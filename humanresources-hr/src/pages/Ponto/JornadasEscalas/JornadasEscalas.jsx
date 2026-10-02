import { useState } from 'react'

import './jornadasEscalas.css'

import ConfirmModal from '../../../components/ui/ConfirmModal'
import Toast from '../../../components/ui/Toast'
import useToast from '../../../hooks/useToast'

import { hasPermission } from '../../../services/permissions'
import { getEmployees } from '../../../services/employee'

import {
  DAY_TYPES,
  WEEK_DAYS,
  addWorkSchedule,
  assignWorkSchedule,
  calculateDayPlannedMinutes,
  createCycleDays,
  createWeeklyDays,
  deleteWorkSchedule,
  formatMinutes,
  getEmployeeWorkSchedules,
  getWorkSchedules,
  updateWorkSchedule
} from '../../../services/workSchedule'

function initialSchedule() {
  return {
    name: '',

    description: '',

    /*
     * weekly:
     * jornada semanal
     *
     * cycle:
     * escala por ciclo
     */
    mode: 'weekly',

    weeklyHours: '44',

    cycleLength: 2,

    cycleStartDate: '',

    active: true,

    days: createWeeklyDays()
  }
}

function cloneDays(days = []) {
  return days.map((day, index) => ({
    ...day,

    id: day.id || `${Date.now()}-${index}-${Math.random()}`,

    periods: (day.periods || []).map((period) => ({
      ...period,

      id: period.id || `${Date.now()}-${Math.random()}`
    }))
  }))
}

