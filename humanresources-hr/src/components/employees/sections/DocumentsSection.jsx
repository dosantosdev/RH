import './documentsSection.css'
import CnhSection from './CnhSection'
import ValidatedField from '../../ui/ValidatedField'

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
        <ValidatedField name="cpf" error={errors.cpf}>
          <input value={form.cpf} onChange={handleChange} placeholder="CPF" />
        </ValidatedField>

        <ValidatedField name="rg" error={errors.rg}>
          <input value={form.rg} onChange={handleChange} placeholder="RG" />
        </ValidatedField>

        <ValidatedField name="rgIssuer" error={errors.rgIssuer}>
          <input
            value={form.rgIssuer}
            onChange={handleChange}
            placeholder="Órgão emissor"
          />
        </ValidatedField>

        <ValidatedField name="rgDate" error={errors.rgDate}>
          <input
            value={form.rgDate}
            onChange={handleChange}
            placeholder="Data RG"
          />
        </ValidatedField>

        <ValidatedField name="rgCity" error={errors.rgCity}>
          <input
            value={form.rgCity}
            onChange={handleChange}
            placeholder="Município RG"
          />
        </ValidatedField>

        <ValidatedField name="rgState" error={errors.rgState}>
          <input
            value={form.rgState}
            onChange={handleChange}
            placeholder="UF RG"
          />
        </ValidatedField>
      </div>

      <div className="documents-extra-grid">
        <ValidatedField name="ctpsNumber" error={errors.ctpsNumber}>
          <input
            value={form.ctpsNumber}
            onChange={handleChange}
            placeholder="CTPS"
          />
        </ValidatedField>

        <ValidatedField name="ctpsSeries" error={errors.ctpsSeries}>
          <input
            value={form.ctpsSeries}
            onChange={handleChange}
            placeholder="Série"
          />
        </ValidatedField>

        <ValidatedField name="ctpsCity" error={errors.ctpsCity}>
          <input
            value={form.ctpsCity}
            onChange={handleChange}
            placeholder="Município CTPS"
          />
        </ValidatedField>

        <ValidatedField name="pis" error={errors.pis}>
          <input value={form.pis} onChange={handleChange} placeholder="PIS" />
        </ValidatedField>
      </div>

      <div className="voter-grid">
        <ValidatedField name="susCard" error={errors.susCard}>
          <input
            value={form.susCard}
            onChange={handleChange}
            placeholder="Cartão SUS"
          />
        </ValidatedField>

        <ValidatedField name="voterTitle" error={errors.voterTitle}>
          <input
            value={form.voterTitle}
            onChange={handleChange}
            placeholder="Título eleitoral"
          />
        </ValidatedField>

        <ValidatedField name="voterZone" error={errors.voterZone}>
          <input
            value={form.voterZone}
            onChange={handleChange}
            placeholder="Zona"
          />
        </ValidatedField>

        <ValidatedField name="voterSection" error={errors.voterSection}>
          <input
            value={form.voterSection}
            onChange={handleChange}
            placeholder="Seção"
          />
        </ValidatedField>
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
