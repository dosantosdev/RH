import './roleForm.css'

import { hasPermission } from '../../services/permissions'
import { getStoredArray } from '../../services/storage'

export default function RoleForm({
  role,
  editingId,
  handleChange,
  handleSubmit
}) {
  const certificates = getStoredArray('certificates')

  const scheduleType = role.scheduleType || 'weekly'

  function updateField(name, value) {
    handleChange({
      target: {
        name,
        value,
        type: 'custom'
      }
    })
  }

  function handleScheduleTypeChange(e) {
    const value = e.target.value

    updateField('scheduleType', value)

    /*
     * Quando o tipo de jornada muda,
     * limpamos campos que pertencem a outro modelo.
     *
     * Isso evita carregar informações antigas de uma
     * jornada semanal para uma escala 12x36, por exemplo.
     */

    if (value === 'weekly') {
      updateField('cycleWorkDays', '')
      updateField('cycleRestDays', '')
    }

    if (value === '12x36') {
      updateField('dailyHours', '12')
      updateField('cycleWorkDays', '1')
      updateField('cycleRestDays', '1')
      updateField('workDaysPerWeek', '')
    }

    if (value === '4x2') {
      updateField('cycleWorkDays', '4')
      updateField('cycleRestDays', '2')
      updateField('workDaysPerWeek', '')
    }

    if (value === '5x2') {
      updateField('cycleWorkDays', '5')
      updateField('cycleRestDays', '2')
      updateField('workDaysPerWeek', '')
    }

    if (value === '6x1') {
      updateField('cycleWorkDays', '6')
      updateField('cycleRestDays', '1')
      updateField('workDaysPerWeek', '')
    }

    if (value === 'custom') {
      updateField('cycleWorkDays', '')
      updateField('cycleRestDays', '')
      updateField('workDaysPerWeek', '')
    }
  }

  return (
    <div className="role-form-container">
      <div className="form-card">
        {/* =========================
            CABEÇALHO
        ========================== */}

        <div className="role-form-header">
          <h2>Cadastro de Cargos</h2>

          <label className="role-status">
            <input
              type="checkbox"
              name="active"
              checked={role.active}
              onChange={handleChange}
            />

            <span>Cargo ativo</span>
          </label>
        </div>

        <form onSubmit={handleSubmit}>
          {/* =========================
              INFORMAÇÕES
          ========================== */}

          <div className="form-section">
            <h3>Informações do Cargo</h3>

            <div className="form-grid">
              <div className="field-group field-name">
                <label htmlFor="name">Nome do cargo</label>

                <input
                  id="name"
                  name="name"
                  value={role.name}
                  placeholder="Ex.: Vendedor"
                  onChange={handleChange}
                />
              </div>

              <div className="field-group field-regime">
                <label htmlFor="workRegime">Regime de trabalho</label>

                <select
                  id="workRegime"
                  name="workRegime"
                  value={role.workRegime}
                  onChange={handleChange}
                >
                  <option value="">Selecione</option>
                  <option value="Presencial">Presencial</option>
                  <option value="Híbrido">Híbrido</option>
                  <option value="Remoto">Remoto</option>
                </select>
              </div>

              <div className="field-group field-full">
                <label htmlFor="description">Descrição do cargo</label>

                <textarea
                  id="description"
                  name="description"
                  value={role.description}
                  placeholder="Descreva detalhadamente o objetivo, características e atribuições gerais do cargo."
                  onChange={handleChange}
                  rows="6"
                />
              </div>

              <div className="field-group field-full">
                <label htmlFor="responsibilities">
                  Funções e responsabilidades
                </label>

                <textarea
                  id="responsibilities"
                  name="responsibilities"
                  value={role.responsibilities}
                  placeholder="Descreva as principais funções, atividades e responsabilidades realizadas por este cargo."
                  onChange={handleChange}
                  rows="8"
                />
              </div>
            </div>
          </div>

          {/* =========================
              REMUNERAÇÃO
          ========================== */}

          <div className="form-section">
            <h3>Remuneração</h3>

            <div className="form-grid">
              <div className="field-group field-salary">
                <label htmlFor="salaryMin">Salário mínimo</label>

                <input
                  id="salaryMin"
                  type="number"
                  name="salaryMin"
                  value={role.salaryMin}
                  placeholder="Ex.: 1800.00"
                  min="0"
                  step="0.01"
                  onChange={handleChange}
                />
              </div>

              <div className="field-group field-salary">
                <label htmlFor="salaryMax">Salário máximo</label>

                <input
                  id="salaryMax"
                  type="number"
                  name="salaryMax"
                  value={role.salaryMax}
                  placeholder="Ex.: 3500.00"
                  min="0"
                  step="0.01"
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* =========================
              PERFIL PROFISSIONAL
          ========================== */}

          <div className="form-section">
            <h3>Perfil Profissional</h3>

            <div className="form-grid">
              <div className="field-group field-education">
                <label htmlFor="education">Escolaridade mínima</label>

                <select
                  id="education"
                  name="education"
                  value={role.education}
                  onChange={handleChange}
                >
                  <option value="">Selecione</option>

                  <option value="Ensino Fundamental">Ensino Fundamental</option>

                  <option value="Ensino Médio">Ensino Médio</option>

                  <option value="Técnico">Curso Técnico</option>

                  <option value="Tecnólogo">Tecnólogo</option>

                  <option value="Superior">Ensino Superior</option>

                  <option value="Pós-graduação">Pós-graduação</option>

                  <option value="Mestrado">Mestrado</option>

                  <option value="Doutorado">Doutorado</option>
                </select>
              </div>

              <div className="field-group field-experience">
                <label htmlFor="experience">Experiência mínima</label>

                <input
                  id="experience"
                  name="experience"
                  value={role.experience}
                  placeholder="Ex.: 2 anos"
                  onChange={handleChange}
                />
              </div>

              <div className="field-group field-full">
                <label htmlFor="skills">Competências e conhecimentos</label>

                <textarea
                  id="skills"
                  name="skills"
                  value={role.skills}
                  placeholder="Informe os conhecimentos técnicos, competências e habilidades necessárias para exercer o cargo."
                  onChange={handleChange}
                  rows="6"
                />
              </div>
            </div>
          </div>

          {/* =========================
              JORNADA DE TRABALHO
          ========================== */}

          <div className="form-section">
            <h3>Jornada de Trabalho</h3>

            <div className="form-grid">
              {/* TIPO DA JORNADA */}

              <div className="field-group field-full">
                <label htmlFor="scheduleType">Tipo de jornada</label>

                <select
                  id="scheduleType"
                  name="scheduleType"
                  value={scheduleType}
                  onChange={handleScheduleTypeChange}
                >
                  <option value="weekly">Jornada semanal</option>

                  <option value="12x36">Escala 12x36</option>

                  <option value="4x2">Escala 4x2</option>

                  <option value="5x2">Escala 5x2</option>

                  <option value="6x1">Escala 6x1</option>

                  <option value="custom">Jornada personalizada</option>
                </select>
              </div>

              {/* CARGA SEMANAL */}

              <div className="field-group field-workload">
                <label htmlFor="workload">Carga horária semanal</label>

                <input
                  id="workload"
                  type="number"
                  name="workload"
                  value={role.workload}
                  placeholder="Ex.: 44"
                  min="0"
                  step="0.5"
                  onChange={handleChange}
                />

                <small>
                  Pode ser 30h, 36h, 40h, 44h ou outro valor definido para o
                  cargo.
                </small>
              </div>

              {/* HORAS POR DIA */}

              <div className="field-group field-workload">
                <label htmlFor="dailyHours">Horas trabalhadas por dia</label>

                <input
                  id="dailyHours"
                  type="number"
                  name="dailyHours"
                  value={role.dailyHours}
                  placeholder="Ex.: 8"
                  min="0"
                  step="0.5"
                  onChange={handleChange}
                  disabled={scheduleType === '12x36'}
                />

                {scheduleType === '12x36' && (
                  <small>
                    A escala 12x36 utiliza 12 horas de trabalho por dia.
                  </small>
                )}
              </div>

              {/* DIAS POR SEMANA */}

              {scheduleType === 'weekly' && (
                <div className="field-group field-workload">
                  <label htmlFor="workDaysPerWeek">
                    Dias trabalhados por semana
                  </label>

                  <input
                    id="workDaysPerWeek"
                    type="number"
                    name="workDaysPerWeek"
                    value={role.workDaysPerWeek}
                    placeholder="Ex.: 5"
                    min="1"
                    max="7"
                    step="1"
                    onChange={handleChange}
                  />

                  <small>
                    O sistema verificará se horas por dia × dias trabalhados
                    respeitam a carga semanal.
                  </small>
                </div>
              )}

              {/* CICLO */}

              {['12x36', '4x2', '5x2', '6x1'].includes(scheduleType) && (
                <>
                  <div className="field-group field-workload">
                    <label htmlFor="cycleWorkDays">
                      Dias trabalhados no ciclo
                    </label>

                    <input
                      id="cycleWorkDays"
                      type="number"
                      name="cycleWorkDays"
                      value={role.cycleWorkDays}
                      min="1"
                      step="1"
                      onChange={handleChange}
                      disabled
                    />
                  </div>

                  <div className="field-group field-workload">
                    <label htmlFor="cycleRestDays">
                      Dias de descanso no ciclo
                    </label>

                    <input
                      id="cycleRestDays"
                      type="number"
                      name="cycleRestDays"
                      value={role.cycleRestDays}
                      min="1"
                      step="1"
                      onChange={handleChange}
                      disabled
                    />
                  </div>
                </>
              )}

              {/* RESUMO */}

              <div className="field-group field-full">
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '8px',
                    background: '#f7f8fc',
                    border: '1px solid #e4e6ec',
                    color: '#555',
                    lineHeight: '1.5',
                    fontSize: '13px'
                  }}
                >
                  {scheduleType === 'weekly' && (
                    <>
                      <strong>Jornada semanal:</strong>{' '}
                      {role.workload || 'não informada'}h semanais
                      {role.dailyHours && role.workDaysPerWeek && (
                        <>
                          {' '}
                          — {role.dailyHours}h × {role.workDaysPerWeek} dias ={' '}
                          {Number(role.dailyHours) *
                            Number(role.workDaysPerWeek)}
                          h
                        </>
                      )}
                    </>
                  )}

                  {scheduleType === '12x36' && (
                    <>
                      <strong>Escala 12x36:</strong> 12 horas trabalhadas e 36
                      horas de descanso.
                    </>
                  )}

                  {scheduleType === '4x2' && (
                    <>
                      <strong>Escala 4x2:</strong> 4 dias trabalhados e 2 dias
                      de descanso.
                    </>
                  )}

                  {scheduleType === '5x2' && (
                    <>
                      <strong>Escala 5x2:</strong> 5 dias trabalhados e 2 dias
                      de descanso.
                    </>
                  )}

                  {scheduleType === '6x1' && (
                    <>
                      <strong>Escala 6x1:</strong> 6 dias trabalhados e 1 dia de
                      descanso.
                    </>
                  )}

                  {scheduleType === 'custom' && (
                    <>
                      <strong>Jornada personalizada:</strong> configuração
                      específica para este cargo.
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* =========================
              REQUISITOS
          ========================== */}

          <div className="form-section">
            <h3>Requisitos do Cargo</h3>

            <div className="requirements-grid">
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  name="requiresCnh"
                  checked={role.requiresCnh}
                  onChange={handleChange}
                />
                Requer CNH
              </label>
            </div>

            {role.requiresCnh && (
              <div className="cnh-categories-role">
                <h4>Categorias exigidas</h4>

                <div className="permissions-grid">
                  {['A', 'B', 'C', 'D', 'E'].map((category) => (
                    <label key={category} className="permission-item">
                      <input
                        type="checkbox"
                        checked={role.requiredCnhCategories?.includes(category)}
                        onChange={() => {
                          const exists =
                            role.requiredCnhCategories?.includes(category)

                          let updated = []

                          if (exists) {
                            updated = role.requiredCnhCategories.filter(
                              (item) => item !== category
                            )
                          } else {
                            updated = [
                              ...(role.requiredCnhCategories || []),
                              category
                            ]
                          }

                          handleChange({
                            target: {
                              name: 'requiredCnhCategories',
                              value: updated,
                              type: 'custom'
                            }
                          })
                        }}
                      />
                      Categoria {category}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* =========================
                CERTIFICADOS
            ========================== */}

            <div className="required-certificates">
              <h4>Certificados obrigatórios</h4>

              <div className="permissions-grid">
                {certificates.map((certificate) => (
                  <label key={certificate.id} className="permission-item">
                    <input
                      type="checkbox"
                      checked={role.requiredCertificates?.includes(
                        certificate.id
                      )}
                      onChange={() => {
                        const exists = role.requiredCertificates?.includes(
                          certificate.id
                        )

                        let updated = []

                        if (exists) {
                          updated = role.requiredCertificates.filter(
                            (id) => id !== certificate.id
                          )
                        } else {
                          updated = [
                            ...(role.requiredCertificates || []),
                            certificate.id
                          ]
                        }

                        handleChange({
                          target: {
                            name: 'requiredCertificates',
                            value: updated,
                            type: 'custom'
                          }
                        })
                      }}
                    />

                    {certificate.name}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* =========================
              BOTÃO
          ========================== */}

          {(hasPermission('roles_create') || hasPermission('roles_edit')) && (
            <button className="save-btn" type="submit">
              {editingId ? 'Atualizar cargo' : 'Salvar cargo'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
