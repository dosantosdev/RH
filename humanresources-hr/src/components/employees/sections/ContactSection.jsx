import './contactSection.css'
import ValidatedField from '../../ui/ValidatedField'

export default function ContactSection({ form, handleChange, errors = {} }) {
  return (
    <div className="form-section">
      <h3 className="form-section-title">Contato</h3>

      <div className="contact-grid">
        <ValidatedField name="phone" error={errors.phone}>
          <input value={form.phone} onChange={handleChange} placeholder="Celular" />
        </ValidatedField>

        <input
          name="carrier"
          value={form.carrier}
          onChange={handleChange}
          placeholder="Operadora"
        />

        <ValidatedField
          name="secondaryPhone"
          error={errors.secondaryPhone}
        >
          <input
            value={form.secondaryPhone}
            onChange={handleChange}
            placeholder="Celular complementar"
          />
        </ValidatedField>

        <input
          name="secondaryCarrier"
          value={form.secondaryCarrier}
          onChange={handleChange}
          placeholder="Operadora 2"
        />

        <ValidatedField name="email" error={errors.email}>
          <input value={form.email} onChange={handleChange} placeholder="E-mail" />
        </ValidatedField>
      </div>
    </div>
  )
}
