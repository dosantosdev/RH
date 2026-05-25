import './personalSection.css'

export default function PersonalSection({
  form,
  handleChange,
  handlePhotoUpload,
  fileRef
}) {
  return (
    <div className="form-section">
      <div className="personal-header">
        <div className="personal-content">
          <h3 className="form-section-title">Dados pessoais</h3>

          <div className="personal-grid">
            <input
              className="field-full"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Nome completo"
            />

            <select
              className="field-small"
              name="gender"
              value={form.gender}
              onChange={handleChange}
            >
              <option value="">Sexo</option>

              <option value="Masculino">Masculino</option>

              <option value="Feminino">Feminino</option>
            </select>

            <select
              className="field-small"
              name="maritalStatus"
              value={form.maritalStatus}
              onChange={handleChange}
            >
              <option value="">Estado civil</option>

              <option value="Solteiro">Solteiro</option>

              <option value="Casado">Casado</option>

              <option value="União estável">União estável</option>

              <option value="Divorciado">Divorciado</option>

              <option value="Viúvo">Viúvo</option>
            </select>

            <select
              className="field-small"
              name="education"
              value={form.education}
              onChange={handleChange}
            >
              <option value="">Escolaridade</option>

              <option value="Fundamental Incompleto">
                Fundamental Incompleto
              </option>

              <option value="Fundamental Completo">Fundamental Completo</option>

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

            <div className="birth-grid">
              <input
                className="birth-date"
                name="birthDate"
                value={form.birthDate}
                onChange={handleChange}
                placeholder="Nascimento"
              />

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

            <input
              className="field-medium"
              name="motherName"
              value={form.motherName}
              onChange={handleChange}
              placeholder="Nome da mãe"
            />

            <input
              className="field-medium"
              name="fatherName"
              value={form.fatherName}
              onChange={handleChange}
              placeholder="Nome do pai"
            />
          </div>
        </div>

        <div className="photo-upload">
          <button
            type="button"
            className="photo-preview"
            onClick={() => fileRef.current.click()}
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
