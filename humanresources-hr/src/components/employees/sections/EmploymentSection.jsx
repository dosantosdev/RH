import { useEffect, useState } from 'react'

import './employmentSection.css'

import ValidatedField from '../../ui/ValidatedField'

export default function EmploymentSection({
  form,
  handleChange,
  branches,
  filteredDepartments,
  filteredPositions,
  handleBranchChange,
  handleDepartmentChange,
  handlePositionChange,
  errors = {}
}) {
  /*
   * ============================================================
   * PESQUISA DE DEPARTAMENTO
   * ============================================================
   */

  const [departmentSearch, setDepartmentSearch] = useState('')

  /*
   * Quando a filial muda, a pesquisa anterior deixa de fazer
   * sentido e deve ser limpa.
   */

  useEffect(() => {
    setDepartmentSearch('')
  }, [form.branchId])

  /*
   * ============================================================
   * DEPARTAMENTOS VISÍVEIS
   * ============================================================
   *
   * filteredDepartments já contém somente os departamentos
   * da filial selecionada.
   *
   * Aqui aplicamos apenas a pesquisa digitada.
   */

  const visibleDepartments = filteredDepartments.filter((department) =>
    department.name
      ?.toLowerCase()
      .includes(departmentSearch.trim().toLowerCase())
  )

  return (
    <div className="form-section">
      {/* ======================================================
          CABEÇALHO
      ======================================================= */}

      <div className="employment-header">
        <h3 className="form-section-title">Vínculo profissional</h3>

        <label className="employment-active">
          <input
            type="checkbox"
            name="active"
            checked={form.active}
            onChange={handleChange}
          />

          <span>
            {form.active ? 'Funcionário ativo' : 'Funcionário inativo'}
          </span>
        </label>
      </div>

      {/* ======================================================
          FILIAL
      ======================================================= */}

      <div className="employment-grid">
        <ValidatedField name="branchId" error={errors.branchId}>
          <select value={form.branchId || ''} onChange={handleBranchChange}>
            <option value="">Selecione a filial</option>

            {branches
              .filter((branch) => branch.active !== false)
              .map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
          </select>
        </ValidatedField>

        {/* ====================================================
            MATRÍCULA
        ===================================================== */}

        <ValidatedField name="registration" error={errors.registration}>
          <input
            value={form.registration}
            onChange={handleChange}
            placeholder="Matrícula"
          />
        </ValidatedField>
      </div>

      {/* ======================================================
          DEPARTAMENTO
          ====================================================== */}

      {form.branchId && (
        <div
          className={`employment-department-block ${
            errors.departmentId ? 'has-error' : ''
          }`}
          data-error-field="departmentId"
        >
          <label className="employment-field-label">Departamento</label>

          <div className="employment-department-search">
            <input
              type="search"
              value={departmentSearch}
              onChange={(event) => setDepartmentSearch(event.target.value)}
              placeholder="Pesquisar departamento..."
            />
          </div>

          <select
            value={form.departmentId || ''}
            onChange={handleDepartmentChange}
            disabled={!filteredDepartments.length}
            className={errors.departmentId ? 'field-error' : ''}
          >
            <option value="">
              {filteredDepartments.length
                ? 'Selecione o departamento'
                : 'Nenhum departamento cadastrado nesta filial'}
            </option>

            {visibleDepartments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>

          {errors.departmentId && (
            <span className="employment-inline-error">
              {errors.departmentId}
            </span>
          )}

          {departmentSearch && visibleDepartments.length === 0 && (
            <span className="employment-search-empty">
              Nenhum departamento encontrado para essa pesquisa.
            </span>
          )}
        </div>
      )}

      {/* ======================================================
          POSIÇÃO
          ====================================================== */}

      {form.branchId && form.departmentId && (
        <div className="employment-position-block">
          <ValidatedField name="positionId" error={errors.positionId}>
            <select
              value={form.positionId || ''}
              onChange={handlePositionChange}
            >
              <option value="">
                {filteredPositions.length
                  ? 'Selecione a posição'
                  : 'Nenhuma posição cadastrada para este departamento'}
              </option>

              {filteredPositions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.cargoName}
                </option>
              ))}
            </select>
          </ValidatedField>
        </div>
      )}

      {/* ======================================================
          AVISO DE POSIÇÃO
      ====================================================== */}

      {form.branchId && form.departmentId && filteredPositions.length === 0 && (
        <div className="employment-organizational-alert">
          <strong>Nenhuma posição encontrada</strong>

          <span>
            Não existe uma posição cadastrada para este departamento e filial.
            Cadastre uma posição no Organograma antes de vincular o funcionário.
          </span>
        </div>
      )}

      {/* ======================================================
          RESUMO DO VÍNCULO
      ====================================================== */}

      {form.positionId && (
        <div className="employment-position-info">
          <div>
            <span>Cargo</span>

            <strong>{form.roleName || '-'}</strong>
          </div>

          <div>
            <span>Departamento</span>

            <strong>{form.departmentName || '-'}</strong>
          </div>

          <div>
            <span>Filial</span>

            <strong>{form.branchName || '-'}</strong>
          </div>
        </div>
      )}

      {/* ======================================================
          DATAS
      ====================================================== */}

      <div className="employment-dates-grid">
        <ValidatedField name="periodicExamDate" error={errors.periodicExamDate}>
          <input
            value={form.periodicExamDate}
            onChange={handleChange}
            placeholder="Exame periódico"
          />
        </ValidatedField>

        <ValidatedField name="admissionDate" error={errors.admissionDate}>
          <input
            value={form.admissionDate}
            onChange={handleChange}
            placeholder="Admissão"
          />
        </ValidatedField>

        {!form.active && (
          <ValidatedField name="dismissalDate" error={errors.dismissalDate}>
            <input
              value={form.dismissalDate}
              onChange={handleChange}
              placeholder="Data demissional"
            />
          </ValidatedField>
        )}
      </div>
    </div>
  )
}
