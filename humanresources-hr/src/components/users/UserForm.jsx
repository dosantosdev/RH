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
  setSearch
}) {
  /*
   * ============================================================
   * PERFIL DE ACESSO
   * ============================================================
   *
   * Aqui não trabalhamos mais com Cargo.
   *
   * Cargo profissional:
   *   Vendedor
   *   Motorista
   *   Gerente
   *
   * Perfil de acesso:
   *   Administrador
   *   Gestão de RH
   *   Funcionário
   */

  function handleAccessRoleChange(e) {
    const selectedAccessRole = accessRoles.find(
      (role) => Number(role.id) === Number(e.target.value)
    )

    setUser({
      ...user,

      accessRoleId: selectedAccessRole?.id || '',

      accessRoleName: selectedAccessRole?.name || ''
    })
  }

  return (
    <div className="user-form-container">
      <div className="form-card">
        <h2>Cadastro de Usuários</h2>

        <form onSubmit={handleSubmit}>
          {/* ====================================================
              INFORMAÇÕES DO USUÁRIO
          ==================================================== */}

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
              {/* NOME */}
              <input
                className="field-full"
                name="name"
                value={user.name}
                placeholder="Nome completo"
                onChange={handleChange}
              />

              {/* CREDENCIAIS */}
              <div className="user-credentials-grid field-full">
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
              </div>

              {/* ==================================================
                  PERFIL DE ACESSO
              ================================================== */}

              <select
                className="field-full"
                name="accessRoleId"
                value={user.accessRoleId || ''}
                onChange={handleAccessRoleChange}
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

              {/* ==================================================
                  FUNCIONÁRIO VINCULADO
              ================================================== */}

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

          {/* ====================================================
              STATUS
          ==================================================== */}

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

          {/* ====================================================
              SALVAR
          ==================================================== */}

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
