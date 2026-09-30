import { getStoredArray } from './storage'
import { parseBrazilianDate } from '../utils/date'

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '')
}

function createError(field, message) {
  return {
    field,
    message
  }
}

function isValidCPF(value) {
  const cpf = digitsOnly(value)

  if (cpf.length !== 11) {
    return false
  }

  if (/^(\d)\1{10}$/.test(cpf)) {
    return false
  }

  let sum = 0

  for (let i = 0; i < 9; i++) {
    sum += Number(cpf[i]) * (10 - i)
  }

  let remainder = (sum * 10) % 11

  if (remainder === 10) {
    remainder = 0
  }

  if (remainder !== Number(cpf[9])) {
    return false
  }

  sum = 0

  for (let i = 0; i < 10; i++) {
    sum += Number(cpf[i]) * (11 - i)
  }

  remainder = (sum * 10) % 11

  if (remainder === 10) {
    remainder = 0
  }

  return remainder === Number(cpf[10])
}

function isValidDate(value) {
  if (!value) {
    return false
  }

  return Boolean(parseBrazilianDate(value))
}

function isFutureDate(value) {
  const date = parseBrazilianDate(value)

  if (!date) {
    return false
  }

  const today = new Date()

  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  return date > today
}

function isBeforeDate(firstValue, secondValue) {
  const firstDate = parseBrazilianDate(firstValue)
  const secondDate = parseBrazilianDate(secondValue)

  if (!firstDate || !secondDate) {
    return false
  }

  firstDate.setHours(0, 0, 0, 0)
  secondDate.setHours(0, 0, 0, 0)

  return firstDate < secondDate
}

export function getSelectedRole(formData, roles = getStoredArray('roles')) {
  return roles.find((role) => role.id === Number(formData.roleId))
}

export function getRequiredCertificates(role) {
  const certificates = getStoredArray('certificates')

  return certificates.filter((certificate) =>
    role?.requiredCertificates?.includes(certificate.id)
  )
}

