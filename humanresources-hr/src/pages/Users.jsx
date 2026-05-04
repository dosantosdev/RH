import { useState, useEffect } from 'react'
import '../components/employee.css'

export default function Users() {
  const initialUser = {
    name: '',
    username: '',
    password: '',
    role: '',
    active: true
  }

  const [user, setUser] = useState(initialUser)
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    const storedUsers = JSON.parse(localStorage.getItem('users')) || []
    const storedRoles = JSON.parse(localStorage.getItem('roles')) || []

    setUsers(storedUsers)
    setRoles(storedRoles)
  }, [])

  function handleChange(e) {
    const { name, value, type, checked } = e.target

    setUser({
      ...user,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  function handleSubmit(e) {
    e.preventDefault()

    let updated

    if (editingId) {
      updated = users.map((u) =>
        u.id === editingId ? { ...user, id: editingId } : u
      )
    } else {
      const newUser = {
        ...user,
        id: Date.now()
      }

      updated = [...users, newUser]
    }

    localStorage.setItem('users', JSON.stringify(updated))
    setUsers(updated)

    alert(editingId ? 'Usuário atualizado!' : 'Usuário cadastrado!')

    setUser(initialUser)
    setEditingId(null)
  }

  function handleEdit(u) {
    setUser(u)
    setEditingId(u.id)
  }

  function handleDelete(id) {
    const confirmDelete = confirm('Deseja excluir este usuário?')
    if (!confirmDelete) return

    const updated = users.filter((u) => u.id !== id)

    localStorage.setItem('users', JSON.stringify(updated))
    setUsers(updated)
  }

  return (
    <div className="form-container">
      <h2>Cadastro de Usuários</h2>

      {/* FORMULÁRIO */}
      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>Informações do Usuário</h3>

          <div className="form-grid">
            <input
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

            {/* SELECT DE CARGO */}
            <select name="role" value={user.role} onChange={handleChange}>
              <option value="">Selecione o cargo</option>

              {roles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-section">
          <h3>Status</h3>

          <label>
            <input
              type="checkbox"
              name="active"
              checked={user.active}
              onChange={handleChange}
            />
            Usuário ativo
          </label>
        </div>

        <button type="submit">{editingId ? 'Atualizar' : 'Salvar'}</button>
      </form>

      {/* LISTA */}
      <div className="form-section" style={{ marginTop: '20px' }}>
        <h3>Usuários cadastrados</h3>

        <div className="details-grid">
          {users.length === 0 && <p>Nenhum usuário cadastrado</p>}

          {users.map((u) => (
            <div key={u.id} className="detail-item">
              <span>{u.name}</span>
              <strong>{u.username}</strong>
              <strong>{u.role || '-'}</strong>
              <strong>{u.active ? '🟢 Ativo' : '🔴 Inativo'}</strong>

              {/* AÇÕES */}
              <div style={{ marginTop: '8px', display: 'flex', gap: '5px' }}>
                <button onClick={() => handleEdit(u)}>✏️</button>
                <button onClick={() => handleDelete(u.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
