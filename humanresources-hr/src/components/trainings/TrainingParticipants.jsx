import { useEffect, useState } from 'react'

import { getStoredArray } from '../../services/storage'

import {
  addTrainingParticipant,
  deleteTrainingParticipant,
  getTrainingParticipants
} from '../../services/trainingParticipant'

import TrainingProgress from './TrainingProgress'

import TrainingTakeAssessment from './TrainingTakeAssessment'

import TrainingCertificate from './TrainingCertificate'

export default function TrainingParticipants({ training, onClose }) {
  const [employees, setEmployees] = useState([])

  const [participants, setParticipants] = useState([])

  const [selectedEmployee, setSelectedEmployee] = useState('')

  const [selectedParticipant, setSelectedParticipant] = useState(null)

  const [selectedAssessmentParticipant, setSelectedAssessmentParticipant] =
    useState(null)

  const [selectedCertificateParticipant, setSelectedCertificateParticipant] =
    useState(null)

  useEffect(() => {
    setEmployees(getStoredArray('employees'))

    reloadParticipants()
  }, [training.id])

  function reloadParticipants() {
    const storedParticipants = getTrainingParticipants()

    setParticipants(
      storedParticipants.filter(
        (participant) => participant.trainingId === training.id
      )
    )
  }

  function handleAddParticipant(e) {
    e.preventDefault()

    if (!selectedEmployee) {
      alert('Selecione um funcionário.')

      return
    }

    const employeeId = Number(selectedEmployee)

    const alreadyParticipant = participants.some(
      (participant) => participant.employeeId === employeeId
    )

    if (alreadyParticipant) {
      alert('Este funcionário já participa deste treinamento.')

      return
    }

    const employee = employees.find((item) => item.id === employeeId)

    if (!employee) {
      alert('Funcionário não encontrado.')

      return
    }

    const newParticipant = {
      id: Date.now(),

      trainingId: training.id,

      trainingName: training.name,

      employeeId: employee.id,

      employeeName: employee.name,

      enrolledAt: new Date().toISOString(),

      status: 'pending',

      progress: 0,

      completedContents: [],

      score: null,

      assessmentStatus: null,

      attempts: [],

      signature: null,

      certificate: null
    }

    addTrainingParticipant(newParticipant)

    reloadParticipants()

    setSelectedEmployee('')

    alert('Funcionário adicionado ao treinamento!')
  }

  function handleRemoveParticipant(id) {
    const confirmed = window.confirm(
      'Deseja remover este funcionário do treinamento?'
    )

    if (!confirmed) {
      return
    }

    deleteTrainingParticipant(id)

    reloadParticipants()

    if (selectedParticipant?.id === id) {
      setSelectedParticipant(null)
    }

    if (selectedAssessmentParticipant?.id === id) {
      setSelectedAssessmentParticipant(null)
    }

    if (selectedCertificateParticipant?.id === id) {
      setSelectedCertificateParticipant(null)
    }
  }

  function getStatusLabel(status) {
    const labels = {
      pending: 'Pendente',

      in_progress: 'Em andamento',

      completed: 'Concluído',

      failed: 'Reprovado'
    }

    return labels[status] || status
  }

  function getAssessmentStatusLabel(status) {
    const labels = {
      approved: 'Aprovado',

      failed: 'Reprovado'
    }

    return labels[status] || 'Não realizada'
  }

  function canGenerateCertificate(participant) {
    return (
      participant.status === 'completed' &&
      participant.progress >= 100 &&
      participant.assessmentStatus === 'approved'
    )
  }

  const availableEmployees = employees.filter(
    (employee) =>
      employee.active !== false &&
      !participants.some(
        (participant) => participant.employeeId === employee.id
      )
  )

  return (
    <div className="training-modal-overlay">
      <div className="training-content-modal">
        {/* CABEÇALHO */}

        <div className="training-modal-header">
          <div>
            <h2>Participantes</h2>

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

        {/* CONTEÚDO */}

        <div className="training-content-body">
          {/* ADICIONAR PARTICIPANTE */}

          <div className="training-new-content">
            <h3>Adicionar funcionário</h3>

            <form onSubmit={handleAddParticipant}>
              <div className="training-content-form-grid">
                <div className="training-field full">
                  <label>Funcionário</label>

                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                  >
                    <option value="">Selecione um funcionário</option>

                    {availableEmployees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="training-content-form-actions">
                <button type="submit" className="training-primary-button">
                  + Adicionar participante
                </button>
              </div>
            </form>
          </div>

          {/* LISTA */}

          <div className="training-content-list">
            <div className="training-content-section-header">
              <div>
                <h3>Participantes cadastrados</h3>

                <span>{participants.length} participante(s)</span>
              </div>
            </div>

            {participants.length === 0 ? (
              <div className="training-content-empty">
                <span>👥</span>

                <p>Nenhum funcionário foi inscrito neste treinamento.</p>
              </div>
            ) : (
              <div className="training-participants-list">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="training-participant-item"
                  >
                    {/* INFORMAÇÕES */}

                    <div className="training-participant-info">
                      <strong>{participant.employeeName}</strong>

                      <span>
                        Inscrito em:{' '}
                        {new Date(participant.enrolledAt).toLocaleDateString(
                          'pt-BR'
                        )}
                      </span>

                      <span>
                        Avaliação:{' '}
                        {getAssessmentStatusLabel(participant.assessmentStatus)}
                      </span>
                    </div>

                    {/* PROGRESSO */}

                    <div className="training-participant-progress">
                      <div className="training-progress-info">
                        <span>{getStatusLabel(participant.status)}</span>

                        <strong>{participant.progress}%</strong>
                      </div>

                      <div className="training-progress-bar">
                        <div
                          style={{
                            width: `${participant.progress}%`
                          }}
                        />
                      </div>
                    </div>

                    {/* NOTA */}

                    <div className="training-participant-score">
                      <span>Nota</span>

                      <strong>
                        {participant.score !== null &&
                        participant.score !== undefined
                          ? `${participant.score}%`
                          : '--'}
                      </strong>
                    </div>

                    {/* AÇÕES */}

                    <div className="training-content-actions">
                      <button
                        type="button"
                        className="training-content-view"
                        onClick={() => setSelectedParticipant(participant)}
                        title="Acompanhar treinamento"
                      >
                        📊
                      </button>

                      <button
                        type="button"
                        className="training-content-view"
                        onClick={() =>
                          setSelectedAssessmentParticipant(participant)
                        }
                        title="Fazer avaliação"
                      >
                        📝
                      </button>

                      <button
                        type="button"
                        className={
                          canGenerateCertificate(participant)
                            ? 'training-content-certificate'
                            : 'training-content-certificate disabled'
                        }
                        onClick={() => {
                          if (!canGenerateCertificate(participant)) {
                            alert(
                              'O certificado estará disponível após a conclusão dos conteúdos e aprovação na avaliação.'
                            )

                            return
                          }

                          setSelectedCertificateParticipant(participant)
                        }}
                        title={
                          canGenerateCertificate(participant)
                            ? 'Ver certificado'
                            : 'Certificado indisponível'
                        }
                      >
                        🎓
                      </button>

                      <button
                        type="button"
                        className="training-content-delete"
                        onClick={() => handleRemoveParticipant(participant.id)}
                        title="Remover participante"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RODAPÉ */}

        <div className="training-modal-footer">
          <button
            type="button"
            className="training-secondary-button"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      </div>

      {/* ACOMPANHAMENTO */}

      {selectedParticipant && (
        <TrainingProgress
          training={training}
          participant={selectedParticipant}
          onClose={() => {
            setSelectedParticipant(null)

            reloadParticipants()
          }}
        />
      )}

      {/* AVALIAÇÃO */}

      {selectedAssessmentParticipant && (
        <TrainingTakeAssessment
          training={training}
          participant={selectedAssessmentParticipant}
          onClose={() => setSelectedAssessmentParticipant(null)}
          onComplete={() => {
            reloadParticipants()

            setSelectedAssessmentParticipant(null)
          }}
        />
      )}

      {/* CERTIFICADO */}

      {selectedCertificateParticipant && (
        <TrainingCertificate
          training={training}
          participant={selectedCertificateParticipant}
          onClose={() => setSelectedCertificateParticipant(null)}
        />
      )}
    </div>
  )
}
