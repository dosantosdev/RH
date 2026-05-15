import './dependentsSection.css'

export default function DependentsSection({
  form,
  handleChange,
  handleDependents,
  handleDependentChange
}) {
  return (
    <div className="form-section">
      <h3 className="form-section-title">Dependentes</h3>

      <div className="dependents-control">
        <label className="checkbox-field">
          <input
            type="checkbox"
            name="hasDependents"
            checked={form.hasDependents}
            onChange={handleChange}
          />
          Possui dependentes
        </label>

        {form.hasDependents && (
          <input
            type="number"
            min="1"
            value={form.dependentsCount}
            onChange={(e) => handleDependents(e.target.value)}
            placeholder="Quantidade"
          />
        )}
      </div>

      {form.hasDependents &&
        (form.dependents || []).map((dependent, index) => (
          <div key={dependent.id} className="dependent-card">
            <h4>Dependente {index + 1}</h4>

            <div className="dependent-grid">
              <input
                name="name"
                value={dependent.name}
                onChange={(e) =>
                  handleDependentChange(index, 'name', e.target.value)
                }
                placeholder="Nome"
              />

              <input
                name="cpf"
                value={dependent.cpf}
                onChange={(e) =>
                  handleDependentChange(index, 'cpf', e.target.value)
                }
                placeholder="CPF"
              />

              <input
                name="birthDate"
                value={dependent.birthDate}
                onChange={(e) =>
                  handleDependentChange(index, 'birthDate', e.target.value)
                }
                placeholder="Nascimento"
              />

              <input
                name="rg"
                value={dependent.rg}
                onChange={(e) =>
                  handleDependentChange(index, 'rg', e.target.value)
                }
                placeholder="RG"
              />
            </div>
          </div>
        ))}
    </div>
  )
}
