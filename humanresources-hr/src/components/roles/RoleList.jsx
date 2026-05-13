import './roleList.css'

import { hasPermission } from '../../services/permissions'

export default function RoleList({ roles, handleEdit, handleDelete }) {
  return (
    <>
      <div className="roles-grid">
        {roles.length === 0 && <p>Nenhum cargo cadastrado</p>}

        {roles.map((r) => (
          <div key={r.id} className="roles-list-card default-card">
            <div className="role-item default-inner-card">
              <div className="role-info">
                <h4>{r.name}</h4>

                <p>{r.description || '-'}</p>

                <span>{r.active ? '🟢 Ativo' : '🔴 Inativo'}</span>
              </div>

              <div className="role-actions default-actions">
                {hasPermission('roles_edit') && (
                  <button onClick={() => handleEdit(r)}>✏️</button>
                )}

                {hasPermission('roles_delete') && (
                  <button onClick={() => handleDelete(r.id)}>🗑️</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
