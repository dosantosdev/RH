import './roleForm.css'

import { permissions } from '../../data/permissions'

import { hasPermission } from '../../services/permissions'

export default function RoleForm({
  role,
  editingId,
  handleChange,
  handleSubmit
}) {
  function handlePermissionChange(permissionKey) {
    const exists = role.permissions.includes(permissionKey)

    let updatedPermissions

    if (exists) {
      updatedPermissions = role.permissions.filter((p) => p !== permissionKey)
    } else {
      updatedPermissions = [...role.permissions, permissionKey]
    }

    handleChange({
      target: {
        name: 'permissions',
        value: updatedPermissions,
        type: 'custom'
      }
    })
  }

  const allPermissions = permissions.flatMap((group) =>
    group.items.map((permission) => permission.key)
  )

  const allSelected = role.permissions.length === allPermissions.length

  function handleSelectAll() {
    handleChange({
      target: {
        name: 'permissions',

        value: allSelected ? [] : allPermissions,

        type: 'custom'
      }
    })
  }

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

          <div className="form-section">
            <div className="permissions-header">
              <h3>Permissões</h3>

              <label className="select-all">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                />
                Selecionar tudo
              </label>
            </div>

            <div className="permissions-container">
              {permissions.map((group) => (
                <div key={group.category} className="permission-group">
                  <h4>{group.category}</h4>

                  <div className="permissions-grid">
                    {group.items.map((permission) => (
                      <label key={permission.key} className="permission-item">
                        <input
                          type="checkbox"
                          checked={role.permissions.includes(permission.key)}
                          onChange={() =>
                            handlePermissionChange(permission.key)
                          }
                        />

                        {permission.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(hasPermission('roles_create') || hasPermission('roles_edit')) && (
            <button className="save-btn" type="submit">
              {editingId ? 'Atualizar cargo' : 'Salvar cargo'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
