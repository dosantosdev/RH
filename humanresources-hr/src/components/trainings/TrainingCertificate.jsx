import { useMemo, useState } from 'react'

import {
  addTrainingCertificate,
  getCertificateByParticipant
} from '../../services/trainingCertificate'

function formatDate(date) {
  if (!date) {
    return '--'
  }

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return '--'
  }

  return parsedDate.toLocaleDateString('pt-BR')
}

function createCertificateNumber() {
  const timestamp = Date.now()
  const randomPart = Math.floor(Math.random() * 9000) + 1000

  return `CERT-${timestamp}-${randomPart}`
}

export default function TrainingCertificate({
  training,
  participant,
  onClose
}) {
  const [certificate, setCertificate] = useState(() =>
    getCertificateByParticipant(participant.id)
  )

  const progress = Number(participant.progress || 0)

  const assessmentApproved = participant.assessmentStatus === 'approved'

  /*
   * O certificado só pode ser emitido quando:
   *
   * 1. O treinamento estiver 100% concluído.
   * 2. A avaliação estiver aprovada.
   */
  const isCompleted = useMemo(
    () => progress >= 100 && assessmentApproved,
    [progress, assessmentApproved]
  )

  function handleGenerateCertificate() {
    if (!isCompleted) {
      alert(
        'O participante ainda não concluiu todos os requisitos do treinamento.'
      )

      return
    }

    /*
     * Antes de criar um novo certificado,
     * verificamos se já existe um emitido para esse participante.
     *
     * Isso permite que o funcionário volte posteriormente
     * e faça uma segunda via sem gerar outro número.
     */
    const existingCertificate = getCertificateByParticipant(participant.id)

    if (existingCertificate) {
      setCertificate(existingCertificate)

      return
    }

    const issuedAt = new Date().toISOString()

    const newCertificate = {
      id: Date.now(),

      participantId: participant.id,

      employeeId: participant.employeeId,

      employeeName: participant.employeeName,

      trainingId: training.id,

      trainingName: training.name,

      issuedAt,

      completedAt: participant.completedAt || issuedAt,

      certificateNumber: createCertificateNumber(),

      score:
        participant.score !== null && participant.score !== undefined
          ? Number(participant.score)
          : null,

      workload: Number(training.duration || 0)
    }

    addTrainingCertificate(newCertificate)

    setCertificate(newCertificate)
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="training-modal-overlay">
      <div className="training-content-modal training-certificate-modal">
        {/* CABEÇALHO */}

        <div className="training-modal-header no-print">
          <div>
            <span className="training-progress-kicker">CERTIFICADO</span>

            <h2>Certificado de conclusão</h2>

            <p>{training.name}</p>
          </div>

          <button
            type="button"
            className="training-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* CERTIFICADO BLOQUEADO */}

        {!isCompleted && !certificate && (
          <div className="training-certificate-locked">
            <div className="training-certificate-locked-icon">🔒</div>

            <h3>Certificado indisponível</h3>

            <p>
              O participante precisa concluir todos os conteúdos e ser aprovado
              na avaliação para receber o certificado.
            </p>

            <div className="certificate-requirements">
              <div>
                <span>Conteúdos</span>

                <strong>{progress}%</strong>
              </div>

              <div>
                <span>Avaliação</span>

                <strong>
                  {participant.assessmentStatus === 'failed'
                    ? 'Reprovada'
                    : 'Não realizada'}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* EMISSÃO DO CERTIFICADO */}

        {isCompleted && !certificate && (
          <div className="training-certificate-generate">
            <div className="training-certificate-generate-icon">🎓</div>

            <h3>Treinamento concluído!</h3>

            <p>
              Todos os requisitos foram cumpridos. O certificado pode ser
              emitido agora.
            </p>

            <button
              type="button"
              className="training-primary-button"
              onClick={handleGenerateCertificate}
            >
              🎓 Emitir certificado
            </button>
          </div>
        )}

        {/* CERTIFICADO EMITIDO */}

        {certificate && (
          <div className="training-certificate-area">
            <div className="training-certificate">
              <div className="certificate-border">
                {/* CABEÇALHO DO CERTIFICADO */}

                <div className="certificate-header">
                  <span>CERTIFICADO</span>

                  <h1>Certificado de Conclusão</h1>
                </div>

                {/* CORPO */}

                <div className="certificate-body">
                  <p>Certificamos que</p>

                  <h2>{certificate.employeeName}</h2>

                  <p>concluiu com aproveitamento o treinamento</p>

                  <h3>{certificate.trainingName}</h3>

                  <p>
                    com carga horária de{' '}
                    <strong>{certificate.workload} hora(s)</strong>.
                  </p>

                  {certificate.score !== null &&
                    certificate.score !== undefined && (
                      <p>
                        Aproveitamento: <strong>{certificate.score}%</strong>
                      </p>
                    )}
                </div>

                {/* DATAS */}

                <div className="certificate-details">
                  <div>
                    <span>Data de conclusão</span>

                    <strong>{formatDate(certificate.completedAt)}</strong>
                  </div>

                  <div>
                    <span>Data de emissão</span>

                    <strong>{formatDate(certificate.issuedAt)}</strong>
                  </div>
                </div>

                {/* IDENTIFICAÇÃO */}

                <div className="certificate-footer">
                  <div>
                    <span>Número do certificado</span>

                    <strong>{certificate.certificateNumber}</strong>
                  </div>

                  <div>
                    <span>Documento</span>

                    <strong>Certificado de treinamento</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* AÇÕES */}

            <div className="training-modal-footer no-print">
              <button
                type="button"
                className="training-secondary-button"
                onClick={onClose}
              >
                Fechar
              </button>

              <button
                type="button"
                className="training-primary-button"
                onClick={handlePrint}
              >
                🖨️ Imprimir certificado
              </button>
            </div>
          </div>
        )}

        {/* RODAPÉ QUANDO BLOQUEADO */}

        {!isCompleted && !certificate && (
          <div className="training-modal-footer no-print">
            <button
              type="button"
              className="training-secondary-button"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
