import './employmentSection.css'
import FieldTooltip from '../../ui/FieldTooltip'

export default function EmploymentSection({
  form,
  handleChange,
  roles,
  branches,
  errors = {}
}) {
  return (
    <div className="form-section">
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

      <div className="employment-grid">
        <div className="field-tooltip-wrapper">
          <select
            className={errors.roleId ? 'field-error' : ''}
            name="roleId"
            value={form.roleId}
            onChange={handleChange}
          >
            <option value="">Cargo</option>

            {roles
              .filter((role) => role.active)
              .map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
          </select>

          <FieldTooltip
            message={errors.roleId}
            visible={Boolean(errors.roleId)}
          />
        </div>

        <div className="field-tooltip-wrapper">
          <select
            className={errors.branchId ? 'field-error' : ''}
            name="branchId"
            value={form.branchId}
            onChange={handleChange}
          >
            <option value="">Filial</option>

            {branches
              .filter((branch) => branch.active)
              .map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
          </select>

          <FieldTooltip
            message={errors.branchId}
            visible={Boolean(errors.branchId)}
          />
        </div>

        <input
          name="registration"
          value={form.registration}
          onChange={handleChange}
          placeholder="Matrícula"
        />
      </div>

      <div className="employment-dates-grid">
        <div className="field-tooltip-wrapper">
          <input
            className={errors.periodicExamDate ? 'field-error' : ''}
            name="periodicExamDate"
            value={form.periodicExamDate}
            onChange={handleChange}
            placeholder="Exame periódico"
          />

          <FieldTooltip
            message={errors.periodicExamDate}
            visible={Boolean(errors.periodicExamDate)}
          />
        </div>

        <div className="field-tooltip-wrapper">
          <input
            className={errors.admissionDate ? 'field-error' : ''}
            name="admissionDate"
            value={form.admissionDate}
            onChange={handleChange}
            placeholder="Admissão"
          />

          <FieldTooltip
            message={errors.admissionDate}
            visible={Boolean(errors.admissionDate)}
          />
        </div>

        {!form.active && (
          <div className="field-tooltip-wrapper">
            <input
              className={errors.dismissalDate ? 'field-error' : ''}
              name="dismissalDate"
              value={form.dismissalDate}
              onChange={handleChange}
              placeholder="Data demissional"
            />

            <FieldTooltip
              message={errors.dismissalDate}
              visible={Boolean(errors.dismissalDate)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
