import './certificatesSection.css'
import { getStoredArray } from '../../../services/storage'
import FieldError from './FieldError'

export default function CertificatesSection({
  form,
  selectedRole,
  handleCheckboxArray,
  errors = {}
}) {
  const certificates = getStoredArray('certificates')

  const requiredCertificates = certificates.filter((certificate) =>
    selectedRole?.requiredCertificates?.includes(certificate.id)
  )

  const requiredCategories = selectedRole?.requiredCnhCategories || []
  const requiresCnh = selectedRole?.requiresCnh

  if (!requiresCnh && requiredCertificates.length === 0) {
    return null
  }

  return (
    <div className="form-section">
      <h3 className="form-section-title">Certificações obrigatórias</h3>

      {requiresCnh && (
        <div className="required-cnh">
          <span className="required-label">CNH obrigatória:</span>
          <div className="required-categories">
            {requiredCategories.map((category) => (
              <span key={category} className="category-badge">
                Categoria {category}
              </span>
            ))}
          </div>
        </div>
      )}

      {requiredCertificates.length > 0 && (
        <div className={errors.certificates ? 'certificates-group field-error-box' : 'certificates-group'}>
          {requiredCertificates.map((certificate) => (
            <label key={certificate.id}>
              <input
                type="checkbox"
                value={certificate.name}
                checked={form.certificates.includes(certificate.name)}
                onChange={(e) => handleCheckboxArray(e, 'certificates')}
              />
              {certificate.name}
            </label>
          ))}
          <FieldError message={errors.certificates} />
        </div>
      )}
    </div>
  )
}
