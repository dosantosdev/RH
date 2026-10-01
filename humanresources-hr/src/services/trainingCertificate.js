import { getStoredArray, setStored } from './storage'

export function getTrainingCertificates() {
  return getStoredArray('trainingCertificates')
}

export function addTrainingCertificate(certificate) {
  const certificates = getTrainingCertificates()

  const updatedCertificates = [...certificates, certificate]

  setStored('trainingCertificates', updatedCertificates)

  return updatedCertificates
}

export function getCertificateByParticipant(participantId) {
  const certificates = getTrainingCertificates()

  return (
    certificates.find(
      (certificate) => certificate.participantId === participantId
    ) || null
  )
}
