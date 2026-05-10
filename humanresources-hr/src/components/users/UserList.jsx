import './userList.css'

import { hasPermission } from '../../services/permissions'

export default function UserList({ users, handleEdit, handleDelete }) {
  return (
    <div className="users-grid">
      {users.length === 0 && <p>Nenhum usuário cadastrado</p>}

      {users.map((u) => (
        <div key={u.id} className="users-list-card">
          <div className="user-item">
            <div className="user-info">
              <h4>{u.name}</h4>

              <p>{u.username}</p>

              <span>{u.roleName || '-'}</span>

              <strong>{u.active ? '🟢 Ativo' : '🔴 Inativo'}</strong>
            </div>

            <div className="user-actions">
              {hasPermission('users_edit') && (
                <button onClick={() => handleEdit(u)}>✏️</button>
              )}

              {hasPermission('users_delete') && (
                <button onClick={() => handleDelete(u.id)}>🗑️</button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
