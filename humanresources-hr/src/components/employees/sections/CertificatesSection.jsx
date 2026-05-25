import './certificatesSection.css'

export default function CertificatesSection({
  form,
  selectedRole,
  handleCheckboxArray
}) {
  const certificates = JSON.parse(localStorage.getItem('certificates')) || []

  const requiredCertificates = certificates.filter((certificate) =>
    selectedRole?.requiredCertificates?.includes(certificate.id)
  )

  const requiredCategories = selectedRole?.requiredCnhCategories || []

  const requiresCnh = selectedRole?.requiresCnh

  // ✅ não renderiza se não houver exigências
  if (!requiresCnh && requiredCertificates.length === 0) {
    return null
  }

  return (
    <div className="form-section">
      <h3 className="form-section-title">Certificações obrigatórias</h3>

      {/* CNH */}

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

      {/* CERTIFICADOS */}

      {requiredCertificates.length > 0 && (
        <div className="certificates-group">
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
        </div>
      )}
    </div>
  )
}
