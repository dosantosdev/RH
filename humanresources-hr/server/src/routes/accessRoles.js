import express from 'express'
import { pool } from '../db/pool.js'
import { authenticate, requirePermission } from '../middleware/auth.js'

const router = express.Router()
router.use(authenticate)

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INTERNAL_NAME_PATTERN = /^[a-z][a-z0-9_-]{1,79}$/

function normalizeRole(row) {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    description: row.description || '',
    active: row.active,
    isSystem: row.is_system,
    permissions: row.name === 'admin' ? ['all'] : (row.permissions || [])
  }
}

async function loadRole(client, roleId, companyId, { lock = false } = {}) {
  const result = await client.query(
    `SELECT id, company_id, name, display_name, description, active, is_system
     FROM access_roles
     WHERE id = $1 AND company_id = $2
     ${lock ? 'FOR UPDATE' : ''}`,
    [roleId, companyId]
  )
  return result.rows[0] || null
}

async function getPermissionIds(client, permissionKeys) {
  if (!Array.isArray(permissionKeys) || permissionKeys.some((key) => typeof key !== 'string')) {
    const error = new Error('Envie uma lista válida de permissões.')
    error.status = 400
    throw error
  }

  if (permissionKeys.includes('all')) {
    const error = new Error('A permissão total é reservada ao perfil Administrador.')
    error.status = 400
    throw error
  }

  const uniqueKeys = [...new Set(permissionKeys)]
  if (uniqueKeys.length === 0) return []

  const result = await client.query(
    'SELECT id, key FROM permissions WHERE key = ANY($1::text[])',
    [uniqueKeys]
  )
  if (result.rowCount !== uniqueKeys.length) {
    const found = new Set(result.rows.map((row) => row.key))
    const missing = uniqueKeys.filter((key) => !found.has(key))
    const error = new Error(`Permissões não reconhecidas: ${missing.join(', ')}. Execute as migrações do banco.`)
    error.status = 400
    throw error
  }
  return result.rows
}

async function loadRolePermissions(client, roleId) {
  const result = await client.query(
    `SELECT p.key
     FROM access_role_permissions arp
     JOIN permissions p ON p.id = arp.permission_id
     WHERE arp.access_role_id = $1
     ORDER BY p.category, p.label`,
    [roleId]
  )
  return result.rows.map((row) => row.key)
}

router.get('/', requirePermission('access_roles_view'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ar.id, ar.name, ar.display_name, ar.description, ar.active, ar.is_system,
              COALESCE(array_agg(p.key) FILTER (WHERE p.key IS NOT NULL), ARRAY[]::text[]) AS permissions
       FROM access_roles ar
       LEFT JOIN access_role_permissions arp ON arp.access_role_id = ar.id
       LEFT JOIN permissions p ON p.id = arp.permission_id
       WHERE ar.company_id = $1
       GROUP BY ar.id
       ORDER BY CASE ar.name WHEN 'admin' THEN 1 WHEN 'gestao_rh' THEN 2 WHEN 'funcionario' THEN 3 ELSE 4 END,
                ar.display_name`,
      [req.user.companyId]
    )
    return res.json(result.rows.map(normalizeRole))
  } catch (error) {
    return next(error)
  }
})

router.post('/', requirePermission('access_roles_create'), async (req, res, next) => {
  const { name, displayName, description = '', active = true, permissions = [] } = req.body || {}
  const cleanName = typeof name === 'string' ? name.trim().toLowerCase() : ''
  const cleanDisplayName = typeof displayName === 'string' ? displayName.trim() : ''

  if (!INTERNAL_NAME_PATTERN.test(cleanName) || cleanName === 'admin') {
    return res.status(400).json({ message: 'Informe um nome interno válido. O nome admin é reservado.' })
  }
  if (!cleanDisplayName || cleanDisplayName.length > 120) {
    return res.status(400).json({ message: 'Informe um nome de exibição de até 120 caracteres.' })
  }
  if (typeof description !== 'string' || description.length > 2000) {
    return res.status(400).json({ message: 'A descrição deve ter até 2.000 caracteres.' })
  }
  if (typeof active !== 'boolean') {
    return res.status(400).json({ message: 'O estado ativo deve ser verdadeiro ou falso.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const permissionRows = await getPermissionIds(client, permissions)
    const inserted = await client.query(
      `INSERT INTO access_roles (company_id, name, display_name, description, active, is_system)
       VALUES ($1, $2, $3, $4, $5, FALSE)
       RETURNING id, name, display_name, description, active, is_system`,
      [req.user.companyId, cleanName, cleanDisplayName, description.trim(), active]
    )
    const role = inserted.rows[0]
    for (const permission of permissionRows) {
      await client.query(
        `INSERT INTO access_role_permissions (access_role_id, permission_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [role.id, permission.id]
      )
    }
    role.permissions = permissionRows.map((permission) => permission.key)
    await client.query('COMMIT')
    return res.status(201).json(normalizeRole(role))
  } catch (error) {
    await client.query('ROLLBACK')
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Já existe um perfil com esse nome interno.' })
    }
    return next(error)
  } finally {
    client.release()
  }
})

