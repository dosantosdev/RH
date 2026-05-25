import './employmentSection.css'

export default function EmploymentSection({
  form,
  handleChange,
  roles,
  branches
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
        {/* ✅ RELACIONAMENTO VIA ID */}

        <select name="roleId" value={form.roleId} onChange={handleChange}>
          <option value="">Cargo</option>

          {roles
            .filter((role) => role.active)
            .map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
        </select>

        {/* ✅ RELACIONAMENTO VIA ID */}

        <select name="branchId" value={form.branchId} onChange={handleChange}>
          <option value="">Filial</option>

          {branches
            .filter((branch) => branch.active)
            .map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
        </select>

        <input
          name="registration"
          value={form.registration}
          onChange={handleChange}
          placeholder="Matrícula"
        />
      </div>

      <div className="employment-dates-grid">
        <input
          name="periodicExamDate"
          value={form.periodicExamDate}
          onChange={handleChange}
          placeholder="Exame periódico"
        />

        <input
          name="admissionDate"
          value={form.admissionDate}
          onChange={handleChange}
          placeholder="Admissão"
        />

        {!form.active && (
          <input
            name="dismissalDate"
            value={form.dismissalDate}
            onChange={handleChange}
            placeholder="Data demissional"
          />
        )}
      </div>
    </div>
  )
}
