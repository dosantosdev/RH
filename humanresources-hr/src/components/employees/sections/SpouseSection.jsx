import './spouseSection.css'

export default function SpouseSection({ form, handleChange }) {
  const showSpouse =
    form.maritalStatus === 'Casado' || form.maritalStatus === 'União estável'

  if (!showSpouse) return null

  return (
    <div className="form-section">
      <h3 className="form-section-title">Dados do cônjuge</h3>

      <div className="spouse-grid">
        <input
          className="field-full"
          name="spouseName"
          value={form.spouseName}
          onChange={handleChange}
          placeholder="Nome do cônjuge"
        />

        <input
          name="spouseCpf"
          value={form.spouseCpf}
          onChange={handleChange}
          placeholder="CPF"
        />

        <input
          name="spousePhone"
          value={form.spousePhone}
          onChange={handleChange}
          placeholder="Telefone"
        />

        <input
          name="spouseRg"
          value={form.spouseRg}
          onChange={handleChange}
          placeholder="RG"
        />

        <input
          name="spouseRgIssuer"
          value={form.spouseRgIssuer}
          onChange={handleChange}
          placeholder="Emissor RG"
        />

        <input
          name="spouseUf"
          value={form.spouseUf}
          onChange={handleChange}
          placeholder="UF"
        />

        <input
          name="spouseBirthDate"
          value={form.spouseBirthDate}
          onChange={handleChange}
          placeholder="Nascimento"
        />

        <select
          name="spouseGender"
          value={form.spouseGender}
          onChange={handleChange}
        >
          <option value="">Sexo</option>

          <option value="Masculino">Masculino</option>

          <option value="Feminino">Feminino</option>
        </select>

        <input
          name="spouseBirthCity"
          value={form.spouseBirthCity}
          onChange={handleChange}
          placeholder="Cidade nascimento"
        />

        <input
          name="marriageDate"
          value={form.marriageDate}
          onChange={handleChange}
          placeholder="Data casamento"
        />
      </div>
    </div>
  )
}
