import './roleForm.css'

export default function RoleForm({
  role,
  editingId,
  handleChange,
  handleSubmit
}) {
  return (
    <div className="role-form-container">
      <div className="form-card">
        <h2>Cadastro de Cargos</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Informações do Cargo</h3>

            <div className="form-grid">
              <input
                className="field-large"
                name="name"
                value={role.name}
                placeholder="Nome do cargo"
                onChange={handleChange}
              />

              <input
                className="field-large"
                name="description"
                value={role.description}
                placeholder="Descrição"
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
                checked={role.active}
                onChange={handleChange}
              />
              Cargo ativo
            </label>
          </div>

          <button className="save-btn" type="submit">
            {editingId ? 'Atualizar cargo' : 'Salvar cargo'}
          </button>
        </form>
      </div>
    </div>
  )
}
