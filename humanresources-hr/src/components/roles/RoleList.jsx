import './roleList.css'

export default function RoleList({ roles, handleEdit, handleDelete }) {
  return (
    <>
      <div className="roles-grid">
        {roles.length === 0 && <p>Nenhum cargo cadastrado</p>}

        {roles.map((r) => (
          <div key={r.id} className="roles-list-card">
            <div className="role-item">
              <div className="role-info">
                <h4>{r.name}</h4>

                <p>{r.description || '-'}</p>

                <span>{r.active ? '🟢 Ativo' : '🔴 Inativo'}</span>
              </div>

              <div className="role-actions">
                <button onClick={() => handleEdit(r)}>✏️</button>

                <button onClick={() => handleDelete(r.id)}>🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
