import express from 'express'
import crypto from 'node:crypto'
import { pool } from '../db/pool.js'
import { authenticate, requirePermission } from '../middleware/auth.js'

const adminRouter = express.Router()
const publicRouter = express.Router()

const TOKEN_BYTES = 32
const MAX_CANDIDATE_BYTES = 8 * 1024 * 1024

function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex')
}

function encryptionKey() {
  const secret = process.env.JWT_SECRET || 'development-only-secret'
  return crypto.createHash('sha256').update(`hr-recruitment-link:${secret}`).digest()
}

function encryptToken(token) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.')
}

function decryptToken(value) {
  const [ivValue, tagValue, encryptedValue] = String(value || '').split('.')
  if (!ivValue || !tagValue || !encryptedValue) return null
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'))
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64url')),
      decipher.final()
    ]).toString('utf8')
  } catch {
    return null
  }
}

function nowIso() {
  return new Date().toISOString()
}

async function getVacancy(companyId, vacancyId) {
  const result = await pool.query(
    `SELECT payload
     FROM app_records
     WHERE company_id = $1 AND module_key = 'recruitment'
       AND record_key = 'recruitmentVacancies'`,
    [companyId]
  )
  const vacancies = Array.isArray(result.rows[0]?.payload) ? result.rows[0].payload : []
  return vacancies.find((item) => String(item.id) === String(vacancyId)) || null
}

function linkResponse(row, includeToken = true) {
  return {
    id: row.id,
    token: includeToken ? decryptToken(row.token_ciphertext) : undefined,
    vacancyId: row.vacancy_id,
    vacancyTitle: row.vacancy_snapshot?.title || '',
    vacancy: row.vacancy_snapshot || null,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    active: !row.revoked_at && new Date(row.expires_at).getTime() > Date.now(),
    revokedAt: row.revoked_at || null
  }
}

adminRouter.use(authenticate)

adminRouter.get('/application-links', requirePermission('recruitment_view'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, token_ciphertext, vacancy_id, vacancy_snapshot,
              expires_at, revoked_at, created_at
       FROM recruitment_application_links
       WHERE company_id = $1
       ORDER BY created_at DESC`,
      [req.user.companyId]
    )
    return res.json(result.rows.map((row) => linkResponse(row)))
  } catch (error) {
    return next(error)
  }
})

adminRouter.post('/application-links', requirePermission('recruitment_create'), async (req, res, next) => {
  const vacancyId = req.body?.vacancyId
  const hours = Number(req.body?.expiresInHours)
  if (vacancyId === undefined || vacancyId === null || String(vacancyId).trim() === '') {
    return res.status(400).json({ message: 'Selecione uma vaga.' })
  }
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24 * 90) {
    return res.status(400).json({ message: 'A validade deve ser maior que zero e de no máximo 90 dias.' })
  }

  try {
    const vacancy = await getVacancy(req.user.companyId, vacancyId)
    if (!vacancy || vacancy.active === false || vacancy.status !== 'aberta') {
      return res.status(404).json({ message: 'Vaga não encontrada ou não está aberta.' })
    }

    const token = crypto.randomBytes(TOKEN_BYTES).toString('base64url')
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000)
    const result = await pool.query(
      `INSERT INTO recruitment_application_links
        (company_id, token_hash, token_ciphertext, vacancy_id, vacancy_snapshot,
         expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
       RETURNING id, token_ciphertext, vacancy_id, vacancy_snapshot,
                 expires_at, revoked_at, created_at`,
      [
        req.user.companyId, tokenHash(token), encryptToken(token), String(vacancy.id),
        JSON.stringify(vacancy), expiresAt, req.user.userId || null
      ]
    )
    return res.status(201).json({ ...linkResponse(result.rows[0]), token })
  } catch (error) {
    return next(error)
  }
})

adminRouter.patch('/application-links/:id/revoke', requirePermission('recruitment_edit'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE recruitment_application_links
       SET revoked_at = COALESCE(revoked_at, NOW())
       WHERE id = $1 AND company_id = $2
       RETURNING id, token_ciphertext, vacancy_id, vacancy_snapshot,
                 expires_at, revoked_at, created_at`,
      [req.params.id, req.user.companyId]
    )
    if (!result.rowCount) return res.status(404).json({ message: 'Link não encontrado.' })
    return res.json(linkResponse(result.rows[0]))
  } catch (error) {
    return next(error)
  }
})

