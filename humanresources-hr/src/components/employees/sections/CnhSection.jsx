import './cnhSection.css'
import FieldError from './FieldError'

export default function CnhSection({
  form,
  handleChange,
  handleCheckboxArray,
  errors = {}
}) {
  return (
    <div className="cnh-section">
      <div className="cnh-grid">
        <div>
          <input
            className={errors.cnhNumber ? 'field-error' : ''}
            name="cnhNumber"
            value={form.cnhNumber}
            onChange={handleChange}
            placeholder="CNH"
          />
          <FieldError message={errors.cnhNumber} />
        </div>

        <input name="cnhDate" value={form.cnhDate} onChange={handleChange} placeholder="1ª habilitação" />

        <div>
          <input
            className={errors.cnhValidity ? 'field-error' : ''}
            name="cnhValidity"
            value={form.cnhValidity}
            onChange={handleChange}
            placeholder="Validade"
          />
          <FieldError message={errors.cnhValidity} />
        </div>

        <input name="cnhCity" value={form.cnhCity} onChange={handleChange} placeholder="Município CNH" />
        <input name="cnhFirstLicenseUF" value={form.cnhFirstLicenseUF} onChange={handleChange} placeholder="UF 1ª habilitação" />
      </div>

      <div className={errors.cnhCategories ? 'cnh-categories field-error-box' : 'cnh-categories'}>
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
        <FieldError message={errors.cnhCategories} />
      </div>
    </div>
  )
}
