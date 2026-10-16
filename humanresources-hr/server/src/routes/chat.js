import express from 'express'
import { pool } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()
router.use(authenticate)

const SUPPORT_STATUSES = new Set(['open', 'in_progress', 'waiting', 'resolved'])
const MAX_MESSAGE_LENGTH = 5000

function canManageSupport(user) {
  return user?.isAdmin === true ||
    (Array.isArray(user?.permissions) && user.permissions.includes('chat_manage'))
}

async function isConversationParticipant(client, conversationId, userId) {
  const result = await client.query(
    `SELECT 1
     FROM chat_participants
     WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  )
  return result.rowCount > 0
}

async function canReadConversation(client, conversationId, user) {
  const result = await client.query(
    `SELECT c.id, c.type, c.status
     FROM chat_conversations c
     WHERE c.id = $1 AND c.company_id = $2`,
    [conversationId, user.companyId]
  )

  if (!result.rowCount) return { exists: false, allowed: false }

  const participant = await isConversationParticipant(client, conversationId, user.userId)
  const supportManager = result.rows[0].type === 'support' && canManageSupport(user)

  return {
    exists: true,
    allowed: participant || supportManager,
    conversation: result.rows[0]
  }
}

/**
 * Diretório limitado à empresa do usuário autenticado.
 * Branch/department são derivados do vínculo do funcionário, quando existe.
 */
router.get('/directory', async (req, res, next) => {
  try {
    const { search = '', branchId = '', departmentId = '' } = req.query
    const values = [req.user.companyId]
    const where = ['u.company_id = $1', 'u.active = TRUE', 'u.id <> $2']
    values.push(req.user.userId)

    if (String(search).trim()) {
      values.push(`%${String(search).trim().slice(0, 100)}%`)
      where.push(`(u.name ILIKE $${values.length} OR u.username ILIKE $${values.length})`)
    }

    if (branchId) {
      values.push(branchId)
      where.push(`e.branch_id = $${values.length}`)
    }

    if (departmentId) {
      values.push(departmentId)
      where.push(`e.department_id = $${values.length}`)
    }

    const result = await pool.query(
      `SELECT
         u.id,
         u.name,
         u.username,
         u.employee_id,
         e.branch_id,
         b.name AS branch_name,
         e.department_id,
         d.name AS department_name
       FROM users u
       LEFT JOIN employees e ON e.id = u.employee_id AND e.company_id = u.company_id
       LEFT JOIN branches b ON b.id = e.branch_id AND b.company_id = u.company_id
       LEFT JOIN departments d ON d.id = e.department_id AND d.company_id = u.company_id
       WHERE ${where.join(' AND ')}
       ORDER BY u.name
       LIMIT 250`,
      values
    )

    return res.json(result.rows)
  } catch (error) {
    return next(error)
  }
})

/**
 * Lista conversas do usuário e atendimentos que ele pode gerenciar.
 */
router.get('/conversations', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         c.id,
         c.type,
         c.title,
         c.status,
         c.created_by,
         c.assigned_to,
         c.branch_id,
         c.department_id,
         c.created_at,
         c.updated_at,
         c.last_message_at,
         creator.name AS creator_name,
         assignee.name AS assigned_to_name,
         p.last_read_at,
         (SELECT COUNT(*)::int
            FROM chat_participants cp2
            WHERE cp2.conversation_id = c.id) AS participant_count,
         (SELECT COUNT(*)::int
            FROM chat_messages unread
            WHERE unread.conversation_id = c.id
              AND unread.sender_id <> $2
              AND unread.created_at > COALESCE(p.last_read_at, 'epoch'::timestamptz)) AS unread_count,
         last_msg.body AS last_message,
         last_msg.sender_id AS last_sender_id,
         last_msg.sender_name AS last_sender_name,
         participants.participant_names
       FROM chat_conversations c
       LEFT JOIN chat_participants p
         ON p.conversation_id = c.id AND p.user_id = $2
       JOIN users creator ON creator.id = c.created_by
       LEFT JOIN users assignee ON assignee.id = c.assigned_to
       LEFT JOIN LATERAL (
         SELECT m.body, m.sender_id, u.name AS sender_name
         FROM chat_messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.conversation_id = c.id
         ORDER BY m.created_at DESC
         LIMIT 1
       ) last_msg ON TRUE
       LEFT JOIN LATERAL (
         SELECT string_agg(u2.name, ', ' ORDER BY u2.name) AS participant_names
         FROM chat_participants cp3
         JOIN users u2 ON u2.id = cp3.user_id
         WHERE cp3.conversation_id = c.id AND cp3.user_id <> $2
       ) participants ON TRUE
       WHERE c.company_id = $1
         AND (
           p.user_id = $2
           OR (c.type = 'support' AND $3::boolean = TRUE)
         )
       ORDER BY c.last_message_at DESC, c.created_at DESC`,
      [req.user.companyId, req.user.userId, canManageSupport(req.user)]
    )

    return res.json(result.rows)
  } catch (error) {
    return next(error)
  }
})