export function validateEmployee(
  formData,
  employees = getStoredArray('employees'),
  roles = getStoredArray('roles')
) {
  const errors = []

  // ==============================
  // DADOS PESSOAIS
  // ==============================

  if (!normalizeText(formData.name)) {
    errors.push(createError('name', 'O nome completo é obrigatório.'))
  }

  if (!formData.cpf) {
    errors.push(createError('cpf', 'O CPF é obrigatório.'))
  } else if (!isValidCPF(formData.cpf)) {
    errors.push(createError('cpf', 'Informe um CPF válido.'))
  }

  if (!formData.birthDate) {
    errors.push(createError('birthDate', 'A data de nascimento é obrigatória.'))
  } else if (!isValidDate(formData.birthDate)) {
    errors.push(createError('birthDate', 'A data de nascimento é inválida.'))
  } else if (isFutureDate(formData.birthDate)) {
    errors.push(
      createError('birthDate', 'A data de nascimento não pode ser futura.')
    )
  }

  // ==============================
  // DOCUMENTAÇÃO
  // ==============================

  if (!formData.foreigner && !formData.rg) {
    errors.push(createError('rg', 'O RG é obrigatório.'))
  }

  if (formData.rgDate && !isValidDate(formData.rgDate)) {
    errors.push(createError('rgDate', 'A data de emissão do RG é inválida.'))
  }

  if (formData.rgDate && isFutureDate(formData.rgDate)) {
    errors.push(
      createError('rgDate', 'A data de emissão do RG não pode ser futura.')
    )
  }

  // ==============================
  // VÍNCULO PROFISSIONAL
  // ==============================

  if (!formData.roleId) {
    errors.push(createError('roleId', 'Selecione o cargo do funcionário.'))
  }

  if (!formData.branchId) {
    errors.push(createError('branchId', 'Selecione a filial do funcionário.'))
  }

  // ==============================
  // DATA DE ADMISSÃO
  // ==============================

  if (!formData.admissionDate) {
    errors.push(
      createError('admissionDate', 'A data de admissão é obrigatória.')
    )
  } else if (!isValidDate(formData.admissionDate)) {
    errors.push(createError('admissionDate', 'A data de admissão é inválida.'))
  }

  if (formData.admissionDate && isFutureDate(formData.admissionDate)) {
    errors.push(
      createError('admissionDate', 'A data de admissão não pode ser futura.')
    )
  }

  // ==============================
  // DATA DE DESLIGAMENTO
  // ==============================

  if (!formData.active) {
    if (!formData.dismissalDate) {
      errors.push(
        createError(
          'dismissalDate',
          'A data de desligamento é obrigatória para funcionários inativos.'
        )
      )
    } else if (!isValidDate(formData.dismissalDate)) {
      errors.push(
        createError('dismissalDate', 'A data de desligamento é inválida.')
      )
    } else if (
      formData.admissionDate &&
      isBeforeDate(formData.dismissalDate, formData.admissionDate)
    ) {
      errors.push(
        createError(
          'dismissalDate',
          'A data de desligamento não pode ser anterior à data de admissão.'
        )
      )
    }
  } else if (formData.dismissalDate) {
    // Se o funcionário estiver ativo e, por algum motivo,
    // existir uma data demissional preenchida, ainda validamos a data.
    if (!isValidDate(formData.dismissalDate)) {
      errors.push(
        createError('dismissalDate', 'A data de desligamento é inválida.')
      )
    } else if (
      formData.admissionDate &&
      isBeforeDate(formData.dismissalDate, formData.admissionDate)
    ) {
      errors.push(
        createError(
          'dismissalDate',
          'A data de desligamento não pode ser anterior à data de admissão.'
        )
      )
    }
  }

  // ==============================
  // EXAME PERIÓDICO
  // ==============================

  if (formData.periodicExamDate) {
    if (!isValidDate(formData.periodicExamDate)) {
      errors.push(
        createError('periodicExamDate', 'A data do exame periódico é inválida.')
      )
    }
  }

  // ==============================
  // CNH
  // ==============================

  const role = getSelectedRole(formData, roles)

  if (role?.requiresCnh) {
    if (!formData.cnhNumber) {
      errors.push(createError('cnhNumber', 'Este cargo exige o número da CNH.'))
    }

    if (!formData.cnhCategories?.length) {
      errors.push(
        createError(
          'cnhCategories',
          'Este cargo exige a seleção de uma categoria da CNH.'
        )
      )
    }

    const requiredCategories = role.requiredCnhCategories || []

    const hasRequiredCategory = requiredCategories.some((category) =>
      formData.cnhCategories?.includes(category)
    )

    if (requiredCategories.length > 0 && !hasRequiredCategory) {
      errors.push(
        createError(
          'cnhCategories',
          `Este cargo exige CNH categoria: ${requiredCategories.join(', ')}.`
        )
      )
    }

    if (!formData.cnhValidity) {
      errors.push(
        createError(
          'cnhValidity',
          'Este cargo exige a data de validade da CNH.'
        )
      )
    } else if (!isValidDate(formData.cnhValidity)) {
      errors.push(
        createError('cnhValidity', 'A data de validade da CNH é inválida.')
      )
    }
  }

  // ==============================
  // CERTIFICADOS
  // ==============================

  const requiredCertificates = getRequiredCertificates(role)

  const missingCertificates = requiredCertificates.filter(
    (certificate) => !formData.certificates?.includes(certificate.name)
  )

  if (missingCertificates.length > 0) {
    errors.push(
      createError(
        'certificates',
        `Certificados obrigatórios não informados: ${missingCertificates
          .map((certificate) => certificate.name)
          .join(', ')}.`
      )
    )
  }

  // ==============================
  // DUPLICIDADE
  // ==============================

  const currentEmployeeId = formData.id

  const duplicate = employees.find((employee) => {
    if (currentEmployeeId !== undefined && employee.id === currentEmployeeId) {
      return false
    }

    const formCpf = digitsOnly(formData.cpf)
    const employeeCpf = digitsOnly(employee.cpf)

    const sameCpf = formCpf && employeeCpf && formCpf === employeeCpf

    const formRg = digitsOnly(formData.rg)
    const employeeRg = digitsOnly(employee.rg)

    const sameRg = formRg && employeeRg && formRg === employeeRg

    const sameName =
      normalizeText(employee.name) === normalizeText(formData.name)

    const sameNameAndDocument = sameName && (sameCpf || sameRg)

    return sameCpf || sameRg || sameNameAndDocument
  })

  if (duplicate) {
    errors.push(
      createError(
        'cpf',
        'Já existe um funcionário cadastrado com os mesmos dados de identificação.'
      )
    )
  }

  return errors
}
