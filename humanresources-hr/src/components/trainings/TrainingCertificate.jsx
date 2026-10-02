import { useState } from 'react'

import {
  addTrainingCertificate,
  getCertificateByParticipant
} from '../../services/trainingCertificate'

export default function TrainingCertificate({
  training,
  participant,
  onClose
}) {
  const [certificate, setCertificate] = useState(() =>
    getCertificateByParticipant(participant.id)
  )

  function handleGenerateCertificate() {
    if (participant.status !== 'completed') {
      alert(
        'O participante ainda não concluiu todos os requisitos do treinamento.'
      )

      return
    }

    const existingCertificate = getCertificateByParticipant(participant.id)

    if (existingCertificate) {
      setCertificate(existingCertificate)

      return
    }

    const newCertificate = {
      id: Date.now(),

      participantId: participant.id,

      employeeId: participant.employeeId,

      employeeName: participant.employeeName,

      trainingId: training.id,

      trainingName: training.name,

      issuedAt: new Date().toISOString(),

      certificateNumber: `CERT-${Date.now()}`,

      score: participant.score,

      workload: training.duration || 0
    }

    addTrainingCertificate(newCertificate)

    setCertificate(newCertificate)
  }

  function handlePrint() {
    window.print()
  }

  const isCompleted = participant.status === 'completed'

  return (
    <div className="training-modal-overlay">
      <div className="training-content-modal training-certificate-modal">
        {/* CABEÇALHO */}

        <div className="training-modal-header no-print">
          <div>
            <h2>Certificado</h2>

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
              O participante precisa concluir os conteúdos e ser aprovado na
              avaliação para receber o certificado.
            </p>

            <div className="certificate-requirements">
              <div>
                <span>Conteúdos</span>

                <strong>{participant.progress || 0}%</strong>
              </div>

              <div>
                <span>Avaliação</span>

                <strong>
                  {participant.assessmentStatus === 'approved'
                    ? 'Aprovado'
                    : participant.assessmentStatus === 'failed'
                      ? 'Reprovado'
                      : 'Não realizada'}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* PRONTO PARA GERAR */}

        {isCompleted && !certificate && (
          <div className="training-certificate-generate">
            <div className="training-certificate-generate-icon">🎓</div>

            <h3>Treinamento concluído!</h3>

            <p>O participante cumpriu todos os requisitos deste treinamento.</p>

            <button
              type="button"
              className="training-primary-button"
              onClick={handleGenerateCertificate}
            >
              Gerar certificado
            </button>
          </div>
        )}

        {/* CERTIFICADO GERADO */}

        {certificate && (
          <div className="training-certificate-area">
            <div className="training-certificate">
              <div className="certificate-border">
                <div className="certificate-header">
                  <span>CERTIFICADO</span>

                  <h1>Certificado de Conclusão</h1>
                </div>

                <div className="certificate-body">
                  <p>Certificamos que</p>

                  <h2>{certificate.employeeName}</h2>

                  <p>concluiu com aproveitamento o treinamento</p>

                  <h3>{certificate.trainingName}</h3>

                  <p>
                    com carga horária de{' '}
                    <strong>{certificate.workload} hora(s)</strong>.
                  </p>

                  {certificate.score !== null && (
                    <p>
                      Aproveitamento: <strong>{certificate.score}%</strong>
                    </p>
                  )}
                </div>

                <div className="certificate-footer">
                  <div>
                    <span>Data de emissão</span>

                    <strong>
                      {new Date(certificate.issuedAt).toLocaleDateString(
                        'pt-BR'
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Certificado</span>

                    <strong>{certificate.certificateNumber}</strong>
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

        {/* RODAPÉ DO CERTIFICADO BLOQUEADO */}

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
