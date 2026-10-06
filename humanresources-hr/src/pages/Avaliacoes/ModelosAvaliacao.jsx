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
  getActiveEvaluationModels,
  getEvaluationModelTypeLabel,
  getEvaluationModels,
  getResponsibleTypeLabel,
  setEvaluationModelActive,
  updateEvaluationModel,
  validateEvaluationModel
} from '../../services/evaluationModels'

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
    setShowForm(false)

    setEditingId(null)

    setError('')
  }

  function handleModelChange(event) {
    const { name, value, type, checked } = event.target

    setModel((previous) => ({
      ...previous,

      [name]: type === 'checkbox' ? checked : value
    }))
  }

  function addStage() {
    setModel((previous) => ({
      ...previous,

      stages: [...previous.stages, createInitialStage()]
    }))
  }

  function updateStage(stageIndex, field, value) {
    setModel((previous) => ({
      ...previous,

      stages: previous.stages.map((stage, index) =>
        index === stageIndex
          ? {
              ...stage,

              [field]: value
            }
          : stage
      )
    }))
  }

  function removeStage(stageIndex) {
    setModel((previous) => ({
      ...previous,

      stages: previous.stages.filter((_, index) => index !== stageIndex)
    }))
  }

  function addQuestion(stageIndex) {
    const question = createEvaluationQuestion({
      type: 'scale'
    })

    setModel((previous) => ({
      ...previous,

      stages: previous.stages.map((stage, index) =>
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
    setModel((previous) => ({
      ...previous,

      stages: previous.stages.map((stage, index) =>
        index === stageIndex
          ? {
              ...stage,

              questions: stage.questions.map((question, currentIndex) =>
                currentIndex === questionIndex
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
    setModel((previous) => ({
      ...previous,

      stages: previous.stages.map((stage, index) =>
        index === stageIndex
          ? {
              ...stage,

              questions: stage.questions.filter(
                (_, currentIndex) => currentIndex !== questionIndex
              )
            }
          : stage
      )
    }))
  }

  function add180Question() {
    const question = createEvaluationQuestion({
      type: 'scale'
    })

    setModel((previous) => ({
      ...previous,

      evaluation180Questions: [...previous.evaluation180Questions, question]
    }))
  }

  function update180Question(questionIndex, field, value) {
    setModel((previous) => ({
      ...previous,

      evaluation180Questions: previous.evaluation180Questions.map(
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
    setModel((previous) => ({
      ...previous,

      evaluation180Questions: previous.evaluation180Questions.filter(
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
        id: editingId,

        ...model,

        stages: model.stages.map((stage) => createEvaluationStage(stage))
      })

      if (!updated) {
        setError('Não foi possível atualizar o modelo.')

        return
      }
    } else {
      addEvaluationModel({
        ...model,

        stages: model.stages.map((stage) => createEvaluationStage(stage))
      })
    }

    setModels(getEvaluationModels())

    closeForm()
  }

  function handleDelete(modelId) {
    const selected = models.find((item) => String(item.id) === String(modelId))

    if (!selected) {
      return
    }

    const confirmed = window.confirm(
      `Deseja excluir o modelo "${selected.name}"?`
    )

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

  function handleToggleActive(model) {
    setEvaluationModelActive(model.id, model.active === false)

    setModels(getEvaluationModels())
  }

  return (
    <div className="evaluations-page">
      <header className="evaluations-header">
        <div>
          <span className="evaluations-eyebrow">AVALIAÇÕES</span>

          <h1>Modelos de avaliação</h1>

          <p>
            Crie os modelos que serão utilizados nas avaliações de desempenho.
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

            <p>Crie o primeiro modelo de avaliação.</p>
          </div>
        ) : (
          <div className="evaluation-model-grid">
            {filteredModels.map((item) => (
              <article key={item.id} className="evaluation-model-card">
                <div className="evaluation-model-card-top">
                  <span
                    className={`evaluation-status ${
                      item.active ? 'completed' : 'cancelled'
                    }`}
                  >
                    {item.active ? 'Ativo' : 'Inativo'}
                  </span>

                  <span>{item.stages?.length} etapa(s)</span>
                </div>

                <h3>{item.name}</h3>

                <p>{item.description || 'Sem descrição.'}</p>

                <div className="evaluation-model-info">
                  <span>{getEvaluationModelTypeLabel(item.type)}</span>

                  <span>PDI obrigatório</span>

                  <span>
                    180°: {item.evaluation180?.enabled ? 'Sim' : 'Não'}
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
                    {item.active ? 'Desativar' : 'Ativar'}
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
            <form onSubmit={handleSubmit}>
              <header className="evaluations-modal-header">
                <div>
                  <span className="evaluations-eyebrow">MODELO</span>

                  <h2>{editingId ? 'Editar modelo' : 'Novo modelo'}</h2>
                </div>

                <button
                  type="button"
                  className="evaluations-modal-close"
                  onClick={closeForm}
                >
                  ×
                </button>
              </header>

              <div className="evaluations-modal-body">
                {error && <div className="evaluations-error">{error}</div>}

                <section className="evaluation-builder-section">
                  <h3>Informações do modelo</h3>

                  <div className="evaluations-form-grid">
                    <div className="evaluations-form-field">
                      <label>Nome *</label>

                      <input
                        name="name"
                        value={model.name}
                        onChange={handleModelChange}
                        placeholder="Ex.: Avaliação de desempenho - Motoristas"
                      />
                    </div>

                    <div className="evaluations-form-field">
                      <label>Tipo *</label>

                      <select
                        name="type"
                        value={model.type}
                        onChange={handleModelChange}
                      >
                        {EVALUATION_MODEL_TYPES.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="evaluations-form-field evaluations-form-field-full">
                      <label>Descrição</label>

                      <textarea
                        name="description"
                        value={model.description}
                        onChange={handleModelChange}
                        rows="3"
                        placeholder="Explique para que este modelo será utilizado."
                      />
                    </div>
                  </div>
                </section>

                <section className="evaluation-builder-section">
                  <div className="evaluation-section-heading">
                    <div>
                      <h3>Etapas</h3>

                      <p>
                        Cada etapa possui seu próprio responsável e perguntas.
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
                    <div className="evaluations-empty small">
                      Adicione pelo menos uma etapa.
                    </div>
                  ) : (
                    <div className="evaluation-stages-builder">
                      {model.stages.map((stage, stageIndex) => (
                        <div
                          className="evaluation-stage-builder"
                          key={stage.id || stageIndex}
                        >
                          <div className="evaluation-stage-heading">
                            <div>
                              <span>ETAPA {stageIndex + 1}</span>

                              <h4>{stage.name || `Etapa ${stageIndex + 1}`}</h4>
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
                            <div className="evaluations-form-field">
                              <label>Nome da etapa *</label>

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
                            </div>

                            <div className="evaluations-form-field">
                              <label>Responsável *</label>

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
                                {EVALUATION_RESPONSIBLE_TYPES.map((item) => (
                                  <option key={item.value} value={item.value}>
                                    {item.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="evaluations-form-field evaluations-form-field-full">
                              <label>Descrição</label>

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
                              />
                            </div>
                          </div>

                          <div className="evaluation-questions-builder">
                            <div className="evaluation-section-heading">
                              <h4>Perguntas</h4>

                              <button
                                type="button"
                                className="evaluations-secondary-button"
                                onClick={() => addQuestion(stageIndex)}
                              >
                                + Pergunta
                              </button>
                            </div>

                            {stage.questions.length === 0 ? (
                              <p className="evaluation-muted">
                                Nenhuma pergunta adicionada.
                              </p>
                            ) : (
                              stage.questions.map((question, questionIndex) => (
                                <div
                                  className="evaluation-question-builder"
                                  key={question.id || questionIndex}
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
                                      placeholder="Digite a pergunta"
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
                                      {EVALUATION_QUESTION_TYPES.map((item) => (
                                        <option
                                          key={item.value}
                                          value={item.value}
                                        >
                                          {item.label}
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
                                    ×
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

                <section className="evaluation-builder-section">
                  <div className="evaluation-section-heading">
                    <div>
                      <h3>PDI</h3>

                      <p>
                        O PDI é obrigatório e será preenchido pelo gerente ou
                        supervisor do setor.
                      </p>
                    </div>

                    <span className="evaluation-fixed-badge">Obrigatório</span>
                  </div>

                  <div className="evaluation-pdi-fixed">
                    {[
                      'Quais são os pontos positivos do funcionário?',
                      'Quais são os pontos negativos ou pontos a desenvolver?',
                      'Quais pontos precisam ser desenvolvidos?',
                      'Quais ações serão realizadas para o desenvolvimento?'
                    ].map((question, index) => (
                      <div key={question} className="evaluation-pdi-question">
                        <span>{index + 1}</span>

                        <strong>{question}</strong>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="evaluation-builder-section">
                  <div className="evaluation-section-heading">
                    <div>
                      <h3>Avaliação 180°</h3>

                      <p>
                        Após o PDI, o funcionário poderá avaliar seu supervisor.
                      </p>
                    </div>

                    <label className="evaluation-toggle">
                      <input
                        type="checkbox"
                        name="evaluation180Enabled"
                        checked={model.evaluation180Enabled}
                        onChange={handleModelChange}
                      />
                      Ativar 180°
                    </label>
                  </div>

                  {model.evaluation180Enabled && (
                    <div className="evaluation-180-builder">
                      <div className="evaluation-section-heading">
                        <h4>Perguntas do 180°</h4>

                        <button
                          type="button"
                          className="evaluations-secondary-button"
                          onClick={add180Question}
                        >
                          + Pergunta
                        </button>
                      </div>

                      {model.evaluation180Questions.map((question, index) => (
                        <div
                          className="evaluation-question-builder"
                          key={question.id || index}
                        >
                          <div className="evaluation-question-number">
                            {index + 1}
                          </div>

                          <div className="evaluation-question-fields">
                            <input
                              value={question.text}
                              onChange={(event) =>
                                update180Question(
                                  index,
                                  'text',
                                  event.target.value
                                )
                              }
                              placeholder="Digite a pergunta"
                            />

                            <select
                              value={question.type}
                              onChange={(event) =>
                                update180Question(
                                  index,
                                  'type',
                                  event.target.value
                                )
                              }
                            >
                              {EVALUATION_QUESTION_TYPES.map((item) => (
                                <option key={item.value} value={item.value}>
                                  {item.label}
                                </option>
                              ))}
                            </select>

                            <label className="evaluation-checkbox">
                              <input
                                type="checkbox"
                                checked={question.required !== false}
                                onChange={(event) =>
                                  update180Question(
                                    index,
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
                            onClick={() => remove180Question(index)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <footer className="evaluations-modal-footer">
                <button
                  type="button"
                  className="evaluations-secondary-button"
                  onClick={closeForm}
                >
                  Cancelar
                </button>

                <button type="submit" className="evaluations-primary-button">
                  Salvar modelo
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