adminRouter.delete('/application-links/:id', requirePermission('recruitment_delete'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `DELETE FROM recruitment_application_links
       WHERE id = $1 AND company_id = $2`,
      [req.params.id, req.user.companyId]
    )
    if (!result.rowCount) return res.status(404).json({ message: 'Link não encontrado.' })
    return res.status(204).end()
  } catch (error) {
    return next(error)
  }
})

publicRouter.get('/applications/:token', async (req, res, next) => {
  const token = String(req.params.token || '')
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) {
    return res.status(404).json({ message: 'Link inválido ou expirado.' })
  }

  try {
    const result = await pool.query(
      `SELECT vacancy_snapshot, expires_at, revoked_at
       FROM recruitment_application_links
       WHERE token_hash = $1`,
      [tokenHash(token)]
    )
    const link = result.rows[0]
    if (!link || link.revoked_at || new Date(link.expires_at).getTime() <= Date.now()) {
      return res.status(404).json({ message: 'Link inválido ou expirado.' })
    }
    const vacancy = link.vacancy_snapshot
    if (!vacancy || vacancy.active === false || vacancy.status !== 'aberta') {
      return res.status(404).json({ message: 'Link inválido ou vaga indisponível.' })
    }
    return res.json({
      vacancy,
      expiresAt: link.expires_at
    })
  } catch (error) {
    return next(error)
  }
})

publicRouter.post('/applications/:token', async (req, res, next) => {
  const token = String(req.params.token || '')
  const candidate = req.body?.candidate
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) {
    return res.status(404).json({ message: 'Link inválido ou expirado.' })
  }
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return res.status(400).json({ message: 'Dados da candidatura inválidos.' })
  }
  if (Buffer.byteLength(JSON.stringify(candidate), 'utf8') > MAX_CANDIDATE_BYTES) {
    return res.status(413).json({ message: 'Os dados e documentos excedem o limite de envio. Reduza o tamanho dos anexos.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const linkResult = await client.query(
      `SELECT id, company_id, vacancy_id, vacancy_snapshot, expires_at, revoked_at
       FROM recruitment_application_links
       WHERE token_hash = $1
       FOR UPDATE`,
      [tokenHash(token)]
    )
    const link = linkResult.rows[0]
    if (!link || link.revoked_at || new Date(link.expires_at).getTime() <= Date.now() ||
        !link.vacancy_snapshot || link.vacancy_snapshot.active === false ||
        link.vacancy_snapshot.status !== 'aberta') {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Link inválido ou expirado.' })
    }

    // Serializa candidaturas da mesma empresa, inclusive quando a lista ainda
    // não existe e, portanto, não há uma linha para bloquear com FOR UPDATE.
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      [String(link.company_id), 'recruitment:recruitmentCandidates']
    )

    const candidatesResult = await client.query(
      `SELECT payload FROM app_records
       WHERE company_id = $1 AND module_key = 'recruitment'
         AND record_key = 'recruitmentCandidates'
       FOR UPDATE`,
      [link.company_id]
    )
    const candidates = Array.isArray(candidatesResult.rows[0]?.payload)
      ? candidatesResult.rows[0].payload
      : []
    const nextId = candidates.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1
    const createdAt = nowIso()
    const submittedCandidate = {
      ...candidate,
      id: nextId,
      createdAt,
      updatedAt: createdAt,
      status: 'em_processo',
      stageId: 1,
      stageName: 'Inscrição',
      vacancyId: link.vacancy_id,
      vacancyTitle: link.vacancy_snapshot.title || '',
      source: 'Link público de candidatura',
      publicApplication: true,
      publicApplicationToken: tokenHash(token),
      submittedAt: createdAt,
      history: [{
        id: Date.now(),
        type: 'created',
        date: createdAt,
        description: 'Candidatura recebida pelo link público.'
      }]
    }
    const updatedCandidates = [...candidates, submittedCandidate]
    await client.query(
      `INSERT INTO app_records
        (company_id, module_key, record_key, payload, created_by, updated_by)
       VALUES ($1, 'recruitment', 'recruitmentCandidates', $2::jsonb, NULL, NULL)
       ON CONFLICT (company_id, module_key, record_key)
       DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
      [link.company_id, JSON.stringify(updatedCandidates)]
    )
    await client.query('COMMIT')
    return res.status(201).json({ message: 'Candidatura enviada com sucesso.' })
  } catch (error) {
    await client.query('ROLLBACK')
    return next(error)
  } finally {
    client.release()
  }
})

export { adminRouter, publicRouter }
