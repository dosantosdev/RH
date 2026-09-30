import './dependentsSection.css'
import ValidatedField from '../../ui/ValidatedField'

export default function DependentsSection({
  form,
  handleChange,
  handleDependents,
  handleDependentChange,
  errors = {}
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
          <ValidatedField
            name="dependentsCount"
            error={errors.dependentsCount}
          >
            <input
              type="number"
              min="1"
              value={form.dependentsCount}
              onChange={(e) => handleDependents(e.target.value)}
              placeholder="Quantidade"
            />
          </ValidatedField>
        )}
      </div>

      {form.hasDependents &&
        (form.dependents || []).map((dependent, index) => {
          const getError = (field) =>
            errors[`dependents[${index}].${field}`]

          return (
            <div key={dependent.id} className="dependent-card">
              <h4>Dependente {index + 1}</h4>

              <div className="dependent-grid">
                <ValidatedField
                  name={`dependents[${index}].name`}
                  error={getError('name')}
                >
                  <input
                    value={dependent.name}
                    onChange={(e) =>
                      handleDependentChange(index, 'name', e.target.value)
                    }
                    placeholder="Nome"
                  />
                </ValidatedField>

                <ValidatedField
                  name={`dependents[${index}].cpf`}
                  error={getError('cpf')}
                >
                  <input
                    value={dependent.cpf}
                    onChange={(e) =>
                      handleDependentChange(index, 'cpf', e.target.value)
                    }
                    placeholder="CPF"
                  />
                </ValidatedField>

                <ValidatedField
                  name={`dependents[${index}].birthDate`}
                  error={getError('birthDate')}
                >
                  <input
                    value={dependent.birthDate}
                    onChange={(e) =>
                      handleDependentChange(index, 'birthDate', e.target.value)
                    }
                    placeholder="Nascimento"
                  />
                </ValidatedField>

                <ValidatedField
                  name={`dependents[${index}].rg`}
                  error={getError('rg')}
                >
                  <input
                    value={dependent.rg}
                    onChange={(e) =>
                      handleDependentChange(index, 'rg', e.target.value)
                    }
                    placeholder="RG"
                  />
                </ValidatedField>
              </div>
            </div>
          )
        })}
    </div>
  )
}
