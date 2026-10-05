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

  const [branches, setBranches] = useState([])

  const [search, setSearch] = useState('')

  const [selectedBranchId, setSelectedBranchId] = useState('all')

  const [selectedId, setSelectedId] = useState('')

  /*
   * ============================================================
   * CARREGAMENTO
   * ============================================================
   */

  useEffect(() => {
    setEmployees(getEmployees())

    setRoles(getStoredArray('roles'))

    setBranches(getStoredArray('branches'))
  }, [])

  /*
   * ============================================================
   * FUNCIONÁRIOS
   * ============================================================
   *
   * Montamos aqui todas as informações necessárias para
   * o controle de ponto.
   *
   * A filial vem preferencialmente do próprio funcionário.
   * Mantemos alguns fallbacks para compatibilidade com
   * funcionários cadastrados em versões anteriores.
   */

  const employeeRows = useMemo(() => {
    return employees
      .filter((employee) => employee.active !== false)
      .map((employee) => {
        const role = roles.find(
          (item) =>
            Number(item.id) === Number(employee.positionId || employee.roleId)
        )

        const branch = branches.find(
          (item) => Number(item.id) === Number(employee.branchId)
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

        const branchName =
          branch?.name ||
          employee.branchName ||
          role?.branchName ||
          'Sem filial definida'

        const branchId =
          branch?.id || employee.branchId || role?.branchId || 'without-branch'

        return {
          employee,

          role,

          branch,

          branchId: String(branchId),

          branchName,

          schedule,

          weeklyHours: Number(schedule.weeklyHours || role?.workload || 0),

          calculatedHours: calculateScheduleWeeklyHours(schedule)
        }
      })
      .filter((item) => {
        /*
         * FILTRO POR FILIAL
         */

        if (
          selectedBranchId !== 'all' &&
          String(item.branchId) !== String(selectedBranchId)
        ) {
          return false
        }

        /*
         * FILTRO DE BUSCA
         */

        const term = search.trim().toLowerCase()

        if (!term) {
          return true
        }

        return (
          item.employee.name?.toLowerCase().includes(term) ||
          item.role?.name?.toLowerCase().includes(term) ||
          item.role?.cargoName?.toLowerCase().includes(term) ||
          item.employee.roleName?.toLowerCase().includes(term) ||
          item.branchName?.toLowerCase().includes(term)
        )
      })
  }, [employees, roles, branches, search, selectedBranchId])

  /*
   * ============================================================
   * AGRUPAMENTO POR FILIAL
   * ============================================================
   */

  const groupedByBranch = useMemo(() => {
    const groups = new Map()

    employeeRows.forEach((item) => {
      const key = item.branchId

      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          name: item.branchName,
          branch: item.branch,
          employees: []
        })
      }

      groups.get(key).employees.push(item)
    })

    return Array.from(groups.values()).sort((a, b) => {
      /*
       * "Sem filial definida" sempre fica por último.
       */

      if (a.id === 'without-branch') {
        return 1
      }

      if (b.id === 'without-branch') {
        return -1
      }

      return a.name.localeCompare(b.name, 'pt-BR')
    })
  }, [employeeRows])

  /*
   * ============================================================
   * FUNCIONÁRIO SELECIONADO
   * ============================================================
   */

  const selected = employeeRows.find(
    (item) => String(item.employee.id) === String(selectedId)
  )

  /*
   * ============================================================
   * LABEL DA JORNADA
   * ============================================================
   */

  function getScheduleLabel(type) {
    const labels = {
      weekly: 'Semanal',
      '12x36': '12x36',
      '4x2': '4x2'
    }

    return labels[type] || 'Personalizada'
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

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

      {/* ========================================================
          FILTROS
      ======================================================== */}

      <div className="controle-ponto-toolbar">
        <input
          type="search"
          placeholder="Buscar funcionário ou cargo..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          value={selectedBranchId}
          onChange={(event) => setSelectedBranchId(event.target.value)}
        >
          <option value="all">Todas as filiais</option>

          {branches
            .filter((branch) => branch.active !== false)
            .sort((a, b) =>
              String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR')
            )
            .map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}

          <option value="without-branch">Sem filial definida</option>
        </select>
      </div>

      {/* ========================================================
          NENHUM RESULTADO
      ======================================================== */}

      {employeeRows.length === 0 ? (
        <div className="controle-ponto-empty">
          <span>🕐</span>

          <h3>Nenhum funcionário encontrado</h3>

          <p>Não existem funcionários ativos para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="controle-ponto-branches">
          {groupedByBranch.map((group) => (
            <section key={group.id} className="controle-ponto-branch-section">
              {/* ==================================================
                  CABEÇALHO DA FILIAL
              ================================================== */}

              <div className="controle-ponto-branch-header">
                <div>
                  <span className="controle-ponto-branch-kicker">FILIAL</span>

                  <h2>{group.name}</h2>

                  {group.branch && (
                    <p>
                      {group.branch.city || 'Cidade não informada'}

                      {group.branch.state ? ` - ${group.branch.state}` : ''}
                    </p>
                  )}
                </div>

                <span className="controle-ponto-branch-count">
                  {group.employees.length}{' '}
                  {group.employees.length === 1
                    ? 'funcionário'
                    : 'funcionários'}
                </span>
              </div>

              {/* ==================================================
                  FUNCIONÁRIOS DA FILIAL
              ================================================== */}

              <div className="controle-ponto-grid">
                {group.employees.map((item) => {
                  const hasSchedule = item.weeklyHours > 0

                  const isWithinLimit =
                    item.calculatedHours <= item.weeklyHours + 0.001

                  return (
                    <article
                      key={item.employee.id}
                      className="controle-ponto-card"
                    >
                      <div className="controle-ponto-card-header">
                        <div>
                          <span>
                            {item.role?.name ||
                              item.role?.cargoName ||
                              item.employee.roleName ||
                              'Cargo não informado'}
                          </span>

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

                          <strong>
                            {getScheduleLabel(item.schedule.type)}
                          </strong>
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
                          Este funcionário ainda não possui uma carga horária
                          semanal configurada.
                        </div>
                      )}

                      {hasSchedule && !isWithinLimit && (
                        <div className="controle-ponto-alert">
                          A jornada configurada ultrapassa a carga horária
                          semanal informada para o cargo.
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
            </section>
          ))}
        </div>
      )}

      {/* ========================================================
          MODAL DA JORNADA
      ======================================================== */}

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
                  <span>Filial</span>

                  <strong>{selected.branchName}</strong>
                </div>

                <div>
                  <span>Cargo</span>

                  <strong>
                    {selected.role?.name ||
                      selected.role?.cargoName ||
                      selected.employee.roleName ||
                      'Não informado'}
                  </strong>
                </div>

                <div>
                  <span>Escala</span>

                  <strong>{getScheduleLabel(selected.schedule.type)}</strong>
                </div>

                <div>
                  <span>Carga semanal</span>

                  <strong>
                    {selected.weeklyHours > 0
                      ? formatHours(selected.weeklyHours)
                      : 'Não definida'}
                  </strong>
                </div>

                <div>
                  <span>Total configurado</span>

                  <strong>
                    {selected.calculatedHours > 0
                      ? formatHours(selected.calculatedHours)
                      : 'Não definida'}
                  </strong>
                </div>

                <div>
                  <span>Matrícula</span>

                  <strong>
                    {selected.employee.registration || 'Não informada'}
                  </strong>
                </div>
              </div>

              {selected.schedule.type === 'weekly' ? (
                <div className="controle-ponto-week-table">
                  {selected.schedule.workDays?.map((day) => {
                    const item = selected.schedule.schedule?.[day]

                    return (
                      <div key={day}>
                        <strong>{getWeekDayLabel(day)}</strong>

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
                      : selected.schedule.type === '4x2'
                        ? 'A jornada considera quatro dias de trabalho seguidos por dois dias de descanso, usando as horas por turno cadastradas.'
                        : 'A jornada utiliza a configuração personalizada cadastrada para o funcionário.'}
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

/*
 * ============================================================
 * DIA DA SEMANA
 * ============================================================
 */

function getWeekDayLabel(day) {
  const labels = {
    monday: 'Segunda-feira',
    tuesday: 'Terça-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sábado',
    sunday: 'Domingo'
  }

  return labels[day] || day
}
