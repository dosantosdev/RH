import { getStoredArray, setStored } from './storage'

const STORAGE_KEYS = {
  vacancies: 'recruitmentVacancies',
  candidates: 'recruitmentCandidates',
  stages: 'recruitmentStages',
  interviews: 'recruitmentInterviews',
  applicationLinks: 'recruitmentApplicationLinks'
}

export const DEFAULT_CANDIDATE_STAGES = [
  { id: 1, name: 'Inscrição', order: 1, color: '#64748b', active: true },
  { id: 2, name: 'Triagem', order: 2, color: '#2563eb', active: true },
  { id: 3, name: 'Entrevista', order: 3, color: '#7c3aed', active: true },
  { id: 4, name: 'Avaliação', order: 4, color: '#d97706', active: true },
  { id: 5, name: 'Aprovação', order: 5, color: '#16a34a', active: true },
  { id: 6, name: 'Reprovação', order: 6, color: '#dc2626', active: true }
]

function getNextId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1
}

function getNow() {
  return new Date().toISOString()
}

function getCollection(key) {
  return getStoredArray(key)
}

function saveCollection(key, items) {
  setStored(key, items)
  return items
}

/* ============================================================
   VAGAS
   ============================================================ */

export function getVacancies() {
  return getCollection(STORAGE_KEYS.vacancies)
}

export function addVacancy(vacancy) {
  const vacancies = getVacancies()
  const newVacancy = {
    ...vacancy,
    id: vacancy.id || getNextId(vacancies),
    createdAt: vacancy.createdAt || getNow(),
    status: vacancy.status || 'aberta',
    active: vacancy.active !== false
  }

  saveCollection(STORAGE_KEYS.vacancies, [...vacancies, newVacancy])
  return newVacancy
}

export function updateVacancy(updatedVacancy) {
  const updated = getVacancies().map((item) =>
    Number(item.id) === Number(updatedVacancy.id)
      ? { ...item, ...updatedVacancy }
      : item
  )

  saveCollection(STORAGE_KEYS.vacancies, updated)
  return updated
}

export function deleteVacancy(id) {
  const updated = getVacancies().filter((item) => Number(item.id) !== Number(id))
  saveCollection(STORAGE_KEYS.vacancies, updated)
  return updated
}

export function getVacancyById(id) {
  return getVacancies().find((item) => Number(item.id) === Number(id))
}

/* ============================================================
   ETAPAS
   ============================================================ */

export function getCandidateStages() {
  const stored = getCollection(STORAGE_KEYS.stages)

  if (stored.length > 0) {
    return stored.sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
  }

  saveCollection(STORAGE_KEYS.stages, DEFAULT_CANDIDATE_STAGES)
  return DEFAULT_CANDIDATE_STAGES
}

export function addCandidateStage(stage) {
  const stages = getCandidateStages()
  const newStage = {
    ...stage,
    id: stage.id || getNextId(stages),
    order: stage.order || stages.length + 1,
    active: stage.active !== false
  }

  saveCollection(STORAGE_KEYS.stages, [...stages, newStage])
  return newStage
}

export function updateCandidateStage(updatedStage) {
  const updated = getCandidateStages().map((stage) =>
    Number(stage.id) === Number(updatedStage.id)
      ? { ...stage, ...updatedStage }
      : stage
  )

  saveCollection(STORAGE_KEYS.stages, updated)
  return updated
}

/* ============================================================
   CANDIDATOS
   ============================================================ */

export function getCandidates() {
  return getCollection(STORAGE_KEYS.candidates)
}

export function addCandidate(candidate) {
  const candidates = getCandidates()

  const newCandidate = {
    ...candidate,
    id: candidate.id || getNextId(candidates),
    createdAt: candidate.createdAt || getNow(),
    updatedAt: getNow(),
    status: candidate.status || 'em_processo',
    stageId: candidate.stageId || 1,
    history: Array.isArray(candidate.history)
      ? candidate.history
      : [
          {
            id: Date.now(),
            type: 'created',
            date: getNow(),
            description: 'Candidato cadastrado'
          }
        ]
  }

  saveCollection(STORAGE_KEYS.candidates, [...candidates, newCandidate])
  return newCandidate
}

export function updateCandidate(updatedCandidate) {
  const updated = getCandidates().map((candidate) =>
    Number(candidate.id) === Number(updatedCandidate.id)
      ? { ...candidate, ...updatedCandidate, updatedAt: getNow() }
      : candidate
  )

  saveCollection(STORAGE_KEYS.candidates, updated)
  return updated
}

