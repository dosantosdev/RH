import './userForm.css'

import { hasPermission } from '../../services/permissions'

export default function UserForm({
  user,
  roles,
  editingId,
  handleChange,
  handleSubmit,
  setUser,
  search,
  setSearch
}) {
  return (
    <div className="user-form-container">
      <div className="form-card">
        <h2>Cadastro de Usuários</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="user-form-header">
              <h3>Informações do Usuário</h3>

              <div className="users-search default-search">
                <input
                  type="text"
                  placeholder="🔍 Buscar usuário..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="form-grid">
              <input
                className="field-full"
                name="name"
                value={user.name}
                placeholder="Nome completo"
                onChange={handleChange}
              />

              <input
                name="username"
                value={user.username}
                placeholder="Usuário"
                onChange={handleChange}
              />

              <input
                name="password"
                type="password"
                value={user.password}
                placeholder="Senha"
                onChange={handleChange}
              />

              <select
                className="field-full"
                name="roleId"
                value={user.roleId}
                onChange={(e) => {
                  const selectedRole = roles.find(
                    (r) => r.id === Number(e.target.value)
                  )

                  setUser({
                    ...user,

                    roleId: selectedRole?.id || '',

                    roleName: selectedRole?.name || ''
                  })
                }}
              >
                <option value="">Selecione o cargo</option>

                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-section">
            <h3>Status</h3>

            <label className="checkbox-field">
              <input
                type="checkbox"
                name="active"
                checked={user.active}
                onChange={handleChange}
              />
              Usuário ativo
            </label>
          </div>

          {(hasPermission('users_create') || hasPermission('users_edit')) && (
            <button className="save-btn" type="submit">
              {editingId ? 'Atualizar usuário' : 'Salvar usuário'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
