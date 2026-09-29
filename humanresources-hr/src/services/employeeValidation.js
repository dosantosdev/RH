import { getStoredArray } from './storage'
import { parseBrazilianDate } from '../utils/date'

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '')
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

export function validateEmployee(formData, employees = getStoredArray('employees'), roles = getStoredArray('roles')) {
  const errors = []

  if (!normalizeText(formData.name)) {
    errors.push('O nome completo é obrigatório.')
  }

  if (!formData.cpf) {
    errors.push('O CPF é obrigatório.')
  } else if (digitsOnly(formData.cpf).length !== 11) {
    errors.push('Informe um CPF válido com 11 dígitos.')
  }

  if (!formData.birthDate) {
    errors.push('A data de nascimento é obrigatória.')
  } else if (!parseBrazilianDate(formData.birthDate)) {
    errors.push('A data de nascimento é inválida.')
  }

  if (!formData.roleId) {
    errors.push('Selecione o cargo do funcionário.')
  }

  if (!formData.branchId) {
    errors.push('Selecione a filial do funcionário.')
  }

  if (formData.periodicExamDate && !parseBrazilianDate(formData.periodicExamDate)) {
    errors.push('A data do exame periódico é inválida.')
  }

  if (formData.admissionDate && !parseBrazilianDate(formData.admissionDate)) {
    errors.push('A data de admissão é inválida.')
  }

  if (!formData.foreigner && !formData.rg) {
    errors.push('O RG é obrigatório.')
  }

  const duplicate = employees.find((employee) => {
    const sameCpf =
      digitsOnly(employee.cpf) &&
      digitsOnly(formData.cpf) &&
      digitsOnly(employee.cpf) === digitsOnly(formData.cpf)

    const sameNameAndDocument =
      normalizeText(employee.name) === normalizeText(formData.name) &&
      digitsOnly(employee.rg) &&
      digitsOnly(formData.rg) &&
      digitsOnly(employee.rg) === digitsOnly(formData.rg)

    return sameCpf || sameNameAndDocument
  })

  if (duplicate) {
    errors.push(
      'Já existe um funcionário cadastrado com os mesmos dados de identificação.'
    )
  }

  const role = getSelectedRole(formData, roles)

  if (role?.requiresCnh) {
    if (!formData.cnhNumber) {
      errors.push('Este cargo exige o número da CNH.')
    }

    if (!formData.cnhCategories?.length) {
      errors.push('Este cargo exige a seleção de uma categoria da CNH.')
    }

    const requiredCategories = role.requiredCnhCategories || []

    const hasRequiredCategory = requiredCategories.some((category) =>
      formData.cnhCategories?.includes(category)
    )

    if (requiredCategories.length > 0 && !hasRequiredCategory) {
      errors.push(
        `Este cargo exige CNH categoria: ${requiredCategories.join(', ')}.`
      )
    }
  }

  const requiredCertificates = getRequiredCertificates(role)

  const missingCertificates = requiredCertificates.filter(
    (certificate) => !formData.certificates?.includes(certificate.name)
  )

  if (missingCertificates.length > 0) {
    errors.push(
      `Certificados obrigatórios não informados: ${missingCertificates
        .map((certificate) => certificate.name)
        .join(', ')}.`
    )
  }

  return errors
}
