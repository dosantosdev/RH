import { useRef } from 'react'
import './employeeForm.css'
import { hasPermission } from '../../services/permissions'

// ✅ FORA DO COMPONENTE
const initialForm = {
  name: '',
  cpf: '',
  rg: '',
  birthDate: '',
  admissionDate: '',
  dismissalDate: '',
  foreigner: false,
  cep: '',
  city: '',
  state: '',
  country: '',
  cnhNumber: '',
  cnhDate: '',
  cnhCategories: [],
  certificates: [],
  active: false,
  photo: null
}

export default function EmployeeForm({
  formData,
  setFormData,
  handleSaveEmployee,
  handlePhotoUpload
}) {
  const fileRef = useRef()

  // ✅ mantém compatibilidade com o código já existente
  const form = formData
  const setForm = setFormData

  function maskCPF(value) {
    const cleaned = value.replace(/\D/g, '').slice(0, 11)

    return cleaned
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }

  function maskCEP(value) {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 9)
  }

  function maskDate(value) {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .slice(0, 10)
  }

  function maskRG(value, foreigner) {
    if (foreigner) {
      return value.toUpperCase()
    }

    return value.replace(/\D/g, '')
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target

    if (type === 'checkbox') {
      setForm((prev) => ({
        ...prev,
        [name]: checked
      }))
      return
    }

    let newValue = value

    if (name === 'cpf') newValue = maskCPF(value)
    if (name === 'cep') newValue = maskCEP(value)

    if (
      name === 'birthDate' ||
      name === 'admissionDate' ||
      name === 'dismissalDate' ||
      name === 'cnhDate'
    ) {
      newValue = maskDate(value)
    }

    if (name === 'rg') {
      newValue = maskRG(value, form.foreigner)
    }

    setForm((prev) => ({
      ...prev,
      [name]: newValue
    }))
  }

  function handleCheckboxArray(e, field) {
    const { value, checked } = e.target

    setForm((prev) => ({
      ...prev,
      [field]: checked
        ? [...prev[field], value]
        : prev[field].filter((item) => item !== value)
    }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    handleSaveEmployee()

    if (fileRef.current) {
      fileRef.current.value = ''
    }
  }

  return (
    <form className="form-container" onSubmit={handleSubmit}>
      {/* DADOS */}
      <div className="form-section">
        <div className="section-header">
          <h3>Dados Pessoais</h3>

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

        <div className="form-grid">
          <input
            className="field-large"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Nome completo"
          />

          <input
            className="personal-input"
            name="birthDate"
            value={form.birthDate}
            onChange={handleChange}
            placeholder="Nascimento"
          />

          <input
            className="personal-input"
            name="cpf"
            value={form.cpf}
            onChange={handleChange}
            placeholder="CPF"
          />

          <input
            className="personal-input"
            name="rg"
            value={form.rg}
            onChange={handleChange}
            placeholder="RG"
          />

          <label className="checkbox-field">
            <input
              type="checkbox"
              name="foreigner"
              checked={form.foreigner}
              onChange={handleChange}
            />
            Estrangeiro
          </label>
        </div>
      </div>

      {/* ENDEREÇO */}
      <div className="form-section">
        <h3>Endereço</h3>

        <div className="form-grid">
          <input
            className="field-xsmall"
            name="cep"
            value={form.cep}
            onChange={handleChange}
            placeholder="CEP"
          />

          <input
            className="field-medium"
            name="city"
            value={form.city}
            onChange={handleChange}
            placeholder="Cidade"
          />

          <input
            className="field-xsmall"
            name="state"
            value={form.state}
            onChange={handleChange}
            placeholder="Estado"
          />

          <input
            className="field-medium"
            name="country"
            value={form.country}
            onChange={handleChange}
            placeholder="País"
          />
        </div>
      </div>

      {/* CNH */}
      <div className="form-section">
        <h3>CNH</h3>

        <div className="form-grid">
          <input
            className="field-medium"
            name="cnhNumber"
            value={form.cnhNumber}
            onChange={handleChange}
            placeholder="CNH"
          />

          <input
            className="field-medium"
            name="cnhDate"
            value={form.cnhDate}
            onChange={handleChange}
            placeholder="1ª habilitação"
          />
        </div>

        <div className="checkbox-group">
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

      {/* CERTIFICADOS */}
      <div className="form-section">
        <h3>Certificados</h3>

        <div className="checkbox-group">
          {['NR20', 'NR35', 'NR31.12', 'MOPP', 'Cargas Indivisíveis'].map(
            (cert) => (
              <label key={cert}>
                <input
                  type="checkbox"
                  value={cert}
                  checked={form.certificates.includes(cert)}
                  onChange={(e) => handleCheckboxArray(e, 'certificates')}
                />
                {cert}
              </label>
            )
          )}
        </div>
      </div>

      {/* STATUS */}
      <div className="form-section">
        <h3>Status</h3>

        <label className="checkbox-field">
          <input
            type="checkbox"
            name="active"
            checked={form.active}
            onChange={handleChange}
          />
          Ativo
        </label>

        <div className="form-grid">
          <input
            className="field-medium"
            name="admissionDate"
            value={form.admissionDate}
            onChange={handleChange}
            placeholder="Admissão"
          />

          {!form.active && (
            <input
              className="field-medium"
              name="dismissalDate"
              value={form.dismissalDate}
              onChange={handleChange}
              placeholder="Demissão"
            />
          )}
        </div>
      </div>

      {(hasPermission('employees_create') ||
        hasPermission('employees_edit')) && (
        <button type="submit">Salvar</button>
      )}
    </form>
  )
}
