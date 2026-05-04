import { useState } from 'react'

export default function EmployeeDetails({
  employee,
  onBack,
  onDelete,
  onUpdate
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [edited, setEdited] = useState(employee)

  function handleChange(e) {
    const { name, value, type, checked } = e.target

    setEdited((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  function handleSave() {
    onUpdate(edited)
    setIsEditing(false)
  }

  return (
    <div className="employee-details">
      <button className="back-btn" onClick={onBack}>
        ← Voltar
      </button>

      {/* NOME */}
      {isEditing ? (
        <input
          name="name"
          value={edited.name}
          onChange={handleChange}
          className="edit-title"
        />
      ) : (
        <h3>{employee.name}</h3>
      )}

      {/* BOTÕES */}
      <div className="actions">
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)}>✏️ Editar</button>
        ) : (
          <button onClick={handleSave}>💾 Salvar</button>
        )}

        <button onClick={() => onDelete(employee)}>🗑️ Excluir</button>
      </div>

      <div className="details-grid">
        {/* CPF */}
        <div className="detail-item">
          <span>CPF</span>
          {isEditing ? (
            <input name="cpf" value={edited.cpf} onChange={handleChange} />
          ) : (
            <strong>{employee.cpf || '-'}</strong>
          )}
        </div>

        {/* RG */}
        <div className="detail-item">
          <span>RG</span>
          {isEditing ? (
            <input name="rg" value={edited.rg} onChange={handleChange} />
          ) : (
            <strong>{employee.rg || '-'}</strong>
          )}
        </div>

        {/* NASCIMENTO */}
        <div className="detail-item">
          <span>Data de nascimento</span>
          {isEditing ? (
            <input
              name="birthDate"
              value={edited.birthDate}
              onChange={handleChange}
            />
          ) : (
            <strong>{employee.birthDate || '-'}</strong>
          )}
        </div>

        {/* ESTRANGEIRO */}
        <div className="detail-item">
          <span>Estrangeiro</span>
          {isEditing ? (
            <input
              type="checkbox"
              name="foreigner"
              checked={edited.foreigner}
              onChange={handleChange}
            />
          ) : (
            <strong>{employee.foreigner ? 'Sim' : 'Não'}</strong>
          )}
        </div>

        {/* CEP */}
        <div className="detail-item">
          <span>CEP</span>
          {isEditing ? (
            <input name="cep" value={edited.cep} onChange={handleChange} />
          ) : (
            <strong>{employee.cep || '-'}</strong>
          )}
        </div>

        {/* CIDADE */}
        <div className="detail-item">
          <span>Cidade</span>
          {isEditing ? (
            <input name="city" value={edited.city} onChange={handleChange} />
          ) : (
            <strong>{employee.city || '-'}</strong>
          )}
        </div>

        {/* ESTADO */}
        <div className="detail-item">
          <span>Estado</span>
          {isEditing ? (
            <input name="state" value={edited.state} onChange={handleChange} />
          ) : (
            <strong>{employee.state || '-'}</strong>
          )}
        </div>

        {/* PAÍS */}
        <div className="detail-item">
          <span>País</span>
          {isEditing ? (
            <input
              name="country"
              value={edited.country}
              onChange={handleChange}
            />
          ) : (
            <strong>{employee.country || '-'}</strong>
          )}
        </div>

        {/* CNH */}
        <div className="detail-item">
          <span>CNH</span>
          {isEditing ? (
            <input
              name="cnhNumber"
              value={edited.cnhNumber}
              onChange={handleChange}
            />
          ) : (
            <strong>{employee.cnhNumber || '-'}</strong>
          )}
        </div>

        {/* DATA CNH */}
        <div className="detail-item">
          <span>1ª habilitação</span>
          {isEditing ? (
            <input
              name="cnhDate"
              value={edited.cnhDate}
              onChange={handleChange}
            />
          ) : (
            <strong>{employee.cnhDate || '-'}</strong>
          )}
        </div>

        {/* CATEGORIAS */}
        <div className="detail-item">
          <span>Categorias CNH</span>
          <strong>
            {employee.cnhCategories?.length
              ? employee.cnhCategories.join(', ')
              : '-'}
          </strong>
        </div>

        {/* CERTIFICADOS */}
        <div className="detail-item">
          <span>Certificados</span>
          <strong>
            {employee.certificates?.length
              ? employee.certificates.join(', ')
              : '-'}
          </strong>
        </div>

        {/* STATUS */}
        <div className="detail-item">
          <span>Status</span>
          {isEditing ? (
            <input
              type="checkbox"
              name="active"
              checked={edited.active}
              onChange={handleChange}
            />
          ) : (
            <strong>{employee.active ? '🟢 Ativo' : '🔴 Inativo'}</strong>
          )}
        </div>

        {/* ADMISSÃO */}
        <div className="detail-item">
          <span>Data de admissão</span>
          {isEditing ? (
            <input
              name="admissionDate"
              value={edited.admissionDate}
              onChange={handleChange}
            />
          ) : (
            <strong>{employee.admissionDate || '-'}</strong>
          )}
        </div>

        {/* DEMISSÃO (CONDICIONAL) */}
        {!employee.active && (
          <div className="detail-item">
            <span>Data de demissão</span>
            {isEditing ? (
              <input
                name="dismissalDate"
                value={edited.dismissalDate}
                onChange={handleChange}
              />
            ) : (
              <strong>{employee.dismissalDate || '-'}</strong>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
