import './documentsSection.css'

export default function DocumentsSection({
  form,
  handleChange,
  handleCheckboxArray
}) {
  return (
    <div className="form-section">
      <h3 className="form-section-title">Documentação</h3>

      <div className="documents-grid">
        <input
          name="cpf"
          value={form.cpf}
          onChange={handleChange}
          placeholder="CPF"
        />

        <input
          name="rg"
          value={form.rg}
          onChange={handleChange}
          placeholder="RG"
        />

        <label className="personal-checkbox">
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
          name="rgIssuer"
          value={form.rgIssuer}
          onChange={handleChange}
          placeholder="Órgão emissor"
        />

        <input
          name="rgDate"
          value={form.rgDate}
          onChange={handleChange}
          placeholder="Data RG"
        />

        <input
          name="rgCity"
          value={form.rgCity}
          onChange={handleChange}
          placeholder="Município RG"
        />

        <input
          name="rgState"
          value={form.rgState}
          onChange={handleChange}
          placeholder="UF RG"
        />
      </div>

      <div className="documents-extra-grid">
        <input
          name="pis"
          value={form.pis}
          onChange={handleChange}
          placeholder="PIS"
        />

        <input
          name="ctpsNumber"
          value={form.ctpsNumber}
          onChange={handleChange}
          placeholder="CTPS"
        />

        <input
          name="ctpsSeries"
          value={form.ctpsSeries}
          onChange={handleChange}
          placeholder="Série"
        />

        <input
          name="ctpsCity"
          value={form.ctpsCity}
          onChange={handleChange}
          placeholder="Município CTPS"
        />
      </div>

      <div className="voter-grid">
        <input
          name="voterTitle"
          value={form.voterTitle}
          onChange={handleChange}
          placeholder="Título eleitoral"
        />

        <input
          name="voterZone"
          value={form.voterZone}
          onChange={handleChange}
          placeholder="Zona"
        />

        <input
          name="voterSection"
          value={form.voterSection}
          onChange={handleChange}
          placeholder="Seção"
        />

        <input
          name="susCard"
          value={form.susCard}
          onChange={handleChange}
          placeholder="Cartão SUS"
        />
      </div>

      <div className="cnh-grid">
        <input
          name="cnhNumber"
          value={form.cnhNumber}
          onChange={handleChange}
          placeholder="CNH"
        />

        <input
          name="cnhDate"
          value={form.cnhDate}
          onChange={handleChange}
          placeholder="1ª habilitação"
        />

        <input
          name="cnhValidity"
          value={form.cnhValidity}
          onChange={handleChange}
          placeholder="Validade"
        />
      </div>

      <div className="cnh-extra-grid">
        <input
          name="cnhCity"
          value={form.cnhCity}
          onChange={handleChange}
          placeholder="Município CNH"
        />

        <input
          name="cnhFirstLicenseUF"
          value={form.cnhFirstLicenseUF}
          onChange={handleChange}
          placeholder="UF 1ª habilitação"
        />
      </div>

      <div className="cnh-categories">
        {['A', 'B', 'C', 'D', 'E'].map((cat) => (
          <label key={cat}>
            <input
              type="checkbox"
              value={cat}
              checked={form.cnhCategories.includes(cat)}
              onChange={(e) => handleCheckboxArray(e, 'cnhCategories')}
            />

            {cat}
          </label>
        ))}
      </div>
    </div>
  )
}
