import { getStoredArray } from './storage'
import { isFieldRequired } from './requiredFields'
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
  return { field, message }
}

function isValidCPF(value) {
  const cpf = digitsOnly(value)

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false
  }

  let sum = 0

  for (let i = 0; i < 9; i++) {
    sum += Number(cpf[i]) * (10 - i)
  }

  let remainder = (sum * 10) % 11

  if (remainder === 10) remainder = 0
  if (remainder !== Number(cpf[9])) return false

  sum = 0

  for (let i = 0; i < 10; i++) {
    sum += Number(cpf[i]) * (11 - i)
  }

  remainder = (sum * 10) % 11

  if (remainder === 10) remainder = 0

  return remainder === Number(cpf[10])
}

function isValidDate(value) {
  return Boolean(value && parseBrazilianDate(value))
}

function isFutureDate(value) {
  const date = parseBrazilianDate(value)

  if (!date) return false

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

function isEmpty(value) {
  if (Array.isArray(value)) {
    return value.length === 0
  }

  return !String(value ?? '').trim()
}

function validateRequiredField(errors, section, field, value, message) {
  if (isFieldRequired(section, field) && isEmpty(value)) {
    errors.push(createError(field, message))
  }
}

function validateConditionalRequiredField(
  errors,
  section,
  field,
  value,
  message
) {
  if (isFieldRequired(section, field) && isEmpty(value)) {
    errors.push(createError(field, message))
  }
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

  validateRequiredField(
    errors,
    'personal',
    'name',
    formData.name,
    'O nome completo é obrigatório.'
  )

  validateRequiredField(
    errors,
    'personal',
    'cpf',
    formData.cpf,
    'O CPF é obrigatório.'
  )

  validateRequiredField(
    errors,
    'personal',
    'birthDate',
    formData.birthDate,
    'A data de nascimento é obrigatória.'
  )

  validateRequiredField(
    errors,
    'personal',
    'gender',
    formData.gender,
    'O sexo é obrigatório.'
  )

  validateRequiredField(
    errors,
    'personal',
    'maritalStatus',
    formData.maritalStatus,
    'O estado civil é obrigatório.'
  )

  validateRequiredField(
    errors,
    'personal',
    'education',
    formData.education,
    'A escolaridade é obrigatória.'
  )

  validateRequiredField(
    errors,
    'personal',
    'motherName',
    formData.motherName,
    'O nome da mãe é obrigatório.'
  )

  validateRequiredField(
    errors,
    'personal',
    'fatherName',
    formData.fatherName,
    'O nome do pai é obrigatório.'
  )

  if (formData.cpf && !isValidCPF(formData.cpf)) {
    errors.push(createError('cpf', 'Informe um CPF válido.'))
  }

  if (formData.birthDate && !isValidDate(formData.birthDate)) {
    errors.push(createError('birthDate', 'A data de nascimento é inválida.'))
  }

  if (formData.birthDate && isFutureDate(formData.birthDate)) {
    errors.push(
      createError('birthDate', 'A data de nascimento não pode ser futura.')
    )
  }

  // ==============================
  // DOCUMENTAÇÃO
  // ==============================

  const documentFields = [
    ['rg', formData.rg, 'O RG é obrigatório.'],
    ['rgIssuer', formData.rgIssuer, 'O órgão emissor do RG é obrigatório.'],
    ['rgDate', formData.rgDate, 'A data de emissão do RG é obrigatória.'],
    ['rgCity', formData.rgCity, 'O município do RG é obrigatório.'],
    ['rgState', formData.rgState, 'A UF do RG é obrigatória.'],
    ['ctpsNumber', formData.ctpsNumber, 'A CTPS é obrigatória.'],
    ['ctpsSeries', formData.ctpsSeries, 'A série da CTPS é obrigatória.'],
    ['ctpsCity', formData.ctpsCity, 'O município da CTPS é obrigatório.'],
    ['pis', formData.pis, 'O PIS é obrigatório.'],
    ['susCard', formData.susCard, 'O Cartão SUS é obrigatório.'],
    ['voterTitle', formData.voterTitle, 'O título eleitoral é obrigatório.'],
    ['voterZone', formData.voterZone, 'A zona eleitoral é obrigatória.'],
    ['voterSection', formData.voterSection, 'A seção eleitoral é obrigatória.']
  ]

  documentFields.forEach(([field, value, message]) => {
    validateRequiredField(errors, 'documents', field, value, message)
  })

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

  const employmentFields = [
    ['registration', formData.registration, 'A matrícula é obrigatória.'],
    [
      'admissionDate',
      formData.admissionDate,
      'A data de admissão é obrigatória.'
    ],
    [
      'periodicExamDate',
      formData.periodicExamDate,
      'A data do exame periódico é obrigatória.'
    ]
  ]

  employmentFields.forEach(([field, value, message]) => {
    validateRequiredField(errors, 'employment', field, value, message)
  })

  /*
   * Novos funcionários devem ser vinculados
   * a uma posição do organograma.
   *
   * Funcionários antigos podem ainda não possuir
   * positionId, pois esse vínculo foi adicionado
   * posteriormente ao sistema.
   *
   * Nesse caso, mantemos a compatibilidade com
   * roleId e branchId.
   */
  if (formData.id === undefined || formData.id === null) {
    validateRequiredField(
      errors,
      'employment',
      'positionId',
      formData.positionId,
      'Selecione a posição do funcionário.'
    )
  } else {
    if (isEmpty(formData.roleId)) {
      errors.push(
        createError('positionId', 'O cargo do funcionário não foi definido.')
      )
    }

    if (isEmpty(formData.branchId)) {
      errors.push(
        createError('positionId', 'A filial do funcionário não foi definida.')
      )
    }
  }

  /*
   * IMPORTANTE:
   *
   * Não existe mais validação de ocupação da posição.
   *
   * Uma mesma posição pode ser vinculada a vários
   * funcionários ativos.
   *
   * Exemplo:
   *
   * Vendedor - Loja Centro
   * ├── João
   * ├── Maria
   * ├── Carlos
   * └── Ana
   *
   * A posição representa uma função dentro da estrutura
   * organizacional, e não uma vaga exclusiva.
   */

  if (formData.admissionDate && !isValidDate(formData.admissionDate)) {
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

  if (formData.periodicExamDate && !isValidDate(formData.periodicExamDate)) {
    errors.push(
      createError('periodicExamDate', 'A data do exame periódico é inválida.')
    )
  }

  // ==============================
  // CNH — VINCULADA AO CARGO
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
  // CERTIFICADOS — VINCULADOS AO CARGO
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
  // CÔNJUGE — CONDICIONAL
  // ==============================

  const hasSpouse =
    formData.maritalStatus === 'Casado' ||
    formData.maritalStatus === 'União estável'

  if (hasSpouse) {
    const spouseFields = [
      ['spouseName', formData.spouseName, 'O nome do cônjuge é obrigatório.'],
      [
        'spouseGender',
        formData.spouseGender,
        'O sexo do cônjuge é obrigatório.'
      ],
      [
        'spousePhone',
        formData.spousePhone,
        'O telefone do cônjuge é obrigatório.'
      ],
      ['spouseCpf', formData.spouseCpf, 'O CPF do cônjuge é obrigatório.'],
      ['spouseRg', formData.spouseRg, 'O RG do cônjuge é obrigatório.'],
      [
        'spouseRgIssuer',
        formData.spouseRgIssuer,
        'O emissor do RG do cônjuge é obrigatório.'
      ],
      ['spouseUf', formData.spouseUf, 'A UF do RG do cônjuge é obrigatória.'],
      [
        'spouseBirthDate',
        formData.spouseBirthDate,
        'A data de nascimento do cônjuge é obrigatória.'
      ],
      [
        'spouseBirthCity',
        formData.spouseBirthCity,
        'A cidade de nascimento do cônjuge é obrigatória.'
      ],
      [
        'marriageDate',
        formData.marriageDate,
        'A data do casamento/união é obrigatória.'
      ]
    ]

    spouseFields.forEach(([field, value, message]) => {
      validateConditionalRequiredField(errors, 'spouse', field, value, message)
    })

    if (formData.spouseCpf && !isValidCPF(formData.spouseCpf)) {
      errors.push(
        createError('spouseCpf', 'Informe um CPF válido para o cônjuge.')
      )
    }

    if (formData.spouseBirthDate && !isValidDate(formData.spouseBirthDate)) {
      errors.push(
        createError(
          'spouseBirthDate',
          'A data de nascimento do cônjuge é inválida.'
        )
      )
    }

    if (formData.marriageDate && !isValidDate(formData.marriageDate)) {
      errors.push(
        createError('marriageDate', 'A data do casamento/união é inválida.')
      )
    }
  }

  // ==============================
  // DEPENDENTES — CONDICIONAL
  // ==============================

  if (formData.hasDependents) {
    const count = Number(formData.dependentsCount)

    if (!count || count < 1) {
      errors.push(
        createError('dependentsCount', 'Informe a quantidade de dependentes.')
      )
    }

    const dependents = formData.dependents || []

    if (count > 0 && dependents.length !== count) {
      errors.push(
        createError(
          'dependentsCount',
          'A quantidade de dependentes não corresponde aos dados preenchidos.'
        )
      )
    }

    dependents.forEach((dependent, index) => {
      const dependentFields = [
        ['name', dependent.name, 'O nome do dependente é obrigatório.'],
        ['cpf', dependent.cpf, 'O CPF do dependente é obrigatório.'],
        [
          'birthDate',
          dependent.birthDate,
          'A data de nascimento do dependente é obrigatória.'
        ],
        ['rg', dependent.rg, 'O RG do dependente é obrigatório.']
      ]

      dependentFields.forEach(([field, value, message]) => {
        const errorField = `dependents[${index}].${field}`

        if (isFieldRequired('dependents', field) && isEmpty(value)) {
          errors.push(createError(errorField, message))
        }
      })

      if (dependent.cpf && !isValidCPF(dependent.cpf)) {
        errors.push(
          createError(
            `dependents[${index}].cpf`,
            'Informe um CPF válido para o dependente.'
          )
        )
      }

      if (dependent.birthDate && !isValidDate(dependent.birthDate)) {
        errors.push(
          createError(
            `dependents[${index}].birthDate`,
            'A data de nascimento do dependente é inválida.'
          )
        )
      }
    })
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
