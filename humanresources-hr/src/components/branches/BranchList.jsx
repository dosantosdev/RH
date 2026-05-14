import './branchList.css'

import { hasPermission } from '../../services/permissions'

export default function BranchList({ branches, handleEdit, handleDelete }) {
  return (
    <>
      <div className="branches-grid">
        {branches.length === 0 && <p>Nenhuma filial cadastrada</p>}

        {branches.map((b) => (
          <div key={b.id} className="branches-list-card default-card">
            <div className="branch-item default-inner-card">
              <div className="branch-info">
                <h4>{b.name}</h4>

                <p>{b.cnpj}</p>

                <p>{b.address}</p>

                <span>
                  {b.city} - {b.state}
                </span>

                <span>{b.active ? '🟢 Ativa' : '🔴 Inativa'}</span>
              </div>

              <div className="branch-actions default-actions">
                {hasPermission('branches_edit') && (
                  <button onClick={() => handleEdit(b)}>✏️</button>
                )}

                {hasPermission('branches_delete') && (
                  <button onClick={() => handleDelete(b.id)}>🗑️</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
