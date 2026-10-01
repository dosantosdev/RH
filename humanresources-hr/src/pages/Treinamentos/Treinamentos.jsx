import { useEffect, useState } from 'react'

import './treinamentos.css'

import TrainingContent from '../../components/trainings/TrainingContent'
import TrainingParticipants from '../../components/trainings/TrainingParticipants'
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

  const [selectedTraining, setSelectedTraining] = useState(null)

  const [selectedParticipantsTraining, setSelectedParticipantsTraining] =
    useState(null)

  const [selectedAssessmentTraining, setSelectedAssessmentTraining] =
    useState(null)

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

    setTraining(initialTraining)

    setShowForm(false)
  }

  function handleOpenForm() {
    setTraining(initialTraining)

    setShowForm(true)
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
      {/* ==============================
          CABEÇALHO
      ============================== */}

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

      {/* ==============================
          RESUMO
      ============================== */}

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

      {/* ==============================
          LISTAGEM
      ============================== */}

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
                    onClick={() => setSelectedAssessmentTraining(item)}
                  >
                    Avaliação
                  </button>

                  <button type="button">Visualizar</button>

                  <button type="button">Editar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ==============================
          MODAL - NOVO TREINAMENTO
      ============================== */}

      {showForm && (
        <div className="training-modal-overlay">
          <div className="training-modal">
            <div className="training-modal-header">
              <div>
                <h2>Novo treinamento</h2>

                <p>Preencha as informações básicas do treinamento.</p>
              </div>

              <button
                type="button"
                className="training-modal-close"
                onClick={() => setShowForm(false)}
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
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </button>

                <button type="submit" className="training-primary-button">
                  Salvar treinamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================
          MODAL - CONTEÚDOS
      ============================== */}

      {selectedTraining && (
        <TrainingContent
          training={selectedTraining}
          onClose={() => setSelectedTraining(null)}
          onUpdate={handleUpdateTraining}
        />
      )}

      {/* ==============================
          MODAL - PARTICIPANTES
      ============================== */}

      {selectedParticipantsTraining && (
        <TrainingParticipants
          training={selectedParticipantsTraining}
          onClose={() => setSelectedParticipantsTraining(null)}
        />
      )}

      {/* ==============================
          MODAL - AVALIAÇÃO
      ============================== */}

      {selectedAssessmentTraining && (
        <TrainingAssessment
          training={selectedAssessmentTraining}
          onClose={() => setSelectedAssessmentTraining(null)}
        />
      )}
    </div>
  )
}
