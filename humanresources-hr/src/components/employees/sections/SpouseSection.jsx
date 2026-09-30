import './spouseSection.css'
import ValidatedField from '../../ui/ValidatedField'

export default function SpouseSection({ form, handleChange, errors = {} }) {
  const showSpouse =
    form.maritalStatus === 'Casado' || form.maritalStatus === 'União estável'

  if (!showSpouse) return null

  return (
    <div className="form-section">
      <h3 className="form-section-title">Dados do cônjuge</h3>

      <div className="spouse-grid">
        <ValidatedField name="spouseName" error={errors.spouseName}>
          <input
            value={form.spouseName}
            onChange={handleChange}
            placeholder="Nome do cônjuge"
          />
        </ValidatedField>

        <div className="spouse-docs-grid">
          <ValidatedField name="spouseGender" error={errors.spouseGender}>
            <select value={form.spouseGender} onChange={handleChange}>
              <option value="">Sexo</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
            </select>
          </ValidatedField>

          <ValidatedField name="spousePhone" error={errors.spousePhone}>
            <input
              value={form.spousePhone}
              onChange={handleChange}
              placeholder="Telefone"
            />
          </ValidatedField>

          <ValidatedField name="spouseCpf" error={errors.spouseCpf}>
            <input
              value={form.spouseCpf}
              onChange={handleChange}
              placeholder="CPF"
            />
          </ValidatedField>

          <ValidatedField name="spouseRg" error={errors.spouseRg}>
            <input
              value={form.spouseRg}
              onChange={handleChange}
              placeholder="RG"
            />
          </ValidatedField>

          <ValidatedField
            name="spouseRgIssuer"
            error={errors.spouseRgIssuer}
          >
            <input
              value={form.spouseRgIssuer}
              onChange={handleChange}
              placeholder="Emissor RG"
            />
          </ValidatedField>

          <ValidatedField name="spouseUf" error={errors.spouseUf}>
            <input
              value={form.spouseUf}
              onChange={handleChange}
              placeholder="UF RG"
            />
          </ValidatedField>
        </div>

        <div className="spouse-extra-grid">
          <ValidatedField
            name="spouseBirthDate"
            error={errors.spouseBirthDate}
          >
            <input
              value={form.spouseBirthDate}
              onChange={handleChange}
              placeholder="Nascimento"
            />
          </ValidatedField>

          <ValidatedField
            name="spouseBirthCity"
            error={errors.spouseBirthCity}
          >
            <input
              value={form.spouseBirthCity}
              onChange={handleChange}
              placeholder="Cidade nascimento"
            />
          </ValidatedField>

          <ValidatedField name="marriageDate" error={errors.marriageDate}>
            <input
              value={form.marriageDate}
              onChange={handleChange}
              placeholder="Data casamento/união"
            />
          </ValidatedField>
        </div>
      </div>
    </div>
  )
}
