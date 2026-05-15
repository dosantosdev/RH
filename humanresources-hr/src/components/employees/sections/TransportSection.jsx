import './transportSection.css'

export default function TransportSection({ form, handleChange }) {
  return (
    <div className="form-section">
      <h3 className="form-section-title">Transporte</h3>

      <div className="transport-grid">
        <input
          name="transportValue"
          value={form.transportValue}
          onChange={handleChange}
          placeholder="Valor passagem ida e volta"
        />

        <input
          name="busCompany"
          value={form.busCompany}
          onChange={handleChange}
          placeholder="Empresa de ônibus"
        />
      </div>
    </div>
  )
}
