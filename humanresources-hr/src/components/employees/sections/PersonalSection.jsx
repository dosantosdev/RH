import './personalSection.css'
import ValidatedField from '../../ui/ValidatedField'

export default function PersonalSection({
  form,
  handleChange,
  handlePhotoUpload,
  fileRef,
  errors = {}
}) {
  return (
    <div className="form-section">
      <div className="personal-header">
        <div className="personal-content">
          <h3 className="form-section-title">Dados pessoais</h3>

          <div className="personal-grid">
            <ValidatedField
              name="name"
              error={errors.name}
              wrapperClassName="field-full"
            >
              <input
                value={form.name}
                onChange={handleChange}
                placeholder="Nome completo"
              />
            </ValidatedField>

            <ValidatedField
              name="gender"
              error={errors.gender}
              wrapperClassName="field-small"
            >
              <select value={form.gender} onChange={handleChange}>
                <option value="">Sexo</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
              </select>
            </ValidatedField>

            <ValidatedField
              name="maritalStatus"
              error={errors.maritalStatus}
              wrapperClassName="field-small"
            >
              <select value={form.maritalStatus} onChange={handleChange}>
                <option value="">Estado civil</option>
                <option value="Solteiro">Solteiro</option>
                <option value="Casado">Casado</option>
                <option value="União estável">União estável</option>
                <option value="Divorciado">Divorciado</option>
                <option value="Viúvo">Viúvo</option>
              </select>
            </ValidatedField>

            <ValidatedField
              name="education"
              error={errors.education}
              wrapperClassName="field-small"
            >
              <select value={form.education} onChange={handleChange}>
                <option value="">Escolaridade</option>
                <option value="Fundamental Incompleto">
                  Fundamental Incompleto
                </option>
                <option value="Fundamental Completo">
                  Fundamental Completo
                </option>
                <option value="Ensino Médio Incompleto">
                  Ensino Médio Incompleto
                </option>
                <option value="Ensino Médio Completo">
                  Ensino Médio Completo
                </option>
                <option value="Ensino Superior Incompleto">
                  Ensino Superior Incompleto
                </option>
                <option value="Ensino Superior Completo">
                  Ensino Superior Completo
                </option>
              </select>
            </ValidatedField>

            <div className="birth-grid">
              <ValidatedField
                name="birthDate"
                error={errors.birthDate}
                wrapperClassName="birth-date"
              >
                <input
                  value={form.birthDate}
                  onChange={handleChange}
                  placeholder="Nascimento"
                />
              </ValidatedField>

              <input
                className="birth-city"
                name="birthCity"
                value={form.birthCity}
                onChange={handleChange}
                placeholder="Cidade nascimento"
              />

              <input
                className="birth-uf"
                name="birthState"
                value={form.birthState}
                onChange={handleChange}
                placeholder="UF nascimento"
              />

              <input
                className="birth-country"
                name="birthCountry"
                value={form.birthCountry}
                onChange={handleChange}
                placeholder="País nascimento"
              />
            </div>

            <ValidatedField
              name="motherName"
              error={errors.motherName}
              wrapperClassName="field-medium"
            >
              <input
                value={form.motherName}
                onChange={handleChange}
                placeholder="Nome da mãe"
              />
            </ValidatedField>

            <ValidatedField
              name="fatherName"
              error={errors.fatherName}
              wrapperClassName="field-medium"
            >
              <input
                value={form.fatherName}
                onChange={handleChange}
                placeholder="Nome do pai"
              />
            </ValidatedField>
          </div>
        </div>

        <div className="photo-upload">
          <button
            type="button"
            className="photo-preview"
            onClick={() => fileRef.current?.click()}
          >
            {form.photo ? (
              <img
                src={
                  typeof form.photo === 'string'
                    ? form.photo
                    : URL.createObjectURL(form.photo)
                }
                alt="Preview"
              />
            ) : (
              <span>Foto</span>
            )}
          </button>

          <input
            type="file"
            ref={fileRef}
            accept="image/*"
            onChange={handlePhotoUpload}
            hidden
          />
        </div>
      </div>
    </div>
  )
}
