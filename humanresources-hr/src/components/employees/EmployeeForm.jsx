import { useState, useRef } from 'react'
import './employeeForm.css'

// ✅ FORA DO COMPONENTE (IMPORTANTÍSSIMO)
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

export default function EmployeeForm() {
  const [form, setForm] = useState(initialForm)
  const fileRef = useRef()

  function maskCPF(value) {
    const cleaned = value.replace(/\D/g, '').slice(0, 11) // 👈 limita a 11

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
      return value.toUpperCase() // permite letras
    }
    return value.replace(/\D/g, '') // só números
  }

  function handleChange(e) {
    const { name, value, type, checked, files } = e.target

    if (type === 'checkbox') {
      setForm((prev) => ({
        ...prev,
        [name]: checked
      }))
      return
    }

    if (type === 'file') {
      setForm((prev) => ({
        ...prev,
        photo: files[0]
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

    const existing = JSON.parse(localStorage.getItem('employees')) || []

    const editData = localStorage.getItem('editEmployee')

    let updated

    if (editData) {
      const old = JSON.parse(editData)

      updated = existing.map((emp) =>
        emp.id === old.id ? { ...form, id: old.id } : emp
      )

      localStorage.removeItem('editEmployee')
    } else {
      const newEmployee = {
        ...form,
        id: Date.now()
      }

      updated = [...existing, newEmployee]
    }

    // ✅ FALTAVA ISSO
    localStorage.setItem('employees', JSON.stringify(updated))

    // ✅ ALERTA (também estava faltando agora)
    alert('Funcionário salvo!')

    // 🔄 RESET
    setForm({ ...initialForm })

    // 🧹 LIMPA FOTO
    if (fileRef.current) {
      fileRef.current.value = ''
    }
  }

  return (
    <form className="form-container" onSubmit={handleSubmit}>
      <h2>Cadastro de Funcionário</h2>

      {/* DADOS */}
      <div className="form-section">
        <h3>Dados Pessoais</h3>

        <div className="form-grid">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Nome completo"
          />
          <input type="file" ref={fileRef} onChange={handleChange} />

          <input
            name="cpf"
            value={form.cpf}
            onChange={handleChange}
            placeholder="CPF"
          />
          <input
            name="rg"
            value={form.rg}
            onChange={handleChange}
            placeholder="RG"
          />

          <input
            name="birthDate"
            value={form.birthDate}
            onChange={handleChange}
            placeholder="Nascimento"
          />

          <label>
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
            name="cep"
            value={form.cep}
            onChange={handleChange}
            placeholder="CEP"
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
        </div>
      </div>

      {/* CNH */}
      <div className="form-section">
        <h3>CNH</h3>

        <div className="form-grid">
          <input
            name="cnhNumber"
            value={form.cnhNumber}
            onChange={handleChange}
            placeholder="CNH"
          />
          <input
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

        <label>
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
            name="admissionDate"
            value={form.admissionDate}
            onChange={handleChange}
            placeholder="Admissão"
          />

          {!form.active && (
            <input
              name="dismissalDate"
              value={form.dismissalDate}
              onChange={handleChange}
              placeholder="Demissão"
            />
          )}
        </div>
      </div>

      <button type="submit">Salvar</button>
    </form>
  )
}
