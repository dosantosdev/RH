import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { hasPermission } from '../../services/permissions'
import {
  addCandidate,
  addCandidateStage,
  createApplicationLink,
  deleteApplicationLink,
  getApplicationLinks,
  addInterview,
  addVacancy,
  deleteCandidate,
  deleteInterview,
  deleteVacancy,
  getCandidateStages,
  getCandidates,
  updateCandidate,
  getInterviews,
  getVacancies,
  moveCandidateToStage,
  updateCandidateStage,
  updateInterview,
  updateVacancy,
  revokeApplicationLink
} from '../../services/recruitment'
import { getEmployees, addEmployee } from '../../services/employee'
import { getPositions } from '../../services/position'
import { initialEmployeeForm } from '../../data/initialEmployeeForm'
import Toast from '../../components/ui/Toast'
import useToast from '../../hooks/useToast'

import './candidatos.css'

const EMPTY_VACANCY = {
  title: '',
  description: '',
  positionId: '',
  quantity: 1,
  openingDate: new Date().toISOString().slice(0, 10),
  closingDate: '',
  status: 'aberta',
  active: true
}

const EMPTY_CANDIDATE = {
  name: '',
  cpf: '',
  email: '',
  phone: '',
  birthDate: '',
  city: '',
  state: '',
  education: '',
  currentCompany: '',
  currentPosition: '',
  salaryExpectation: '',
  source: '',
  vacancyId: '',
  stageId: 1,
  notes: '',
  resumeName: '',
  resumeData: ''
}

