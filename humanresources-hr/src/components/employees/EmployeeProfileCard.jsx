import { useState } from 'react'
import './employeeProfileCard.css'
import EmployeeForm from './EmployeeForm'

export default function EmployeeProfileCard({ employee, onDelete, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)

  const [edited, setEdited] = useState(employee)

  function handlePhotoChange(e) {
    const file = e.target.files[0]

    if (!file) return

    const reader = new FileReader()

    reader.onloadend = () => {
      setEdited((prev) => ({
        ...prev,
        photo: reader.result
      }))
    }

    reader.readAsDataURL(file)
  }

  function handleSave() {
    onUpdate(edited)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <EmployeeForm
        formData={edited}
        setFormData={setEdited}
        handleSaveEmployee={handleSave}
        handlePhotoUpload={handlePhotoChange}
        isEditing={true}
      />
    )
  }

  return (
    <div className="employee-profile-card">
      <div className="profile-photo-large">
        {edited.photo ? (
          <img src={edited.photo} alt="Foto" />
        ) : (
          <span>Foto</span>
        )}
      </div>

      <h1>{edited.name}</h1>

      <div className="profile-badge">
        {edited.isActive || edited.active ? '🟢 Ativo' : '🔴 Inativo'}
      </div>

      <div className="profile-info-list">
        <div className="info-row">
          <span>Nascimento</span>

          <strong>{edited.birthDate || '-'}</strong>
        </div>

        <div className="info-row">
          <span>CPF</span>

          <strong>{edited.cpf || '-'}</strong>
        </div>

        <div className="info-row">
          <span>RG</span>

          <strong>{edited.rg || '-'}</strong>
        </div>

        <div className="info-row">
          <span>Estrangeiro</span>

          <strong>
            {edited.isForeigner || edited.foreigner ? 'Sim' : 'Não'}
          </strong>
        </div>

        <div className="info-row">
          <span>CEP</span>

          <strong>{edited.cep || '-'}</strong>
        </div>

        <div className="info-row">
          <span>Cidade</span>

          <strong>{edited.city || '-'}</strong>
        </div>

        <div className="info-row">
          <span>Estado</span>

          <strong>{edited.state || '-'}</strong>
        </div>

        <div className="info-row">
          <span>País</span>

          <strong>{edited.country || '-'}</strong>
        </div>

        <div className="info-row">
          <span>CNH</span>

          <strong>{edited.cnhNumber || '-'}</strong>
        </div>

        <div className="info-row">
          <span>1ª habilitação</span>

          <strong>{edited.cnhFirstDate || edited.cnhDate || '-'}</strong>
        </div>

        <div className="info-row">
          <span>Categorias</span>

          <strong>
            {edited.cnhCategories?.length
              ? [...edited.cnhCategories].sort().join(', ')
              : '-'}
          </strong>
        </div>

        <div className="info-row">
          <span>Certificados</span>

          <strong>
            {edited.certificates?.length
              ? [...edited.certificates].sort().join(', ')
              : '-'}
          </strong>
        </div>

        <div className="info-row">
          <span>Admissão</span>

          <strong>{edited.admissionDate || '-'}</strong>
        </div>

        {!(edited.isActive || edited.active) && (
          <div className="info-row">
            <span>Demissão</span>

            <strong>{edited.dismissalDate || '-'}</strong>
          </div>
        )}
      </div>

      <div className="profile-actions">
        <button onClick={() => setIsEditing(true)}>✏️ Editar</button>

        <button onClick={() => onDelete(edited)}>🗑️ Excluir</button>
      </div>
    </div>
  )
}
