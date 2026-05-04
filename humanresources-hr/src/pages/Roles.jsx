import { useState, useEffect } from 'react'
import '../components/employee.css'

export default function Roles() {
  const initialRole = {
    name: '',
    description: '',
    active: true
  }

  const [role, setRole] = useState(initialRole)
  const [roles, setRoles] = useState([])
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('roles')) || []
    setRoles(stored)
  }, [])

  function handleChange(e) {
    const { name, value, type, checked } = e.target

    setRole({
      ...role,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  function handleSubmit(e) {
    e.preventDefault()

    let updated

    if (editingId) {
      updated = roles.map((r) =>
        r.id === editingId ? { ...role, id: editingId } : r
      )
    } else {
      const newRole = {
        ...role,
        id: Date.now()
      }

      updated = [...roles, newRole]
    }

    localStorage.setItem('roles', JSON.stringify(updated))
    setRoles(updated)

    alert(editingId ? 'Cargo atualizado!' : 'Cargo cadastrado!')

    setRole(initialRole)
    setEditingId(null)
  }

  function handleEdit(r) {
    setRole(r)
    setEditingId(r.id)
  }

  function handleDelete(id) {
    const confirmDelete = confirm('Deseja excluir este cargo?')
    if (!confirmDelete) return

    const updated = roles.filter((r) => r.id !== id)

    localStorage.setItem('roles', JSON.stringify(updated))
    setRoles(updated)
  }

  return (
    <div className="form-container">
      <h2>Cadastro de Cargos</h2>

      {/* FORMULÁRIO */}
      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>Informações do Cargo</h3>

          <div className="form-grid">
            <input
              name="name"
              value={role.name}
              placeholder="Nome do cargo"
              onChange={handleChange}
            />

            <input
              name="description"
              value={role.description}
              placeholder="Descrição"
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Status</h3>

          <label>
            <input
              type="checkbox"
              name="active"
              checked={role.active}
              onChange={handleChange}
            />
            Cargo ativo
          </label>
        </div>

        <button type="submit">{editingId ? 'Atualizar' : 'Salvar'}</button>
      </form>

      {/* LISTA */}
      <div className="form-section" style={{ marginTop: '20px' }}>
        <h3>Cargos cadastrados</h3>

        <div className="details-grid">
          {roles.length === 0 && <p>Nenhum cargo cadastrado</p>}

          {roles.map((r) => (
            <div key={r.id} className="detail-item">
              <span>{r.name}</span>
              <strong>{r.description || '-'}</strong>
              <strong>{r.active ? '🟢 Ativo' : '🔴 Inativo'}</strong>

              {/* AÇÕES */}
              <div style={{ marginTop: '8px', display: 'flex', gap: '5px' }}>
                <button onClick={() => handleEdit(r)}>✏️</button>
                <button onClick={() => handleDelete(r.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
