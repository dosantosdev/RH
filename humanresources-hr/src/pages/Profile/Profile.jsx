import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Toast from '../../components/ui/Toast'
import useToast from '../../hooks/useToast'

import { apiRequest, updateApiSessionUser } from '../../services/api'
import { hasPermission } from '../../services/permissions'

import './profile.css'

export default function Profile() {
  const navigate = useNavigate()
  const { toast, showToast } = useToast()

  const [currentUser, setCurrentUser] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    username: ''
  })

  useEffect(() => {
    let active = true

    async function loadProfile() {
      setLoading(true)

      try {
        // A API identifica o usuário e a empresa pelo token da sessão.
        const result = await apiRequest('/me')
        const apiUser = result?.user

        if (!apiUser) {
          throw new Error('A API não retornou os dados do perfil.')
        }

        let cachedSession = {}
        let cachedEmployees = []

        try {
          cachedSession = JSON.parse(localStorage.getItem('loggedUser') || '{}')
          cachedEmployees = JSON.parse(localStorage.getItem('employees') || '[]')
        } catch {
          cachedSession = {}
          cachedEmployees = []
        }

        const cachedEmployee = Array.isArray(cachedEmployees)
          ? cachedEmployees.find((item) => String(item.id) === String(apiUser.employee_id))
          : null

        const normalizedUser = {
          id: apiUser.id,
          name: apiUser.name || '',
          username: apiUser.username || '',
          email: apiUser.email || '',
          photo: cachedEmployee?.photo || cachedSession.photo || '',
          companyId: apiUser.company_id,
          employeeId: apiUser.employee_id,
          roleName: apiUser.access_role_display_name || apiUser.access_role_name || 'Usuário',
          accessRoleName: apiUser.access_role_name || '',
          permissions: result.permissions || [],
          isAdmin: Boolean(result.isAdmin)
        }

        const linkedEmployee = apiUser.employee_name
          ? {
              name: apiUser.employee_name,
              status: apiUser.employee_status || ''
            }
          : null

        if (!active) return

        setCurrentUser(normalizedUser)
        setEmployee(linkedEmployee)
        setForm({
          name: normalizedUser.name,
          username: normalizedUser.username
        })

        // Mantém somente os campos públicos da sessão compatível usados
        // por componentes legados; a fonte oficial continua sendo o PostgreSQL.
        updateApiSessionUser(normalizedUser)
        localStorage.setItem('loggedUser', JSON.stringify({
          ...JSON.parse(localStorage.getItem('loggedUser') || '{}'),
          ...normalizedUser
        }))
        localStorage.setItem('currentUser', JSON.stringify({
          ...JSON.parse(localStorage.getItem('currentUser') || '{}'),
          ...normalizedUser
        }))
      } catch (error) {
        if (!active) return

        if (error.status === 401) {
          navigate('/', { replace: true })
          return
        }

        showToast(error.message || 'Não foi possível carregar seu perfil.', 'error')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [navigate, showToast])

  if (!hasPermission('profile_view')) {
    return <h2>Acesso negado</h2>
  }

  if (loading) {
    return <div className="profile-page"><p>Carregando perfil do banco de dados...</p></div>
  }

  if (!currentUser) {
    return (
      <div className="profile-page">
        <p>Não foi possível carregar o perfil. Verifique sua conexão com a API.</p>
        <button type="button" onClick={() => navigate('/dashboard')}>Voltar</button>
        <Toast show={toast.show} message={toast.message} type={toast.type} />
      </div>
    )
  }

  const displayName = employee?.name || form.name || 'Usuário'
  const photo = currentUser.photo || ''
  const roleName = currentUser.roleName || currentUser.accessRoleName || 'Usuário'

  function handleChange(event) {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (saving) return

    if (!hasPermission('profile_edit')) {
      showToast('Você não tem permissão para editar seu perfil.', 'warning')
      return
    }

    if (!form.name.trim() || !form.username.trim()) {
      showToast('Informe o nome e o usuário.', 'warning')
      return
    }

    setSaving(true)

    try {
      const result = await apiRequest('/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.name.trim(),
          username: form.username.trim()
        })
      })

      const updatedUser = {
        ...currentUser,
        name: result.user?.name || form.name.trim(),
        username: result.user?.username || form.username.trim()
      }

      setCurrentUser(updatedUser)
      setForm({
        name: updatedUser.name,
        username: updatedUser.username
      })

      updateApiSessionUser(updatedUser)

      // Compatibilidade temporária com componentes que leem a sessão antiga.
      for (const key of ['loggedUser', 'currentUser']) {
        try {
          const storedUser = JSON.parse(localStorage.getItem(key) || '{}')
          localStorage.setItem(key, JSON.stringify({
            ...storedUser,
            name: updatedUser.name,
            username: updatedUser.username
          }))
        } catch {
          // Não bloqueia a atualização já confirmada pelo PostgreSQL.
        }
      }

      showToast(result.message || 'Perfil atualizado com sucesso!', 'success')
    } catch (error) {
      showToast(error.message || 'Não foi possível atualizar seu perfil.', 'error')
    } finally {
      setSaving(false)
    }
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
                <label htmlFor="profile-name">Nome</label>
                <input
                  id="profile-name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  disabled={!hasPermission('profile_edit') || saving}
                  maxLength={120}
                  required
                />
              </div>

              <div>
                <label htmlFor="profile-username">Usuário</label>
                <input
                  id="profile-username"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  disabled={!hasPermission('profile_edit') || saving}
                  maxLength={80}
                  required
                />
              </div>

              <div>
                <label htmlFor="profile-role">Cargo</label>
                <input id="profile-role" value={roleName} disabled />
              </div>

              <div>
                <label htmlFor="profile-employee">Funcionário vinculado</label>
                <input
                  id="profile-employee"
                  value={employee?.name || 'Nenhum'}
                  disabled
                />
              </div>
            </div>
          </div>

          {hasPermission('profile_edit') && (
            <div className="profile-actions">
              <button type="submit" className="save-btn" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          )}
        </form>
      </div>

      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  )
}
