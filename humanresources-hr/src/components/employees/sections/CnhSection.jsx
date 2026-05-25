import './cnhSection.css'

export default function CnhSection({
  form,
  handleChange,
  handleCheckboxArray
}) {
  return (
    <div className="cnh-section">
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
