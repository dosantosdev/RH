import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { addCandidate, getApplicationLinkByToken } from '../../services/recruitment'
import { initialEmployeeForm } from '../../data/initialEmployeeForm'

import './candidaturaPublica.css'

const DOCUMENT_TYPES = [
  { key: 'cpf', label: 'CPF' },
  { key: 'rg', label: 'RG' },
  { key: 'ctps', label: 'CTPS Digital' },
  { key: 'proofAddress', label: 'Comprovante de endereço' },
  { key: 'cnh', label: 'CNH' },
  { key: 'voterTitle', label: 'Título de eleitor' },
  { key: 'pis', label: 'PIS/PASEP' },
  { key: 'certificates', label: 'Certificados' },
  { key: 'other', label: 'Outro documento' }
]

const TEXT_FIELDS = [
  ['name', 'Nome completo', true],
  ['cpf', 'CPF', true],
  ['rg', 'RG', true],
  ['rgIssuer', 'Órgão expedidor do RG'],
  ['rgDate', 'Data de emissão do RG', false, 'date'],
  ['rgCity', 'Cidade de emissão do RG'],
  ['rgState', 'UF do RG'],
  ['birthDate', 'Data de nascimento', true, 'date'],
  ['gender', 'Sexo'],
  ['maritalStatus', 'Estado civil'],
  ['birthCity', 'Cidade de nascimento'],
  ['birthState', 'Estado de nascimento'],
  ['birthCountry', 'País de nascimento'],
  ['motherName', 'Nome da mãe'],
  ['fatherName', 'Nome do pai'],
  ['bloodType', 'Tipo sanguíneo'],
  ['skinColor', 'Cor/raça'],
  ['hairColor', 'Cor do cabelo'],
  ['eyeColor', 'Cor dos olhos'],
  ['height', 'Altura'],
  ['weight', 'Peso'],
  ['phone', 'Telefone', true],
  ['secondaryPhone', 'Telefone secundário'],
  ['email', 'E-mail', true, 'email'],
  ['carrier', 'Operadora do telefone'],
  ['secondaryCarrier', 'Operadora secundária'],
  ['pis', 'PIS/PASEP'],
  ['ctpsNumber', 'CTPS - número'],
  ['ctpsSeries', 'CTPS - série'],
  ['ctpsCity', 'CTPS - cidade'],
  ['accountType', 'Tipo de conta'],
  ['bank', 'Banco'],
  ['agency', 'Agência'],
  ['account', 'Conta'],
  ['pixKey', 'Chave PIX'],
  ['voterTitle', 'Título de eleitor'],
  ['voterZone', 'Zona eleitoral'],
  ['voterSection', 'Seção eleitoral'],
  ['susCard', 'Cartão SUS'],
  ['education', 'Escolaridade'],
  ['registration', 'Matrícula'],
  ['periodicExamDate', 'Data do exame periódico', false, 'date'],
  ['propertyType', 'Tipo de moradia'],
  ['livingSince', 'Mora no endereço desde'],
  ['cep', 'CEP'],
  ['street', 'Rua'],
  ['number', 'Número'],
  ['complement', 'Complemento'],
  ['district', 'Bairro'],
  ['city', 'Cidade'],
  ['state', 'Estado/UF'],
  ['country', 'País'],
  ['transportValue', 'Valor do transporte'],
  ['busCompany', 'Empresa de ônibus'],
  ['spouseName', 'Nome do cônjuge'],
  ['spouseCpf', 'CPF do cônjuge'],
  ['spousePhone', 'Telefone do cônjuge'],
  ['spouseRg', 'RG do cônjuge'],
  ['spouseRgIssuer', 'Órgão expedidor do RG do cônjuge'],
  ['spouseUf', 'UF do cônjuge'],
  ['spouseBirthDate', 'Nascimento do cônjuge', false, 'date'],
  ['spouseGender', 'Sexo do cônjuge'],
  ['spouseBirthCity', 'Cidade de nascimento do cônjuge'],
  ['marriageDate', 'Data do casamento', false, 'date'],
  ['cnhNumber', 'CNH - número'],
  ['cnhDate', 'CNH - data de emissão', false, 'date'],
  ['cnhValidity', 'CNH - validade', false, 'date'],
  ['cnhCity', 'CNH - cidade'],
  ['cnhFirstLicenseUF', 'CNH - UF da primeira habilitação']
]

