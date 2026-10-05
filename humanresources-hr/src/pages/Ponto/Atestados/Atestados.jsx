import { useMemo, useState } from 'react'

import { getEmployees } from '../../../services/employee'
import { getStoredArray } from '../../../services/storage'

import {
  addMedicalCertificate,
  deleteMedicalCertificate,
  getMedicalCertificates,
  MEDICAL_CERTIFICATE_STATUSES,
  MEDICAL_CERTIFICATE_TYPES,
  updateMedicalCertificate
} from '../../../services/medicalCertificates'

import './atestados.css'

export default function Atestados() {
  const [employees] = useState(() => getEmployees())

  const [branches] = useState(() => getStoredArray('branches'))

  const [certificates, setCertificates] = useState(() =>
    getMedicalCertificates()
  )

  const [search, setSearch] = useState('')

  const [selectedBranchId, setSelectedBranchId] = useState('')

  const [selectedStatus, setSelectedStatus] = useState('')

  const [showModal, setShowModal] = useState(false)

  const [editingCertificate, setEditingCertificate] = useState(null)

  const [form, setForm] = useState(createInitialForm())

  const [formError, setFormError] = useState('')

  /*
   * ============================================================
   * FUNCIONÁRIOS ATIVOS
   * ============================================================
   */

  const activeEmployees = useMemo(() => {
    return employees.filter((employee) => employee.active !== false)
  }, [employees])

  /*
   * ============================================================
   * ATESTADOS ENRIQUECIDOS
   * ============================================================
   */

  const certificateRows = useMemo(() => {
    return certificates
      .map((certificate) => {
        const employee = employees.find(
          (item) => Number(item.id) === Number(certificate.employeeId)
        )

        const branch = branches.find(
          (item) => Number(item.id) === Number(employee?.branchId)
        )

        return {
          ...certificate,
          employee,
          branch
        }
      })
      .filter((item) => item.employee)
      .filter((item) => {
        if (
          selectedBranchId &&
          String(item.employee.branchId) !== String(selectedBranchId)
        ) {
          return false
        }

        if (selectedStatus && item.status !== selectedStatus) {
          return false
        }

        const term = search.trim().toLowerCase()

        if (!term) {
          return true
        }

        return (
          item.employee.name?.toLowerCase().includes(term) ||
          item.employee.registration?.toLowerCase().includes(term) ||
          item.doctorName?.toLowerCase().includes(term) ||
          item.institution?.toLowerCase().includes(term)
        )
      })
      .sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)))
  }, [
    certificates,
    employees,
    branches,
    search,
    selectedBranchId,
    selectedStatus
  ])

  /*
   * ============================================================
   * RESUMO
   * ============================================================
   */

  const summary = useMemo(() => {
    return certificates.reduce(
      (result, certificate) => {
        result.total += 1

        if (certificate.status === 'approved') {
          result.approved += 1
        }

        if (certificate.status === 'pending') {
          result.pending += 1
        }

        if (certificate.status === 'rejected') {
          result.rejected += 1
        }

        result.days += Number(certificate.days || 0)

        return result
      },
      {
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        days: 0
      }
    )
  }, [certificates])

  /*
   * ============================================================
   * ABRIR NOVO
   * ============================================================
   */

  function openCreateModal() {
    setEditingCertificate(null)

    setForm(createInitialForm())

    setFormError('')

    setShowModal(true)
  }

  /*
   * ============================================================
   * ABRIR EDIÇÃO
   * ============================================================
   */

  function openEditModal(certificate) {
    setEditingCertificate(certificate)

    setForm({
      employeeId: String(certificate.employeeId),
      type: certificate.type || 'medical',
      startDate: certificate.startDate || '',
      endDate: certificate.endDate || '',
      doctorName: certificate.doctorName || '',
      professionalRegistration: certificate.professionalRegistration || '',
      institution: certificate.institution || '',
      status: certificate.status || 'pending',
      reason: certificate.reason || '',
      documentName: certificate.documentName || '',
      documentData: certificate.documentData || ''
    })

    setFormError('')

    setShowModal(true)
  }

  /*
   * ============================================================
   * FECHAR MODAL
   * ============================================================
   */

  function closeModal() {
    setShowModal(false)

    setEditingCertificate(null)

    setForm(createInitialForm())

    setFormError('')
  }

  /*
   * ============================================================
   * ALTERAÇÃO DO FORMULÁRIO
   * ============================================================
   */

  function handleFormChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value
    }))
  }

  /*
   * ============================================================
   * DOCUMENTO
   * ============================================================
   */

  function handleDocumentChange(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      setForm((current) => ({
        ...current,
        documentName: file.name,
        documentData: reader.result
      }))
    }

    reader.readAsDataURL(file)
  }

  /*
   * ============================================================
   * SALVAR
   * ============================================================
   */

  function handleSubmit(event) {
    event.preventDefault()

    setFormError('')

    if (!form.employeeId) {
      setFormError('Selecione um funcionário.')

      return
    }

    if (!form.startDate || !form.endDate) {
      setFormError('Informe a data inicial e a data final do atestado.')

      return
    }

    if (form.startDate > form.endDate) {
      setFormError('A data final não pode ser anterior à data inicial.')

      return
    }

    const days = calculateDays(form.startDate, form.endDate)

    const employee = employees.find(
      (item) => Number(item.id) === Number(form.employeeId)
    )

    const branchId = employee?.branchId || ''

    const certificateData = {
      employeeId: Number(form.employeeId),
      branchId,
      type: form.type,
      startDate: form.startDate,
      endDate: form.endDate,
      days,
      doctorName: form.doctorName.trim(),
      professionalRegistration: form.professionalRegistration.trim(),
      institution: form.institution.trim(),
      status: form.status,
      reason: form.reason.trim(),
      documentName: form.documentName,
      documentData: form.documentData
    }

    if (editingCertificate) {
      updateMedicalCertificate({
        ...certificateData,
        id: editingCertificate.id
      })
    } else {
      addMedicalCertificate(certificateData)
    }

    setCertificates(getMedicalCertificates())

    closeModal()
  }

  /*
   * ============================================================
   * EXCLUSÃO
   * ============================================================
   */

  function handleDelete(certificateId) {
    const confirmed = window.confirm('Deseja realmente excluir este atestado?')

    if (!confirmed) {
      return
    }

    deleteMedicalCertificate(certificateId)

    setCertificates(getMedicalCertificates())
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="atestados-page">
      <header className="atestados-header">
        <div>
          <span className="atestados-kicker">PONTO</span>

          <h1>Atestados</h1>

          <p>
            Cadastre e acompanhe os atestados dos funcionários, seus períodos e
            respectivas justificativas.
          </p>
        </div>

        <button
          type="button"
          className="atestados-primary-button"
          onClick={openCreateModal}
        >
          + Novo atestado
        </button>
      </header>

      <section className="atestados-summary">
        <SummaryCard label="Total de atestados" value={summary.total} />

        <SummaryCard
          label="Aprovados"
          value={summary.approved}
          variant="positive"
        />

        <SummaryCard
          label="Pendentes"
          value={summary.pending}
          variant="warning"
        />

        <SummaryCard label="Dias abrangidos" value={summary.days} />
      </section>

      <section className="atestados-filter-card">
        <div className="atestados-filter">
          <label htmlFor="atestados-search">Buscar</label>

          <input
            id="atestados-search"
            type="search"
            placeholder="Funcionário, médico ou instituição..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="atestados-filter">
          <label htmlFor="atestados-branch">Filial</label>

          <select
            id="atestados-branch"
            value={selectedBranchId}
            onChange={(event) => setSelectedBranchId(event.target.value)}
          >
            <option value="">Todas as filiais</option>

            {branches
              .filter((branch) => branch.active !== false)
              .sort((a, b) =>
                String(a.name || '').localeCompare(
                  String(b.name || ''),
                  'pt-BR'
                )
              )
              .map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
          </select>
        </div>

        <div className="atestados-filter">
          <label htmlFor="atestados-status">Status</label>

          <select
            id="atestados-status"
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
          >
            <option value="">Todos os status</option>

            {MEDICAL_CERTIFICATE_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="atestados-card">
        <div className="atestados-card-header">
          <div>
            <span>REGISTROS</span>

            <h2>Atestados cadastrados</h2>

            <p>
              Consulte os documentos e períodos registrados para cada
              funcionário.
            </p>
          </div>

          <strong>
            {certificateRows.length}{' '}
            {certificateRows.length === 1 ? 'registro' : 'registros'}
          </strong>
        </div>

        {certificateRows.length === 0 ? (
          <div className="atestados-empty">
            <span>📄</span>

            <h3>Nenhum atestado encontrado</h3>

            <p>Não existem atestados para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="atestados-list">
            {certificateRows.map((certificate) => (
              <CertificateCard
                key={certificate.id}
                certificate={certificate}
                onEdit={() => openEditModal(certificate)}
                onDelete={() => handleDelete(certificate.id)}
              />
            ))}
          </div>
        )}
      </section>

      {showModal && (
        <CertificateModal
          form={form}
          isEditing={Boolean(editingCertificate)}
          formError={formError}
          employees={activeEmployees}
          onChange={handleFormChange}
          onDocumentChange={handleDocumentChange}
          onSubmit={handleSubmit}
          onClose={closeModal}
        />
      )}
    </div>
  )
}

/*
 * ============================================================
 * CARD DE RESUMO
 * ============================================================
 */

function SummaryCard({ label, value, variant = '' }) {
  return (
    <article className={`atestados-summary-card ${variant}`}>
      <span>{label}</span>

      <strong>{value}</strong>
    </article>
  )
}

/*
 * ============================================================
 * CARD DO ATESTADO
 * ============================================================
 */

function CertificateCard({ certificate, onEdit, onDelete }) {
  return (
    <article className="atestados-certificate-card">
      <div className="atestados-certificate-header">
        <div>
          <span>{getTypeLabel(certificate.type)}</span>

          <h3>{certificate.employee.name}</h3>

          <p>
            {certificate.branch?.name ||
              certificate.employee.branchName ||
              'Filial não informada'}
          </p>
        </div>

        <span className={`atestados-status ${certificate.status}`}>
          {getStatusLabel(certificate.status)}
        </span>
      </div>

      <div className="atestados-certificate-info">
        <div>
          <span>Período</span>

          <strong>
            {formatDisplayDate(certificate.startDate)} →{' '}
            {formatDisplayDate(certificate.endDate)}
          </strong>
        </div>

        <div>
          <span>Duração</span>

          <strong>
            {certificate.days} {certificate.days === 1 ? 'dia' : 'dias'}
          </strong>
        </div>

        <div>
          <span>Profissional</span>

          <strong>{certificate.doctorName || 'Não informado'}</strong>
        </div>

        <div>
          <span>Registro</span>

          <strong>
            {certificate.professionalRegistration || 'Não informado'}
          </strong>
        </div>
      </div>

      {certificate.institution && (
        <div className="atestados-certificate-detail">
          <span>Instituição</span>

          <strong>{certificate.institution}</strong>
        </div>
      )}

      {certificate.reason && (
        <div className="atestados-certificate-detail">
          <span>Observação</span>

          <p>{certificate.reason}</p>
        </div>
      )}

      {certificate.documentName && (
        <div className="atestados-document">
          <span>Documento</span>

          <strong>{certificate.documentName}</strong>
        </div>
      )}

      <footer className="atestados-certificate-footer">
        <button type="button" onClick={onEdit}>
          Editar
        </button>

        <button type="button" className="danger" onClick={onDelete}>
          Excluir
        </button>
      </footer>
    </article>
  )
}

/*
 * ============================================================
 * MODAL
 * ============================================================
 */

function CertificateModal({
  form,
  isEditing,
  formError,
  employees,
  onChange,
  onDocumentChange,
  onSubmit,
  onClose
}) {
  return (
    <div
      className="atestados-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="atestados-modal">
        <header className="atestados-modal-header">
          <div>
            <span>{isEditing ? 'EDITAR ATESTADO' : 'NOVO ATESTADO'}</span>

            <h2>{isEditing ? 'Editar atestado' : 'Cadastrar atestado'}</h2>

            <p>Informe o período e os dados do documento.</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>

        <form onSubmit={onSubmit}>
          <div className="atestados-form">
            <label className="atestados-form-full">
              <span>Funcionário</span>

              <select
                name="employeeId"
                value={form.employeeId}
                onChange={onChange}
                required
              >
                <option value="">Selecione um funcionário</option>

                {employees
                  .sort((a, b) =>
                    String(a.name || '').localeCompare(
                      String(b.name || ''),
                      'pt-BR'
                    )
                  )
                  .map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              <span>Tipo de atestado</span>

              <select name="type" value={form.type} onChange={onChange}>
                {MEDICAL_CERTIFICATE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Status</span>

              <select name="status" value={form.status} onChange={onChange}>
                {MEDICAL_CERTIFICATE_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Data inicial</span>

              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={onChange}
                required
              />
            </label>

            <label>
              <span>Data final</span>

              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={onChange}
                required
              />
            </label>

            <label>
              <span>Médico / profissional</span>

              <input
                type="text"
                name="doctorName"
                value={form.doctorName}
                onChange={onChange}
                placeholder="Nome do profissional"
              />
            </label>

            <label>
              <span>Registro profissional</span>

              <input
                type="text"
                name="professionalRegistration"
                value={form.professionalRegistration}
                onChange={onChange}
                placeholder="Ex.: CRM 12345"
              />
            </label>

            <label className="atestados-form-full">
              <span>Instituição de saúde</span>

              <input
                type="text"
                name="institution"
                value={form.institution}
                onChange={onChange}
                placeholder="Hospital, clínica, consultório..."
              />
            </label>

            <label className="atestados-form-full">
              <span>Documento</span>

              <input
                type="file"
                accept="image/*,.pdf"
                onChange={onDocumentChange}
              />

              {form.documentName && (
                <small>Arquivo selecionado: {form.documentName}</small>
              )}
            </label>

            <label className="atestados-form-full">
              <span>Observação</span>

              <textarea
                name="reason"
                value={form.reason}
                onChange={onChange}
                placeholder="Observações sobre o atestado..."
                rows="4"
              />
            </label>
          </div>

          {formError && <div className="atestados-form-error">{formError}</div>}

          <footer className="atestados-modal-footer">
            <button type="button" onClick={onClose}>
              Cancelar
            </button>

            <button type="submit" className="primary">
              {isEditing ? 'Salvar alterações' : 'Cadastrar atestado'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

/*
 * ============================================================
 * FORMULÁRIO INICIAL
 * ============================================================
 */

function createInitialForm() {
  return {
    employeeId: '',
    type: 'medical',
    startDate: '',
    endDate: '',
    doctorName: '',
    professionalRegistration: '',
    institution: '',
    status: 'pending',
    reason: '',
    documentName: '',
    documentData: ''
  }
}

/*
 * ============================================================
 * CÁLCULO DE DIAS
 * ============================================================
 */

function calculateDays(startDate, endDate) {
  const start = parseDate(startDate)

  const end = parseDate(endDate)

  if (!start || !end || start > end) {
    return 0
  }

  const difference = end.getTime() - start.getTime()

  return Math.floor(difference / (1000 * 60 * 60 * 24)) + 1
}

/*
 * ============================================================
 * DATAS
 * ============================================================
 */

function parseDate(value) {
  if (!value) {
    return null
  }

  const [year, month, day] = value.split('-').map(Number)

  const date = new Date(year, month - 1, day)

  return Number.isNaN(date.getTime()) ? null : date
}

function formatDisplayDate(value) {
  const date = parseDate(value)

  return date ? date.toLocaleDateString('pt-BR') : '—'
}

/*
 * ============================================================
 * LABELS
 * ============================================================
 */

function getTypeLabel(type) {
  return (
    MEDICAL_CERTIFICATE_TYPES.find((item) => item.value === type)?.label || type
  )
}

function getStatusLabel(status) {
  return (
    MEDICAL_CERTIFICATE_STATUSES.find((item) => item.value === status)?.label ||
    status
  )
}
