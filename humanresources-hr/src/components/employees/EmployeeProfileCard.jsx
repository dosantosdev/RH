import { useState } from 'react'

import './employeeProfileCard.css'

import EmployeeForm from './EmployeeForm'

import { hasPermission } from '../../services/permissions'
import { getStoredArray } from '../../services/storage'
import { getPositions } from '../../services/position'

export default function EmployeeProfileCard({ employee, onDelete, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)

  const [edited, setEdited] = useState(employee)

  /*
   * Busca as informações organizacionais para permitir
   * que funcionários antigos também sejam exibidos
   * corretamente.
   */
  const positions = getPositions()
  const roles = getStoredArray('roles')
  const branches = getStoredArray('branches')

  /*
   * Localiza a posição atual do funcionário.
   */
  const selectedPosition = positions.find(
    (position) => Number(position.id) === Number(edited.positionId)
  )

  /*
   * Localiza o cargo.
   *
   * Para funcionários novos:
   * Cargo vem da posição.
   *
   * Para funcionários antigos:
   * usamos roleId.
   */
  const selectedRole = roles.find(
    (role) =>
      Number(role.id) === Number(selectedPosition?.cargoId || edited.roleId)
  )

  /*
   * Localiza a filial.
   *
   * Para funcionários novos:
   * vem da posição.
   *
   * Para funcionários antigos:
   * usamos branchId.
   */
  const selectedBranch = branches.find(
    (branch) =>
      Number(branch.id) ===
      Number(selectedPosition?.branchId || edited.branchId)
  )

  const positionName = selectedPosition?.cargoName || edited.positionName || ''

  const roleName =
    selectedRole?.name || selectedPosition?.cargoName || edited.roleName || ''

  const departmentName =
    selectedPosition?.departmentName || edited.departmentName || ''

  const branchName =
    selectedBranch?.name ||
    selectedPosition?.branchName ||
    edited.branchName ||
    ''

  function handlePhotoChange(e) {
    const file = e.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      return
    }

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
        {/* =========================
            VÍNCULO PROFISSIONAL
        ========================== */}

        <div className="profile-info-section-title">Vínculo profissional</div>

        <div className="info-row">
          <span>Posição</span>

          <strong>{positionName || '-'}</strong>
        </div>

        <div className="info-row">
          <span>Cargo</span>

          <strong>{roleName || '-'}</strong>
        </div>

        <div className="info-row">
          <span>Departamento</span>

          <strong>{departmentName || '-'}</strong>
        </div>

        <div className="info-row">
          <span>Filial</span>

          <strong>{branchName || '-'}</strong>
        </div>

        <div className="info-row">
          <span>Matrícula</span>

          <strong>{edited.registration || '-'}</strong>
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

        {/* =========================
            DADOS PESSOAIS
        ========================== */}

        <div className="profile-info-section-title">Dados pessoais</div>

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

        {/* =========================
            ENDEREÇO
        ========================== */}

        <div className="profile-info-section-title">Endereço</div>

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

        {/* =========================
            CNH
        ========================== */}

        <div className="profile-info-section-title">CNH</div>

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

        {/* =========================
            CERTIFICADOS
        ========================== */}

        <div className="profile-info-section-title">Certificados</div>

        <div className="info-row">
          <span>Certificados</span>

          <strong>
            {edited.certificates?.length
              ? [...edited.certificates].sort().join(', ')
              : '-'}
          </strong>
        </div>
      </div>

      <div className="profile-actions">
        {hasPermission('employees_edit') && (
          <button onClick={() => setIsEditing(true)}>✏️ Editar</button>
        )}

        {hasPermission('employees_delete') && (
          <button onClick={() => onDelete(edited)}>🗑️ Excluir</button>
        )}
      </div>
    </div>
  )
}
