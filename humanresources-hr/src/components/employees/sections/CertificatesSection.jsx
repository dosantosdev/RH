import './certificatesSection.css'

export default function CertificatesSection({ form, handleCheckboxArray }) {
  return (
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
  )
}