router.patch('/:id', requirePermission('access_roles_edit'), async (req, res, next) => {
  if (!UUID_PATTERN.test(req.params.id)) {
    return res.status(400).json({ message: 'Identificador de perfil inválido.' })
  }

  const { name, displayName, description, active, permissions } = req.body || {}
  if (name !== undefined && (typeof name !== 'string' || !INTERNAL_NAME_PATTERN.test(name.trim().toLowerCase()) || name.trim().toLowerCase() === 'admin')) {
    return res.status(400).json({ message: 'Informe um nome interno válido. O nome admin é reservado.' })
  }
  if (displayName !== undefined && (typeof displayName !== 'string' || !displayName.trim() || displayName.trim().length > 120)) {
    return res.status(400).json({ message: 'Informe um nome de exibição de até 120 caracteres.' })
  }
  if (description !== undefined && (typeof description !== 'string' || description.length > 2000)) {
    return res.status(400).json({ message: 'A descrição deve ter até 2.000 caracteres.' })
  }
  if (active !== undefined && typeof active !== 'boolean') {
    return res.status(400).json({ message: 'O estado ativo deve ser verdadeiro ou falso.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const role = await loadRole(client, req.params.id, req.user.companyId, { lock: true })
    if (!role) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Perfil de acesso não encontrado.' })
    }
    if (role.name === 'admin') {
      const protectedFields = ['name', 'active', 'permissions']
      if (protectedFields.some((field) => Object.prototype.hasOwnProperty.call(req.body || {}, field))) {
        await client.query('ROLLBACK')
        return res.status(400).json({ message: 'O nome, o estado e as permissões do Administrador são protegidos.' })
      }
    }

    const permissionRows = role.name === 'admin' || permissions === undefined
      ? null
      : await getPermissionIds(client, permissions)
    const nextName = role.name === 'admin' || name === undefined ? role.name : name.trim().toLowerCase()
    const nextDisplayName = displayName === undefined ? role.display_name : displayName.trim()
    const nextDescription = description === undefined ? role.description : description.trim()
    const nextActive = role.name === 'admin' || active === undefined ? role.active : active

    await client.query(
      `UPDATE access_roles
       SET name = $3, display_name = $4, description = $5, active = $6
       WHERE id = $1 AND company_id = $2`,
      [role.id, req.user.companyId, nextName, nextDisplayName, nextDescription, nextActive]
    )

    if (permissionRows) {
      await client.query('DELETE FROM access_role_permissions WHERE access_role_id = $1', [role.id])
      for (const permission of permissionRows) {
        await client.query(
          `INSERT INTO access_role_permissions (access_role_id, permission_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [role.id, permission.id]
        )
      }
    }

    const updated = await loadRole(client, role.id, req.user.companyId)
    updated.permissions = permissionRows
      ? permissionRows.map((permission) => permission.key)
      : await loadRolePermissions(client, role.id)
    await client.query('COMMIT')
    return res.json(normalizeRole(updated))
  } catch (error) {
    await client.query('ROLLBACK')
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Já existe um perfil com esse nome interno.' })
    }
    return next(error)
  } finally {
    client.release()
  }
})

router.delete('/:id', requirePermission('access_roles_delete'), async (req, res, next) => {
  if (!UUID_PATTERN.test(req.params.id)) {
    return res.status(400).json({ message: 'Identificador de perfil inválido.' })
  }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const role = await loadRole(client, req.params.id, req.user.companyId, { lock: true })
    if (!role) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Perfil de acesso não encontrado.' })
    }
    if (role.name === 'admin') {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'O perfil Administrador não pode ser excluído.' })
    }
    const users = await client.query(
      'SELECT COUNT(*)::int AS count FROM users WHERE company_id = $1 AND access_role_id = $2',
      [req.user.companyId, role.id]
    )
    if (users.rows[0].count > 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ message: `Este perfil está vinculado a ${users.rows[0].count} usuário(s) e não pode ser excluído.` })
    }
    await client.query('DELETE FROM access_roles WHERE id = $1 AND company_id = $2', [role.id, req.user.companyId])
    await client.query('COMMIT')
    return res.status(204).end()
  } catch (error) {
    await client.query('ROLLBACK')
    return next(error)
  } finally {
    client.release()
  }
})

export default router
