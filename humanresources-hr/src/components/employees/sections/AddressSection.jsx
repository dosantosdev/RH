import './addressSection.css'
import ValidatedField from '../../ui/ValidatedField'

export default function AddressSection({ form, handleChange, errors = {} }) {
  return (
    <div className="form-section">
      <h3 className="form-section-title">Endereço</h3>

      <div className="address-grid">
        <ValidatedField name="cep" error={errors.cep}>
          <input value={form.cep} onChange={handleChange} placeholder="CEP" />
        </ValidatedField>

        <ValidatedField
          name="street"
          error={errors.street}
          inputClassName="street-field"
        >
          <input value={form.street} onChange={handleChange} placeholder="Rua" />
        </ValidatedField>

        <ValidatedField name="number" error={errors.number}>
          <input
            value={form.number}
            onChange={handleChange}
            placeholder="Número"
          />
        </ValidatedField>

        <ValidatedField name="complement" error={errors.complement}>
          <input
            value={form.complement}
            onChange={handleChange}
            placeholder="Complemento"
          />
        </ValidatedField>

        <ValidatedField name="district" error={errors.district}>
          <input
            value={form.district}
            onChange={handleChange}
            placeholder="Bairro"
          />
        </ValidatedField>

        <ValidatedField name="city" error={errors.city}>
          <input value={form.city} onChange={handleChange} placeholder="Cidade" />
        </ValidatedField>

        <ValidatedField name="state" error={errors.state}>
          <input value={form.state} onChange={handleChange} placeholder="Estado" />
        </ValidatedField>

        <ValidatedField name="country" error={errors.country}>
          <input value={form.country} onChange={handleChange} placeholder="País" />
        </ValidatedField>

        <ValidatedField name="propertyType" error={errors.propertyType}>
          <select value={form.propertyType} onChange={handleChange}>
            <option value="">Tipo propriedade</option>
            <option value="Própria">Própria</option>
            <option value="Alugada">Alugada</option>
            <option value="Cedida">Cedida</option>
          </select>
        </ValidatedField>

        <ValidatedField name="livingSince" error={errors.livingSince}>
          <input
            value={form.livingSince}
            onChange={handleChange}
            placeholder="Reside desde"
          />
        </ValidatedField>
      </div>
    </div>
  )
}
