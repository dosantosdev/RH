import { useEffect, useState } from 'react'

import { getStoredArray } from '../../services/storage'

export default function TrainingParticipantDetails({
  participant,
  mode = 'view',
  onClose,
  onSave
}) {
  const [employees, setEmployees] = useState([])

  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    participant.employeeId
  )

  const isEditing = mode === 'edit'

  useEffect(() => {
    setEmployees(getStoredArray('employees'))
  }, [])

  useEffect(() => {
    setSelectedEmployeeId(participant.employeeId)
  }, [participant.employeeId])

  const employee = employees.find(
    (item) => Number(item.id) === Number(participant.employeeId)
  )

  const selectedEmployee = employees.find(
    (item) => Number(item.id) === Number(selectedEmployeeId)
  )

  function handleSave() {
    if (!selectedEmployee) {
      alert('Selecione um funcionário.')

      return
    }

    const updatedParticipant = {
      ...participant,

      employeeId: selectedEmployee.id,

      employeeName: selectedEmployee.name
    }

    onSave(updatedParticipant)

    onClose()
  }

  return (
    <div className="training-modal-overlay">
      <div
        className="training-content-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABEÇALHO */}

        <div className="training-modal-header">
          <div>
            <h2>
              {isEditing ? 'Editar participante' : 'Dados do participante'}
            </h2>

            <p>{participant.trainingName}</p>
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
          <div className="training-content-list">
            <div className="training-content-section-header">
              <div>
                <h3>Funcionário</h3>

                <span>Informações vinculadas ao participante.</span>
              </div>
            </div>

            {isEditing ? (
              <div className="training-new-content">
                <div className="training-content-form-grid">
                  <div className="training-field full">
                    <label>Funcionário</label>

                    <select
                      value={selectedEmployeeId || ''}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    >
                      <option value="">Selecione um funcionário</option>

                      {employees
                        .filter(
                          (item) =>
                            item.active !== false ||
                            Number(item.id) === Number(participant.employeeId)
                        )
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="training-view-summary">
                <div className="training-view-value">
                  <span>Nome</span>

                  <strong>
                    {employee?.name || participant.employeeName || '-'}
                  </strong>
                </div>

                <div className="training-view-value">
                  <span>E-mail</span>

                  <strong>{employee?.email || '-'}</strong>
                </div>

                <div className="training-view-value">
                  <span>Telefone</span>

                  <strong>{employee?.phone || '-'}</strong>
                </div>

                <div className="training-view-value">
                  <span>Matrícula</span>

                  <strong>{employee?.registration || '-'}</strong>
                </div>

                <div className="training-view-value">
                  <span>Cargo</span>

                  <strong>
                    {employee?.roleName || employee?.positionName || '-'}
                  </strong>
                </div>

                <div className="training-view-value">
                  <span>Departamento</span>

                  <strong>{employee?.departmentName || '-'}</strong>
                </div>

                <div className="training-view-value">
                  <span>Filial</span>

                  <strong>{employee?.branchName || '-'}</strong>
                </div>

                <div className="training-view-value">
                  <span>Inscrito em</span>

                  <strong>
                    {participant.enrolledAt
                      ? new Date(participant.enrolledAt).toLocaleDateString(
                          'pt-BR'
                        )
                      : '-'}
                  </strong>
                </div>
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

          {isEditing && (
            <button
              type="button"
              className="training-primary-button"
              onClick={handleSave}
            >
              Salvar alterações
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