/**
 * Cria conversa direta, grupo ou atendimento.
 * O servidor valida que todos os participantes pertencem à mesma empresa.
 */
router.post('/conversations', async (req, res, next) => {
  const client = await pool.connect()

  try {
    const {
      type = 'direct',
      title = '',
      participantIds = [],
      branchId = null,
      departmentId = null
    } = req.body || {}

    if (!['direct', 'group', 'support'].includes(type)) {
      return res.status(400).json({ message: 'Tipo de conversa inválido.' })
    }

    const normalizedTitle = String(title).trim().slice(0, 180)
    if ((type === 'group' || type === 'support') && !normalizedTitle) {
      return res.status(400).json({
        message: type === 'support'
          ? 'Informe o assunto do atendimento.'
          : 'Informe o nome do grupo.'
      })
    }

    if (!Array.isArray(participantIds) || participantIds.length > 100) {
      return res.status(400).json({ message: 'Lista de participantes inválida.' })
    }

    const selectedIds = [...new Set(
      participantIds
        .filter((id) => typeof id === 'string')
        .map((id) => id.trim())
        .filter(Boolean)
    )].filter((id) => id !== req.user.userId)

    if (type === 'direct' && selectedIds.length !== 1) {
      return res.status(400).json({ message: 'Selecione uma pessoa para a conversa individual.' })
    }

    if (type === 'group' && selectedIds.length < 1) {
      return res.status(400).json({ message: 'Selecione pelo menos uma pessoa para o grupo.' })
    }

    if (branchId) {
      const branch = await client.query(
        'SELECT 1 FROM branches WHERE id = $1 AND company_id = $2 AND active = TRUE',
        [branchId, req.user.companyId]
      )
      if (!branch.rowCount) {
        return res.status(400).json({ message: 'Filial inválida para esta empresa.' })
      }
    }

    if (departmentId) {
      const department = await client.query(
        'SELECT 1 FROM departments WHERE id = $1 AND company_id = $2 AND active = TRUE',
        [departmentId, req.user.companyId]
      )
      if (!department.rowCount) {
        return res.status(400).json({ message: 'Departamento inválido para esta empresa.' })
      }
    }

    const idsToValidate = [...selectedIds, req.user.userId]
    const users = await client.query(
      `SELECT id
       FROM users
       WHERE company_id = $1 AND active = TRUE AND id = ANY($2::uuid[])`,
      [req.user.companyId, idsToValidate]
    )

    if (users.rowCount !== idsToValidate.length) {
      return res.status(400).json({
        message: 'Um ou mais participantes não pertencem à empresa ou estão inativos.'
      })
    }

    if (type === 'direct') {
      const existing = await client.query(
        `SELECT c.id
         FROM chat_conversations c
         JOIN chat_participants mine
           ON mine.conversation_id = c.id AND mine.user_id = $2
         JOIN chat_participants other
           ON other.conversation_id = c.id AND other.user_id = $3
         WHERE c.company_id = $1 AND c.type = 'direct'
           AND (SELECT COUNT(*) FROM chat_participants allp
                WHERE allp.conversation_id = c.id) = 2
         LIMIT 1`,
        [req.user.companyId, req.user.userId, selectedIds[0]]
      )

      if (existing.rowCount) {
        return res.json({ id: existing.rows[0].id, existing: true })
      }
    }

    await client.query('BEGIN')

    const created = await client.query(
      `INSERT INTO chat_conversations
        (company_id, type, title, created_by, branch_id, department_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        req.user.companyId,
        type,
        type === 'direct' ? null : normalizedTitle,
        req.user.userId,
        branchId || null,
        departmentId || null
      ]
    )

    const conversationId = created.rows[0].id

    for (const userId of idsToValidate) {
      await client.query(
        `INSERT INTO chat_participants (conversation_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [conversationId, userId]
      )
    }

    await client.query('COMMIT')
    return res.status(201).json({ id: conversationId, existing: false })
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackError) {
      console.error('Não foi possível reverter a transação do chat:', rollbackError)
    }
    return next(error)
  } finally {
    client.release()
  }
})

