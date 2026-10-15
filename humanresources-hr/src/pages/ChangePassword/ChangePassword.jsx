import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Toast from '../../components/ui/Toast'
import useToast from '../../hooks/useToast'
import { apiRequest } from '../../services/api'
import { hasPermission } from '../../services/permissions'

import './changePassword.css'

export default function ChangePassword() {
  const navigate = useNavigate()
  const { toast, showToast } = useToast()

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [saving, setSaving] = useState(false)

  if (!hasPermission('password_change')) {
    return <h2>Acesso negado</h2>
  }

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

    if (!form.currentPassword || !form.newPassword) {
      showToast('Informe a senha atual e a nova senha.', 'warning')
      return
    }

    if (form.newPassword.length < 8) {
      showToast('A nova senha deve possuir pelo menos 8 caracteres.', 'warning')
      return
    }

    if (form.newPassword !== form.confirmPassword) {
      showToast(
        'A confirmação da senha não corresponde à nova senha.',
        'warning'
      )
      return
    }

    setSaving(true)

    try {
      const result = await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword
        })
      })

      setForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })

      showToast(result.message || 'Senha alterada com sucesso!', 'success')
    } catch (error) {
      if (error.status === 401) {
        showToast(
          'Sua sessão expirou. Entre novamente para alterar a senha.',
          'error'
        )
      } else {
        showToast(error.message || 'Não foi possível alterar a senha.', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="change-password-page">
      <div className="change-password-card">
        <button
          type="button"
          className="password-back-btn"
          onClick={() => navigate('/dashboard')}
        >
          ← Voltar
        </button>

        <h2>Alterar senha</h2>

        <p className="password-description">
          Informe sua senha atual e escolha uma nova senha.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="password-field">
            <label htmlFor="currentPassword">Senha atual</label>
            <input
              id="currentPassword"
              type="password"
              name="currentPassword"
              value={form.currentPassword}
              onChange={handleChange}
              autoComplete="current-password"
              disabled={saving}
              required
            />
          </div>

          <div className="password-field">
            <label htmlFor="newPassword">Nova senha</label>
            <input
              id="newPassword"
              type="password"
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              autoComplete="new-password"
              minLength={8}
              disabled={saving}
              required
            />
          </div>

          <div className="password-field">
            <label htmlFor="confirmPassword">Confirmar nova senha</label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              minLength={8}
              disabled={saving}
              required
            />
          </div>

          <button
            type="submit"
            className="change-password-btn"
            disabled={saving}
          >
            {saving ? 'Alterando senha...' : 'Alterar senha'}
          </button>
        </form>
      </div>

      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  )
}
