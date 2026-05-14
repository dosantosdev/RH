import './branchForm.css'

import { hasPermission } from '../../services/permissions'

export default function BranchForm({
  branch,
  editingId,
  handleChange,
  handleSubmit
}) {
  return (
    <div className="branch-form-container">
      <div className="form-card">
        <h2>Cadastro de Filiais</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Informações da Filial</h3>

            <div className="form-grid">
              <input
                className="field-large"
                name="name"
                value={branch.name}
                placeholder="Nome da filial"
                onChange={handleChange}
              />

              <input
                className="field-medium"
                name="cnpj"
                value={branch.cnpj}
                placeholder="CNPJ"
                onChange={handleChange}
              />

              <input
                className="field-large"
                name="address"
                value={branch.address}
                placeholder="Endereço"
                onChange={handleChange}
              />

              <input
                className="field-medium"
                name="city"
                value={branch.city}
                placeholder="Cidade"
                onChange={handleChange}
              />

              <input
                className="field-small"
                name="state"
                value={branch.state}
                placeholder="Estado"
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Status</h3>

            <label className="checkbox-field">
              <input
                type="checkbox"
                name="active"
                checked={branch.active}
                onChange={handleChange}
              />
              Filial ativa
            </label>
          </div>

          {(hasPermission('branches_create') ||
            hasPermission('branches_edit')) && (
            <button className="save-btn" type="submit">
              {editingId ? 'Atualizar filial' : 'Salvar filial'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
