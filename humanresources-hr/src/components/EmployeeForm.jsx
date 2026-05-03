import { useState } from 'react'
import './employee.css'

export default function EmployeeForm() {
  const [form, setForm] = useState({
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
  })

  function handleChange(e) {
    const { name, value, type, checked, files } = e.target

    if (type === 'checkbox') {
      setForm({
        ...form,
        [name]: checked
      })
    } else if (type === 'file') {
      setForm({
        ...form,
        photo: files[0]
      })
    } else {
      setForm({
        ...form,
        [name]: value
      })
    }
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
    console.log(form)
    alert('Funcionário cadastrado!')
  }

  return (
    <form className="form-container" onSubmit={handleSubmit}>
      <h2>Cadastro de Funcionário</h2>

      {/* 🧍 DADOS PESSOAIS */}
      <div className="form-section">
        <h3>Dados Pessoais</h3>

        <div className="form-grid">
          <input
            name="name"
            placeholder="Nome completo"
            onChange={handleChange}
          />

          <input type="file" onChange={handleChange} />

          <input name="cpf" placeholder="CPF" onChange={handleChange} />
          <input name="rg" placeholder="RG" onChange={handleChange} />

          <input
            name="birthDate"
            placeholder="Data de nascimento"
            onChange={handleChange}
          />

          <label>
            <input type="checkbox" name="foreigner" onChange={handleChange} />
            Estrangeiro
          </label>
        </div>
      </div>

      {/* 📍 ENDEREÇO */}
      <div className="form-section">
        <h3>Endereço</h3>

        <div className="form-grid">
          <input name="cep" placeholder="CEP" onChange={handleChange} />
          <input name="city" placeholder="Cidade" onChange={handleChange} />

          <input name="state" placeholder="Estado" onChange={handleChange} />
          <input name="country" placeholder="País" onChange={handleChange} />
        </div>
      </div>

      {/* 🚗 CNH */}
      <div className="form-section">
        <h3>CNH</h3>

        <div className="form-grid">
          <input
            name="cnhNumber"
            placeholder="Número da CNH"
            onChange={handleChange}
          />
          <input
            name="cnhDate"
            placeholder="Primeira habilitação"
            onChange={handleChange}
          />
        </div>

        <div className="checkbox-group">
          {['A', 'B', 'C', 'D', 'E'].map((cat) => (
            <label key={cat}>
              <input
                type="checkbox"
                value={cat}
                onChange={(e) => handleCheckboxArray(e, 'cnhCategories')}
              />
              {cat}
            </label>
          ))}
        </div>
      </div>

      {/* 🎓 CERTIFICADOS */}
      <div className="form-section">
        <h3>Certificados</h3>

        <div className="checkbox-group">
          {['NR 31.12', 'NR20', 'NR35', 'Cargas indivisíveis', 'MOPP'].map(
            (cert) => (
              <label key={cert}>
                <input
                  type="checkbox"
                  value={cert}
                  onChange={(e) => handleCheckboxArray(e, 'certificates')}
                />
                {cert}
              </label>
            )
          )}
        </div>
      </div>

      {/* ✅ STATUS */}
      <div className="form-section">
        <h3>Status</h3>

        <label>
          <input
            type="checkbox"
            name="active"
            checked={form.active}
            onChange={handleChange}
          />
          Funcionário ativo
        </label>

        <div className="form-grid" style={{ marginTop: '15px' }}>
          {/* 📅 SEMPRE VISÍVEL */}
          <input
            name="admissionDate"
            placeholder="Data de admissão"
            onChange={handleChange}
          />

          {/* 📅 SÓ SE NÃO ESTIVER ATIVO */}
          {!form.active && (
            <input
              name="dismissalDate"
              placeholder="Data de demissão"
              onChange={handleChange}
            />
          )}
        </div>
      </div>

      <button type="submit">Salvar</button>
    </form>
  )
}
