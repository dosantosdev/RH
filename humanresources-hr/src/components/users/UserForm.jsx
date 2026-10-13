import './userForm.css'
import { hasPermission } from '../../services/permissions'

export default function UserForm({
  user,
  accessRoles,
  employees,
  editingId,
  handleChange,
  handleSubmit,
  setUser,
  search,
  setSearch,
  saving = false
}) {
  function handleAccessRoleChange(event) {
    const selectedRole = accessRoles.find(
      (role) => String(role.id) === String(event.target.value)
    )

    setUser({
      ...user,
      accessRoleId: selectedRole?.id || '',
      accessRoleName: selectedRole?.name || ''
    })
  }

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
                  onChange={(event) => setSearch(event.target.value)}
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
                required
              />

              <div className="user-credentials-grid field-full">
                <input
                  name="username"
                  value={user.username}
                  placeholder="Usuário"
                  onChange={handleChange}
                  autoComplete="off"
                  required
                />

                <input
                  name="password"
                  type="password"
                  value={user.password}
                  placeholder={editingId ? 'Nova senha (opcional)' : 'Senha (mínimo 8 caracteres)'}
                  onChange={handleChange}
                  autoComplete="new-password"
                  minLength={editingId && !user.password ? undefined : 8}
                  required={!editingId}
                />
              </div>

              <input
                className="field-full"
                name="email"
                type="email"
                value={user.email || ''}
                placeholder="E-mail (opcional)"
                onChange={handleChange}
              />

              <select
                className="field-full"
                name="accessRoleId"
                value={user.accessRoleId || ''}
                onChange={handleAccessRoleChange}
                required
              >
                <option value="">Selecione o perfil de acesso</option>
                {accessRoles
                  .filter((role) => role.active !== false)
                  .map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.displayName || role.name}
                    </option>
                  ))}
              </select>

              <select
                className="field-full"
                name="employeeId"
                value={user.employeeId || ''}
                onChange={handleChange}
              >
                <option value="">Nenhum funcionário vinculado</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
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
                checked={Boolean(user.active)}
                onChange={handleChange}
              />
              Usuário ativo
            </label>
          </div>

          {(hasPermission('users_create') || hasPermission('users_edit')) && (
            <button className="save-btn" type="submit" disabled={saving}>
              {saving
                ? 'Salvando...'
                : editingId
                  ? 'Atualizar usuário'
                  : 'Salvar usuário'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