const EMPTY_INTERVIEW = {
  candidateId: '',
  date: '',
  time: '',
  type: 'Presencial',
  interviewer: '',
  location: '',
  status: 'agendada',
  score: '',
  notes: ''
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value.includes?.('T') ? value : `${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('pt-BR')
}

function downloadCsv(filename, rows) {
  if (!rows.length) return

  const keys = Object.keys(rows[0])
  const csv = [
    keys.join(';'),
    ...rows.map((row) =>
      keys
        .map((key) =>
          `"${String(row[key] ?? '').replaceAll('"', '""')}"`
        )
        .join(';')
    )
  ].join('\n')

  const blob = new Blob([`\ufeff${csv}`], {
    type: 'text/csv;charset=utf-8;'
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}

export default function Candidatos() {
  const { toast, showToast } = useToast()

  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') || 'dashboard'
  const [vacancies, setVacancies] = useState([])
  const [candidates, setCandidates] = useState([])
  const [stages, setStages] = useState([])
  const [interviews, setInterviews] = useState([])
  const [positions, setPositions] = useState([])
  const [applicationLinks, setApplicationLinks] = useState([])
  const [linkVacancyId, setLinkVacancyId] = useState('')
  const [linkValidity, setLinkValidity] = useState('24')

  const [vacancyForm, setVacancyForm] = useState(EMPTY_VACANCY)
  const [candidateForm, setCandidateForm] = useState(EMPTY_CANDIDATE)
  const [interviewForm, setInterviewForm] = useState(EMPTY_INTERVIEW)
  const [stageForm, setStageForm] = useState({ name: '', color: '#2563eb' })

  const [editingVacancyId, setEditingVacancyId] = useState(null)
  const [editingInterviewId, setEditingInterviewId] = useState(null)
  const [editingStageId, setEditingStageId] = useState(null)

  const [selectedCandidateId, setSelectedCandidateId] = useState(null)
  const [candidateSearch, setCandidateSearch] = useState('')
  const [candidateStatus, setCandidateStatus] = useState('todos')
  const [candidateVacancy, setCandidateVacancy] = useState('todos')
  const [candidateStage, setCandidateStage] = useState('todos')

  function reload() {
    setVacancies(getVacancies())
    setCandidates(getCandidates())
    setStages(getCandidateStages())
    setInterviews(getInterviews())
    setPositions(getPositions())
    setApplicationLinks(getApplicationLinks())
  }

  function changeTab(nextTab) {
    if (nextTab === 'dashboard') {
      setSearchParams({})
    } else {
      setSearchParams({ tab: nextTab })
    }
  }

  const selectedCandidate = candidates.find(
    (candidate) => Number(candidate.id) === Number(selectedCandidateId)
  )

  const filteredCandidates = useMemo(() => {
    const search = candidateSearch.trim().toLowerCase()

    return candidates.filter((candidate) => {
      const matchesSearch =
        !search ||
        candidate.name?.toLowerCase().includes(search) ||
        candidate.email?.toLowerCase().includes(search) ||
        candidate.phone?.toLowerCase().includes(search) ||
        candidate.cpf?.toLowerCase().includes(search)

      const matchesStatus =
        candidateStatus === 'todos' || candidate.status === candidateStatus

      const matchesVacancy =
        candidateVacancy === 'todos' ||
        Number(candidate.vacancyId) === Number(candidateVacancy)

      const matchesStage =
        candidateStage === 'todos' ||
        Number(candidate.stageId) === Number(candidateStage)

      return matchesSearch && matchesStatus && matchesVacancy && matchesStage
    })
  }, [
    candidates,
    candidateSearch,
    candidateStatus,
    candidateVacancy,
    candidateStage
  ])

  const metrics = {
    openVacancies: vacancies.filter(
      (vacancy) => vacancy.active !== false && vacancy.status === 'aberta'
    ).length,
    candidates: candidates.length,
    inProcess: candidates.filter(
      (candidate) => candidate.status === 'em_processo'
    ).length,
    approved: candidates.filter(
      (candidate) => candidate.status === 'aprovado'
    ).length,
    interviews: interviews.filter(
      (interview) => interview.status === 'agendada'
    ).length
  }

  if (!hasPermission('recruitment_view')) {
    return (
      <div className="candidates-page">
        <div className="candidate-empty">
          <h2>Acesso negado</h2>
          <p>Você não possui permissão para acessar a Área do Candidato.</p>
        </div>
      </div>
    )
  }

  function handleCreateApplicationLink(vacancyId) {
    if (!hasPermission('recruitment_create')) {
      showToast('Você não tem permissão para gerar links de candidatura.', 'error')
      return
    }

    try {
      const link = createApplicationLink({
        vacancyId,
        expiresInHours: Number(linkValidity)
      })

      const publicUrl = `${window.location.origin}/candidatura?token=${encodeURIComponent(link.token)}`

      setLinkVacancyId(String(vacancyId))
      reload()

      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(publicUrl)
          .then(() => showToast('Link gerado e copiado para a área de transferência.', 'success'))
          .catch(() => showToast('Link gerado. Copie-o na lista de links.', 'success'))
      } else {
        showToast('Link gerado. Copie-o na lista de links.', 'success')
      }
    } catch (error) {
      showToast(error?.message || 'Não foi possível gerar o link.', 'error')
    }
  }

  function getPublicApplicationUrl(link) {
    return `${window.location.origin}/candidatura?token=${encodeURIComponent(link.token)}`
  }

  function handleCopyApplicationLink(link) {
    const url = getPublicApplicationUrl(link)

    if (!navigator.clipboard?.writeText) {
      window.prompt('Copie o link de candidatura:', url)
      return
    }

    navigator.clipboard.writeText(url)
      .then(() => showToast('Link copiado.', 'success'))
      .catch(() => window.prompt('Copie o link de candidatura:', url))
  }

  function handleRevokeApplicationLink(id) {
    if (!hasPermission('recruitment_edit')) {
      showToast('Você não tem permissão para revogar links.', 'error')
      return
    }

    revokeApplicationLink(id)
    reload()
    showToast('Link revogado.', 'success')
  }

  function handleDeleteApplicationLink(id) {
    if (!hasPermission('recruitment_delete')) {
      showToast('Você não tem permissão para excluir links.', 'error')
      return
    }

    if (!window.confirm('Excluir este link de candidatura?')) return

    deleteApplicationLink(id)
    reload()
    showToast('Link excluído.', 'success')
  }

  function handleVacancySubmit(event) {
    event.preventDefault()

    if (!hasPermission(editingVacancyId ? 'recruitment_edit' : 'recruitment_create')) {
      showToast('Você não tem permissão para alterar vagas.', 'error')
      return
    }

    const position = positions.find(
      (item) => Number(item.id) === Number(vacancyForm.positionId)
    )

    const payload = {
      ...vacancyForm,
      positionName: position?.cargoName || vacancyForm.positionName || '',
      branchName: position?.branchName || '',
      departmentName: position?.departmentName || ''
    }

    if (editingVacancyId) {
      updateVacancy({ ...payload, id: editingVacancyId })
      showToast('Vaga atualizada com sucesso.', 'success')
    } else {
      addVacancy(payload)
      showToast('Vaga cadastrada com sucesso.', 'success')
    }

    setVacancyForm(EMPTY_VACANCY)
    setEditingVacancyId(null)
    reload()
  }

  function handleCandidateSubmit(event) {
    event.preventDefault()

    if (!hasPermission('recruitment_create')) {
      showToast('Você não tem permissão para cadastrar candidatos.', 'error')
      return
    }

    if (!candidateForm.name.trim() || !candidateForm.email.trim()) {
      showToast('Informe pelo menos nome e e-mail do candidato.', 'warning')
      return
    }

    const vacancy = vacancies.find(
      (item) => Number(item.id) === Number(candidateForm.vacancyId)
    )
    const stage = stages.find(
      (item) => Number(item.id) === Number(candidateForm.stageId)
    )

    addCandidate({
      ...candidateForm,
      vacancyTitle: vacancy?.title || '',
      stageName: stage?.name || ''
    })

    showToast('Candidato cadastrado com sucesso.', 'success')
    setCandidateForm(EMPTY_CANDIDATE)
    reload()
    changeTab('candidates')
  }

  function handleResumeUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      showToast('O currículo deve ter no máximo 5 MB.', 'warning')
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      setCandidateForm((current) => ({
        ...current,
        resumeName: file.name,
        resumeData: reader.result
      }))
    }

    reader.readAsDataURL(file)
  }

  function handleStageMove(candidateId, stageId) {
    if (!hasPermission('recruitment_edit')) {
      showToast('Você não tem permissão para alterar etapas.', 'error')
      return
    }

    moveCandidateToStage(candidateId, stageId)
    reload()
    showToast('Etapa do candidato atualizada.', 'success')
  }

  function handleInterviewSubmit(event) {
    event.preventDefault()

    if (!hasPermission(editingInterviewId ? 'recruitment_edit' : 'recruitment_create')) {
      showToast('Você não tem permissão para gerenciar entrevistas.', 'error')
      return
    }

    if (!interviewForm.candidateId || !interviewForm.date) {
      showToast('Selecione o candidato e informe a data.', 'warning')
      return
    }

    if (editingInterviewId) {
      updateInterview({ ...interviewForm, id: editingInterviewId })
      showToast('Entrevista atualizada.', 'success')
    } else {
      addInterview(interviewForm)
      showToast('Entrevista agendada.', 'success')
    }

    setInterviewForm(EMPTY_INTERVIEW)
    setEditingInterviewId(null)
    reload()
  }

  function handleStageSubmit(event) {
    event.preventDefault()

    if (!stageForm.name.trim()) return

    if (editingStageId) {
      updateCandidateStage({
        id: editingStageId,
        name: stageForm.name.trim(),
        color: stageForm.color
      })
      showToast('Etapa atualizada.', 'success')
    } else {
      addCandidateStage({
        name: stageForm.name.trim(),
        color: stageForm.color
      })
      showToast('Etapa criada.', 'success')
    }

    setStageForm({ name: '', color: '#2563eb' })
    setEditingStageId(null)
    reload()
  }

  function handleConvertCandidate(candidate) {
    if (!hasPermission('recruitment_convert')) {
      showToast('Você não tem permissão para transformar candidatos em funcionários.', 'error')
      return
    }

    const approvedStage = stages.find((stage) =>
      String(stage.name || '').trim().toLowerCase() === 'aprovação'
    )

    const isApproved =
      candidate.status === 'aprovado' ||
      (approvedStage && Number(candidate.stageId) === Number(approvedStage.id))

    if (!isApproved) {
      showToast('O candidato precisa estar na etapa de aprovação antes da contratação.', 'warning')
      return
    }

    if (candidate.employeeId) {
      showToast('Este candidato já foi transformado em funcionário.', 'warning')
      return
    }

    try {
      const existingEmployees = getEmployees()
      const normalizedCpf = String(candidate.cpf || '').replace(/\D/g, '')

      if (
        normalizedCpf &&
        existingEmployees.some(
          (employee) => String(employee.cpf || '').replace(/\D/g, '') === normalizedCpf
        )
      ) {
        showToast('Já existe um funcionário com este CPF.', 'warning')
        return
      }

      const vacancy = vacancies.find(
        (item) => Number(item.id) === Number(candidate.vacancyId)
      )

      if (!vacancy) {
        showToast('A vaga vinculada ao candidato não foi encontrada.', 'error')
        return
      }

      const position = positions.find(
        (item) => Number(item.id) === Number(vacancy.positionId)
      )

      if (!position) {
        showToast('A vaga não possui uma posição válida do Organograma. Vincule uma posição antes de contratar.', 'warning')
        return
      }

      const employeeData =
        candidate.employeeData && typeof candidate.employeeData === 'object'
          ? candidate.employeeData
          : {}

      const newEmployee = {
        ...initialEmployeeForm,
        ...employeeData,
        id: Date.now(),
        name: employeeData.name || candidate.name || '',
        cpf: employeeData.cpf || candidate.cpf || '',
        email: employeeData.email || candidate.email || '',
        phone: employeeData.phone || candidate.phone || '',
        birthDate: employeeData.birthDate || candidate.birthDate || '',
        city: employeeData.city || candidate.city || '',
        state: employeeData.state || candidate.state || '',
        education: employeeData.education || candidate.education || '',
        admissionDate: new Date().toISOString().slice(0, 10),
        active: true,
        positionId: position.id,
        positionName: position.cargoName || '',
        departmentId: position.departmentId || '',
        departmentName: position.departmentName || '',
        branchId: position.branchId || '',
        branchName: position.branchName || '',
        roleId: position.cargoId || '',
        roleName: position.cargoName || '',
        recruitmentCandidateId: candidate.id,
        recruitmentVacancyId: candidate.vacancyId || '',
        recruitmentDocuments: candidate.documents || employeeData.recruitmentDocuments || []
      }

      addEmployee(newEmployee)

      const now = new Date().toISOString()
      const history = Array.isArray(candidate.history) ? candidate.history : []

      updateCandidate({
        ...candidate,
        status: 'contratado',
        hiredAt: now,
        employeeId: newEmployee.id,
        history: [
          ...history,
          {
            id: Date.now(),
            type: 'hired',
            date: now,
            employeeId: newEmployee.id,
            description: 'Candidato aprovado e transformado em funcionário.'
          }
        ]
      })

      const hiredCount = candidates.filter(
        (item) =>
          Number(item.vacancyId) === Number(vacancy.id) &&
          item.status === 'contratado'
      ).length + 1

      if (vacancy.quantity && hiredCount >= Number(vacancy.quantity)) {
        updateVacancy({
          ...vacancy,
          status: 'encerrada',
          active: false
        })
      }

      reload()
      setSelectedCandidateId(candidate.id)
      showToast('Candidato transformado em funcionário com sucesso e vinculado ao Organograma.', 'success')
    } catch (error) {
      console.error('Erro ao transformar candidato em funcionário:', error)
      showToast(error?.message || 'Não foi possível transformar o candidato em funcionário.', 'error')
    }
  }

  function handleDeleteCandidate(id) {
    if (!hasPermission('recruitment_delete')) {
      showToast('Você não tem permissão para excluir candidatos.', 'error')
      return
    }

    if (!window.confirm('Excluir este candidato?')) return

    deleteCandidate(id)
    setSelectedCandidateId(null)
    reload()
    showToast('Candidato excluído.', 'success')
  }

  function handleDeleteVacancy(id) {
    if (!hasPermission('recruitment_delete')) {
      showToast('Você não tem permissão para excluir vagas.', 'error')
      return
    }

    if (!window.confirm('Excluir esta vaga?')) return

    deleteVacancy(id)
    reload()
    showToast('Vaga excluída.', 'success')
  }

  function handleDeleteInterview(id) {
    if (!hasPermission('recruitment_delete')) {
      showToast('Você não tem permissão para excluir entrevistas.', 'error')
      return
    }

    if (!window.confirm('Excluir esta entrevista?')) return

    deleteInterview(id)
    reload()
    showToast('Entrevista excluída.', 'success')
  }

  function printCandidates() {
    const rows = filteredCandidates
      .map((candidate) => {
        const vacancy = vacancies.find(
          (item) => Number(item.id) === Number(candidate.vacancyId)
        )
        const stage = stages.find(
          (item) => Number(item.id) === Number(candidate.stageId)
        )

        return `
          <tr>
            <td>${candidate.name || '-'}</td>
            <td>${candidate.email || '-'}</td>
            <td>${vacancy?.title || '-'}</td>
            <td>${stage?.name || '-'}</td>
            <td>${candidate.status || '-'}</td>
            <td>${formatDate(candidate.createdAt)}</td>
          </tr>
        `
      })
      .join('')

    const printWindow = window.open('', '_blank', 'width=1200,height=800')

    if (!printWindow) {
      showToast('Permita pop-ups no navegador para imprimir.', 'warning')
      return
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>Relatório de candidatos</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: Arial, sans-serif; color: #172033; }
            h1 { margin: 0 0 4px; }
            p { color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #d9dee8; padding: 8px; text-align: left; }
            th { background: #f1f5f9; }
            thead { display: table-header-group; }
          </style>
        </head>
        <body>
          <h1>Relatório de candidatos</h1>
          <p>Gerado em ${new Date().toLocaleString('pt-BR')}</p>
          <p>Total: ${filteredCandidates.length}</p>
          <table>
            <thead>
              <tr>
                <th>Candidato</th>
                <th>E-mail</th>
                <th>Vaga</th>
                <th>Etapa</th>
                <th>Status</th>
                <th>Cadastro</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()

    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 300)
  }

  const canManage = hasPermission('recruitment_create')
  const canEdit = hasPermission('recruitment_edit')
  const canDelete = hasPermission('recruitment_delete')

  return (
    <div className="candidates-page">
      <Toast show={toast.show} message={toast.message} type={toast.type} />

      <header className="candidates-header">
        <div>
          <span className="candidates-eyebrow">RECURSOS HUMANOS</span>
          <h1>Área do Candidato</h1>
          <p>
            Centralize vagas, candidatos, currículos, etapas, entrevistas e
            contratação.
          </p>
        </div>

        <div className="candidate-header-actions">
          {tab === 'candidates' && (
            <>
              <button className="secondary-button" onClick={printCandidates}>
                🖨️ Imprimir
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  downloadCsv(
                    'candidatos.csv',
                    filteredCandidates.map((candidate) => ({
                      nome: candidate.name,
                      email: candidate.email,
                      telefone: candidate.phone,
                      status: candidate.status,
                      vaga:
                        vacancies.find(
                          (item) =>
                            Number(item.id) === Number(candidate.vacancyId)
                        )?.title || '',
                      etapa:
                        stages.find(
                          (item) =>
                            Number(item.id) === Number(candidate.stageId)
                        )?.name || ''
                    }))
                  )
                }
              >
                ⬇️ CSV
              </button>
            </>
          )}
        </div>
      </header>

      <section className="candidate-metrics">
        <Metric label="Vagas abertas" value={metrics.openVacancies} />
        <Metric label="Candidatos" value={metrics.candidates} />
        <Metric label="Em processo" value={metrics.inProcess} />
        <Metric label="Aprovados" value={metrics.approved} />
        <Metric label="Entrevistas agendadas" value={metrics.interviews} />
      </section>

      <nav className="candidate-tabs">
        {[
          ['dashboard', 'Visão geral'],
          ['vacancies', 'Vagas abertas'],
          ['application-links', 'Links de candidatura'],
          ['candidates', 'Candidatos'],
          ['curriculums', 'Currículos'],
          ['stages', 'Etapas'],
          ['interviews', 'Entrevistas'],
          ['conversion', 'Aprovação / contratação']
        ].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? 'active' : ''}
            onClick={() => changeTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'dashboard' && (
        <section className="candidate-dashboard">
          <div className="candidate-card candidate-flow-card">
            <h2>Fluxo do processo seletivo</h2>
            <div className="candidate-flow">
              <FlowItem icon="🧑‍💼" label="Candidato" />
              <span>→</span>
              <FlowItem icon="📋" label="Processo seletivo" />
              <span>→</span>
              <FlowItem icon="✅" label="Aprovado" />
              <span>→</span>
              <FlowItem icon="👤" label="Funcionário" />
              <span>→</span>
              <FlowItem icon="🌳" label="Organograma" />
            </div>
            <p className="candidate-help">
              Ao contratar, o sistema cria o funcionário e aproveita a posição
              vinculada à vaga para posicioná-lo no Organograma.
            </p>
          </div>

          <div className="candidate-dashboard-grid">
            <div className="candidate-card">
              <h2>Vagas recentes</h2>
              {vacancies.slice(-5).reverse().map((vacancy) => (
                <div className="candidate-list-row" key={vacancy.id}>
                  <div>
                    <strong>{vacancy.title}</strong>
                    <span>{vacancy.departmentName || 'Sem departamento'}</span>
                  </div>
                  <Badge value={vacancy.status} />
                </div>
              ))}
              {!vacancies.length && <Empty text="Nenhuma vaga cadastrada." />}
            </div>

            <div className="candidate-card">
              <h2>Próximas entrevistas</h2>
              {interviews
                .filter((item) => item.status === 'agendada')
                .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
                .slice(0, 5)
                .map((interview) => {
                  const candidate = candidates.find(
                    (item) => Number(item.id) === Number(interview.candidateId)
                  )
                  return (
                    <div className="candidate-list-row" key={interview.id}>
                      <div>
                        <strong>{candidate?.name || 'Candidato'}</strong>
                        <span>
                          {formatDate(interview.date)} às {interview.time || '--'}
                        </span>
                      </div>
                      <Badge value={interview.type} />
                    </div>
                  )
                })}
              {!interviews.length && <Empty text="Nenhuma entrevista agendada." />}
            </div>
          </div>
        </section>
      )}

      {tab === 'application-links' && (
        <section className="candidate-section-grid">
          <div className="candidate-card">
            <h2>Gerar link de candidatura</h2>
            <p className="candidate-help">
              Gere um link individual para o candidato preencher o cadastro diretamente.
              O link possui validade configurável e pode ser revogado a qualquer momento.
            </p>

            <form
              className="candidate-form"
              onSubmit={(event) => {
                event.preventDefault()
                if (!linkVacancyId) {
                  showToast('Selecione uma vaga.', 'warning')
                  return
                }
                handleCreateApplicationLink(linkVacancyId)
              }}
            >
              <label>
                Vaga *
                <select
                  value={linkVacancyId}
                  onChange={(event) => setLinkVacancyId(event.target.value)}
                  required
                >
                  <option value="">Selecione uma vaga aberta</option>
                  {vacancies
                    .filter((vacancy) => vacancy.active !== false && vacancy.status === 'aberta')
                    .map((vacancy) => (
                      <option key={vacancy.id} value={vacancy.id}>
                        {vacancy.title}
                      </option>
                    ))}
                </select>
              </label>

              <label>
                Validade do link
                <select value={linkValidity} onChange={(event) => setLinkValidity(event.target.value)}>
                  <option value="1">1 hora</option>
                  <option value="6">6 horas</option>
                  <option value="12">12 horas</option>
                  <option value="24">24 horas</option>
                  <option value="48">2 dias</option>
                  <option value="72">3 dias</option>
                  <option value="96">4 dias</option>
                  <option value="120">5 dias</option>
                  <option value="144">6 dias</option>
                  <option value="168">7 dias</option>
                </select>
              </label>

              <button className="primary-button" type="submit" disabled={!hasPermission('recruitment_create')}>
                🔗 Gerar e copiar link
              </button>
            </form>

            <div className="candidate-public-flow">
              <span>Link</span><b>→</b><span>Cadastro completo</span><b>→</b><span>Documentos</span><b>→</b><span>Candidato</span>
            </div>
          </div>

          <div className="candidate-card">
            <h2>Links gerados</h2>
            <div className="candidate-table-wrapper">
              <table className="candidate-table">
                <thead>
                  <tr>
                    <th>Vaga</th>
                    <th>Criado em</th>
                    <th>Validade</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {applicationLinks
                    .slice()
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .map((link) => {
                      const status = link.active ? 'ativo' : 'revogado'

                      return (
                        <tr key={link.id}>
                          <td><strong>{link.vacancyTitle || 'Vaga'}</strong></td>
                          <td>{formatDate(link.createdAt)}</td>
                          <td>{formatDate(link.expiresAt)} às {new Date(link.expiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td><Badge value={status} /></td>
                          <td className="table-actions">
                            {status === 'ativo' && (
                              <>
                                <button className="secondary-button small-button" onClick={() => handleCopyApplicationLink(link)}>
                                  Copiar
                                </button>
                                <button className="secondary-button small-button" onClick={() => handleRevokeApplicationLink(link.id)}>
                                  Revogar
                                </button>
                              </>
                            )}
                            {canDelete && (
                              <button onClick={() => handleDeleteApplicationLink(link.id)} title="Excluir link">
                                🗑️
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
              {!applicationLinks.length && <Empty text="Nenhum link de candidatura gerado." />}
            </div>
          </div>
        </section>
      )}

      {tab === 'vacancies' && (
        <section className="candidate-section-grid">
          <div className="candidate-card">
            <h2>{editingVacancyId ? 'Editar vaga' : 'Cadastrar vaga'}</h2>

            {canManage || editingVacancyId ? (
              <form className="candidate-form" onSubmit={handleVacancySubmit}>
                <label>
                  Título da vaga *
                  <input
                    value={vacancyForm.title}
                    onChange={(e) =>
                      setVacancyForm({ ...vacancyForm, title: e.target.value })
                    }
                    placeholder="Ex.: Analista de RH"
                    required
                  />
                </label>

                <label>
                  Posição do organograma
                  <select
                    value={vacancyForm.positionId}
                    onChange={(e) =>
                      setVacancyForm({
                        ...vacancyForm,
                        positionId: e.target.value
                      })
                    }
                  >
                    <option value="">Selecione uma posição</option>
                    {positions.map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.cargoName} — {position.departmentName || 'Sem departamento'} — {position.branchName || 'Sem filial'}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="candidate-form-grid">
                  <label>
                    Quantidade
                    <input
                      type="number"
                      min="1"
                      value={vacancyForm.quantity}
                      onChange={(e) =>
                        setVacancyForm({
                          ...vacancyForm,
                          quantity: e.target.value
                        })
                      }
                    />
                  </label>

                  <label>
                    Abertura
                    <input
                      type="date"
                      value={vacancyForm.openingDate}
                      onChange={(e) =>
                        setVacancyForm({
                          ...vacancyForm,
                          openingDate: e.target.value
                        })
                      }
                    />
                  </label>

                  <label>
                    Encerramento
                    <input
                      type="date"
                      value={vacancyForm.closingDate}
                      onChange={(e) =>
                        setVacancyForm({
                          ...vacancyForm,
                          closingDate: e.target.value
                        })
                      }
                    />
                  </label>

                  <label>
                    Status
                    <select
                      value={vacancyForm.status}
                      onChange={(e) =>
                        setVacancyForm({
                          ...vacancyForm,
                          status: e.target.value
                        })
                      }
                    >
                      <option value="aberta">Aberta</option>
                      <option value="pausada">Pausada</option>
                      <option value="encerrada">Encerrada</option>
                    </select>
                  </label>
                </div>

                <label>
                  Descrição
                  <textarea
                    rows="4"
                    value={vacancyForm.description}
                    onChange={(e) =>
                      setVacancyForm({
                        ...vacancyForm,
                        description: e.target.value
                      })
                    }
                    placeholder="Requisitos, responsabilidades e observações da vaga..."
                  />
                </label>

                <div className="form-actions">
                  <button className="primary-button" type="submit">
                    {editingVacancyId ? 'Salvar alterações' : 'Cadastrar vaga'}
                  </button>

                  {editingVacancyId && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setVacancyForm(EMPTY_VACANCY)
                        setEditingVacancyId(null)
                      }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <Empty text="Você não possui permissão para cadastrar vagas." />
            )}
          </div>

          <div className="candidate-card">
            <h2>Vagas cadastradas</h2>

            <div className="candidate-table-wrapper">
              <table className="candidate-table">
                <thead>
                  <tr>
                    <th>Vaga</th>
                    <th>Posição</th>
                    <th>Qtd.</th>
                    <th>Status</th>
                    <th>Candidatos</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {vacancies.map((vacancy) => {
                    const count = candidates.filter(
                      (candidate) =>
                        Number(candidate.vacancyId) === Number(vacancy.id)
                    ).length

                    return (
                      <tr key={vacancy.id}>
                        <td>
                          <strong>{vacancy.title}</strong>
                          <small>{vacancy.departmentName || '-'}</small>
                        </td>
                        <td>{vacancy.positionName || 'Sem posição'}</td>
                        <td>{vacancy.quantity}</td>
                        <td><Badge value={vacancy.status} /></td>
                        <td>{count}</td>
                        <td className="table-actions">
                          {canEdit && (
                            <button
                              onClick={() => {
                                setVacancyForm({
                                  ...EMPTY_VACANCY,
                                  ...vacancy
                                })
                                setEditingVacancyId(vacancy.id)
                              }}
                            >
                              ✏️
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDeleteVacancy(vacancy.id)}>
                              🗑️
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {!vacancies.length && <Empty text="Nenhuma vaga cadastrada." />}
            </div>
          </div>
        </section>
      )}

      {tab === 'candidates' && (
        <section className="candidate-section-grid candidates-main-grid">
          <div className="candidate-card">
            <h2>Cadastrar candidato</h2>

            {canManage ? (
              <form className="candidate-form" onSubmit={handleCandidateSubmit}>
                <div className="candidate-form-grid">
                  <label>
                    Nome *
                    <input
                      value={candidateForm.name}
                      onChange={(e) =>
                        setCandidateForm({
                          ...candidateForm,
                          name: e.target.value
                        })
                      }
                      required
                    />
                  </label>

                  <label>
                    CPF
                    <input
                      value={candidateForm.cpf}
                      onChange={(e) =>
                        setCandidateForm({
                          ...candidateForm,
                          cpf: e.target.value
                        })
                      }
                    />
                  </label>

                  <label>
                    E-mail *
                    <input
                      type="email"
                      value={candidateForm.email}
                      onChange={(e) =>
                        setCandidateForm({
                          ...candidateForm,
                          email: e.target.value
                        })
                      }
                      required
                    />
                  </label>

                  <label>
                    Telefone
                    <input
                      value={candidateForm.phone}
                      onChange={(e) =>
                        setCandidateForm({
                          ...candidateForm,
                          phone: e.target.value
                        })
                      }
                    />
                  </label>

                  <label>
                    Cidade
                    <input
                      value={candidateForm.city}
                      onChange={(e) =>
                        setCandidateForm({
                          ...candidateForm,
                          city: e.target.value
                        })
                      }
                    />
                  </label>

                  <label>
                    Estado
                    <input
                      value={candidateForm.state}
                      onChange={(e) =>
                        setCandidateForm({
                          ...candidateForm,
                          state: e.target.value
                        })
                      }
                    />
                  </label>

                  <label>
                    Formação
                    <input
                      value={candidateForm.education}
                      onChange={(e) =>
                        setCandidateForm({
                          ...candidateForm,
                          education: e.target.value
                        })
                      }
                    />
                  </label>

                  <label>
                    Pretensão salarial
                    <input
                      value={candidateForm.salaryExpectation}
                      onChange={(e) =>
                        setCandidateForm({
                          ...candidateForm,
                          salaryExpectation: e.target.value
                        })
                      }
                    />
                  </label>
                </div>

                <label>
                  Vaga
                  <select
                    value={candidateForm.vacancyId}
                    onChange={(e) =>
                      setCandidateForm({
                        ...candidateForm,
                        vacancyId: e.target.value
                      })
                    }
                  >
                    <option value="">Selecione</option>
                    {vacancies
                      .filter((vacancy) => vacancy.status === 'aberta')
                      .map((vacancy) => (
                        <option key={vacancy.id} value={vacancy.id}>
                          {vacancy.title}
                        </option>
                      ))}
                  </select>
                </label>

                <label>
                  Etapa inicial
                  <select
                    value={candidateForm.stageId}
                    onChange={(e) =>
                      setCandidateForm({
                        ...candidateForm,
                        stageId: e.target.value
                      })
                    }
                  >
                    {stages
                      .filter((stage) => stage.active !== false)
                      .map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name}
                        </option>
                      ))}
                  </select>
                </label>

                <label>
                  Currículo
                  <input type="file" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} />
                  {candidateForm.resumeName && (
                    <small className="file-selected">
                      📎 {candidateForm.resumeName}
                    </small>
                  )}
                </label>

                <label>
                  Observações
                  <textarea
                    rows="3"
                    value={candidateForm.notes}
                    onChange={(e) =>
                      setCandidateForm({
                        ...candidateForm,
                        notes: e.target.value
                      })
                    }
                  />
                </label>

                <button className="primary-button" type="submit">
                  Cadastrar candidato
                </button>
              </form>
            ) : (
              <Empty text="Você não possui permissão para cadastrar candidatos." />
            )}
          </div>

          <div className="candidate-card">
            <div className="section-title-row">
              <div>
                <h2>Candidatos</h2>
                <p>{filteredCandidates.length} resultado(s)</p>
              </div>
            </div>

            <div className="candidate-filters">
              <input
                placeholder="Buscar por nome, CPF, e-mail ou telefone..."
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
              />

              <select
                value={candidateStatus}
                onChange={(e) => setCandidateStatus(e.target.value)}
              >
                <option value="todos">Todos os status</option>
                <option value="em_processo">Em processo</option>
                <option value="aprovado">Aprovado</option>
                <option value="reprovado">Reprovado</option>
                <option value="contratado">Contratado</option>
              </select>

              <select
                value={candidateVacancy}
                onChange={(e) => setCandidateVacancy(e.target.value)}
              >
                <option value="todos">Todas as vagas</option>
                {vacancies.map((vacancy) => (
                  <option key={vacancy.id} value={vacancy.id}>
                    {vacancy.title}
                  </option>
                ))}
              </select>

              <select
                value={candidateStage}
                onChange={(e) => setCandidateStage(e.target.value)}
              >
                <option value="todos">Todas as etapas</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="candidate-table-wrapper">
              <table className="candidate-table">
                <thead>
                  <tr>
                    <th>Candidato</th>
                    <th>Vaga</th>
                    <th>Etapa</th>
                    <th>Status</th>
                    <th>Cadastro</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((candidate) => {
                    const vacancy = vacancies.find(
                      (item) => Number(item.id) === Number(candidate.vacancyId)
                    )
                    return (
                      <tr key={candidate.id}>
                        <td>
                          <button
                            className="candidate-name-button"
                            onClick={() => setSelectedCandidateId(candidate.id)}
                          >
                            <strong>{candidate.name}</strong>
                          </button>
                          <small>{candidate.email}</small>
                        </td>
                        <td>{vacancy?.title || '-'}</td>
                        <td>
                          <select
                            value={candidate.stageId || ''}
                            disabled={!canEdit}
                            onChange={(e) =>
                              handleStageMove(candidate.id, e.target.value)
                            }
                          >
                            {stages.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td><Badge value={candidate.status} /></td>
                        <td>{formatDate(candidate.createdAt)}</td>
                        <td className="table-actions">
                          <button onClick={() => setSelectedCandidateId(candidate.id)}>
                            👁️
                          </button>
                          {canDelete && (
                            <button onClick={() => handleDeleteCandidate(candidate.id)}>
                              🗑️
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {!filteredCandidates.length && (
                <Empty text="Nenhum candidato encontrado." />
              )}
            </div>
          </div>
        </section>
      )}

      {tab === 'curriculums' && (
        <section className="candidate-card">
          <h2>Currículos</h2>
          <p className="candidate-help">
            Currículos enviados ficam vinculados ao cadastro do candidato.
          </p>

          <div className="candidate-table-wrapper">
            <table className="candidate-table">
              <thead>
                <tr>
                  <th>Candidato</th>
                  <th>Arquivo</th>
                  <th>Vaga</th>
                  <th>Etapa</th>
                  <th>Download</th>
                </tr>
              </thead>
              <tbody>
                {candidates
                  .filter((candidate) => candidate.resumeData)
                  .map((candidate) => {
                    const vacancy = vacancies.find(
                      (item) => Number(item.id) === Number(candidate.vacancyId)
                    )
                    const stage = stages.find(
                      (item) => Number(item.id) === Number(candidate.stageId)
                    )
                    return (
                      <tr key={candidate.id}>
                        <td><strong>{candidate.name}</strong></td>
                        <td>{candidate.resumeName}</td>
                        <td>{vacancy?.title || '-'}</td>
                        <td>{stage?.name || '-'}</td>
                        <td>
                          <a
                            className="download-link"
                            href={candidate.resumeData}
                            download={candidate.resumeName || 'curriculo'}
                          >
                            ⬇️ Baixar
                          </a>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>

            {!candidates.some((candidate) => candidate.resumeData) && (
              <Empty text="Nenhum currículo anexado." />
            )}
          </div>
        </section>
      )}

      {tab === 'stages' && (
        <section className="candidate-section-grid">
          <div className="candidate-card">
            <h2>{editingStageId ? 'Editar etapa' : 'Nova etapa'}</h2>

            {canEdit || canManage ? (
              <form className="candidate-form" onSubmit={handleStageSubmit}>
                <label>
                  Nome da etapa
                  <input
                    value={stageForm.name}
                    onChange={(e) =>
                      setStageForm({ ...stageForm, name: e.target.value })
                    }
                    placeholder="Ex.: Teste técnico"
                    required
                  />
                </label>

                <label>
                  Cor
                  <input
                    type="color"
                    value={stageForm.color}
                    onChange={(e) =>
                      setStageForm({ ...stageForm, color: e.target.value })
                    }
                  />
                </label>

                <button className="primary-button">Salvar etapa</button>
              </form>
            ) : (
              <Empty text="Sem permissão para gerenciar etapas." />
            )}
          </div>

          <div className="candidate-card">
            <h2>Etapas do processo seletivo</h2>
            <div className="stage-list">
              {stages.map((stage, index) => (
                <div className="stage-row" key={stage.id}>
                  <span className="stage-number">{index + 1}</span>
                  <span
                    className="stage-color"
                    style={{ background: stage.color || '#2563eb' }}
                  />
                  <strong>{stage.name}</strong>
                  <span className="stage-count">
                    {candidates.filter(
                      (candidate) => Number(candidate.stageId) === Number(stage.id)
                    ).length}{' '}
                    candidato(s)
                  </span>
                  {(canEdit || canManage) && (
                    <button
                      onClick={() => {
                        setStageForm({
                          name: stage.name,
                          color: stage.color || '#2563eb'
                        })
                        setEditingStageId(stage.id)
                      }}
                    >
                      ✏️
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === 'interviews' && (
        <section className="candidate-section-grid">
          <div className="candidate-card">
            <h2>{editingInterviewId ? 'Editar entrevista' : 'Agendar entrevista'}</h2>

            {canManage || editingInterviewId ? (
              <form className="candidate-form" onSubmit={handleInterviewSubmit}>
                <label>
                  Candidato
                  <select
                    value={interviewForm.candidateId}
                    onChange={(e) =>
                      setInterviewForm({
                        ...interviewForm,
                        candidateId: e.target.value
                      })
                    }
                    required
                  >
                    <option value="">Selecione</option>
                    {candidates
                      .filter((candidate) => candidate.status !== 'contratado')
                      .map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.name}
                        </option>
                      ))}
                  </select>
                </label>

                <div className="candidate-form-grid">
                  <label>
                    Data
                    <input
                      type="date"
                      value={interviewForm.date}
                      onChange={(e) =>
                        setInterviewForm({
                          ...interviewForm,
                          date: e.target.value
                        })
                      }
                      required
                    />
                  </label>

                  <label>
                    Horário
                    <input
                      type="time"
                      value={interviewForm.time}
                      onChange={(e) =>
                        setInterviewForm({
                          ...interviewForm,
                          time: e.target.value
                        })
                      }
                    />
                  </label>

                  <label>
                    Tipo
                    <select
                      value={interviewForm.type}
                      onChange={(e) =>
                        setInterviewForm({
                          ...interviewForm,
                          type: e.target.value
                        })
                      }
                    >
                      <option>Presencial</option>
                      <option>Online</option>
                      <option>Telefone</option>
                    </select>
                  </label>

                  <label>
                    Entrevistador
                    <input
                      value={interviewForm.interviewer}
                      onChange={(e) =>
                        setInterviewForm({
                          ...interviewForm,
                          interviewer: e.target.value
                        })
                      }
                    />
                  </label>
                </div>

                <label>
                  Local / link
                  <input
                    value={interviewForm.location}
                    onChange={(e) =>
                      setInterviewForm({
                        ...interviewForm,
                        location: e.target.value
                      })
                    }
                  />
                </label>

                <label>
                  Status
                  <select
                    value={interviewForm.status}
                    onChange={(e) =>
                      setInterviewForm({
                        ...interviewForm,
                        status: e.target.value
                      })
                    }
                  >
                    <option value="agendada">Agendada</option>
                    <option value="realizada">Realizada</option>
                    <option value="cancelada">Cancelada</option>
                    <option value="faltou">Candidato não compareceu</option>
                  </select>
                </label>

                <label>
                  Avaliação / notas
                  <textarea
                    rows="4"
                    value={interviewForm.notes}
                    onChange={(e) =>
                      setInterviewForm({
                        ...interviewForm,
                        notes: e.target.value
                      })
                    }
                  />
                </label>

                <div className="form-actions">
                  <button className="primary-button">Salvar entrevista</button>
                  {editingInterviewId && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setInterviewForm(EMPTY_INTERVIEW)
                        setEditingInterviewId(null)
                      }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <Empty text="Sem permissão para gerenciar entrevistas." />
            )}
          </div>

          <div className="candidate-card">
            <h2>Entrevistas</h2>

            <div className="candidate-table-wrapper">
              <table className="candidate-table">
                <thead>
                  <tr>
                    <th>Candidato</th>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Entrevistador</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {interviews.map((interview) => {
                    const candidate = candidates.find(
                      (item) =>
                        Number(item.id) === Number(interview.candidateId)
                    )

                    return (
                      <tr key={interview.id}>
                        <td>{candidate?.name || '-'}</td>
                        <td>
                          {formatDate(interview.date)}{' '}
                          {interview.time && `às ${interview.time}`}
                        </td>
                        <td>{interview.type}</td>
                        <td>{interview.interviewer || '-'}</td>
                        <td><Badge value={interview.status} /></td>
                        <td className="table-actions">
                          {canEdit && (
                            <button
                              onClick={() => {
                                setInterviewForm({
                                  ...EMPTY_INTERVIEW,
                                  ...interview
                                })
                                setEditingInterviewId(interview.id)
                              }}
                            >
                              ✏️
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteInterview(interview.id)}
                            >
                              🗑️
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {!interviews.length && <Empty text="Nenhuma entrevista cadastrada." />}
            </div>
          </div>
        </section>
      )}

      {tab === 'conversion' && (
        <section className="candidate-card">
          <h2>Aprovação e contratação</h2>
          <p className="candidate-help">
            Aprove um candidato pela etapa correspondente. Depois disso, use
            <strong> Transformar em funcionário </strong>
            para criar o cadastro e vinculá-lo à posição da vaga no Organograma.
          </p>

          <div className="candidate-table-wrapper">
            <table className="candidate-table">
              <thead>
                <tr>
                  <th>Candidato</th>
                  <th>Vaga</th>
                  <th>Etapa</th>
                  <th>Status</th>
                  <th>Funcionário</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => {
                  const vacancy = vacancies.find(
                    (item) => Number(item.id) === Number(candidate.vacancyId)
                  )

                  return (
                    <tr key={candidate.id}>
                      <td>
                        <strong>{candidate.name}</strong>
                        <small>{candidate.email}</small>
                      </td>
                      <td>{vacancy?.title || '-'}</td>
                      <td>
                        <select
                          value={candidate.stageId || ''}
                          disabled={!canEdit}
                          onChange={(e) =>
                            handleStageMove(candidate.id, e.target.value)
                          }
                        >
                          {stages.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td><Badge value={candidate.status} /></td>
                      <td>
                        {candidate.employeeId ? (
                          <span className="success-text">
                            ID {candidate.employeeId}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        {candidate.status === 'aprovado' &&
                          hasPermission('recruitment_convert') && (
                            <button
                              className="primary-button small-button"
                              onClick={() => handleConvertCandidate(candidate)}
                            >
                              Contratar
                            </button>
                          )}
                        {candidate.status === 'contratado' && (
                          <span className="success-text">✓ Contratado</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!candidates.length && <Empty text="Nenhum candidato cadastrado." />}
          </div>
        </section>
      )}

      {selectedCandidate && (
        <div
          className="candidate-modal-backdrop"
          onMouseDown={() => setSelectedCandidateId(null)}
        >
          <div
            className="candidate-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="candidates-eyebrow">CANDIDATO</span>
                <h2>{selectedCandidate.name}</h2>
              </div>
              <button onClick={() => setSelectedCandidateId(null)}>✕</button>
            </div>

            <div className="candidate-detail-grid">
              <Detail label="E-mail" value={selectedCandidate.email} />
              <Detail label="Telefone" value={selectedCandidate.phone} />
              <Detail label="CPF" value={selectedCandidate.cpf} />
              <Detail label="Formação" value={selectedCandidate.education} />
              <Detail label="Cidade" value={selectedCandidate.city} />
              <Detail label="Estado" value={selectedCandidate.state} />
              <Detail label="Empresa atual" value={selectedCandidate.currentCompany} />
              <Detail label="Cargo atual" value={selectedCandidate.currentPosition} />
              <Detail
                label="Pretensão salarial"
                value={selectedCandidate.salaryExpectation}
              />
            </div>

            <div className="candidate-detail-section">
              <h3>Histórico do processo</h3>

              {(selectedCandidate.history || []).slice().reverse().map((item) => (
                <div className="history-item" key={item.id}>
                  <strong>{item.description}</strong>
                  <span>{formatDate(item.date)}</span>
                </div>
              ))}
            </div>

            {selectedCandidate.resumeData && (
              <a
                className="primary-button inline-button"
                href={selectedCandidate.resumeData}
                download={selectedCandidate.resumeName || 'curriculo'}
              >
                ⬇️ Baixar currículo
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="candidate-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function FlowItem({ icon, label }) {
  return (
    <div className="flow-item">
      <span>{icon}</span>
      <strong>{label}</strong>
    </div>
  )
}

function Badge({ value }) {
  const label = {
    aberta: 'Aberta',
    pausada: 'Pausada',
    encerrada: 'Encerrada',
    em_processo: 'Em processo',
    aprovado: 'Aprovado',
    reprovado: 'Reprovado',
    contratado: 'Contratado',
    agendada: 'Agendada',
    realizada: 'Realizada',
    cancelada: 'Cancelada',
    faltou: 'Não compareceu',
    Presencial: 'Presencial',
    Online: 'Online',
    Telefone: 'Telefone'
  }[value] || value || '-'

  return <span className={`candidate-badge ${String(value).replace(/\s/g, '-')}`}>{label}</span>
}

function Detail({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  )
}

function Empty({ text }) {
  return <div className="candidate-empty">{text}</div>
}
