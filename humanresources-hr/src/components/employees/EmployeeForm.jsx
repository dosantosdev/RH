import { useRef } from 'react'
import './employeeForm.css'
import { hasPermission } from '../../services/permissions'

// ✅ FORA DO COMPONENTE
const initialForm = {
  name: '',
  cpf: '',
  rg: '',
  rgIssuer: '',
  rgDate: '',
  rgCity: '',
  rgState: '',
  birthDate: '',
  gender: '',
  maritalStatus: '',
  birthCity: '',
  motherName: '',
  fatherName: '',
  bloodType: '',
  skinColor: '',
  hairColor: '',
  eyeColor: '',
  height: '',
  weight: '',
  phone: '',
  carrier: '',
  secondaryPhone: '',
  secondaryCarrier: '',
  email: '',
  pis: '',
  ctpsNumber: '',
  ctpsSeries: '',
  ctpsCity: '',
  voterTitle: '',
  voterZone: '',
  voterSection: '',
  susCard: '',
  accountType: '',
  bank: '',
  agency: '',
  account: '',
  pixKey: '',
  education: '',
  registration: '',
  periodicExamDate: '',
  propertyType: '',
  livingSince: '',
  street: '',
  number: '',
  complement: '',
  district: '',
  transportValue: '',
  busCompany: '',
  spouseName: '',
  spouseCpf: '',
  spousePhone: '',
  spouseRg: '',
  spouseRgIssuer: '',
  spouseUf: '',
  spouseBirthDate: '',
  spouseGender: '',
  spouseBirthCity: '',
  marriageDate: '',
  hasDependents: false,
  dependentsCount: 0,
  dependents: [],
  admissionDate: '',
  dismissalDate: '',
  foreigner: false,
  cep: '',
  city: '',
  state: '',
  country: '',
  cnhNumber: '',
  cnhDate: '',
  cnhValidity: '',
  cnhCity: '',
  cnhFirstLicenseUF: '',
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
      name === 'cnhDate' ||
      name === 'rgDate' ||
      name === 'livingSince' ||
      name === 'spouseBirthDate' ||
      name === 'marriageDate' ||
      name === 'cnhValidity'
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

  function handleDependents(count) {
    const total = Number(count)

    const updatedDependents = Array.from({ length: total }, (_, index) => ({
      id: index + 1,

      name: form.dependents[index]?.name || '',

      cpf: form.dependents[index]?.cpf || '',

      birthDate: form.dependents[index]?.birthDate || '',

      rg: form.dependents[index]?.rg || ''
    }))

    setForm((prev) => ({
      ...prev,

      dependentsCount: total,

      dependents: updatedDependents
    }))
  }

  function handleDependentChange(index, field, value) {
    const updated = [...form.dependents]

    updated[index][field] = value

    setForm((prev) => ({
      ...prev,

      dependents: updated
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

          <input
            name="birthDate"
            value={form.birthDate}
            onChange={handleChange}
            placeholder="Nascimento"
          />

          <input
            className="field-half"
            name="birthCity"
            value={form.birthCity}
            onChange={handleChange}
            placeholder="Cidade de nascimento"
          />

          <input
            className="field-half"
            name="motherName"
            value={form.motherName}
            onChange={handleChange}
            placeholder="Nome da mãe"
          />

          <input
            className="field-half"
            name="fatherName"
            value={form.fatherName}
            onChange={handleChange}
            placeholder="Nome do pai"
          />
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Características físicas</h3>

        <div className="physical-grid">
          <select
            name="bloodType"
            value={form.bloodType}
            onChange={handleChange}
          >
            <option value="">Tipo sanguíneo</option>

            <option value="A+">A+</option>
            <option value="A-">A-</option>

            <option value="B+">B+</option>
            <option value="B-">B-</option>

            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>

            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>

          <input
            name="skinColor"
            value={form.skinColor}
            onChange={handleChange}
            placeholder="Cor da pele"
          />

          <input
            name="hairColor"
            value={form.hairColor}
            onChange={handleChange}
            placeholder="Cor do cabelo"
          />

          <input
            name="eyeColor"
            value={form.eyeColor}
            onChange={handleChange}
            placeholder="Cor dos olhos"
          />

          <input
            name="height"
            value={form.height}
            onChange={handleChange}
            placeholder="Altura"
          />

          <input
            name="weight"
            value={form.weight}
            onChange={handleChange}
            placeholder="Peso"
          />
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Contato</h3>

        <div className="contact-grid">
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Celular"
          />

          <input
            name="carrier"
            value={form.carrier}
            onChange={handleChange}
            placeholder="Operadora"
          />

          <input
            name="secondaryPhone"
            value={form.secondaryPhone}
            onChange={handleChange}
            placeholder="Celular complementar"
          />

          <input
            name="secondaryCarrier"
            value={form.secondaryCarrier}
            onChange={handleChange}
            placeholder="Operadora 2"
          />

          <input
            className="contact-email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="E-mail"
          />
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Documentação</h3>
        <div className="document-main-grid">
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

        <div className="rg-grid">
          <input
            name="rgIssuer"
            value={form.rgIssuer}
            onChange={handleChange}
            placeholder="Órgão emissor"
          />

          <input
            name="rgDate"
            value={form.rgDate}
            onChange={handleChange}
            placeholder="Data RG"
          />

          <input
            name="rgCity"
            value={form.rgCity}
            onChange={handleChange}
            placeholder="Município RG"
          />

          <input
            name="rgState"
            value={form.rgState}
            onChange={handleChange}
            placeholder="UF RG"
          />
        </div>
        <div className="work-docs-grid">
          <input
            name="pis"
            value={form.pis}
            onChange={handleChange}
            placeholder="PIS"
          />

          <input
            name="ctpsNumber"
            value={form.ctpsNumber}
            onChange={handleChange}
            placeholder="CTPS número"
          />

          <input
            name="ctpsSeries"
            value={form.ctpsSeries}
            onChange={handleChange}
            placeholder="Série"
          />

          <input
            name="ctpsCity"
            value={form.ctpsCity}
            onChange={handleChange}
            placeholder="Município CTPS"
          />
        </div>
        <div className="voter-grid">
          <input
            name="voterTitle"
            value={form.voterTitle}
            onChange={handleChange}
            placeholder="Título eleitoral"
          />

          <input
            name="voterZone"
            value={form.voterZone}
            onChange={handleChange}
            placeholder="Zona"
          />

          <input
            name="voterSection"
            value={form.voterSection}
            onChange={handleChange}
            placeholder="Seção"
          />

          <input
            name="susCard"
            value={form.susCard}
            onChange={handleChange}
            placeholder="Cartão SUS"
          />
        </div>
      </div>

      {/* ENDEREÇO */}
      <div className="form-section">
        <h3 className="form-section-title">Endereço</h3>
        <div className="address-top-grid">
          <input
            name="cep"
            value={form.cep}
            onChange={handleChange}
            placeholder="CEP"
          />

          <input
            name="street"
            value={form.street}
            onChange={handleChange}
            placeholder="Rua"
          />
        </div>

        <div className="address-details-grid">
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
        </div>

        <div className="address-location-grid">
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

        <div className="housing-grid">
          <select
            name="propertyType"
            value={form.propertyType}
            onChange={handleChange}
          >
            <option value="">Tipo de propriedade</option>

            <option value="Própria">Própria</option>

            <option value="Alugada">Alugada</option>

            <option value="Financiada">Financiada</option>

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

      {/* CNH */}
      <div className="form-section">
        <h3 className="form-section-title">CNH</h3>

        <div className="cnh-grid">
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

          <input
            name="cnhValidity"
            value={form.cnhValidity}
            onChange={handleChange}
            placeholder="Validade"
          />

          <div className="cnh-categories">
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

        <div className="cnh-extra-grid">
          <input
            name="cnhCity"
            value={form.cnhCity}
            onChange={handleChange}
            placeholder="Município CNH"
          />

          <input
            name="cnhFirstLicenseUF"
            value={form.cnhFirstLicenseUF}
            onChange={handleChange}
            placeholder="UF 1ª habilitação"
          />
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Dados bancários</h3>

        <div className="bank-grid">
          <select
            name="accountType"
            value={form.accountType}
            onChange={handleChange}
          >
            <option value="">Tipo de conta</option>

            <option value="Corrente">Corrente</option>

            <option value="Poupança">Poupança</option>

            <option value="Salário">Salário</option>
          </select>

          <input
            name="bank"
            value={form.bank}
            onChange={handleChange}
            placeholder="Banco"
          />

          <input
            name="agency"
            value={form.agency}
            onChange={handleChange}
            placeholder="Agência"
          />

          <input
            name="account"
            value={form.account}
            onChange={handleChange}
            placeholder="Conta"
          />

          <input
            className="bank-pix"
            name="pixKey"
            value={form.pixKey}
            onChange={handleChange}
            placeholder="Chave PIX"
          />
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Dados profissionais</h3>

        <div className="professional-grid">
          <select
            name="education"
            value={form.education}
            onChange={handleChange}
          >
            <option value="">Escolaridade</option>

            <option value="Fundamental incompleto">
              Fundamental incompleto
            </option>

            <option value="Fundamental completo">Fundamental completo</option>

            <option value="Médio incompleto">Médio incompleto</option>

            <option value="Médio completo">Médio completo</option>

            <option value="Superior incompleto">Superior incompleto</option>

            <option value="Superior completo">Superior completo</option>
          </select>

          <input
            name="registration"
            value={form.registration}
            onChange={handleChange}
            placeholder="Matrícula"
          />

          <input
            name="periodicExamDate"
            value={form.periodicExamDate}
            onChange={handleChange}
            placeholder="Exame periódico"
          />
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Transporte</h3>

        <div className="transport-grid">
          <input
            name="transportValue"
            value={form.transportValue}
            onChange={handleChange}
            placeholder="Valor passagem ida e volta"
          />

          <input
            name="busCompany"
            value={form.busCompany}
            onChange={handleChange}
            placeholder="Empresa de ônibus"
          />
        </div>
      </div>

      {['Casado', 'União estável'].includes(form.maritalStatus) && (
        <div className="form-section">
          <h3 className="form-section-title">Dados do cônjuge</h3>

          <div className="spouse-grid">
            <input
              className="spouse-full"
              name="spouseName"
              value={form.spouseName}
              onChange={handleChange}
              placeholder="Nome do cônjuge"
            />

            <input
              name="spouseCpf"
              value={form.spouseCpf}
              onChange={handleChange}
              placeholder="CPF cônjuge"
            />

            <input
              name="spouseRg"
              value={form.spouseRg}
              onChange={handleChange}
              placeholder="RG cônjuge"
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
              name="spousePhone"
              value={form.spousePhone}
              onChange={handleChange}
              placeholder="Telefone"
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
              className="spouse-city"
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
      )}

      <div className="form-section">
        <h3 className="form-section-title">Dependentes</h3>

        <div className="dependents-controls">
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={form.hasDependents}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,

                  hasDependents: e.target.checked,

                  dependentsCount: e.target.checked ? prev.dependentsCount : 0,

                  dependents: e.target.checked ? prev.dependents : []
                }))
              }
            />
            Possui dependentes
          </label>

          {form.hasDependents && (
            <select
              value={form.dependentsCount}
              onChange={(e) => handleDependents(e.target.value)}
            >
              <option value={0}>Quantidade</option>

              {[1, 2, 3, 4, 5].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          )}
        </div>

        {(form.dependents || []).map((dependent, index) => (
          <div key={dependent.id} className="dependent-grid">
            <input
              className="dependent-full"
              value={dependent.name}
              onChange={(e) =>
                handleDependentChange(index, 'name', e.target.value)
              }
              placeholder={`Nome do dependente ${dependent.id}`}
            />

            <input
              value={dependent.cpf}
              onChange={(e) =>
                handleDependentChange(index, 'cpf', e.target.value)
              }
              placeholder="CPF"
            />

            <input
              value={dependent.birthDate}
              onChange={(e) =>
                handleDependentChange(index, 'birthDate', e.target.value)
              }
              placeholder="Nascimento"
            />

            <input
              value={dependent.rg}
              onChange={(e) =>
                handleDependentChange(index, 'rg', e.target.value)
              }
              placeholder="RG"
            />
          </div>
        ))}
      </div>

      {/* CERTIFICADOS */}
      <div className="form-section">
        <h3 className="form-section-title">Certificados</h3>

        <div className="certificates-group">
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
        <h3 className="form-section-title">Status</h3>

        <div className="status-grid">
          <label className="checkbox-field">
            <input
              type="checkbox"
              name="active"
              checked={form.active}
              onChange={handleChange}
            />
            Ativo
          </label>

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

      {(hasPermission('employees_create') ||
        hasPermission('employees_edit')) && (
        <button type="submit">Salvar</button>
      )}
    </form>
  )
}
