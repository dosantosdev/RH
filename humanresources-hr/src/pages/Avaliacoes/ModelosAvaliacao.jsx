import { useMemo, useState } from 'react'

import {
  addEvaluationModel,
  createEvaluationQuestion,
  createEvaluationStage,
  deleteEvaluationModel,
  duplicateEvaluationModel,
  EVALUATION_MODEL_TYPES,
  EVALUATION_QUESTION_TYPES,
  EVALUATION_RESPONSIBLE_TYPES,
  getEvaluationModelTypeLabel,
  getEvaluationModels,
  getResponsibleTypeLabel,
  setEvaluationModelActive,
  updateEvaluationModel,
  validateEvaluationModel
} from '../../services/evaluationModels'

import { getStoredArray } from '../../services/storage'

import './avaliacoes.css'

function createInitialModel() {
  return {
    name: '',
    description: '',
    type: 'performance',
    active: true,
    stages: [],
    evaluation180Enabled: false,
    evaluation180Questions: []
  }
}

function createInitialStage() {
  return {
    name: '',
    description: '',
    responsibleType: 'specific_user',
    responsibleUserId: '',
    responsibleUserName: '',
    questions: []
  }
}

export default function ModelosAvaliacao() {
  const [models, setModels] = useState(getEvaluationModels)

  const [users] = useState(() =>
    getStoredArray('users').filter((user) => user.active !== false)
  )

  const [model, setModel] = useState(createInitialModel())

  const [editingId, setEditingId] = useState(null)

  const [search, setSearch] = useState('')

  const [showForm, setShowForm] = useState(false)

  const [error, setError] = useState('')

  const filteredModels = useMemo(() => {
    const value = search.trim().toLowerCase()

    if (!value) {
      return models
    }

    return models.filter(
      (item) =>
        item.name?.toLowerCase().includes(value) ||
        item.description?.toLowerCase().includes(value)
    )
  }, [models, search])

  function openNewModel() {
    setModel(createInitialModel())

    setEditingId(null)

    setError('')

    setShowForm(true)
  }

  function openEditModel(selectedModel) {
    setModel({
      name: selectedModel.name || '',

      description: selectedModel.description || '',

      type: selectedModel.type || 'performance',

      active: selectedModel.active !== false,

      stages: (selectedModel.stages || []).map((stage) => ({
        ...stage,

        questions: (stage.questions || []).map((question) => ({
          ...question
        }))
      })),

      evaluation180Enabled: selectedModel.evaluation180?.enabled === true,

      evaluation180Questions: (
        selectedModel.evaluation180?.questions || []
      ).map((question) => ({
        ...question
      }))
    })

    setEditingId(selectedModel.id)

    setError('')

    setShowForm(true)
  }

  function closeForm() {
    setModel(createInitialModel())

    setEditingId(null)

    setError('')

    setShowForm(false)
  }

  function handleModelChange(event) {
    const { name, value, type, checked } = event.target

    setModel((current) => ({
      ...current,

      [name]: type === 'checkbox' ? checked : value
    }))
  }

  function addStage() {
    setModel((current) => ({
      ...current,

      stages: [...current.stages, createEvaluationStage(createInitialStage())]
    }))
  }

  function updateStage(stageIndex, field, value) {
    setModel((current) => ({
      ...current,

      stages: current.stages.map((stage, index) =>
        index === stageIndex
          ? {
              ...stage,
              [field]: value,

              ...(field === 'responsibleType' && value !== 'specific_user'
                ? {
                    responsibleUserId: '',
                    responsibleUserName: ''
                  }
                : {})
            }
          : stage
      )
    }))
  }

  function removeStage(stageIndex) {
    setModel((current) => ({
      ...current,

      stages: current.stages.filter((_, index) => index !== stageIndex)
    }))
  }

  function addQuestion(stageIndex) {
    const question = createEvaluationQuestion()

    setModel((current) => ({
      ...current,

      stages: current.stages.map((stage, index) =>
        index === stageIndex
          ? {
              ...stage,

              questions: [...stage.questions, question]
            }
          : stage
      )
    }))
  }

  function updateQuestion(stageIndex, questionIndex, field, value) {
    setModel((current) => ({
      ...current,

      stages: current.stages.map((stage, stagePosition) =>
        stagePosition === stageIndex
          ? {
              ...stage,

              questions: stage.questions.map((question, questionPosition) =>
                questionPosition === questionIndex
                  ? {
                      ...question,
                      [field]: value
                    }
                  : question
              )
            }
          : stage
      )
    }))
  }

  function removeQuestion(stageIndex, questionIndex) {
    setModel((current) => ({
      ...current,

      stages: current.stages.map((stage, stagePosition) =>
        stagePosition === stageIndex
          ? {
              ...stage,

              questions: stage.questions.filter(
                (_, questionPosition) => questionPosition !== questionIndex
              )
            }
          : stage
      )
    }))
  }

  function add180Question() {
    const question = createEvaluationQuestion()

    setModel((current) => ({
      ...current,

      evaluation180Questions: [...current.evaluation180Questions, question]
    }))
  }

  function update180Question(questionIndex, field, value) {
    setModel((current) => ({
      ...current,

      evaluation180Questions: current.evaluation180Questions.map(
        (question, index) =>
          index === questionIndex
            ? {
                ...question,
                [field]: value
              }
            : question
      )
    }))
  }

  function remove180Question(questionIndex) {
    setModel((current) => ({
      ...current,

      evaluation180Questions: current.evaluation180Questions.filter(
        (_, index) => index !== questionIndex
      )
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    setError('')

    const validation = validateEvaluationModel(model)

    if (!validation.valid) {
      setError(validation.errors.join(' '))

      return
    }

    if (editingId) {
      const updated = updateEvaluationModel({
        ...model,
        id: editingId
      })

      if (!updated) {
        setError('Não foi possível atualizar o modelo.')

        return
      }
    } else {
      addEvaluationModel(model)
    }

    setModels(getEvaluationModels())

    closeForm()
  }

  function handleDelete(modelId) {
    const confirmed = window.confirm('Deseja realmente excluir este modelo?')

    if (!confirmed) {
      return
    }

    deleteEvaluationModel(modelId)

    setModels(getEvaluationModels())
  }

  function handleDuplicate(modelId) {
    duplicateEvaluationModel(modelId)

    setModels(getEvaluationModels())
  }

  function handleToggleActive(selectedModel) {
    setEvaluationModelActive(selectedModel.id, selectedModel.active === false)

    setModels(getEvaluationModels())
  }

  return (
    <div className="evaluations-page">
      <header className="evaluations-header">
        <div>
          <span className="evaluations-eyebrow">AVALIAÇÕES</span>

          <h1>Modelos de avaliação</h1>

          <p>
            Crie modelos personalizados para definir etapas, responsáveis e
            perguntas.
          </p>
        </div>

        <button
          type="button"
          className="evaluations-primary-button"
          onClick={openNewModel}
        >
          + Novo modelo
        </button>
      </header>

      <section className="evaluations-card">
        <div className="evaluations-toolbar">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar modelo..."
          />
        </div>

        {filteredModels.length === 0 ? (
          <div className="evaluations-empty">
            <strong>Nenhum modelo encontrado.</strong>

            <p>Crie o primeiro modelo de avaliação para começar.</p>
          </div>
        ) : (
          <div className="evaluation-model-grid">
            {filteredModels.map((item) => (
              <article className="evaluation-model-card" key={item.id}>
                <div className="evaluation-model-card-top">
                  <span>{getEvaluationModelTypeLabel(item.type)}</span>

                  <span
                    className={
                      item.active !== false
                        ? 'evaluation-status completed'
                        : 'evaluation-status cancelled'
                    }
                  >
                    {item.active !== false ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <h3>{item.name}</h3>

                <p>{item.description || 'Sem descrição.'}</p>

                <div className="evaluation-model-info">
                  <span>
                    <strong>{item.stages?.length || 0}</strong> etapa(s)
                  </span>

                  <span>
                    <strong>
                      {item.stages?.reduce(
                        (total, stage) =>
                          total + (stage.questions?.length || 0),
                        0
                      )}
                    </strong>{' '}
                    pergunta(s)
                  </span>

                  <span>PDI obrigatório</span>

                  <span>
                    180°:{' '}
                    {item.evaluation180?.enabled ? 'Ativo' : 'Não utilizado'}
                  </span>
                </div>

                <div className="evaluation-actions">
                  <button type="button" onClick={() => openEditModel(item)}>
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDuplicate(item.id)}
                  >
                    Duplicar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(item)}
                  >
                    {item.active !== false ? 'Desativar' : 'Ativar'}
                  </button>

                  <button
                    type="button"
                    className="danger"
                    onClick={() => handleDelete(item.id)}
                  >
                    Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {showForm && (
        <div className="evaluations-modal-overlay">
          <div className="evaluations-modal evaluations-modal-large">
            <header className="evaluations-modal-header">
              <div>
                <span className="evaluations-eyebrow">
                  {editingId ? 'EDITAR MODELO' : 'NOVO MODELO'}
                </span>

                <h2>
                  {editingId ? 'Editar modelo' : 'Criar modelo de avaliação'}
                </h2>

                <p>Configure as etapas e responsáveis do processo.</p>
              </div>

              <button
                type="button"
                className="evaluations-modal-close"
                onClick={closeForm}
              >
                ×
              </button>
            </header>

            <form className="evaluations-modal-body" onSubmit={handleSubmit}>
              {error && <div className="evaluation-error">{error}</div>}

              <section className="evaluation-form-section">
                <div className="evaluation-section-heading">
                  <div>
                    <span>CONFIGURAÇÃO</span>

                    <h3>Informações do modelo</h3>
                  </div>
                </div>

                <div className="evaluations-form-grid">
                  <label>
                    Nome do modelo *
                    <input
                      name="name"
                      value={model.name}
                      onChange={handleModelChange}
                      placeholder="Ex.: Avaliação anual"
                    />
                  </label>

                  <label>
                    Tipo *
                    <select
                      name="type"
                      value={model.type}
                      onChange={handleModelChange}
                    >
                      {EVALUATION_MODEL_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="evaluations-form-field-full">
                    Descrição
                    <textarea
                      name="description"
                      value={model.description}
                      onChange={handleModelChange}
                      rows="3"
                      placeholder="Explique para que este modelo será utilizado."
                    />
                  </label>

                  <label className="evaluation-toggle">
                    <input
                      type="checkbox"
                      name="active"
                      checked={model.active}
                      onChange={handleModelChange}
                    />
                    Modelo ativo
                  </label>
                </div>
              </section>

              <section className="evaluation-form-section">
                <div className="evaluation-section-heading">
                  <div>
                    <span>FLUXO</span>

                    <h3>Etapas da avaliação</h3>

                    <p>
                      As etapas serão executadas em ordem. A próxima etapa só
                      será liberada depois da conclusão da anterior.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="evaluations-secondary-button"
                    onClick={addStage}
                  >
                    + Adicionar etapa
                  </button>
                </div>

                {model.stages.length === 0 ? (
                  <div className="evaluation-muted">
                    Nenhuma etapa adicionada.
                  </div>
                ) : (
                  <div className="evaluation-stage-list">
                    {model.stages.map((stage, stageIndex) => (
                      <div className="evaluation-stage-builder" key={stage.id}>
                        <div className="evaluation-stage-heading">
                          <div>
                            <span>ETAPA {stageIndex + 1}</span>

                            <h4>{stage.name || 'Nova etapa'}</h4>
                          </div>

                          <button
                            type="button"
                            className="danger-text-button"
                            onClick={() => removeStage(stageIndex)}
                          >
                            Remover etapa
                          </button>
                        </div>

                        <div className="evaluations-form-grid">
                          <label>
                            Nome da etapa *
                            <input
                              value={stage.name}
                              onChange={(event) =>
                                updateStage(
                                  stageIndex,
                                  'name',
                                  event.target.value
                                )
                              }
                              placeholder="Ex.: Avaliação do gerente"
                            />
                          </label>

                          <label>
                            Responsável *
                            <select
                              value={stage.responsibleType}
                              onChange={(event) =>
                                updateStage(
                                  stageIndex,
                                  'responsibleType',
                                  event.target.value
                                )
                              }
                            >
                              {EVALUATION_RESPONSIBLE_TYPES.map(
                                (responsible) => (
                                  <option
                                    key={responsible.value}
                                    value={responsible.value}
                                  >
                                    {responsible.label}
                                  </option>
                                )
                              )}
                            </select>
                          </label>

                          {stage.responsibleType === 'specific_user' && (
                            <label>
                              Usuário responsável *
                              <select
                                value={stage.responsibleUserId}
                                onChange={(event) => {
                                  const selectedUser = users.find(
                                    (user) =>
                                      String(user.id) ===
                                      String(event.target.value)
                                  )

                                  updateStage(
                                    stageIndex,
                                    'responsibleUserId',
                                    event.target.value
                                  )

                                  updateStage(
                                    stageIndex,
                                    'responsibleUserName',
                                    selectedUser?.name ||
                                      selectedUser?.username ||
                                      ''
                                  )
                                }}
                              >
                                <option value="">Selecione o usuário</option>

                                {users.map((user) => (
                                  <option key={user.id} value={user.id}>
                                    {user.name || user.username}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}

                          <label className="evaluations-form-field-full">
                            Descrição
                            <textarea
                              value={stage.description}
                              onChange={(event) =>
                                updateStage(
                                  stageIndex,
                                  'description',
                                  event.target.value
                                )
                              }
                              rows="2"
                              placeholder="Explique o objetivo desta etapa."
                            />
                          </label>
                        </div>

                        <div className="evaluation-questions-builder">
                          <div className="evaluation-section-heading">
                            <div>
                              <h4>Perguntas</h4>

                              <p>
                                Defina o que o responsável deverá responder.
                              </p>
                            </div>

                            <button
                              type="button"
                              className="evaluations-secondary-button"
                              onClick={() => addQuestion(stageIndex)}
                            >
                              + Pergunta
                            </button>
                          </div>

                          {stage.questions.length === 0 ? (
                            <div className="evaluation-muted">
                              Nenhuma pergunta adicionada.
                            </div>
                          ) : (
                            stage.questions.map((question, questionIndex) => (
                              <div
                                className="evaluation-question-builder"
                                key={question.id}
                              >
                                <div className="evaluation-question-number">
                                  {questionIndex + 1}
                                </div>

                                <div className="evaluation-question-fields">
                                  <input
                                    value={question.text}
                                    onChange={(event) =>
                                      updateQuestion(
                                        stageIndex,
                                        questionIndex,
                                        'text',
                                        event.target.value
                                      )
                                    }
                                    placeholder="Digite a pergunta..."
                                  />

                                  <select
                                    value={question.type}
                                    onChange={(event) =>
                                      updateQuestion(
                                        stageIndex,
                                        questionIndex,
                                        'type',
                                        event.target.value
                                      )
                                    }
                                  >
                                    {EVALUATION_QUESTION_TYPES.map((type) => (
                                      <option
                                        key={type.value}
                                        value={type.value}
                                      >
                                        {type.label}
                                      </option>
                                    ))}
                                  </select>

                                  <label className="evaluation-checkbox">
                                    <input
                                      type="checkbox"
                                      checked={question.required !== false}
                                      onChange={(event) =>
                                        updateQuestion(
                                          stageIndex,
                                          questionIndex,
                                          'required',
                                          event.target.checked
                                        )
                                      }
                                    />
                                    Obrigatória
                                  </label>
                                </div>

                                <button
                                  type="button"
                                  className="danger-text-button"
                                  onClick={() =>
                                    removeQuestion(stageIndex, questionIndex)
                                  }
                                >
                                  Remover
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="evaluation-form-section">
                <div className="evaluation-section-heading">
                  <div>
                    <span>PDI</span>

                    <h3>Plano de Desenvolvimento Individual</h3>

                    <p>
                      O PDI é obrigatório e será preenchido ao final de todas as
                      etapas.
                    </p>
                  </div>

                  <span className="evaluation-fixed-badge">Obrigatório</span>
                </div>

                <div className="evaluation-pdi-fixed">
                  <div className="evaluation-pdi-question">
                    <span>1</span>

                    <strong>
                      Quais são os pontos positivos do funcionário?
                    </strong>
                  </div>

                  <div className="evaluation-pdi-question">
                    <span>2</span>

                    <strong>
                      Quais são os pontos negativos ou pontos a desenvolver?
                    </strong>
                  </div>

                  <div className="evaluation-pdi-question">
                    <span>3</span>

                    <strong>Quais pontos precisam ser desenvolvidos?</strong>
                  </div>

                  <div className="evaluation-pdi-question">
                    <span>4</span>

                    <strong>
                      Quais ações serão realizadas para o desenvolvimento?
                    </strong>
                  </div>
                </div>
              </section>

              <section className="evaluation-form-section">
                <div className="evaluation-section-heading">
                  <div>
                    <span>180°</span>

                    <h3>Avaliação do funcionário para o supervisor</h3>

                    <p>Esta etapa é opcional e só será liberada após o PDI.</p>
                  </div>

                  <label className="evaluation-toggle">
                    <input
                      type="checkbox"
                      checked={model.evaluation180Enabled}
                      onChange={(event) =>
                        setModel((current) => ({
                          ...current,

                          evaluation180Enabled: event.target.checked
                        }))
                      }
                    />
                    Habilitar 180°
                  </label>
                </div>

                {model.evaluation180Enabled && (
                  <div className="evaluation-180-builder">
                    <div className="evaluation-section-heading">
                      <div>
                        <h4>Perguntas do 180°</h4>
                      </div>

                      <button
                        type="button"
                        className="evaluations-secondary-button"
                        onClick={add180Question}
                      >
                        + Pergunta
                      </button>
                    </div>

                    {model.evaluation180Questions.length === 0 ? (
                      <div className="evaluation-muted">
                        Nenhuma pergunta adicionada.
                      </div>
                    ) : (
                      model.evaluation180Questions.map(
                        (question, questionIndex) => (
                          <div
                            className="evaluation-question-builder"
                            key={question.id}
                          >
                            <div className="evaluation-question-number">
                              {questionIndex + 1}
                            </div>

                            <div className="evaluation-question-fields">
                              <input
                                value={question.text}
                                onChange={(event) =>
                                  update180Question(
                                    questionIndex,
                                    'text',
                                    event.target.value
                                  )
                                }
                                placeholder="Digite a pergunta..."
                              />

                              <select
                                value={question.type}
                                onChange={(event) =>
                                  update180Question(
                                    questionIndex,
                                    'type',
                                    event.target.value
                                  )
                                }
                              >
                                {EVALUATION_QUESTION_TYPES.map((type) => (
                                  <option key={type.value} value={type.value}>
                                    {type.label}
                                  </option>
                                ))}
                              </select>

                              <label className="evaluation-checkbox">
                                <input
                                  type="checkbox"
                                  checked={question.required !== false}
                                  onChange={(event) =>
                                    update180Question(
                                      questionIndex,
                                      'required',
                                      event.target.checked
                                    )
                                  }
                                />
                                Obrigatória
                              </label>
                            </div>

                            <button
                              type="button"
                              className="danger-text-button"
                              onClick={() => remove180Question(questionIndex)}
                            >
                              Remover
                            </button>
                          </div>
                        )
                      )
                    )}
                  </div>
                )}
              </section>

              <footer className="evaluations-modal-footer">
                <button
                  type="button"
                  className="evaluations-secondary-button"
                  onClick={closeForm}
                >
                  Cancelar
                </button>

                <button type="submit" className="evaluations-primary-button">
                  {editingId ? 'Salvar alterações' : 'Criar modelo'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
