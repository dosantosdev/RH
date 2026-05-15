import './contactSection.css'

export default function ContactSection({ form, handleChange }) {
  return (
    <div className="form-section">
      <h3 className="form-section-title">Contato</h3>

      <div className="contact-grid">
        <input
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="Celular"
        />

        <input
          name="carrier"
          value={form.carrier}
          onChange={handleChange}
          placeholder="Operadora"
        />

        <input
          name="secondaryPhone"
          value={form.secondaryPhone}
          onChange={handleChange}
          placeholder="Celular complementar"
        />

        <input
          name="secondaryCarrier"
          value={form.secondaryCarrier}
          onChange={handleChange}
          placeholder="Operadora 2"
        />
      </div>

      <div className="email-grid">
        <input
          className="field-full"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="E-mail"
        />
      </div>
    </div>
  )
}
