import { apiRequest } from './api'

function formatDateForForm(value) {
  if (!value) return ''
  const text = String(value).slice(0, 10)
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`
  return text
}

/**
 * Converte a resposta do PostgreSQL para o formato já utilizado
 * pelos componentes de funcionários. Os campos completos do formulário
 * permanecem em registrationData até serem migrados individualmente.
 */
export function normalizeEmployee(row) {
  const data = row?.registration_data || row?.registrationData || {}

  return {
    ...data,
    id: row.id,
    databaseId: row.id,
    name: row.name || data.name || '',
    cpf: row.cpf ?? data.cpf ?? '',
    rg: row.rg ?? data.rg ?? '',
    email: row.email ?? data.email ?? '',
    phone: row.phone ?? data.phone ?? '',
    birthDate: formatDateForForm(row.birth_date ?? data.birthDate),
    admissionDate: formatDateForForm(row.admission_date ?? data.admissionDate),
    dismissalDate: formatDateForForm(row.termination_date ?? data.dismissalDate),
    branchId: row.branch_id ?? data.branchId ?? '',
    departmentId: row.department_id ?? data.departmentId ?? '',
    roleId: row.role_id ?? data.roleId ?? '',
    positionId: row.position_id ?? data.positionId ?? '',
    branchName: row.branch_name ?? data.branchName ?? '',
    departmentName: row.department_name ?? data.departmentName ?? '',
    roleName: row.role_name ?? data.roleName ?? '',
    dependents: Array.isArray(row.dependents)
      ? row.dependents
      : Array.isArray(data.dependents)
        ? data.dependents
        : [],
    status: row.status || data.status || 'active',
    isActive: (row.status || data.status || 'active') === 'active',
    active: (row.status || data.status || 'active') === 'active'
  }
}

function toIsoDate(value) {
  if (!value) return null
  const text = String(value).trim()
  const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  return null
}

export async function searchEmployees(search, { status } = {}) {
  const params = new URLSearchParams()
  if (search?.trim()) params.set('search', search.trim())
  if (status) params.set('status', status)
  const query = params.toString()
  const rows = await apiRequest(`/employees${query ? `?${query}` : ''}`)
  return rows.map(normalizeEmployee)
}

export async function getEmployeeById(id) {
  const row = await apiRequest(`/employees/${encodeURIComponent(id)}`)
  return normalizeEmployee(row)
}

export async function updateEmployeeInApi(employee) {
  const payload = {
    name: String(employee.name || '').trim(),
    cpf: employee.cpf || null,
    rg: employee.rg || null,
    email: employee.email || null,
    phone: employee.phone || null,
    birthDate: toIsoDate(employee.birthDate),
    admissionDate: toIsoDate(employee.admissionDate),
    terminationDate: toIsoDate(employee.dismissalDate),
    status: employee.status || ((employee.isActive || employee.active) ? 'active' : 'inactive'),
    registrationData: employee
  }

  const row = await apiRequest(`/employees/${encodeURIComponent(employee.databaseId || employee.id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })

  return normalizeEmployee(row)
}

export async function deleteEmployeeFromApi(id) {
  return apiRequest(`/employees/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
