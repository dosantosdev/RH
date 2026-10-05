const STORAGE_KEY = 'medicalCertificates'

/*
 * ============================================================
 * TIPOS DE ATESTADO
 * ============================================================
 */

export const MEDICAL_CERTIFICATE_TYPES = [
  {
    value: 'medical',
    label: 'Atestado médico'
  },
  {
    value: 'dental',
    label: 'Atestado odontológico'
  },
  {
    value: 'occupational',
    label: 'Atestado ocupacional'
  },
  {
    value: 'accompaniment',
    label: 'Acompanhamento de familiar'
  },
  {
    value: 'other',
    label: 'Outro'
  }
]

/*
 * ============================================================
 * STATUS
 * ============================================================
 */

export const MEDICAL_CERTIFICATE_STATUSES = [
  {
    value: 'pending',
    label: 'Pendente'
  },
  {
    value: 'approved',
    label: 'Aprovado'
  },
  {
    value: 'rejected',
    label: 'Recusado'
  },
  {
    value: 'cancelled',
    label: 'Cancelado'
  }
]

/*
 * ============================================================
 * UTILITÁRIOS
 * ============================================================
 */

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/*
 * ============================================================
 * STORAGE
 * ============================================================
 */

export function getMedicalCertificates() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)

    if (!stored) {
      return []
    }

    const parsed = JSON.parse(stored)

    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/*
 * ============================================================
 * BUSCAR POR FUNCIONÁRIO
 * ============================================================
 */

export function getEmployeeMedicalCertificates(employeeId) {
  return getMedicalCertificates().filter(
    (item) => Number(item.employeeId) === Number(employeeId)
  )
}

/*
 * ============================================================
 * ADICIONAR
 * ============================================================
 */

export function addMedicalCertificate(certificate) {
  const certificates = getMedicalCertificates()

  const newCertificate = {
    ...certificate,
    id: certificate.id || generateId(),
    createdAt: certificate.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const updated = [...certificates, newCertificate]

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

  return newCertificate
}

/*
 * ============================================================
 * ATUALIZAR
 * ============================================================
 */

export function updateMedicalCertificate(certificate) {
  const certificates = getMedicalCertificates()

  const updated = certificates.map((item) =>
    String(item.id) === String(certificate.id)
      ? {
          ...item,
          ...certificate,
          updatedAt: new Date().toISOString()
        }
      : item
  )

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

  return updated
}

/*
 * ============================================================
 * EXCLUIR
 * ============================================================
 */

export function deleteMedicalCertificate(certificateId) {
  const certificates = getMedicalCertificates()

  const updated = certificates.filter(
    (item) => String(item.id) !== String(certificateId)
  )

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

  return updated
}

/*
 * ============================================================
 * VERIFICAR SE EXISTE ATESTADO NO DIA
 * ============================================================
 */

export function getApprovedMedicalCertificatesForDate(employeeId, date) {
  return getEmployeeMedicalCertificates(employeeId).filter((certificate) => {
    if (certificate.status !== 'approved') {
      return false
    }

    return date >= certificate.startDate && date <= certificate.endDate
  })
}

/*
 * ============================================================
 * VERIFICAR SE O DIA ESTÁ JUSTIFICADO
 * ============================================================
 */

export function hasApprovedMedicalCertificateForDate(employeeId, date) {
  return getApprovedMedicalCertificatesForDate(employeeId, date).length > 0
}
