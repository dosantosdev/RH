import { useEffect, useState } from 'react'

import './treinamentos.css'

import TrainingContent from '../../components/trainings/TrainingContent'
import TrainingParticipants from '../../components/trainings/TrainingParticipants'
import TrainingProgressList from '../../components/trainings/TrainingProgressList'
import TrainingAssessment from '../../components/trainings/TrainingAssessment'

import {
  getTrainings,
  addTraining,
  updateTraining
} from '../../services/training'

export default function Treinamentos() {
  const initialTraining = {
    name: '',
    description: '',
    category: '',
    objective: '',
    duration: '',
    mandatory: false,
    active: true,
    validity: '',
    minimumScore: '',
    allowRetake: true
  }

  const [trainings, setTrainings] = useState([])

  const [training, setTraining] = useState(initialTraining)

  const [showForm, setShowForm] = useState(false)

  const [search, setSearch] = useState('')

  const [editingTraining, setEditingTraining] = useState(null)

  /*
   * Modal de conteúdos
   */
  const [selectedTraining, setSelectedTraining] = useState(null)

  /*
   * Modal de participantes
   *
   * Aqui ficam:
   *
   * - adicionar funcionário
   * - remover funcionário
   * - consultar participantes
   * - avaliação individual
   * - certificado
   */
  const [selectedParticipantsTraining, setSelectedParticipantsTraining] =
    useState(null)

  /*
   * Modal de progresso geral.
   *
   * Mostra todos os participantes e o progresso
   * de cada um.
   */
  const [selectedProgressTraining, setSelectedProgressTraining] = useState(null)

  /*
   * Modal para configuração da avaliação.
   */
  const [selectedAssessmentTraining, setSelectedAssessmentTraining] =
    useState(null)

  /*
   * Modal de visualização.
   */
  const [selectedViewTraining, setSelectedViewTraining] = useState(null)

  useEffect(() => {
    setTrainings(getTrainings())
  }, [])

  function handleChange(e) {
    const { name, value, type, checked } = e.target

    setTraining((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  function handleOpenForm() {
    setTraining({
      ...initialTraining
    })

    setEditingTraining(null)

    setShowForm(true)
  }

  function handleEditTraining(item) {
    setTraining({
      ...item
    })

    setEditingTraining(item)

    setShowForm(true)
  }

  function handleCloseForm() {
    setShowForm(false)

    setEditingTraining(null)

    setTraining({
      ...initialTraining
    })
  }

  function handleUpdateTraining(updatedTraining) {
    const updatedTrainings = updateTraining(updatedTraining)

    setTrainings(updatedTrainings)

    const updatedSelectedTraining = updatedTrainings.find(
      (item) => item.id === updatedTraining.id
    )

    setSelectedTraining(updatedSelectedTraining || null)
  }

  function handleSubmit(e) {
    e.preventDefault()

    if (!training.name.trim()) {
      alert('Informe o nome do treinamento.')
      return
    }

    if (!training.description.trim()) {
      alert('Informe a descrição do treinamento.')
      return
    }

    /*
     * EDIÇÃO
     *
     * Mantemos todos os dados já existentes no treinamento.
     */
    if (editingTraining) {
      const updatedTraining = {
        ...editingTraining,

        ...training,

        duration: Number(training.duration) || 0,

        validity: Number(training.validity) || 0,

        minimumScore: Number(training.minimumScore) || 0
      }

      const updatedTrainings = updateTraining(updatedTraining)

      setTrainings(updatedTrainings)

      setShowForm(false)

      setEditingTraining(null)

      setTraining({
        ...initialTraining
      })

      return
    }

    /*
     * NOVO TREINAMENTO
     */
    const newTraining = {
      ...training,

      id: Date.now(),

      createdAt: new Date().toISOString(),

      duration: Number(training.duration) || 0,

      validity: Number(training.validity) || 0,

      minimumScore: Number(training.minimumScore) || 0,

      participants: 0,

      contents: [],

      questions: [],

      participantIds: []
    }

    const updatedTrainings = addTraining(newTraining)

    setTrainings(updatedTrainings)

    setTraining({
      ...initialTraining
    })

    setShowForm(false)
  }

  const filteredTrainings = trainings.filter((item) =>
    item.name?.toLowerCase().includes(search.toLowerCase())
  )

  const totalParticipants = trainings.reduce(
    (total, item) => total + (item.participants || 0),
    0
  )

  return (
    <div className="trainings-page">
      {/* ==================================================
          CABEÇALHO
      ================================================== */}

      <div className="trainings-header">
        <div>
          <h1>Treinamentos</h1>

          <p>Gerencie treinamentos, conteúdos, avaliações e participantes.</p>
        </div>

        <button
          type="button"
          className="training-primary-button"
          onClick={handleOpenForm}
        >
          + Novo treinamento
        </button>
      </div>

      {/* ==================================================
          RESUMO
      ================================================== */}

      <div className="training-summary">
        <div className="training-summary-card">
          <span className="summary-icon">📚</span>

          <div>
            <strong>{trainings.length}</strong>

            <span>Treinamentos</span>
          </div>
        </div>

        <div className="training-summary-card">
          <span className="summary-icon">👥</span>

          <div>
            <strong>{totalParticipants}</strong>

            <span>Participantes</span>
          </div>
        </div>

        <div className="training-summary-card">
          <span className="summary-icon">✅</span>

          <div>
            <strong>0</strong>

            <span>Concluídos</span>
          </div>
        </div>

        <div className="training-summary-card">
          <span className="summary-icon">⏳</span>

          <div>
            <strong>0</strong>

            <span>Pendentes</span>
          </div>
        </div>
      </div>

      {/* ==================================================
          LISTAGEM
      ================================================== */}

      <div className="trainings-content">
        <div className="trainings-list-header">
          <div>
            <h2>Treinamentos cadastrados</h2>

            <p>Consulte e gerencie os treinamentos da empresa.</p>
          </div>

          <input
            type="text"
            placeholder="Buscar treinamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filteredTrainings.length === 0 ? (
          <div className="trainings-empty">
            <div className="training-empty-icon">📚</div>

            <h3>Nenhum treinamento cadastrado</h3>

            <p>Comece criando o primeiro treinamento da empresa.</p>

            <button
              type="button"
              className="training-primary-button"
              onClick={handleOpenForm}
            >
              + Criar treinamento
            </button>
          </div>
        ) : (
          <div className="trainings-grid">
            {filteredTrainings.map((item) => (
              <div key={item.id} className="training-card">
                <div className="training-card-top">
                  <div>
                    <h3>{item.name}</h3>

                    <span
                      className={
                        item.active
                          ? 'training-status active'
                          : 'training-status inactive'
                      }
                    >
                      {item.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>

                <p>{item.description}</p>

                <div className="training-card-info">
                  <span>📂 {item.category || 'Sem categoria'}</span>

                  <span>🕒 {item.duration || 0} hora(s)</span>

                  <span>👥 {item.participants || 0} participantes</span>

                  {item.mandatory && <span>⚠️ Obrigatório</span>}
                </div>

                {/* ==================================================
                    AÇÕES
                ================================================== */}

                <div className="training-card-actions">
                  <button
                    type="button"
                    onClick={() => setSelectedTraining(item)}
                  >
                    Conteúdos
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedParticipantsTraining(item)}
                  >
                    Participantes
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedProgressTraining(item)}
                  >
                    Progresso
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAssessmentTraining(item)}
                  >
                    Avaliação
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedViewTraining(item)}
                  >
                    Visualizar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEditTraining(item)}
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ==================================================
          MODAL - NOVO / EDITAR TREINAMENTO
      ================================================== */}

      {showForm && (
        <div className="training-modal-overlay">
          <div className="training-modal">
            <div className="training-modal-header">
              <div>
                <h2>
                  {editingTraining ? 'Editar treinamento' : 'Novo treinamento'}
                </h2>

                <p>
                  {editingTraining
                    ? 'Altere as informações do treinamento.'
                    : 'Preencha as informações básicas do treinamento.'}
                </p>
              </div>

              <button
                type="button"
                className="training-modal-close"
                onClick={handleCloseForm}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="training-form">
              {/* INFORMAÇÕES BÁSICAS */}

              <div className="training-form-section">
                <h3>Informações básicas</h3>

                <div className="training-form-grid">
                  <div className="training-field full">
                    <label>Nome do treinamento *</label>

                    <input
                      type="text"
                      name="name"
                      value={training.name}
                      onChange={handleChange}
                      placeholder="Ex.: NR-01 - Integração"
                    />
                  </div>

                  <div className="training-field full">
                    <label>Descrição *</label>

                    <textarea
                      name="description"
                      value={training.description}
                      onChange={handleChange}
                      placeholder="Descreva o treinamento..."
                      rows="4"
                    />
                  </div>

                  <div className="training-field">
                    <label>Categoria</label>

                    <select
                      name="category"
                      value={training.category}
                      onChange={handleChange}
                    >
                      <option value="">Selecione</option>

                      <option value="Segurança">Segurança</option>

                      <option value="Integração">Integração</option>

                      <option value="Operacional">Operacional</option>

                      <option value="Administrativo">Administrativo</option>

                      <option value="Técnico">Técnico</option>

                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div className="training-field">
                    <label>Carga horária (horas)</label>

                    <input
                      type="number"
                      name="duration"
                      min="0"
                      step="0.5"
                      value={training.duration}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="training-field full">
                    <label>Objetivo</label>

                    <textarea
                      name="objective"
                      value={training.objective}
                      onChange={handleChange}
                      placeholder="Qual o objetivo deste treinamento?"
                      rows="3"
                    />
                  </div>
                </div>
              </div>

              {/* CONFIGURAÇÕES */}

              <div className="training-form-section">
                <h3>Configurações</h3>

                <div className="training-form-grid">
                  <div className="training-field">
                    <label>Validade (meses)</label>

                    <input
                      type="number"
                      name="validity"
                      min="0"
                      value={training.validity}
                      onChange={handleChange}
                      placeholder="Ex.: 12"
                    />
                  </div>

                  <div className="training-field">
                    <label>Nota mínima</label>

                    <input
                      type="number"
                      name="minimumScore"
                      min="0"
                      max="100"
                      value={training.minimumScore}
                      onChange={handleChange}
                      placeholder="Ex.: 70"
                    />
                  </div>
                </div>

                <div className="training-options">
                  <label>
                    <input
                      type="checkbox"
                      name="mandatory"
                      checked={training.mandatory}
                      onChange={handleChange}
                    />
                    Treinamento obrigatório
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      name="allowRetake"
                      checked={training.allowRetake}
                      onChange={handleChange}
                    />
                    Permitir refazer a avaliação
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      name="active"
                      checked={training.active}
                      onChange={handleChange}
                    />
                    Treinamento ativo
                  </label>
                </div>
              </div>

              {/* RODAPÉ */}

              <div className="training-modal-footer">
                <button
                  type="button"
                  className="training-secondary-button"
                  onClick={handleCloseForm}
                >
                  Cancelar
                </button>

                <button type="submit" className="training-primary-button">
                  {editingTraining ? 'Salvar alterações' : 'Salvar treinamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================
          MODAL - CONTEÚDOS
      ================================================== */}

      {selectedTraining && (
        <TrainingContent
          training={selectedTraining}
          onClose={() => setSelectedTraining(null)}
          onUpdate={handleUpdateTraining}
        />
      )}

      {/* ==================================================
          MODAL - PARTICIPANTES
      ================================================== */}

      {selectedParticipantsTraining && (
        <TrainingParticipants
          training={selectedParticipantsTraining}
          onClose={() => setSelectedParticipantsTraining(null)}
        />
      )}

      {/* ==================================================
          MODAL - PROGRESSO GERAL
      ================================================== */}

      {selectedProgressTraining && (
        <TrainingProgressList
          training={selectedProgressTraining}
          onClose={() => setSelectedProgressTraining(null)}
        />
      )}

      {/* ==================================================
          MODAL - AVALIAÇÃO
      ================================================== */}

      {selectedAssessmentTraining && (
        <TrainingAssessment
          training={selectedAssessmentTraining}
          onClose={() => setSelectedAssessmentTraining(null)}
        />
      )}

      {/* ==================================================
          MODAL - VISUALIZAR
      ================================================== */}

      {selectedViewTraining && (
        <div
          className="training-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedViewTraining(null)
            }
          }}
        >
          <div
            className="training-content-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* CABEÇALHO */}

            <div className="training-modal-header">
              <div>
                <h2>Visualizar treinamento</h2>

                <p>{selectedViewTraining.name}</p>
              </div>

              <button
                type="button"
                className="training-modal-close"
                onClick={() => setSelectedViewTraining(null)}
              >
                ×
              </button>
            </div>

            {/* CONTEÚDO */}

            <div className="training-content-body">
              <div className="training-view-summary">
                <div className="training-view-item">
                  <span>Nome</span>

                  <strong>{selectedViewTraining.name || '-'}</strong>
                </div>

                <div className="training-view-item">
                  <span>Categoria</span>

                  <strong>
                    {selectedViewTraining.category || 'Sem categoria'}
                  </strong>
                </div>

                <div className="training-view-item">
                  <span>Status</span>

                  <strong>
                    {selectedViewTraining.active ? 'Ativo' : 'Inativo'}
                  </strong>
                </div>

                <div className="training-view-item">
                  <span>Carga horária</span>

                  <strong>{selectedViewTraining.duration || 0} hora(s)</strong>
                </div>

                <div className="training-view-item">
                  <span>Validade</span>

                  <strong>
                    {selectedViewTraining.validity
                      ? `${selectedViewTraining.validity} mês(es)`
                      : 'Não informada'}
                  </strong>
                </div>

                <div className="training-view-item">
                  <span>Nota mínima</span>

                  <strong>{selectedViewTraining.minimumScore || 0}%</strong>
                </div>

                <div className="training-view-item">
                  <span>Participantes</span>

                  <strong>{selectedViewTraining.participants || 0}</strong>
                </div>

                <div className="training-view-item">
                  <span>Obrigatório</span>

                  <strong>
                    {selectedViewTraining.mandatory ? 'Sim' : 'Não'}
                  </strong>
                </div>
              </div>

              {/* DESCRIÇÃO */}

              <div className="training-view-section">
                <h3>Descrição</h3>

                <p className="training-view-text">
                  {selectedViewTraining.description ||
                    'Nenhuma descrição cadastrada.'}
                </p>
              </div>

              {/* OBJETIVO */}

              <div className="training-view-section">
                <h3>Objetivo</h3>

                <p className="training-view-text">
                  {selectedViewTraining.objective ||
                    'Nenhum objetivo informado.'}
                </p>
              </div>

              {/* ESTRUTURA */}

              <div className="training-view-section">
                <h3>Estrutura do treinamento</h3>

                <div className="training-view-summary">
                  <div className="training-view-item">
                    <span>Conteúdos</span>

                    <strong>
                      {selectedViewTraining.contents?.length || 0}
                    </strong>
                  </div>

                  <div className="training-view-item">
                    <span>Perguntas</span>

                    <strong>
                      {selectedViewTraining.questions?.length || 0}
                    </strong>
                  </div>

                  <div className="training-view-item">
                    <span>Participantes</span>

                    <strong>
                      {selectedViewTraining.participantIds?.length ||
                        selectedViewTraining.participants ||
                        0}
                    </strong>
                  </div>

                  <div className="training-view-item">
                    <span>Refazer avaliação</span>

                    <strong>
                      {selectedViewTraining.allowRetake
                        ? 'Permitido'
                        : 'Não permitido'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* RODAPÉ */}

            <div className="training-modal-footer">
              <button
                type="button"
                className="training-secondary-button"
                onClick={() => setSelectedViewTraining(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
