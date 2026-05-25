import './bankingSection.css'

export default function BankingSection({ form, handleChange }) {
  return (
    <div className="form-section">
      <h3 className="form-section-title">Dados bancários</h3>

      <div className="bank-grid">
        <select
          name="accountType"
          value={form.accountType}
          onChange={handleChange}
        >
          <option value="">Tipo conta</option>

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
          name="pixKey"
          value={form.pixKey}
          onChange={handleChange}
          placeholder="Chave PIX"
        />
      </div>
    </div>
  )
}
