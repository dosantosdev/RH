import { useEffect, useState } from 'react'

import { getStoredArray } from '../../services/storage'

import {
  addTrainingParticipant,
  deleteTrainingParticipant,
  getTrainingParticipants,
  updateTrainingParticipant
} from '../../services/trainingParticipant'

import TrainingParticipantDetails from './TrainingParticipantDetails'

export default function TrainingParticipants({ training, onClose }) {
  const [employees, setEmployees] = useState([])

  const [participants, setParticipants] = useState([])

  const [selectedEmployee, setSelectedEmployee] = useState('')

  const [selectedParticipant, setSelectedParticipant] = useState(null)

  const [detailsMode, setDetailsMode] = useState('view')

  useEffect(() => {
    setEmployees(getStoredArray('employees'))

    reloadParticipants()
  }, [training.id])

  function reloadParticipants() {
    const storedParticipants = getTrainingParticipants()

    setParticipants(
      storedParticipants.filter(
        (participant) => Number(participant.trainingId) === Number(training.id)
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
      (participant) => Number(participant.employeeId) === employeeId
    )

    if (alreadyParticipant) {
      alert('Este funcionário já participa deste treinamento.')

      return
    }

    const employee = employees.find((item) => Number(item.id) === employeeId)

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

      bestScore: null,

      minimumScore: Number(training.minimumScore) || 0,

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
  }

  function handleViewParticipant(participant) {
    setDetailsMode('view')

    setSelectedParticipant(participant)
  }

  function handleEditParticipant(participant) {
    setDetailsMode('edit')

    setSelectedParticipant(participant)
  }

  function handleUpdateParticipant(updatedParticipant) {
    updateTrainingParticipant(updatedParticipant)

    reloadParticipants()

    setSelectedParticipant(updatedParticipant)
  }

  const availableEmployees = employees.filter(
    (employee) =>
      employee.active !== false &&
      !participants.some(
        (participant) => Number(participant.employeeId) === Number(employee.id)
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
          {/* ADICIONAR */}

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

          {/* PARTICIPANTES */}

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
                    style={{
                      gridTemplateColumns: '1fr auto'
                    }}
                  >
                    <div className="training-participant-info">
                      <strong>{participant.employeeName}</strong>

                      <span>
                        Inscrito em:{' '}
                        {participant.enrolledAt
                          ? new Date(participant.enrolledAt).toLocaleDateString(
                              'pt-BR'
                            )
                          : '-'}
                      </span>
                    </div>

                    <div className="training-content-actions">
                      {/* VISUALIZAR */}

                      <button
                        type="button"
                        className="training-content-view"
                        onClick={() => handleViewParticipant(participant)}
                        title="Visualizar dados"
                      >
                        👁️
                      </button>

                      {/* EDITAR */}

                      <button
                        type="button"
                        className="training-content-view"
                        onClick={() => handleEditParticipant(participant)}
                        title="Editar participante"
                      >
                        ✏️
                      </button>

                      {/* EXCLUIR */}

                      <button
                        type="button"
                        className="training-content-delete"
                        onClick={() => handleRemoveParticipant(participant.id)}
                        title="Excluir participante"
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

      {/* DADOS / EDIÇÃO DO PARTICIPANTE */}

      {selectedParticipant && (
        <TrainingParticipantDetails
          participant={selectedParticipant}
          mode={detailsMode}
          onClose={() => setSelectedParticipant(null)}
          onSave={handleUpdateParticipant}
        />
      )}
    </div>
  )
}
