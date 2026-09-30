import './documentsSection.css'
import CnhSection from './CnhSection'
import FieldError from './FieldError'

export default function DocumentsSection({
  form,
  handleChange,
  handleCheckboxArray,
  errors = {}
}) {
  return (
    <div className="form-section">
      <div className="documents-header">
        <h3 className="form-section-title">Documentação</h3>

        <label className="foreign-toggle">
          <input
            type="checkbox"
            name="foreigner"
            checked={form.foreigner}
            onChange={handleChange}
          />
          Estrangeiro
        </label>
      </div>

      <div className="rg-grid">
        <input
          className={errors.cpf ? 'field-error' : ''}
          name="cpf"
          value={form.cpf}
          onChange={handleChange}
          placeholder="CPF"
        />
        <FieldError message={errors.cpf} />

        <input
          className={errors.rg ? 'field-error' : ''}
          name="rg"
          value={form.rg}
          onChange={handleChange}
          placeholder="RG"
        />
        <FieldError message={errors.rg} />

        <input name="rgIssuer" value={form.rgIssuer} onChange={handleChange} placeholder="Órgão emissor" />

        <div>
          <input
            className={errors.rgDate ? 'field-error' : ''}
            name="rgDate"
            value={form.rgDate}
            onChange={handleChange}
            placeholder="Data RG"
          />
          <FieldError message={errors.rgDate} />
        </div>

        <input name="rgCity" value={form.rgCity} onChange={handleChange} placeholder="Município RG" />
        <input name="rgState" value={form.rgState} onChange={handleChange} placeholder="UF RG" />
      </div>

      <div className="documents-extra-grid">
        <input name="ctpsNumber" value={form.ctpsNumber} onChange={handleChange} placeholder="CTPS" />
        <input name="ctpsSeries" value={form.ctpsSeries} onChange={handleChange} placeholder="Série" />
        <input name="ctpsCity" value={form.ctpsCity} onChange={handleChange} placeholder="Município CTPS" />
        <input name="pis" value={form.pis} onChange={handleChange} placeholder="PIS" />
      </div>

      <div className="voter-grid">
        <input name="susCard" value={form.susCard} onChange={handleChange} placeholder="Cartão SUS" />
        <input name="voterTitle" value={form.voterTitle} onChange={handleChange} placeholder="Título eleitoral" />
        <input name="voterZone" value={form.voterZone} onChange={handleChange} placeholder="Zona" />
        <input name="voterSection" value={form.voterSection} onChange={handleChange} placeholder="Seção" />
      </div>

      <CnhSection
        form={form}
        handleChange={handleChange}
        handleCheckboxArray={handleCheckboxArray}
        errors={errors}
      />
    </div>
  )
}
