import './employmentSection.css'
import FieldError from './FieldError'

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
        <div>
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
          <FieldError message={errors.roleId} />
        </div>

        <div>
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
          <FieldError message={errors.branchId} />
        </div>

        <input
          name="registration"
          value={form.registration}
          onChange={handleChange}
          placeholder="Matrícula"
        />
      </div>

      <div className="employment-dates-grid">
        <div>
          <input
            className={errors.periodicExamDate ? 'field-error' : ''}
            name="periodicExamDate"
            value={form.periodicExamDate}
            onChange={handleChange}
            placeholder="Exame periódico"
          />
          <FieldError message={errors.periodicExamDate} />
        </div>

        <div>
          <input
            className={errors.admissionDate ? 'field-error' : ''}
            name="admissionDate"
            value={form.admissionDate}
            onChange={handleChange}
            placeholder="Admissão"
          />
          <FieldError message={errors.admissionDate} />
        </div>

        {!form.active && (
          <div>
            <input
              className={errors.dismissalDate ? 'field-error' : ''}
              name="dismissalDate"
              value={form.dismissalDate}
              onChange={handleChange}
              placeholder="Data demissional"
            />
            <FieldError message={errors.dismissalDate} />
          </div>
        )}
      </div>
    </div>
  )
}