function formatExpiry(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('pt-BR')
}

function Field({ label, value, onChange, required = false, type = 'text' }) {
  return (
    <label className="public-field">
      <span>{label}{required ? ' *' : ''}</span>
      <input
        type={type}
        value={value || ''}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

export default function CandidaturaPublica() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const link = useMemo(() => getApplicationLinkByToken(token), [token])
  const [form, setForm] = useState({ ...initialEmployeeForm })
  const [documents, setDocuments] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleDocument(event, type) {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setError(`O arquivo de ${type} deve ter no máximo 2 MB.`)
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setDocuments((current) => [
        ...current.filter((item) => item.type !== type),
        {
          id: `${type}-${Date.now()}`,
          type,
          name: file.name,
          mimeType: file.type,
          size: file.size,
          data: reader.result,
          createdAt: new Date().toISOString()
        }
      ])
      setError('')
    }
    reader.readAsDataURL(file)
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!link) return

    setSaving(true)
    setError('')

    try {
      addCandidate({
        name: form.name,
        cpf: form.cpf,
        email: form.email,
        phone: form.phone,
        birthDate: form.birthDate,
        city: form.city,
        state: form.state,
        education: form.education,
        source: 'Link público de candidatura',
        vacancyId: link.vacancyId,
        vacancyTitle: link.vacancy.title,
        stageId: 1,
        stageName: 'Inscrição',
        status: 'em_processo',
        employeeData: {
          ...form,
          active: true,
          photo: null,
          recruitmentDocuments: documents
        },
        documents,
        publicApplication: true,
        publicApplicationToken: token,
        submittedAt: new Date().toISOString(),
        notes: 'Cadastro preenchido pelo candidato através de link público.'
      })

      setSubmitted(true)
    } catch (submitError) {
      setError(submitError?.message || 'Não foi possível enviar o cadastro.')
    } finally {
      setSaving(false)
    }
  }

  if (!link) {
    return (
      <main className="public-application-page">
        <section className="public-application-card public-invalid-card">
          <div className="public-brand">RECURSOS HUMANOS</div>
          <h1>Link de candidatura inválido ou expirado</h1>
          <p>
            O link pode ter expirado, sido revogado ou a vaga pode não estar mais aberta.
            Solicite um novo link ao setor de Recursos Humanos.
          </p>
        </section>
      </main>
    )
  }

  if (submitted) {
    return (
      <main className="public-application-page">
        <section className="public-application-card public-success-card">
          <div className="public-success-icon">✓</div>
          <div className="public-brand">RECURSOS HUMANOS</div>
          <h1>Cadastro enviado com sucesso!</h1>
          <p>
            Seus dados foram enviados para análise na vaga <strong>{link.vacancy.title}</strong>.
          </p>
          <p className="public-muted">
            O RH entrará em contato caso você avance para a próxima etapa do processo seletivo.
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="public-application-page">
      <section className="public-application-card">
        <header className="public-application-header">
          <div>
            <div className="public-brand">RECURSOS HUMANOS</div>
            <h1>Cadastro de candidato</h1>
            <p>Vaga: <strong>{link.vacancy.title}</strong></p>
            {link.vacancy.description && <p>{link.vacancy.description}</p>}
          </div>
          <div className="public-expiry">
            Link válido até<br />
            <strong>{formatExpiry(link.expiresAt)}</strong>
          </div>
        </header>

        <div className="public-warning">
          Preencha os dados com atenção. Os campos marcados com * são obrigatórios.
          Você poderá anexar os documentos solicitados ao final do formulário.
        </div>

        {error && <div className="public-error">{error}</div>}

        <form onSubmit={handleSubmit} className="public-form">
          <section>
            <h2>Dados pessoais</h2>
            <div className="public-grid">
              {TEXT_FIELDS.slice(0, 23).map(([field, label, required, type]) => (
                <Field
                  key={field}
                  label={label}
                  value={form[field]}
                  required={required}
                  type={type}
                  onChange={(value) => updateField(field, value)}
                />
              ))}
            </div>
            <label className="public-check">
              <input
                type="checkbox"
                checked={Boolean(form.foreigner)}
                onChange={(event) => updateField('foreigner', event.target.checked)}
              />
              Sou estrangeiro(a)
            </label>
          </section>

          <section>
            <h2>Documentação e registros</h2>
            <div className="public-grid">
              {TEXT_FIELDS.slice(23, 40).map(([field, label, required, type]) => (
                <Field key={field} label={label} value={form[field]} required={required} type={type} onChange={(value) => updateField(field, value)} />
              ))}
            </div>
          </section>

          <section>
            <h2>Endereço e contato</h2>
            <div className="public-grid">
              {TEXT_FIELDS.slice(40, 52).map(([field, label, required, type]) => (
                <Field key={field} label={label} value={form[field]} required={required} type={type} onChange={(value) => updateField(field, value)} />
              ))}
            </div>
          </section>

          <section>
            <h2>Cônjuge e dependentes</h2>
            <div className="public-grid">
              {TEXT_FIELDS.slice(52, 63).map(([field, label, required, type]) => (
                <Field key={field} label={label} value={form[field]} required={required} type={type} onChange={(value) => updateField(field, value)} />
              ))}
            </div>
            <div className="public-inline-fields">
              <Field label="Quantidade de dependentes" value={form.dependentsCount} type="number" onChange={(value) => updateField('dependentsCount', Number(value) || 0)} />
              <label className="public-check">
                <input type="checkbox" checked={Boolean(form.hasDependents)} onChange={(event) => updateField('hasDependents', event.target.checked)} />
                Possuo dependentes
              </label>
            </div>
          </section>

          <section>
            <h2>CNH</h2>
            <div className="public-grid">
              {TEXT_FIELDS.slice(63).map(([field, label, required, type]) => (
                <Field key={field} label={label} value={form[field]} required={required} type={type} onChange={(value) => updateField(field, value)} />
              ))}
            </div>
            <label className="public-field">
              <span>Categorias da CNH</span>
              <input value={(form.cnhCategories || []).join(', ')} onChange={(event) => updateField('cnhCategories', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} placeholder="Ex.: B, D, E" />
            </label>
          </section>

          <section>
            <h2>Documentos para análise</h2>
            <p className="public-muted">Envie os documentos disponíveis. Cada arquivo pode ter até 2 MB.</p>
            <div className="public-documents-grid">
              {DOCUMENT_TYPES.map((document) => {
                const selected = documents.find((item) => item.type === document.key)
                return (
                  <label className="public-document-card" key={document.key}>
                    <span>{document.label}</span>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(event) => handleDocument(event, document.key)} />
                    {selected && <small>✓ {selected.name}</small>}
                  </label>
                )
              })}
            </div>
          </section>

          <section>
            <h2>Observações</h2>
            <textarea className="public-textarea" value={form.notes || ''} onChange={(event) => updateField('notes', event.target.value)} rows="5" placeholder="Informações adicionais que deseja comunicar ao RH..." />
          </section>

          <div className="public-submit-area">
            <p>Ao enviar, seus dados serão encaminhados para o processo seletivo da vaga selecionada.</p>
            <button type="submit" disabled={saving} className="public-submit-button">
              {saving ? 'Enviando...' : 'Enviar candidatura'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
