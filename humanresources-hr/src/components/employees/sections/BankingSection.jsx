import './bankingSection.css'
import ValidatedField from '../../ui/ValidatedField'

export default function BankingSection({ form, handleChange, errors = {} }) {
  return (
    <div className="form-section">
      <h3 className="form-section-title">Dados bancários</h3>

      <div className="bank-grid">
        <ValidatedField name="accountType" error={errors.accountType}>
          <select value={form.accountType} onChange={handleChange}>
            <option value="">Tipo conta</option>
            <option value="Corrente">Corrente</option>
            <option value="Poupança">Poupança</option>
            <option value="Salário">Salário</option>
          </select>
        </ValidatedField>

        <ValidatedField name="bank" error={errors.bank}>
          <input value={form.bank} onChange={handleChange} placeholder="Banco" />
        </ValidatedField>

        <ValidatedField name="agency" error={errors.agency}>
          <input value={form.agency} onChange={handleChange} placeholder="Agência" />
        </ValidatedField>

        <ValidatedField name="account" error={errors.account}>
          <input value={form.account} onChange={handleChange} placeholder="Conta" />
        </ValidatedField>

        <ValidatedField name="pixKey" error={errors.pixKey}>
          <input
            value={form.pixKey}
            onChange={handleChange}
            placeholder="Chave PIX"
          />
        </ValidatedField>
      </div>
    </div>
  )
}
