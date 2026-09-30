import './transportSection.css'
import ValidatedField from '../../ui/ValidatedField'

export default function TransportSection({ form, handleChange, errors = {} }) {
  return (
    <div className="form-section">
      <h3 className="form-section-title">Transporte</h3>

      <div className="transport-grid">
        <ValidatedField name="transportValue" error={errors.transportValue}>
          <input
            value={form.transportValue}
            onChange={handleChange}
            placeholder="Valor passagem ida e volta"
          />
        </ValidatedField>

        <ValidatedField name="busCompany" error={errors.busCompany}>
          <input
            value={form.busCompany}
            onChange={handleChange}
            placeholder="Empresa de ônibus"
          />
        </ValidatedField>
      </div>
    </div>
  )
}
