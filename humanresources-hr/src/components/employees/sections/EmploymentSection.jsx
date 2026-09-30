import './employmentSection.css'
import ValidatedField from '../../ui/ValidatedField'

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
        <ValidatedField name="roleId" error={errors.roleId}>
          <select value={form.roleId} onChange={handleChange}>
            <option value="">Cargo</option>
            {roles
              .filter((role) => role.active)
              .map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
          </select>
        </ValidatedField>

        <ValidatedField name="branchId" error={errors.branchId}>
          <select value={form.branchId} onChange={handleChange}>
            <option value="">Filial</option>
            {branches
              .filter((branch) => branch.active)
              .map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
          </select>
        </ValidatedField>

        <ValidatedField name="registration" error={errors.registration}>
          <input
            value={form.registration}
            onChange={handleChange}
            placeholder="Matrícula"
          />
        </ValidatedField>
      </div>

      <div className="employment-dates-grid">
        <ValidatedField
          name="periodicExamDate"
          error={errors.periodicExamDate}
        >
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
          <ValidatedField
            name="dismissalDate"
            error={errors.dismissalDate}
          >
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
