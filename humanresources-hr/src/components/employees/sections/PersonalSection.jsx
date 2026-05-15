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
        <h3 className="form-section-title">Dados pessoais</h3>

        <div className="photo-upload">
          <div className="photo-preview">
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
          </div>

          <label className="upload-button">
            Alterar foto
            <input
              type="file"
              ref={fileRef}
              accept="image/*"
              onChange={handlePhotoUpload}
              hidden
            />
          </label>
        </div>
      </div>

      <div className="personal-grid">
        <input
          className="field-full"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Nome completo"
        />

        <select name="gender" value={form.gender} onChange={handleChange}>
          <option value="">Sexo</option>

          <option value="Masculino">Masculino</option>

          <option value="Feminino">Feminino</option>
        </select>

        <select
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

        <select name="education" value={form.education} onChange={handleChange}>
          <option value="">Escolaridade</option>

          <option value="Fundamental">Fundamental</option>

          <option value="Médio">Médio</option>

          <option value="Superior">Superior</option>
        </select>

        <div className="birth-grid">
          <input
            name="birthDate"
            value={form.birthDate}
            onChange={handleChange}
            placeholder="Nascimento"
          />

          <input
            name="birthCity"
            value={form.birthCity}
            onChange={handleChange}
            placeholder="Cidade nascimento"
          />

          <input
            name="birthState"
            value={form.birthState}
            onChange={handleChange}
            placeholder="UF nascimento"
          />

          <input
            name="birthCountry"
            value={form.birthCountry}
            onChange={handleChange}
            placeholder="País nascimento"
          />
        </div>

        <input
          className="half-field"
          name="motherName"
          value={form.motherName}
          onChange={handleChange}
          placeholder="Nome da mãe"
        />

        <input
          className="half-field"
          name="fatherName"
          value={form.fatherName}
          onChange={handleChange}
          placeholder="Nome do pai"
        />
      </div>
    </div>
  )
}
