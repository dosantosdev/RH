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
    periodicExamDate: formatDateForForm(data.periodicExamDate ?? data.periodic_exam_date),
    // Quando a API envia explicitamente um vínculo nulo, respeitamos o valor
    // do banco em vez de recuperar um ID antigo de registration_data.
    branchId: row.branch_id !== undefined ? (row.branch_id ?? '') : (data.branchId ?? ''),
    departmentId: row.department_id !== undefined ? (row.department_id ?? '') : (data.departmentId ?? ''),
    roleId: row.role_id !== undefined ? (row.role_id ?? '') : (data.roleId ?? ''),
    positionId: row.position_id !== undefined ? (row.position_id ?? '') : (data.positionId ?? ''),
    branchName: row.branch_name !== undefined ? (row.branch_name ?? '') : (data.branchName ?? ''),
    departmentName: row.department_name !== undefined ? (row.department_name ?? '') : (data.departmentName ?? ''),
    roleName: row.role_name !== undefined ? (row.role_name ?? '') : (data.roleName ?? ''),
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
  if (id === undefined || id === null || !String(id).trim() ||
      String(id) === 'undefined' || String(id) === 'null') {
    throw new Error('ID do funcionário inválido. Volte à busca e selecione o cadastro novamente.')
  }

  const row = await apiRequest(`/employees/${encodeURIComponent(String(id))}`)
  return normalizeEmployee(row)
}

export async function updateEmployeeInApi(employee) {
  const employeeId = employee?.databaseId || employee?.id
  if (!employeeId || String(employeeId) === 'undefined' || String(employeeId) === 'null') {
    throw new Error('Não foi possível salvar: o funcionário não possui um ID válido.')
  }

  const payload = {
    name: String(employee.name || '').trim(),
    cpf: employee.cpf || null,
    rg: employee.rg || null,
    email: employee.email || null,
    phone: employee.phone || null,
    birthDate: toIsoDate(employee.birthDate),
    admissionDate: toIsoDate(employee.admissionDate),
    terminationDate: toIsoDate(employee.dismissalDate),
    // Enviar os vínculos relacionais em colunas próprias do PostgreSQL.
    // Sem estes campos, o perfil podia parecer atualizado até a próxima consulta.
    branchId: employee.branchId || null,
    departmentId: employee.departmentId || null,
    roleId: employee.roleId || null,
    positionId: employee.positionId || null,
    status: employee.status || ((employee.isActive || employee.active) ? 'active' : 'inactive'),
    registrationData: employee
  }

  const row = await apiRequest(`/employees/${encodeURIComponent(employeeId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })

  return normalizeEmployee(row)
}

export async function deleteEmployeeFromApi(id) {
  return apiRequest(`/employees/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
