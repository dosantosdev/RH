import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Toast from '../../components/ui/Toast'
import useToast from '../../hooks/useToast'

import { hasPermission } from '../../services/permissions'

import './profile.css'

export default function Profile() {
  const navigate = useNavigate()
  const { toast, showToast } = useToast()

  const [currentUser, setCurrentUser] = useState(null)
  const [employee, setEmployee] = useState(null)

  const [form, setForm] = useState({
    name: '',
    username: ''
  })

  useEffect(() => {
    const loggedUser = JSON.parse(localStorage.getItem('loggedUser'))

    if (!loggedUser) {
      navigate('/')
      return
    }

    setCurrentUser(loggedUser)

    setForm({
      name: loggedUser.name || '',
      username: loggedUser.username || ''
    })

    const employees = JSON.parse(localStorage.getItem('employees')) || []

    const linkedEmployee = employees.find(
      (item) => item.id === Number(loggedUser.employeeId)
    )

    setEmployee(linkedEmployee || null)
  }, [navigate])

  if (!hasPermission('profile_view')) {
    return <h2>Acesso negado</h2>
  }

  if (!currentUser) {
    return null
  }

  const displayName = employee?.name || form.name || 'Usuário'

  const photo = employee?.photo || currentUser.photo

  const roleName = currentUser.roleName || currentUser.role || 'Usuário'

  function handleChange(e) {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  function handleSubmit(e) {
    e.preventDefault()

    if (!hasPermission('profile_edit')) {
      showToast('Você não tem permissão para editar seu perfil.', 'warning')

      return
    }

    const users = JSON.parse(localStorage.getItem('users')) || []

    const updatedUsers = users.map((user) =>
      user.id === currentUser.id
        ? {
            ...user,
            name: form.name,
            username: form.username
          }
        : user
    )

    localStorage.setItem('users', JSON.stringify(updatedUsers))

    const updatedLoggedUser = {
      ...currentUser,
      name: form.name,
      username: form.username
    }

    localStorage.setItem('loggedUser', JSON.stringify(updatedLoggedUser))

    localStorage.setItem('currentUser', JSON.stringify(updatedLoggedUser))

    setCurrentUser(updatedLoggedUser)

    showToast('Perfil atualizado com sucesso!', 'success')
  }

  return (
    <div className="profile-page">
      <div className="profile-card-page">
        <div className="profile-page-header">
          <button
            type="button"
            className="profile-back-btn"
            onClick={() => navigate('/dashboard')}
          >
            ← Voltar
          </button>

          <h2>Meu perfil</h2>
        </div>

        <div className="profile-main">
          <div className="profile-avatar-large">
            {photo ? (
              <img src={photo} alt={displayName} />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>

          <div className="profile-summary">
            <h3>{displayName}</h3>

            <p>{roleName}</p>

            {employee && <span>Funcionário vinculado</span>}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="profile-section">
            <h3>Informações da conta</h3>

            <div className="profile-form-grid">
              <div>
                <label>Nome</label>

                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  disabled={!hasPermission('profile_edit')}
                />
              </div>

              <div>
                <label>Usuário</label>

                <input
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  disabled={!hasPermission('profile_edit')}
                />
              </div>

              <div>
                <label>Cargo</label>

                <input value={roleName} disabled />
              </div>

              <div>
                <label>Funcionário vinculado</label>

                <input value={employee?.name || 'Nenhum'} disabled />
              </div>
            </div>
          </div>

          {hasPermission('profile_edit') && (
            <div className="profile-actions">
              <button type="submit" className="save-btn">
                Salvar alterações
              </button>
            </div>
          )}
        </form>
      </div>

      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  )
}