export function deleteCandidate(id) {
  const updated = getCandidates().filter(
    (candidate) => Number(candidate.id) !== Number(id)
  )

  saveCollection(STORAGE_KEYS.candidates, updated)
  return updated
}

export function moveCandidateToStage(candidateId, stageId, description = '') {
  const stages = getCandidateStages()
  const stage = stages.find((item) => Number(item.id) === Number(stageId))
  const candidates = getCandidates()

  if (!stage) return null

  const updated = candidates.map((candidate) => {
    if (Number(candidate.id) !== Number(candidateId)) return candidate

    const history = Array.isArray(candidate.history)
      ? candidate.history
      : []

    return {
      ...candidate,
      stageId: stage.id,
      status:
        stage.name.toLowerCase() === 'aprovação'
          ? 'aprovado'
          : stage.name.toLowerCase() === 'reprovação'
            ? 'reprovado'
            : 'em_processo',
      updatedAt: getNow(),
      history: [
        ...history,
        {
          id: Date.now(),
          type: 'stage_change',
          date: getNow(),
          stageId: stage.id,
          description:
            description || `Movido para a etapa "${stage.name}".`
        }
      ]
    }
  })

  saveCollection(STORAGE_KEYS.candidates, updated)
  return updated.find((candidate) => Number(candidate.id) === Number(candidateId))
}

/* ============================================================
   ENTREVISTAS
   ============================================================ */

export function getInterviews() {
  return getCollection(STORAGE_KEYS.interviews)
}

export function addInterview(interview) {
  const interviews = getInterviews()

  const newInterview = {
    ...interview,
    id: interview.id || getNextId(interviews),
    createdAt: interview.createdAt || getNow(),
    status: interview.status || 'agendada'
  }

  saveCollection(STORAGE_KEYS.interviews, [...interviews, newInterview])
  return newInterview
}

export function updateInterview(updatedInterview) {
  const updated = getInterviews().map((interview) =>
    Number(interview.id) === Number(updatedInterview.id)
      ? { ...interview, ...updatedInterview }
      : interview
  )

  saveCollection(STORAGE_KEYS.interviews, updated)
  return updated
}

export function deleteInterview(id) {
  const updated = getInterviews().filter(
    (interview) => Number(interview.id) !== Number(id)
  )

  saveCollection(STORAGE_KEYS.interviews, updated)
  return updated
}


/* ============================================================
   LINKS PÚBLICOS DE CANDIDATURA
   ============================================================ */

function createToken() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}

export function getApplicationLinks() {
  return getCollection(STORAGE_KEYS.applicationLinks)
}

export function createApplicationLink({ vacancyId, expiresInHours }) {
  const vacancy = getVacancyById(vacancyId)

  if (!vacancy) {
    throw new Error('Vaga não encontrada.')
  }

  const hours = Number(expiresInHours)

  if (!Number.isFinite(hours) || hours <= 0) {
    throw new Error('Informe uma validade válida para o link.')
  }

  const links = getApplicationLinks()
  const token = createToken()
  const createdAt = getNow()
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

  const link = {
    id: getNextId(links),
    token,
    vacancyId: vacancy.id,
    vacancyTitle: vacancy.title || '',
    createdAt,
    expiresAt,
    active: true
  }

  saveCollection(STORAGE_KEYS.applicationLinks, [...links, link])
  return link
}

export function getApplicationLinkByToken(token) {
  if (!token) return null

  const link = getApplicationLinks().find((item) => item.token === token)

  if (!link) return null

  if (!link.active || new Date(link.expiresAt).getTime() <= Date.now()) {
    return null
  }

  const vacancy = getVacancyById(link.vacancyId)

  if (!vacancy || vacancy.active === false || vacancy.status !== 'aberta') {
    return null
  }

  return {
    ...link,
    vacancy
  }
}

export function revokeApplicationLink(id) {
  const updated = getApplicationLinks().map((item) =>
    Number(item.id) === Number(id)
      ? { ...item, active: false, revokedAt: getNow() }
      : item
  )

  saveCollection(STORAGE_KEYS.applicationLinks, updated)
  return updated
}

export function deleteApplicationLink(id) {
  const updated = getApplicationLinks().filter(
    (item) => Number(item.id) !== Number(id)
  )

  saveCollection(STORAGE_KEYS.applicationLinks, updated)
  return updated
}

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

export function initializeRecruitment() {
  const stages = getCandidateStages()

  return {
    vacancies: getVacancies(),
    candidates: getCandidates(),
    stages,
    interviews: getInterviews(),
    applicationLinks: getApplicationLinks()
  }
}
