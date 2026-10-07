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

/*
 * Busca um certificado pelo participante e pelo treinamento.
 *
 * O treinamento também é considerado para evitar que um
 * certificado de outro treinamento seja exibido.
 *
 * O trainingId continua opcional para manter compatibilidade
 * com chamadas antigas do serviço.
 */
export function getCertificateByParticipant(participantId, trainingId) {
  const certificates = getTrainingCertificates()

  return (
    certificates.find((certificate) => {
      const sameParticipant =
        String(certificate.participantId) === String(participantId)

      if (!sameParticipant) {
        return false
      }

      if (trainingId === undefined || trainingId === null) {
        return true
      }

      return String(certificate.trainingId) === String(trainingId)
    }) || null
  )
}
