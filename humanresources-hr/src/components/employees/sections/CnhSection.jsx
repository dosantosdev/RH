import './cnhSection.css'
import FieldTooltip from '../../ui/FieldTooltip'

export default function CnhSection({
  form,
  handleChange,
  handleCheckboxArray,
  errors = {}
}) {
  return (
    <div className="cnh-section">
      <div className="cnh-grid">
        {/* CNH */}
        <div className="field-tooltip-wrapper">
          <input
            className={errors.cnhNumber ? 'field-error' : ''}
            name="cnhNumber"
            value={form.cnhNumber}
            onChange={handleChange}
            placeholder="CNH"
          />

          <FieldTooltip
            message={errors.cnhNumber}
            visible={Boolean(errors.cnhNumber)}
          />
        </div>

        {/* 1ª HABILITAÇÃO */}
        <div className="field-tooltip-wrapper">
          <input
            className={errors.cnhDate ? 'field-error' : ''}
            name="cnhDate"
            value={form.cnhDate}
            onChange={handleChange}
            placeholder="1ª habilitação"
          />

          <FieldTooltip
            message={errors.cnhDate}
            visible={Boolean(errors.cnhDate)}
          />
        </div>

        {/* VALIDADE */}
        <div className="field-tooltip-wrapper">
          <input
            className={errors.cnhValidity ? 'field-error' : ''}
            name="cnhValidity"
            value={form.cnhValidity}
            onChange={handleChange}
            placeholder="Validade"
          />

          <FieldTooltip
            message={errors.cnhValidity}
            visible={Boolean(errors.cnhValidity)}
          />
        </div>

        {/* MUNICÍPIO CNH */}
        <div className="field-tooltip-wrapper">
          <input
            className={errors.cnhCity ? 'field-error' : ''}
            name="cnhCity"
            value={form.cnhCity}
            onChange={handleChange}
            placeholder="Município CNH"
          />

          <FieldTooltip
            message={errors.cnhCity}
            visible={Boolean(errors.cnhCity)}
          />
        </div>

        {/* UF 1ª HABILITAÇÃO */}
        <div className="field-tooltip-wrapper">
          <input
            className={errors.cnhFirstLicenseUF ? 'field-error' : ''}
            name="cnhFirstLicenseUF"
            value={form.cnhFirstLicenseUF}
            onChange={handleChange}
            placeholder="UF 1ª habilitação"
          />

          <FieldTooltip
            message={errors.cnhFirstLicenseUF}
            visible={Boolean(errors.cnhFirstLicenseUF)}
          />
        </div>
      </div>

      {/* CATEGORIAS */}
      <div
        className={
          errors.cnhCategories
            ? 'cnh-categories field-error-box'
            : 'cnh-categories'
        }
      >
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

        <FieldTooltip
          message={errors.cnhCategories}
          visible={Boolean(errors.cnhCategories)}
        />
      </div>
    </div>
  )
}
