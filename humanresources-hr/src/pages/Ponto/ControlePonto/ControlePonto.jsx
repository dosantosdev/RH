import { useEffect, useMemo, useState } from 'react'

import { getEmployees } from '../../../services/employee'
import { getStoredArray } from '../../../services/storage'

import {
  calculateScheduleWeeklyHours,
  formatHours,
  normalizeWorkSchedule
} from '../../../services/workSchedule'

import './controlePonto.css'

export default function ControlePonto() {
  const [employees, setEmployees] = useState([])

  const [roles, setRoles] = useState([])

  const [search, setSearch] = useState('')

  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    setEmployees(getEmployees())

    setRoles(getStoredArray('roles'))
  }, [])

  const employeeRows = useMemo(() => {
    return employees
      .filter((employee) => employee.active !== false)
      .map((employee) => {
        const role = roles.find(
          (item) =>
            Number(item.id) === Number(employee.positionId || employee.roleId)
        )

        const schedule = normalizeWorkSchedule(
          employee.workSchedule ||
            role?.workSchedule || {
              weeklyHours: role?.workload || ''
            }
        )

        if (!schedule.weeklyHours && role?.workload) {
          schedule.weeklyHours = role.workload
        }

        return {
          employee,

          role,

          schedule,

          weeklyHours: Number(schedule.weeklyHours || role?.workload || 0),

          calculatedHours: calculateScheduleWeeklyHours(schedule)
        }
      })
      .filter((item) => {
        const term = search.trim().toLowerCase()

        if (!term) {
          return true
        }

        return (
          item.employee.name?.toLowerCase().includes(term) ||
          item.role?.name?.toLowerCase().includes(term)
        )
      })
  }, [employees, roles, search])

  const selected = employeeRows.find(
    (item) => String(item.employee.id) === String(selectedId)
  )

  function getScheduleLabel(type) {
    const labels = {
      weekly: 'Semanal',
      '12x36': '12x36',
      '4x2': '4x2'
    }

    return labels[type] || 'Personalizada'
  }

  return (
    <div className="controle-ponto-page">
      <div className="controle-ponto-header">
        <div>
          <span className="controle-ponto-kicker">PONTO</span>

          <h1>Controle de Ponto</h1>

          <p>
            Consulte a jornada cadastrada e a carga horária prevista para cada
            funcionário.
          </p>
        </div>
      </div>

      <div className="controle-ponto-toolbar">
        <input
          type="search"
          placeholder="Buscar funcionário ou cargo..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {employeeRows.length === 0 ? (
        <div className="controle-ponto-empty">
          <span>🕐</span>

          <h3>Nenhum funcionário encontrado</h3>

          <p>
            Cadastre funcionários e associe um cargo com jornada de trabalho
            para começar a utilizar o controle de ponto.
          </p>
        </div>
      ) : (
        <div className="controle-ponto-grid">
          {employeeRows.map((item) => {
            const hasSchedule = item.weeklyHours > 0

            const isWithinLimit =
              item.calculatedHours <= item.weeklyHours + 0.001

            return (
              <article key={item.employee.id} className="controle-ponto-card">
                <div className="controle-ponto-card-header">
                  <div>
                    <span>{item.role?.name || 'Cargo não informado'}</span>

                    <h2>{item.employee.name}</h2>
                  </div>

                  <span
                    className={
                      hasSchedule && isWithinLimit
                        ? 'controle-ponto-badge valid'
                        : 'controle-ponto-badge warning'
                    }
                  >
                    {hasSchedule && isWithinLimit
                      ? 'Jornada válida'
                      : 'Revisar jornada'}
                  </span>
                </div>

                <div className="controle-ponto-info-grid">
                  <div>
                    <span>Tipo de jornada</span>

                    <strong>{getScheduleLabel(item.schedule.type)}</strong>
                  </div>

                  <div>
                    <span>Carga semanal</span>

                    <strong>
                      {item.weeklyHours > 0
                        ? formatHours(item.weeklyHours)
                        : 'Não definida'}
                    </strong>
                  </div>

                  <div>
                    <span>Jornada configurada</span>

                    <strong>
                      {item.calculatedHours > 0
                        ? formatHours(item.calculatedHours)
                        : 'Não definida'}
                    </strong>
                  </div>
                </div>

                {!hasSchedule && (
                  <div className="controle-ponto-alert">
                    Este funcionário ainda não possui uma carga horária semanal
                    configurada.
                  </div>
                )}

                {hasSchedule && !isWithinLimit && (
                  <div className="controle-ponto-alert">
                    A jornada configurada ultrapassa a carga horária semanal
                    informada para o cargo.
                  </div>
                )}

                <div className="controle-ponto-card-footer">
                  <span>
                    {item.employee.registration
                      ? `Matrícula ${item.employee.registration}`
                      : 'Matrícula não informada'}
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedId(item.employee.id)}
                  >
                    Ver jornada
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {selected && (
        <div className="controle-ponto-modal-overlay">
          <div className="controle-ponto-modal">
            <div className="controle-ponto-modal-header">
              <div>
                <span>JORNADA CADASTRADA</span>

                <h2>{selected.employee.name}</h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedId('')}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="controle-ponto-modal-body">
              <div className="controle-ponto-modal-summary">
                <div>
                  <span>Cargo</span>

                  <strong>{selected.role?.name || 'Não informado'}</strong>
                </div>

                <div>
                  <span>Escala</span>

                  <strong>{getScheduleLabel(selected.schedule.type)}</strong>
                </div>

                <div>
                  <span>Carga semanal</span>

                  <strong>{formatHours(selected.weeklyHours)}</strong>
                </div>

                <div>
                  <span>Total configurado</span>

                  <strong>{formatHours(selected.calculatedHours)}</strong>
                </div>
              </div>

              {selected.schedule.type === 'weekly' ? (
                <div className="controle-ponto-week-table">
                  {selected.schedule.workDays.map((day) => {
                    const item = selected.schedule.schedule[day]

                    return (
                      <div key={day}>
                        <strong>{day}</strong>

                        <span>
                          {item?.start || '--:--'} às {item?.end || '--:--'}
                        </span>

                        <small>
                          {item?.breakMinutes || 0} min de intervalo
                        </small>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="controle-ponto-scale-description">
                  <strong>{getScheduleLabel(selected.schedule.type)}</strong>

                  <p>
                    {selected.schedule.type === '12x36'
                      ? 'A jornada considera 12 horas de trabalho por plantão, alternadas com 36 horas de descanso.'
                      : 'A jornada considera quatro dias de trabalho seguidos por dois dias de descanso, usando as horas por turno cadastradas.'}
                  </p>
                </div>
              )}
            </div>

            <div className="controle-ponto-modal-footer">
              <button type="button" onClick={() => setSelectedId('')}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