router.get('/conversations/:id/messages', async (req, res, next) => {
  const client = await pool.connect()

  try {
    const access = await canReadConversation(client, req.params.id, req.user)

    if (!access.exists) {
      return res.status(404).json({ message: 'Conversa não encontrada.' })
    }

    if (!access.allowed) {
      return res.status(403).json({ message: 'Você não participa desta conversa.' })
    }

    const requestedLimit = Number.parseInt(req.query.limit, 10)
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 100

    // Quando um gestor abre um atendimento, passa a integrar a conversa
    // para que o indicador de leitura funcione também para ele.
    if (
      access.conversation.type === 'support' &&
      canManageSupport(req.user) &&
      !(await isConversationParticipant(client, req.params.id, req.user.userId))
    ) {
      await client.query(
        `INSERT INTO chat_participants (conversation_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [req.params.id, req.user.userId]
      )
    }

    const result = await client.query(
      `SELECT
         m.id, m.conversation_id, m.sender_id, m.body, m.created_at, m.edited_at,
         u.name AS sender_name
       FROM chat_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1 AND m.company_id = $2
       ORDER BY m.created_at DESC
       LIMIT $3`,
      [req.params.id, req.user.companyId, limit]
    )

    if (await isConversationParticipant(client, req.params.id, req.user.userId)) {
      await client.query(
        `UPDATE chat_participants
         SET last_read_at = NOW()
         WHERE conversation_id = $1 AND user_id = $2`,
        [req.params.id, req.user.userId]
      )
    }

    return res.json(result.rows.reverse())
  } catch (error) {
    return next(error)
  } finally {
    client.release()
  }
})

router.post('/conversations/:id/messages', async (req, res, next) => {
  const client = await pool.connect()

  try {
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : ''

    if (!body || body.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        message: `A mensagem deve conter entre 1 e ${MAX_MESSAGE_LENGTH} caracteres.`
      })
    }

    const access = await canReadConversation(client, req.params.id, req.user)

    if (!access.exists) {
      return res.status(404).json({ message: 'Conversa não encontrada.' })
    }

    if (!access.allowed) {
      return res.status(403).json({ message: 'Você não participa desta conversa.' })
    }

    if (access.conversation.type === 'support' && access.conversation.status === 'resolved') {
      return res.status(409).json({
        message: 'Este atendimento foi resolvido. Altere o status para continuar a conversa.'
      })
    }

    await client.query('BEGIN')

    const result = await client.query(
      `INSERT INTO chat_messages
        (company_id, conversation_id, sender_id, body)
       VALUES ($1, $2, $3, $4)
       RETURNING id, conversation_id, sender_id, body, created_at, edited_at`,
      [req.user.companyId, req.params.id, req.user.userId, body]
    )

    await client.query(
      `UPDATE chat_conversations
       SET last_message_at = NOW(),
           updated_at = NOW(),
           status = CASE
             WHEN type = 'support' AND status = 'resolved' THEN 'open'
             ELSE status
           END
       WHERE id = $1 AND company_id = $2`,
      [req.params.id, req.user.companyId]
    )

    await client.query('COMMIT')

    return res.status(201).json({
      ...result.rows[0],
      sender_name: req.user.name || 'Usuário'
    })
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackError) {
      console.error('Não foi possível reverter a transação do chat:', rollbackError)
    }
    return next(error)
  } finally {
    client.release()
  }
})

router.patch('/conversations/:id/status', async (req, res, next) => {
  try {
    if (!canManageSupport(req.user)) {
      return res.status(403).json({
        message: 'Somente usuários autorizados podem gerenciar os atendimentos.'
      })
    }

    const { status, assignedTo = null } = req.body || {}

    if (!SUPPORT_STATUSES.has(status)) {
      return res.status(400).json({ message: 'Status de atendimento inválido.' })
    }

    if (assignedTo) {
      const assignee = await pool.query(
        `SELECT id FROM users
         WHERE id = $1 AND company_id = $2 AND active = TRUE`,
        [assignedTo, req.user.companyId]
      )

      if (!assignee.rowCount) {
        return res.status(400).json({ message: 'Responsável inválido.' })
      }
    }

    const result = await pool.query(
      `UPDATE chat_conversations
       SET status = $3,
           assigned_to = $4,
           updated_at = NOW()
       WHERE id = $1 AND company_id = $2 AND type = 'support'
       RETURNING id, status, assigned_to, updated_at`,
      [req.params.id, req.user.companyId, status, assignedTo || null]
    )

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Atendimento não encontrado.' })
    }

    return res.json(result.rows[0])
  } catch (error) {
    return next(error)
  }
})

export default router
