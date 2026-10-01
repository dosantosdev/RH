import './employmentSection.css'
import ValidatedField from '../../ui/ValidatedField'

export default function EmploymentSection({
  form,
  handleChange,
  positions,
  handlePositionChange,
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
        <ValidatedField name="positionId" error={errors.positionId}>
          <select value={form.positionId || ''} onChange={handlePositionChange}>
            <option value="">Selecione a posição</option>

            {positions
              .filter((position) => position.active !== false)
              .map((position) => (
                <option key={position.id} value={position.id}>
                  {position.cargoName}
                  {' — '}
                  {position.departmentName}
                  {' / '}
                  {position.branchName}
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
