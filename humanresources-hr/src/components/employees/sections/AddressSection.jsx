import './addressSection.css'

export default function AddressSection({ form, handleChange }) {
  return (
    <div className="form-section">
      <h3 className="form-section-title">Endereço</h3>

      <div className="address-grid">
        <input
          name="cep"
          value={form.cep}
          onChange={handleChange}
          placeholder="CEP"
        />

        <input
          className="street-field"
          name="street"
          value={form.street}
          onChange={handleChange}
          placeholder="Rua"
        />

        <input
          name="number"
          value={form.number}
          onChange={handleChange}
          placeholder="Número"
        />

        <input
          name="complement"
          value={form.complement}
          onChange={handleChange}
          placeholder="Complemento"
        />

        <input
          name="district"
          value={form.district}
          onChange={handleChange}
          placeholder="Bairro"
        />

        <input
          name="city"
          value={form.city}
          onChange={handleChange}
          placeholder="Cidade"
        />

        <input
          name="state"
          value={form.state}
          onChange={handleChange}
          placeholder="Estado"
        />

        <input
          name="country"
          value={form.country}
          onChange={handleChange}
          placeholder="País"
        />

        <select
          name="propertyType"
          value={form.propertyType}
          onChange={handleChange}
        >
          <option value="">Tipo propriedade</option>

          <option value="Própria">Própria</option>

          <option value="Alugada">Alugada</option>

          <option value="Cedida">Cedida</option>
        </select>

        <input
          name="livingSince"
          value={form.livingSince}
          onChange={handleChange}
          placeholder="Reside desde"
        />
      </div>
    </div>
  )
}
