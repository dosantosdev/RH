import './roleForm.css'

import { permissions } from '../../data/permissions'

import { hasPermission } from '../../services/permissions'

export default function RoleForm({
  role,
  editingId,
  handleChange,
  handleSubmit
}) {
  const certificates = JSON.parse(localStorage.getItem('certificates')) || []

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
          {/* INFORMAÇÕES */}

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

          {/* STATUS */}

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

          {/* REQUISITOS */}

          <div className="form-section">
            <h3>Requisitos do Cargo</h3>

            <div className="requirements-grid">
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  name="requiresCnh"
                  checked={role.requiresCnh}
                  onChange={handleChange}
                />
                Requer CNH
              </label>
            </div>

            {role.requiresCnh && (
              <div className="cnh-categories-role">
                {['A', 'B', 'C', 'D', 'E'].map((category) => (
                  <label key={category} className="permission-item">
                    <input
                      type="checkbox"
                      checked={role.requiredCnhCategories?.includes(category)}
                      onChange={() => {
                        const exists =
                          role.requiredCnhCategories?.includes(category)

                        let updated = []

                        if (exists) {
                          updated = role.requiredCnhCategories.filter(
                            (c) => c !== category
                          )
                        } else {
                          updated = [
                            ...(role.requiredCnhCategories || []),

                            category
                          ]
                        }

                        handleChange({
                          target: {
                            name: 'requiredCnhCategories',

                            value: updated,

                            type: 'custom'
                          }
                        })
                      }}
                    />
                    Categoria {category}
                  </label>
                ))}
              </div>
            )}

            <div className="required-certificates">
              <h4>Certificados obrigatórios</h4>

              <div className="permissions-grid">
                {certificates.map((certificate) => (
                  <label key={certificate.id} className="permission-item">
                    <input
                      type="checkbox"
                      checked={role.requiredCertificates?.includes(
                        certificate.id
                      )}
                      onChange={() => {
                        const exists = role.requiredCertificates?.includes(
                          certificate.id
                        )

                        let updated = []

                        if (exists) {
                          updated = role.requiredCertificates.filter(
                            (id) => id !== certificate.id
                          )
                        } else {
                          updated = [
                            ...(role.requiredCertificates || []),

                            certificate.id
                          ]
                        }

                        handleChange({
                          target: {
                            name: 'requiredCertificates',

                            value: updated,

                            type: 'custom'
                          }
                        })
                      }}
                    />

                    {certificate.name}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* PERMISSÕES */}

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
