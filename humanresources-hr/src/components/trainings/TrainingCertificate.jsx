import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api'

function formatDate(date) {
  if (!date) return '--'
  const parsedDate = new Date(date)
  if (Number.isNaN(parsedDate.getTime())) return '--'
  return parsedDate.toLocaleDateString('pt-BR')
}

export default function TrainingCertificate({ training, participant, onClose }) {
  const [certificate, setCertificate] = useState(null)
  const [loadingCertificate, setLoadingCertificate] = useState(true)
  const [issuingCertificate, setIssuingCertificate] = useState(false)
  const [certificateError, setCertificateError] = useState('')

  const progress = Number(participant.progress || 0)
  const assessmentApproved = participant.assessmentStatus === 'approved'
  const isCompleted = useMemo(
    () => progress >= 100 && assessmentApproved && participant.status === 'completed',
    [progress, assessmentApproved, participant.status]
  )

  useEffect(() => {
    let cancelled = false
    async function loadCertificate() {
      setLoadingCertificate(true)
      setCertificateError('')
      try {
        const params = new URLSearchParams({
          participantId: String(participant.id),
          trainingId: String(training.id)
        })
        const response = await apiRequest(`/me/training-certificate?${params.toString()}`)
        if (!cancelled) setCertificate(response?.certificate || null)
      } catch (error) {
        if (!cancelled) {
          setCertificateError(error?.message || 'Não foi possível consultar o certificado no servidor.')
        }
      } finally {
        if (!cancelled) setLoadingCertificate(false)
      }
    }
    loadCertificate()
    return () => { cancelled = true }
  }, [participant.id, training.id])

  async function handleGenerateCertificate() {
    if (!isCompleted || issuingCertificate) {
      if (!isCompleted) {
        setCertificateError('O participante ainda não concluiu todos os requisitos do treinamento.')
      }
      return
    }

    setIssuingCertificate(true)
    setCertificateError('')
    try {
      const response = await apiRequest('/me/training-certificate', {
        method: 'POST',
        body: JSON.stringify({
          participantId: participant.id,
          trainingId: training.id
        })
      })
      if (!response?.certificate) {
        throw new Error('O servidor não retornou o certificado emitido.')
      }
      setCertificate(response.certificate)
    } catch (error) {
      setCertificateError(error?.message || 'Não foi possível emitir o certificado.')
    } finally {
      setIssuingCertificate(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="training-modal-overlay">
      <div className="training-content-modal training-certificate-modal">
        <div className="training-modal-header no-print">
          <div>
            <span className="training-progress-kicker">CERTIFICADO</span>
            <h2>Certificado de conclusão</h2>
            <p>{training.name}</p>
          </div>
          <button type="button" className="training-modal-close" onClick={onClose}>×</button>
        </div>

        {certificateError && (
          <div className="training-assessment-empty-screen" role="alert">
            <p>{certificateError}</p>
            <button type="button" className="training-secondary-button" onClick={() => window.location.reload()}>
              Recarregar página
            </button>
          </div>
        )}

        {loadingCertificate && (
          <div className="training-certificate-locked" role="status">
            <h3>Consultando certificado...</h3>
            <p>Estamos verificando o registro no servidor.</p>
          </div>
        )}

        {!loadingCertificate && !isCompleted && !certificate && (
          <div className="training-certificate-locked">
            <div className="training-certificate-locked-icon">🔒</div>
            <h3>Certificado indisponível</h3>
            <p>O participante precisa concluir todos os conteúdos e ser aprovado na avaliação para receber o certificado.</p>
            <div className="certificate-requirements">
              <div><span>Conteúdos</span><strong>{progress}%</strong></div>
              <div>
                <span>Avaliação</span>
                <strong>{participant.assessmentStatus === 'failed' ? 'Reprovada' : 'Não realizada'}</strong>
              </div>
            </div>
          </div>
        )}

        {!loadingCertificate && isCompleted && !certificate && (
          <div className="training-certificate-generate">
            <div className="training-certificate-generate-icon">🎓</div>
            <h3>Treinamento concluído!</h3>
            <p>Todos os requisitos foram cumpridos. O certificado pode ser emitido agora.</p>
            <button
              type="button"
              className="training-primary-button"
              onClick={handleGenerateCertificate}
              disabled={issuingCertificate}
            >
              {issuingCertificate ? 'Emitindo certificado...' : '🎓 Emitir certificado'}
            </button>
          </div>
        )}

        {!loadingCertificate && certificate && (
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
                  <p>com carga horária de <strong>{certificate.workload} hora(s)</strong>.</p>
                  {certificate.score !== null && certificate.score !== undefined && (
                    <p>Aproveitamento: <strong>{certificate.score}%</strong></p>
                  )}
                </div>
                <div className="certificate-details">
                  <div><span>Data de conclusão</span><strong>{formatDate(certificate.completedAt)}</strong></div>
                  <div><span>Data de emissão</span><strong>{formatDate(certificate.issuedAt)}</strong></div>
                </div>
                <div className="certificate-footer">
                  <div><span>Número do certificado</span><strong>{certificate.certificateNumber}</strong></div>
                  <div><span>Documento</span><strong>Certificado de treinamento</strong></div>
                </div>
              </div>
            </div>
            <div className="training-modal-footer no-print">
              <button type="button" className="training-secondary-button" onClick={onClose}>Fechar</button>
              <button type="button" className="training-primary-button" onClick={handlePrint}>🖨️ Imprimir certificado</button>
            </div>
          </div>
        )}

        {!loadingCertificate && !isCompleted && !certificate && (
          <div className="training-modal-footer no-print">
            <button type="button" className="training-secondary-button" onClick={onClose}>Fechar</button>
          </div>
        )}
      </div>
    </div>
  )
}