export default function JornadasEscalas() {
  const [schedules, setSchedules] = useState(getWorkSchedules)

  const [employees] = useState(getEmployees)

  const [assignments, setAssignments] = useState(getEmployeeWorkSchedules)

  const [schedule, setSchedule] = useState(initialSchedule)

  const [editingId, setEditingId] = useState(null)

  const [search, setSearch] = useState('')

  const [deleteId, setDeleteId] = useState(null)

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')

  const { toast, showToast } = useToast()

  /*
   * ============================================================
   * PERMISSÃO PRINCIPAL
   * ============================================================
   */

  if (!hasPermission('work_schedules_view')) {
    return <h2>Acesso negado</h2>
  }

  const filteredSchedules = schedules.filter((item) => {
    const value = search.toLowerCase()

    return (
      item.name?.toLowerCase().includes(value) ||
      item.description?.toLowerCase().includes(value)
    )
  })

  /*
   * ============================================================
   * FORMULÁRIO
   * ============================================================
   */

  function resetForm() {
    setSchedule(initialSchedule())

    setEditingId(null)
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target

    setSchedule((prev) => ({
      ...prev,

      [name]: type === 'checkbox' ? checked : value
    }))
  }

  function changeMode(event) {
    const mode = event.target.value

    setSchedule((prev) => ({
      ...prev,

      mode,

      days:
        mode === 'weekly'
          ? createWeeklyDays()
          : createCycleDays(Number(prev.cycleLength) || 2)
    }))
  }

  function changeCycleLength(event) {
    const value = Math.max(1, Math.min(31, Number(event.target.value) || 1))

    setSchedule((prev) => ({
      ...prev,

      cycleLength: value,

      days: prev.mode === 'cycle' ? createCycleDays(value) : prev.days
    }))
  }

  function updateDay(dayId, field, value) {
    setSchedule((prev) => ({
      ...prev,

      days: prev.days.map((day) =>
        day.id === dayId
          ? {
              ...day,
              [field]: value
            }
          : day
      )
    }))
  }

  function updatePeriod(dayId, periodId, field, value) {
    setSchedule((prev) => ({
      ...prev,

      days: prev.days.map((day) =>
        day.id !== dayId
          ? day
          : {
              ...day,

              periods: day.periods.map((period) =>
                period.id === periodId
                  ? {
                      ...period,
                      [field]: value
                    }
                  : period
              )
            }
      )
    }))
  }

  function addPeriod(dayId) {
    setSchedule((prev) => ({
      ...prev,

      days: prev.days.map((day) =>
        day.id !== dayId
          ? day
          : {
              ...day,

              periods: [
                ...(day.periods || []),

                {
                  id: `${Date.now()}-${Math.random()}`,

                  start: '18:00',

                  end: '22:00'
                }
              ]
            }
      )
    }))
  }

  function removePeriod(dayId, periodId) {
    setSchedule((prev) => ({
      ...prev,

      days: prev.days.map((day) =>
        day.id !== dayId
          ? day
          : {
              ...day,

              periods: day.periods.filter((period) => period.id !== periodId)
            }
      )
    }))
  }

  /*
   * ============================================================
   * SALVAR JORNADA
   * ============================================================
   */

  function handleSubmit(event) {
    event.preventDefault()

    const allowed = editingId
      ? hasPermission('work_schedules_edit')
      : hasPermission('work_schedules_create')

    if (!allowed) {
      showToast('Você não tem permissão para esta ação.', 'warning')

      return
    }

    if (!schedule.name.trim()) {
      showToast('Informe o nome da jornada.', 'warning')

      return
    }

    if (schedule.mode === 'cycle' && !schedule.cycleStartDate) {
      showToast('Informe a data de início do ciclo.', 'warning')

      return
    }

    const data = {
      ...schedule,

      id: editingId || Date.now(),

      weeklyHours:
        schedule.mode === 'weekly' ? String(schedule.weeklyHours) : '',

      cycleLength:
        schedule.mode === 'cycle' ? Number(schedule.cycleLength) : null,

      days: cloneDays(schedule.days),

      updatedAt: new Date().toISOString()
    }

    const updated = editingId
      ? updateWorkSchedule(data)
      : addWorkSchedule({
          ...data,

          createdAt: new Date().toISOString()
        })

    setSchedules(updated)

    resetForm()

    showToast(
      editingId ? 'Jornada atualizada!' : 'Jornada cadastrada!',
      'success'
    )
  }

  /*
   * ============================================================
   * EDITAR
   * ============================================================
   */

  function handleEdit(item) {
    if (!hasPermission('work_schedules_edit')) {
      showToast('Você não tem permissão para editar jornadas.', 'warning')

      return
    }

    setSchedule({
      ...item,

      days: cloneDays(item.days),

      cycleLength: Number(item.cycleLength) || 2
    })

    setEditingId(item.id)

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  /*
   * ============================================================
   * EXCLUIR
   * ============================================================
   */

  function handleDelete(id) {
    if (!hasPermission('work_schedules_delete')) {
      showToast('Você não tem permissão para excluir jornadas.', 'warning')

      return
    }

    const linked = assignments.some(
      (assignment) => Number(assignment.scheduleId) === Number(id)
    )

    if (linked) {
      showToast(
        'Esta jornada possui vínculos. Remova os vínculos antes de excluir.',
        'warning'
      )

      return
    }

    setDeleteId(id)
  }

  function confirmDelete() {
    const updated = deleteWorkSchedule(deleteId)

    setSchedules(updated)

    setDeleteId(null)

    showToast('Jornada excluída!', 'success')
  }

  /*
   * ============================================================
   * VINCULAR FUNCIONÁRIO
   * ============================================================
   */

  function handleAssign(event) {
    event.preventDefault()

    if (!hasPermission('work_schedules_edit')) {
      showToast('Você não tem permissão para vincular jornadas.', 'warning')

      return
    }

    const form = event.currentTarget

    const employeeId = Number(selectedEmployeeId)

    const scheduleId = Number(form.scheduleId.value)

    if (!employeeId || !scheduleId || !form.effectiveFrom.value) {
      showToast('Informe funcionário, jornada e início da vigência.', 'warning')

      return
    }

    assignWorkSchedule({
      employeeId,

      scheduleId,

      effectiveFrom: form.effectiveFrom.value,

      effectiveTo: form.effectiveTo.value,

      notes: form.notes.value
    })

    setAssignments(getEmployeeWorkSchedules())

    setSelectedEmployeeId('')

    form.reset()

    showToast('Jornada vinculada ao funcionário!', 'success')
  }

  /*
   * ============================================================
   * REMOVER VÍNCULO
   * ============================================================
   */

  function removeAssignment(employeeId) {
    if (!hasPermission('work_schedules_edit')) {
      showToast('Você não tem permissão para alterar vínculos.', 'warning')

      return
    }

    const updated = assignments.filter(
      (assignment) => Number(assignment.employeeId) !== Number(employeeId)
    )

    localStorage.setItem('employeeWorkSchedules', JSON.stringify(updated))

    setAssignments(updated)

    showToast('Vínculo removido.', 'success')
  }

  /*
   * ============================================================
   * AUXILIARES VISUAIS
   * ============================================================
   */

  function daySummary(day) {
    if (day.type === 'off') {
      return 'Folga'
    }

    if (day.type === 'course') {
      return `${day.creditedHours || 0}h abonadas`
    }

    return formatMinutes(calculateDayPlannedMinutes(day))
  }

  function scheduleType(item) {
    return item.mode === 'cycle'
      ? `Ciclo de ${item.cycleLength} dias`
      : `${item.weeklyHours || '—'}h semanais`
  }

  function employeeName(id) {
    return (
      employees.find((item) => Number(item.id) === Number(id))?.name ||
      `Funcionário #${id}`
    )
  }

  function scheduleName(id) {
    return (
      schedules.find((item) => Number(item.id) === Number(id))?.name ||
      'Jornada não encontrada'
    )
  }

  return (
    <div className="work-schedules-page">
      {/* ======================================================
          CABEÇALHO
      ====================================================== */}

      <header className="work-schedules-header">
        <div>
          <span>PONTO</span>

          <h1>Jornadas e Escalas</h1>

          <p>
            Configure jornadas semanais, escalas por ciclo e dias especiais,
            mantendo a vigência de cada configuração.
          </p>
        </div>
      </header>

      {/* ======================================================
          CADASTRO
      ====================================================== */}

      <section className="work-schedules-card">
        <div className="work-schedules-card-header">
          <div>
            <h2>{editingId ? 'Editar jornada' : 'Nova jornada'}</h2>

            <p>
              A jornada será a referência para os próximos cálculos do módulo de
              ponto.
            </p>
          </div>
        </div>

        <form className="work-schedules-form" onSubmit={handleSubmit}>
          <div className="work-schedules-form-grid">
            <div className="work-schedules-field full">
              <label htmlFor="name">Nome da jornada *</label>

              <input
                id="name"
                name="name"
                value={schedule.name}
                onChange={handleChange}
                placeholder="Ex.: Administrativo 44h"
              />
            </div>

            <div className="work-schedules-field">
              <label htmlFor="mode">Tipo *</label>

              <select id="mode" value={schedule.mode} onChange={changeMode}>
                <option value="weekly">Jornada semanal</option>

                <option value="cycle">Escala por ciclo</option>
              </select>
            </div>

            {schedule.mode === 'weekly' ? (
              <div className="work-schedules-field">
                <label htmlFor="weeklyHours">Carga semanal de referência</label>

                <div className="work-schedules-input-suffix">
                  <input
                    id="weeklyHours"
                    name="weeklyHours"
                    type="number"
                    min="0"
                    step="0.5"
                    value={schedule.weeklyHours}
                    onChange={handleChange}
                  />

                  <span>horas</span>
                </div>
              </div>
            ) : (
              <div className="work-schedules-field">
                <label htmlFor="cycleLength">Dias do ciclo</label>

                <input
                  id="cycleLength"
                  type="number"
                  min="1"
                  max="31"
                  value={schedule.cycleLength}
                  onChange={changeCycleLength}
                />
              </div>
            )}

            {schedule.mode === 'cycle' && (
              <div className="work-schedules-field">
                <label htmlFor="cycleStartDate">Início do ciclo *</label>

                <input
                  id="cycleStartDate"
                  name="cycleStartDate"
                  type="date"
                  value={schedule.cycleStartDate}
                  onChange={handleChange}
                />
              </div>
            )}

            <div className="work-schedules-field full">
              <label htmlFor="description">Descrição</label>

              <textarea
                id="description"
                name="description"
                rows="3"
                value={schedule.description}
                onChange={handleChange}
                placeholder="Ex.: equipe de monitoramento, administrativo, jovem aprendiz..."
              />
            </div>

            <label className="work-schedules-check full">
              <input
                type="checkbox"
                name="active"
                checked={schedule.active}
                onChange={handleChange}
              />
              Jornada ativa
            </label>
          </div>

          {/* ==================================================
              DIAS
          ================================================== */}

          <div className="work-schedules-days-header">
            <div>
              <h3>{schedule.mode === 'weekly' ? 'Semana' : 'Ciclo'}</h3>

              <p>
                Um dia pode possuir vários períodos, permitindo intervalos e
                horários especiais.
              </p>
            </div>
          </div>

          <div className="work-schedules-days">
            {schedule.days.map((day, index) => {
              const dayLabel =
                schedule.mode === 'weekly'
                  ? WEEK_DAYS.find(
                      (item) => Number(item.value) === Number(day.dayOfWeek)
                    )?.label
                  : `Dia ${day.cycleDay || index + 1}`

              return (
                <article className="work-schedule-day" key={day.id}>
                  <div className="work-schedule-day-title">
                    <div>
                      <strong>{dayLabel}</strong>

                      <span>{daySummary(day)}</span>
                    </div>

                    <select
                      value={day.type}
                      onChange={(event) =>
                        updateDay(day.id, 'type', event.target.value)
                      }
                    >
                      {DAY_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ========================================
                        TRABALHO
                    ======================================== */}

                  {day.type === 'work' && (
                    <div className="work-schedule-periods">
                      {day.periods.map((period) => (
                        <div className="work-schedule-period" key={period.id}>
                          <div className="work-schedules-field">
                            <label>Início</label>

                            <input
                              type="time"
                              value={period.start}
                              onChange={(event) =>
                                updatePeriod(
                                  day.id,
                                  period.id,
                                  'start',
                                  event.target.value
                                )
                              }
                            />
                          </div>

                          <div className="work-schedules-field">
                            <label>Fim</label>

                            <input
                              type="time"
                              value={period.end}
                              onChange={(event) =>
                                updatePeriod(
                                  day.id,
                                  period.id,
                                  'end',
                                  event.target.value
                                )
                              }
                            />
                          </div>

                          <button
                            type="button"
                            className="work-schedule-remove-period"
                            disabled={day.periods.length === 1}
                            onClick={() => removePeriod(day.id, period.id)}
                          >
                            ×
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        className="work-schedule-add-period"
                        onClick={() => addPeriod(day.id)}
                      >
                        + Adicionar período
                      </button>
                    </div>
                  )}

                  {/* ========================================
                        CURSO / ABONO
                    ======================================== */}

                  {day.type === 'course' && (
                    <div className="work-schedule-special">
                      <div className="work-schedules-field">
                        <label>Horas abonadas</label>

                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={day.creditedHours}
                          onChange={(event) =>
                            updateDay(
                              day.id,
                              'creditedHours',
                              event.target.value
                            )
                          }
                          placeholder="Ex.: 5"
                        />
                      </div>

                      <p>
                        O dia será tratado como curso/abono: não exige batida e
                        não gera falta. As horas entram como cumpridas no
                        cálculo.
                      </p>
                    </div>
                  )}

                  {/* ========================================
                        FOLGA
                    ======================================== */}

                  {day.type === 'off' && (
                    <div className="work-schedule-off">
                      <span>✓</span>
                      Dia previsto como folga. Não gera falta.
                    </div>
                  )}
                </article>
              )
            })}
          </div>

          <div className="work-schedules-form-footer">
            {editingId && (
              <button
                type="button"
                className="work-schedules-secondary-button"
                onClick={resetForm}
              >
                Cancelar
              </button>
            )}

            <button type="submit" className="work-schedules-primary-button">
              {editingId ? 'Salvar alterações' : 'Cadastrar jornada'}
            </button>
          </div>
        </form>
      </section>

      {/* ======================================================
          LISTA DE JORNADAS
      ====================================================== */}

      <section className="work-schedules-card">
        <div className="work-schedules-card-header work-schedules-list-header">
          <div>
            <h2>Jornadas cadastradas</h2>

            <p>{schedules.length} configuração(ões)</p>
          </div>

          <input
            type="search"
            placeholder="Buscar jornada..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {filteredSchedules.length === 0 ? (
          <div className="work-schedules-empty">
            <span>🕐</span>

            <h3>Nenhuma jornada encontrada</h3>

            <p>Cadastre uma jornada acima para começar.</p>
          </div>
        ) : (
          <div className="work-schedules-list">
            {filteredSchedules.map((item) => (
              <article className="work-schedule-card" key={item.id}>
                <div className="work-schedule-card-top">
                  <div>
                    <span>{scheduleType(item)}</span>

                    <h3>{item.name}</h3>
                  </div>

                  <strong
                    className={item.active === false ? 'inactive' : 'active'}
                  >
                    {item.active === false ? 'Inativa' : 'Ativa'}
                  </strong>
                </div>

                {item.description && <p>{item.description}</p>}

                <div className="work-schedule-card-summary">
                  {item.days?.slice(0, 7).map((day, index) => (
                    <div key={day.id || index}>
                      <strong>
                        {item.mode === 'weekly'
                          ? WEEK_DAYS.find(
                              (weekday) =>
                                Number(weekday.value) === Number(day.dayOfWeek)
                            )?.label.slice(0, 3)
                          : `D${day.cycleDay || index + 1}`}
                      </strong>

                      <span>{daySummary(day)}</span>
                    </div>
                  ))}
                </div>

                <div className="work-schedule-card-actions">
                  {hasPermission('work_schedules_edit') && (
                    <button type="button" onClick={() => handleEdit(item)}>
                      Editar
                    </button>
                  )}

                  {hasPermission('work_schedules_delete') && (
                    <button type="button" onClick={() => handleDelete(item.id)}>
                      Excluir
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ======================================================
          VÍNCULOS
      ====================================================== */}

      <section className="work-schedules-card">
        <div className="work-schedules-card-header">
          <div>
            <h2>Vincular jornada aos funcionários</h2>

            <p>
              Cada vínculo possui vigência. Ao trocar a jornada, o vínculo
              anterior permanece no histórico.
            </p>
          </div>
        </div>

        {hasPermission('work_schedules_edit') && (
          <form
            className="work-schedule-assignment-form"
            onSubmit={handleAssign}
          >
            <div className="work-schedules-field">
              <label>Funcionário *</label>

              <select
                value={selectedEmployeeId}
                onChange={(event) => setSelectedEmployeeId(event.target.value)}
              >
                <option value="">Selecione</option>

                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="work-schedules-field">
              <label>Jornada *</label>

              <select name="scheduleId" defaultValue="">
                <option value="">Selecione</option>

                {schedules
                  .filter((item) => item.active !== false)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="work-schedules-field">
              <label>Início da vigência *</label>

              <input name="effectiveFrom" type="date" />
            </div>

            <div className="work-schedules-field">
              <label>Fim da vigência</label>

              <input name="effectiveTo" type="date" />
            </div>

            <div className="work-schedules-field full">
              <label>Observações</label>

              <textarea
                name="notes"
                rows="2"
                placeholder="Ex.: alteração contratual ou troca de escala."
              />
            </div>

            <div className="work-schedules-form-footer full">
              <button type="submit" className="work-schedules-primary-button">
                Vincular jornada
              </button>
            </div>
          </form>
        )}

        <div className="work-schedule-assigned-list">
          {assignments.length === 0 ? (
            <div className="work-schedules-empty compact">
              <span>👥</span>

              <p>Nenhum vínculo cadastrado.</p>
            </div>
          ) : (
            assignments.map((assignment) => (
              <div className="work-schedule-assigned-item" key={assignment.id}>
                <div>
                  <strong>{employeeName(assignment.employeeId)}</strong>

                  <span>{scheduleName(assignment.scheduleId)}</span>
                </div>

                <div>
                  <small>
                    Vigência: {assignment.effectiveFrom || '—'}
                    {assignment.effectiveTo
                      ? ` até ${assignment.effectiveTo}`
                      : ' em aberto'}
                  </small>

                  {assignment.notes && <small>{assignment.notes}</small>}
                </div>

                {hasPermission('work_schedules_edit') && (
                  <button
                    type="button"
                    onClick={() => removeAssignment(assignment.employeeId)}
                  >
                    Remover
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* ======================================================
          EXCLUSÃO
      ====================================================== */}

      <ConfirmModal
        isOpen={deleteId !== null}
        title="Excluir jornada"
        message="Tem certeza que deseja excluir esta jornada?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  )
}
