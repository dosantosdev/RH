import React, { useEffect, useState } from 'react'

import {
  addEvaluationModel,
  createEvaluationQuestion,
  createPdiQuestion,
  deleteEvaluationModel,
  deletePdiQuestion,
  getEvaluationModels,
  normalizePdiQuestions,
  updateEvaluationModel,
  updatePdiQuestion
} from '../../services/evaluationModels'

import './avaliacoes.css'

/*
 * ============================================================
 * COMPONENTE
 * ============================================================
 */

export default function ModelosAvaliacao() {
  const [models, setModels] = useState([])

  const [selectedModelId, setSelectedModelId] = useState(null)

  const [isEditing, setIsEditing] = useState(false)

  const [form, setForm] = useState(createEmptyForm())

  const [error, setError] = useState('')

  const [success, setSuccess] = useState('')

  /*
   * ----------------------------------------------------------
   * CARREGAR MODELOS
   * ----------------------------------------------------------
   */

  useEffect(() => {
    loadModels()
  }, [])

  function loadModels() {
    const storedModels = getEvaluationModels()

    setModels(storedModels)
  }

  /*
   * ----------------------------------------------------------
   * NOVO FORMULÁRIO
   * ----------------------------------------------------------
   */

  function createEmptyForm() {
    return {
      name: '',

      description: '',

      type: 'performance',

      active: true,

      stages: [],

      evaluation180Enabled: false,

      evaluation180Questions: [],

      pdiQuestions: normalizePdiQuestions()
    }
  }

  /*
   * ----------------------------------------------------------
   * ABRIR NOVO
   * ----------------------------------------------------------
   */

  function handleNewModel() {
    setSelectedModelId(null)

    setForm(createEmptyForm())

    setIsEditing(true)

    setError('')

    setSuccess('')
  }

  /*
   * ----------------------------------------------------------
   * EDITAR MODELO
   * ----------------------------------------------------------
   */

  function handleEditModel(model) {
    setSelectedModelId(model.id)

    setForm({
      ...model,

      stages: Array.isArray(model.stages) ? model.stages.map(cloneStage) : [],

      evaluation180Questions: Array.isArray(model.evaluation180Questions)
        ? model.evaluation180Questions.map(cloneQuestion)
        : [],

      pdiQuestions: normalizePdiQuestions(model.pdiQuestions).map(cloneQuestion)
    })

    setIsEditing(true)

    setError('')

    setSuccess('')
  }

  /*
   * ----------------------------------------------------------
   * CANCELAR
   * ----------------------------------------------------------
   */

  function handleCancel() {
    setIsEditing(false)

    setSelectedModelId(null)

    setError('')

    setSuccess('')
  }

  /*
   * ----------------------------------------------------------
   * CAMPOS PRINCIPAIS
   * ----------------------------------------------------------
   */

  function handleChange(event) {
    const { name, value, type, checked } = event.target

    setForm((current) => ({
      ...current,

      [name]: type === 'checkbox' ? checked : value
    }))
  }

  /*
   * ==========================================================
   * PDI
   * ==========================================================
   */

  /*
   * ----------------------------------------------------------
   * ALTERAR TEXTO DE PERGUNTA
   * ----------------------------------------------------------
   */

  function handlePdiQuestionTextChange(questionId, value) {
    setForm((current) => ({
      ...current,

      pdiQuestions: current.pdiQuestions.map((question) =>
        String(question.id) === String(questionId)
          ? {
              ...question,

              text: value
            }
          : question
      )
    }))
  }

  /*
   * ----------------------------------------------------------
   * ALTERAR OBRIGATORIEDADE
   * ----------------------------------------------------------
   */

  function handlePdiQuestionRequiredChange(questionId, checked) {
    setForm((current) => ({
      ...current,

      pdiQuestions: current.pdiQuestions.map((question) =>
        String(question.id) === String(questionId)
          ? {
              ...question,

              required: checked
            }
          : question
      )
    }))
  }

  /*
   * ----------------------------------------------------------
   * ADICIONAR PERGUNTA
   * ----------------------------------------------------------
   */

  function handleAddPdiQuestion() {
    const newQuestion = createPdiQuestion({
      text: '',
      required: true
    })

    setForm((current) => ({
      ...current,

      pdiQuestions: [...current.pdiQuestions, newQuestion]
    }))

    setError('')
  }

  /*
   * ----------------------------------------------------------
   * EXCLUIR PERGUNTA
   * ----------------------------------------------------------
   */

  function handleDeletePdiQuestion(questionId) {
    /*
     * A empresa pode ter quantas perguntas quiser, mas o PDI
     * precisa ter pelo menos uma.
     */
    if (form.pdiQuestions.length <= 1) {
      setError('O PDI precisa ter pelo menos uma pergunta.')

      return
    }

    setForm((current) => ({
      ...current,

      pdiQuestions: current.pdiQuestions.filter(
        (question) => String(question.id) !== String(questionId)
      )
    }))

    setError('')
  }

  /*
   * ----------------------------------------------------------
   * MOVER PERGUNTA PARA CIMA
   * ----------------------------------------------------------
   */

  function handleMovePdiQuestionUp(index) {
    if (index <= 0) {
      return
    }

    setForm((current) => {
      const questions = [...current.pdiQuestions]

      const previous = questions[index - 1]

      questions[index - 1] = questions[index]

      questions[index] = previous

      return {
        ...current,

        pdiQuestions: questions
      }
    })
  }

  /*
   * ----------------------------------------------------------
   * MOVER PERGUNTA PARA BAIXO
   * ----------------------------------------------------------
   */

  function handleMovePdiQuestionDown(index) {
    if (index >= form.pdiQuestions.length - 1) {
      return
    }

    setForm((current) => {
      const questions = [...current.pdiQuestions]

      const next = questions[index + 1]

      questions[index + 1] = questions[index]

      questions[index] = next

      return {
        ...current,

        pdiQuestions: questions
      }
    })
  }

  /*
   * ==========================================================
   * ETAPAS
   * ==========================================================
   */

  function handleAddStage() {
    const stage = {
      id: `stage-${Date.now()}`,

      name: '',

      description: '',

      responsibleType: 'department_supervisor',

      responsibleUserId: '',

      responsibleUserName: '',

      questions: []
    }

    setForm((current) => ({
      ...current,

      stages: [...current.stages, stage]
    }))
  }

  function handleRemoveStage(stageId) {
    setForm((current) => ({
      ...current,

      stages: current.stages.filter(
        (stage) => String(stage.id) !== String(stageId)
      )
    }))
  }

  function handleStageChange(stageId, field, value) {
    setForm((current) => ({
      ...current,

      stages: current.stages.map((stage) =>
        String(stage.id) === String(stageId)
          ? {
              ...stage,

              [field]: value
            }
          : stage
      )
    }))
  }

  /*
   * ----------------------------------------------------------
   * PERGUNTAS DAS ETAPAS
   * ----------------------------------------------------------
   */

  function handleAddStageQuestion(stageId) {
    const question = createEvaluationQuestion({
      text: '',
      type: 'scale',
      required: true
    })

    setForm((current) => ({
      ...current,

      stages: current.stages.map((stage) =>
        String(stage.id) === String(stageId)
          ? {
              ...stage,

              questions: [...stage.questions, question]
            }
          : stage
      )
    }))
  }

  function handleStageQuestionChange(stageId, questionId, field, value) {
    setForm((current) => ({
      ...current,

      stages: current.stages.map((stage) => {
        if (String(stage.id) !== String(stageId)) {
          return stage
        }

        return {
          ...stage,

          questions: stage.questions.map((question) =>
            String(question.id) === String(questionId)
              ? {
                  ...question,

                  [field]: value
                }
              : question
          )
        }
      })
    }))
  }

  function handleRemoveStageQuestion(stageId, questionId) {
    setForm((current) => ({
      ...current,

      stages: current.stages.map((stage) =>
        String(stage.id) === String(stageId)
          ? {
              ...stage,

              questions: stage.questions.filter(
                (question) => String(question.id) !== String(questionId)
              )
            }
          : stage
      )
    }))
  }

  /*
   * ==========================================================
   * 180°
   * ==========================================================
   */

  function handleToggle180(event) {
    const enabled = event.target.checked

    setForm((current) => ({
      ...current,

      evaluation180Enabled: enabled,

      evaluation180Questions: enabled
        ? current.evaluation180Questions.length > 0
          ? current.evaluation180Questions
          : [
              createEvaluationQuestion({
                text: '',
                type: 'scale',
                required: true
              })
            ]
        : current.evaluation180Questions
    }))
  }

  function handleAdd180Question() {
    setForm((current) => ({
      ...current,

      evaluation180Questions: [
        ...current.evaluation180Questions,
        createEvaluationQuestion({
          text: '',
          type: 'scale',
          required: true
        })
      ]
    }))
  }

  function handle180QuestionChange(questionId, field, value) {
    setForm((current) => ({
      ...current,

      evaluation180Questions: current.evaluation180Questions.map((question) =>
        String(question.id) === String(questionId)
          ? {
              ...question,

              [field]: value
            }
          : question
      )
    }))
  }

  function handleRemove180Question(questionId) {
    setForm((current) => ({
      ...current,

      evaluation180Questions: current.evaluation180Questions.filter(
        (question) => String(question.id) !== String(questionId)
      )
    }))
  }

  /*
   * ==========================================================
   * SALVAR
   * ==========================================================
   */

  function validateForm() {
    const errors = []

    if (!String(form.name || '').trim()) {
      errors.push('Informe o nome do modelo.')
    }

    if (!Array.isArray(form.pdiQuestions) || form.pdiQuestions.length === 0) {
      errors.push('Cadastre pelo menos uma pergunta no PDI.')
    }

    form.pdiQuestions.forEach((question, index) => {
      if (!String(question.text || '').trim()) {
        errors.push(`Informe o texto da pergunta ${index + 1} do PDI.`)
      }
    })

    form.stages.forEach((stage, stageIndex) => {
      if (!String(stage.name || '').trim()) {
        errors.push(`Informe o nome da etapa ${stageIndex + 1}.`)
      }

      stage.questions.forEach((question, questionIndex) => {
        if (!String(question.text || '').trim()) {
          errors.push(
            `Informe a pergunta ${questionIndex + 1} da etapa "${stage.name}".`
          )
        }
      })
    })

    if (form.evaluation180Enabled) {
      if (form.evaluation180Questions.length === 0) {
        errors.push('Cadastre pelo menos uma pergunta para a avaliação 180°.')
      }

      form.evaluation180Questions.forEach((question, index) => {
        if (!String(question.text || '').trim()) {
          errors.push(
            `Informe o texto da pergunta ${index + 1} da avaliação 180°.`
          )
        }
      })
    }

    return errors
  }

  function handleSave(event) {
    event.preventDefault()

    setError('')

    setSuccess('')

    const errors = validateForm()

    if (errors.length > 0) {
      setError(errors[0])

      return
    }

    const data = {
      ...form,

      name: String(form.name).trim(),

      description: String(form.description || '').trim(),

      pdiRequired: true,

      pdiQuestions: form.pdiQuestions.map((question) => ({
        ...question,

        text: String(question.text || '').trim(),

        type: 'text',

        required: question.required !== false
      })),

      stages: form.stages.map((stage) => ({
        ...stage,

        name: String(stage.name || '').trim(),

        description: String(stage.description || '').trim(),

        questions: stage.questions.map((question) => ({
          ...question,

          text: String(question.text || '').trim()
        }))
      })),

      evaluation180Questions: form.evaluation180Questions.map((question) => ({
        ...question,

        text: String(question.text || '').trim()
      }))
    }

    try {
      let updatedModels

      if (selectedModelId) {
        updatedModels = updateEvaluationModel({
          ...data,

          id: selectedModelId
        })
      } else {
        updatedModels = addEvaluationModel(data)
      }

      setModels(updatedModels)

      setSuccess('Modelo de avaliação salvo com sucesso.')

      setIsEditing(false)

      setSelectedModelId(null)
    } catch (saveError) {
      console.error(saveError)

      setError('Não foi possível salvar o modelo.')
    }
  }

  /*
   * ==========================================================
   * EXCLUIR
   * ==========================================================
   */

  function handleDeleteModel(model) {
    const confirmed = window.confirm(
      `Deseja realmente excluir o modelo "${model.name}"?`
    )

    if (!confirmed) {
      return
    }

    const updatedModels = deleteEvaluationModel(model.id)

    setModels(updatedModels)

    if (selectedModelId === model.id) {
      handleCancel()
    }
  }

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  if (isEditing) {
    return (
      <div className="avaliacoes-page">
        <div className="avaliacoes-header">
          <div>
            <span className="avaliacoes-kicker">CONFIGURAÇÃO</span>

            <h1>
              {selectedModelId
                ? 'Editar modelo de avaliação'
                : 'Novo modelo de avaliação'}
            </h1>

            <p>
              Configure as etapas, perguntas e o Plano de Desenvolvimento
              Individual.
            </p>
          </div>

          <button
            type="button"
            className="avaliacoes-secondary-button"
            onClick={handleCancel}
          >
            Voltar
          </button>
        </div>

        {error && (
          <div className="avaliacoes-alert avaliacao-alert-error">{error}</div>
        )}

        {success && (
          <div className="avaliacoes-alert avaliacao-alert-success">
            {success}
          </div>
        )}

        <form className="avaliacoes-form" onSubmit={handleSave}>
          {/* =================================================
              DADOS DO MODELO
          ================================================== */}

          <section className="avaliacoes-section">
            <div className="avaliacoes-section-header">
              <div>
                <span className="avaliacoes-section-number">01</span>

                <div>
                  <h2>Dados do modelo</h2>

                  <p>Defina as informações básicas da avaliação.</p>
                </div>
              </div>
            </div>

            <div className="avaliacoes-form-grid">
              <div className="avaliacoes-field">
                <label htmlFor="evaluation-name">Nome do modelo</label>

                <input
                  id="evaluation-name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Ex.: Avaliação anual de desempenho"
                />
              </div>

              <div className="avaliacoes-field">
                <label htmlFor="evaluation-type">Tipo</label>

                <select
                  id="evaluation-type"
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                >
                  <option value="performance">Avaliação de desempenho</option>

                  <option value="periodic">Avaliação periódica</option>

                  <option value="probationary">Avaliação de experiência</option>

                  <option value="feedback">Feedback</option>

                  <option value="other">Outra</option>
                </select>
              </div>

              <div className="avaliacoes-field avaliacoes-field-full">
                <label htmlFor="evaluation-description">Descrição</label>

                <textarea
                  id="evaluation-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Descreva a finalidade deste modelo."
                />
              </div>

              <label className="avaliacoes-checkbox">
                <input
                  type="checkbox"
                  name="active"
                  checked={form.active}
                  onChange={handleChange}
                />

                <span>Modelo ativo</span>
              </label>
            </div>
          </section>

          {/* =================================================
              PDI
          ================================================== */}

          <section className="avaliacoes-section avaliacoes-pdi-section">
            <div className="avaliacoes-section-header">
              <div>
                <span className="avaliacoes-section-number">02</span>

                <div>
                  <h2>Plano de Desenvolvimento Individual</h2>

                  <p>
                    A empresa define as perguntas que serão utilizadas no PDI
                    deste modelo.
                  </p>
                </div>
              </div>

              <span className="avaliacoes-section-badge">Configurável</span>
            </div>

            <div className="avaliacoes-info-box">
              <strong>Como funciona o PDI?</strong>

              <p>
                As perguntas abaixo serão copiadas para cada nova avaliação
                criada com este modelo. Alterações futuras no modelo não
                modificam avaliações que já foram iniciadas.
              </p>
            </div>

            <div className="avaliacoes-pdi-list">
              {form.pdiQuestions.map((question, index) => (
                <div className="avaliacoes-pdi-question" key={question.id}>
                  <div className="avaliacoes-pdi-question-top">
                    <div className="avaliacoes-pdi-question-number">
                      {index + 1}
                    </div>

                    <div className="avaliacoes-pdi-question-content">
                      <label>Pergunta</label>

                      <textarea
                        value={question.text}
                        onChange={(event) =>
                          handlePdiQuestionTextChange(
                            question.id,
                            event.target.value
                          )
                        }
                        rows={3}
                        placeholder="Digite a pergunta que a empresa deseja utilizar no PDI..."
                      />
                    </div>
                  </div>

                  <div className="avaliacoes-pdi-question-footer">
                    <label className="avaliacoes-checkbox">
                      <input
                        type="checkbox"
                        checked={question.required !== false}
                        onChange={(event) =>
                          handlePdiQuestionRequiredChange(
                            question.id,
                            event.target.checked
                          )
                        }
                      />

                      <span>Pergunta obrigatória</span>
                    </label>

                    <div className="avaliacoes-pdi-question-actions">
                      <button
                        type="button"
                        className="avaliacoes-icon-button"
                        disabled={index === 0}
                        onClick={() => handleMovePdiQuestionUp(index)}
                        title="Mover para cima"
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        className="avaliacoes-icon-button"
                        disabled={index === form.pdiQuestions.length - 1}
                        onClick={() => handleMovePdiQuestionDown(index)}
                        title="Mover para baixo"
                      >
                        ↓
                      </button>

                      <button
                        type="button"
                        className="avaliacoes-danger-button"
                        onClick={() => handleDeletePdiQuestion(question.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="avaliacoes-add-button"
              onClick={handleAddPdiQuestion}
            >
              + Adicionar pergunta ao PDI
            </button>
          </section>

          {/* =================================================
              ETAPAS
          ================================================== */}

          <section className="avaliacoes-section">
            <div className="avaliacoes-section-header">
              <div>
                <span className="avaliacoes-section-number">03</span>

                <div>
                  <h2>Etapas da avaliação</h2>

                  <p>
                    Configure quem responde e quais perguntas fazem parte de
                    cada etapa.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="avaliacoes-add-button"
                onClick={handleAddStage}
              >
                + Adicionar etapa
              </button>
            </div>

            {form.stages.length === 0 ? (
              <div className="avaliacoes-empty-box">
                <strong>Nenhuma etapa configurada</strong>

                <p>
                  Adicione uma etapa caso este modelo precise de uma avaliação
                  antes do PDI.
                </p>
              </div>
            ) : (
              <div className="avaliacoes-stages-list">
                {form.stages.map((stage, stageIndex) => (
                  <div className="avaliacoes-stage-card" key={stage.id}>
                    <div className="avaliacoes-stage-header">
                      <div>
                        <span>ETAPA {stageIndex + 1}</span>

                        <h3>{stage.name || 'Nova etapa'}</h3>
                      </div>

                      <button
                        type="button"
                        className="avaliacoes-danger-button"
                        onClick={() => handleRemoveStage(stage.id)}
                      >
                        Excluir etapa
                      </button>
                    </div>

                    <div className="avaliacoes-form-grid">
                      <div className="avaliacoes-field">
                        <label>Nome da etapa</label>

                        <input
                          value={stage.name}
                          onChange={(event) =>
                            handleStageChange(
                              stage.id,
                              'name',
                              event.target.value
                            )
                          }
                          placeholder="Ex.: Avaliação do supervisor"
                        />
                      </div>

                      <div className="avaliacoes-field">
                        <label>Responsável</label>

                        <select
                          value={stage.responsibleType}
                          onChange={(event) =>
                            handleStageChange(
                              stage.id,
                              'responsibleType',
                              event.target.value
                            )
                          }
                        >
                          <option value="department_supervisor">
                            Supervisor do setor
                          </option>

                          <option value="branch_manager">
                            Gerente da filial
                          </option>

                          <option value="manager_or_supervisor">
                            Superior hierárquico
                          </option>

                          <option value="instructor">Instrutor</option>

                          <option value="specific_user">
                            Usuário específico
                          </option>
                        </select>
                      </div>

                      <div className="avaliacoes-field avaliacoes-field-full">
                        <label>Descrição</label>

                        <textarea
                          value={stage.description}
                          onChange={(event) =>
                            handleStageChange(
                              stage.id,
                              'description',
                              event.target.value
                            )
                          }
                          rows={3}
                          placeholder="Explique o objetivo desta etapa."
                        />
                      </div>
                    </div>

                    <div className="avaliacoes-stage-questions">
                      <div className="avaliacoes-subsection-header">
                        <div>
                          <h4>Perguntas</h4>

                          <p>Defina as perguntas desta etapa.</p>
                        </div>

                        <button
                          type="button"
                          className="avaliacoes-add-button"
                          onClick={() => handleAddStageQuestion(stage.id)}
                        >
                          + Adicionar pergunta
                        </button>
                      </div>

                      {stage.questions.length === 0 ? (
                        <div className="avaliacoes-empty-box small">
                          Nenhuma pergunta cadastrada.
                        </div>
                      ) : (
                        <div className="avaliacoes-stage-question-list">
                          {stage.questions.map((question, questionIndex) => (
                            <div
                              className="avaliacoes-stage-question"
                              key={question.id}
                            >
                              <div className="avaliacoes-question-number">
                                {questionIndex + 1}
                              </div>

                              <div className="avaliacoes-stage-question-content">
                                <input
                                  value={question.text}
                                  onChange={(event) =>
                                    handleStageQuestionChange(
                                      stage.id,
                                      question.id,
                                      'text',
                                      event.target.value
                                    )
                                  }
                                  placeholder="Digite a pergunta..."
                                />

                                <div className="avaliacoes-stage-question-options">
                                  <select
                                    value={question.type}
                                    onChange={(event) =>
                                      handleStageQuestionChange(
                                        stage.id,
                                        question.id,
                                        'type',
                                        event.target.value
                                      )
                                    }
                                  >
                                    <option value="scale">
                                      Nota de 1 a 10
                                    </option>

                                    <option value="text">Texto</option>

                                    <option value="yes_no">Sim / Não</option>
                                  </select>

                                  <label className="avaliacoes-checkbox">
                                    <input
                                      type="checkbox"
                                      checked={question.required !== false}
                                      onChange={(event) =>
                                        handleStageQuestionChange(
                                          stage.id,
                                          question.id,
                                          'required',
                                          event.target.checked
                                        )
                                      }
                                    />

                                    <span>Obrigatória</span>
                                  </label>

                                  <button
                                    type="button"
                                    className="avaliacoes-danger-button"
                                    onClick={() =>
                                      handleRemoveStageQuestion(
                                        stage.id,
                                        question.id
                                      )
                                    }
                                  >
                                    Excluir
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* =================================================
              180°
          ================================================== */}

          <section className="avaliacoes-section">
            <div className="avaliacoes-section-header">
              <div>
                <span className="avaliacoes-section-number">04</span>

                <div>
                  <h2>Avaliação 180°</h2>

                  <p>
                    Permite que o próprio funcionário responda à avaliação
                    destinada a ele.
                  </p>
                </div>
              </div>
            </div>

            <label className="avaliacoes-switch-row">
              <input
                type="checkbox"
                checked={form.evaluation180Enabled}
                onChange={handleToggle180}
              />

              <span>Ativar avaliação 180°</span>
            </label>

            {form.evaluation180Enabled && (
              <div className="avaliacoes-180-content">
                <div className="avaliacoes-subsection-header">
                  <div>
                    <h4>Perguntas da avaliação 180°</h4>

                    <p>
                      Cadastre as perguntas que o funcionário deverá responder.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="avaliacoes-add-button"
                    onClick={handleAdd180Question}
                  >
                    + Adicionar pergunta
                  </button>
                </div>

                {form.evaluation180Questions.map((question, index) => (
                  <div className="avaliacoes-stage-question" key={question.id}>
                    <div className="avaliacoes-question-number">
                      {index + 1}
                    </div>

                    <div className="avaliacoes-stage-question-content">
                      <input
                        value={question.text}
                        onChange={(event) =>
                          handle180QuestionChange(
                            question.id,
                            'text',
                            event.target.value
                          )
                        }
                        placeholder="Digite a pergunta..."
                      />

                      <div className="avaliacoes-stage-question-options">
                        <select
                          value={question.type}
                          onChange={(event) =>
                            handle180QuestionChange(
                              question.id,
                              'type',
                              event.target.value
                            )
                          }
                        >
                          <option value="scale">Nota de 1 a 10</option>

                          <option value="text">Texto</option>

                          <option value="yes_no">Sim / Não</option>
                        </select>

                        <label className="avaliacoes-checkbox">
                          <input
                            type="checkbox"
                            checked={question.required !== false}
                            onChange={(event) =>
                              handle180QuestionChange(
                                question.id,
                                'required',
                                event.target.checked
                              )
                            }
                          />

                          <span>Obrigatória</span>
                        </label>

                        <button
                          type="button"
                          className="avaliacoes-danger-button"
                          onClick={() => handleRemove180Question(question.id)}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* =================================================
              BOTÕES
          ================================================== */}

          <div className="avaliacoes-form-actions">
            <button
              type="button"
              className="avaliacoes-secondary-button"
              onClick={handleCancel}
            >
              Cancelar
            </button>

            <button type="submit" className="avaliacoes-primary-button">
              Salvar modelo
            </button>
          </div>
        </form>
      </div>
    )
  }

  /*
   * ==========================================================
   * LISTAGEM
   * ==========================================================
   */

  return (
    <div className="avaliacoes-page">
      <div className="avaliacoes-header">
        <div>
          <span className="avaliacoes-kicker">CONFIGURAÇÃO</span>

          <h1>Modelos de avaliação</h1>

          <p>
            Crie e configure os modelos utilizados nas avaliações de desempenho.
          </p>
        </div>

        <button
          type="button"
          className="avaliacoes-primary-button"
          onClick={handleNewModel}
        >
          + Novo modelo
        </button>
      </div>

      {error && (
        <div className="avaliacoes-alert avaliacao-alert-error">{error}</div>
      )}

      {success && (
        <div className="avaliacoes-alert avaliacao-alert-success">
          {success}
        </div>
      )}

      {models.length === 0 ? (
        <div className="avaliacoes-empty-page">
          <div className="avaliacoes-empty-icon">✓</div>

          <h2>Nenhum modelo cadastrado</h2>

          <p>
            Crie o primeiro modelo para começar a configurar suas avaliações de
            desempenho.
          </p>

          <button
            type="button"
            className="avaliacoes-primary-button"
            onClick={handleNewModel}
          >
            Criar primeiro modelo
          </button>
        </div>
      ) : (
        <div className="avaliacoes-models-grid">
          {models.map((model) => (
            <article className="avaliacoes-model-card" key={model.id}>
              <div className="avaliacoes-model-card-header">
                <div>
                  <span className="avaliacoes-model-type">
                    {getModelTypeLabel(model.type)}
                  </span>

                  <h2>{model.name}</h2>
                </div>

                <span
                  className={
                    model.active
                      ? 'avaliacoes-status active'
                      : 'avaliacoes-status inactive'
                  }
                >
                  {model.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <p className="avaliacoes-model-description">
                {model.description || 'Sem descrição cadastrada.'}
              </p>

              <div className="avaliacoes-model-stats">
                <div>
                  <strong>{model.stages?.length || 0}</strong>

                  <span>Etapas</span>
                </div>

                <div>
                  <strong>
                    {normalizePdiQuestions(model.pdiQuestions).length}
                  </strong>

                  <span>Perguntas PDI</span>
                </div>

                <div>
                  <strong>{model.evaluation180Enabled ? 'Sim' : 'Não'}</strong>

                  <span>180°</span>
                </div>
              </div>

              <div className="avaliacoes-model-card-actions">
                <button
                  type="button"
                  className="avaliacoes-secondary-button"
                  onClick={() => handleEditModel(model)}
                >
                  Editar
                </button>

                <button
                  type="button"
                  className="avaliacoes-danger-button"
                  onClick={() => handleDeleteModel(model)}
                >
                  Excluir
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

/*
 * ============================================================
 * CLONAGEM
 * ============================================================
 */

function cloneQuestion(question) {
  return {
    ...question
  }
}

function cloneStage(stage) {
  return {
    ...stage,

    questions: Array.isArray(stage.questions)
      ? stage.questions.map(cloneQuestion)
      : []
  }
}

/*
 * ============================================================
 * TIPO DO MODELO
 * ============================================================
 */

function getModelTypeLabel(type) {
  const labels = {
    performance: 'Avaliação de desempenho',

    periodic: 'Avaliação periódica',

    probationary: 'Avaliação de experiência',

    feedback: 'Feedback',

    other: 'Outra'
  }

  return labels[type] || 'Avaliação'
}
