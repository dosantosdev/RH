import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Toast from '../../components/ui/Toast'
import useToast from '../../hooks/useToast'

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

  if (!hasPermission('password_change')) {
    return <h2>Acesso negado</h2>
  }

  function handleChange(e) {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  function handleSubmit(e) {
    e.preventDefault()

    const currentUser = JSON.parse(localStorage.getItem('loggedUser'))

    if (!currentUser) {
      navigate('/')
      return
    }

    if (form.currentPassword !== currentUser.password) {
      showToast('A senha atual está incorreta.', 'warning')

      return
    }

    if (!form.newPassword) {
      showToast('Informe a nova senha.', 'warning')

      return
    }

    if (form.newPassword.length < 3) {
      showToast('A nova senha deve possuir pelo menos 3 caracteres.', 'warning')

      return
    }

    if (form.newPassword !== form.confirmPassword) {
      showToast(
        'A confirmação da senha não corresponde à nova senha.',
        'warning'
      )

      return
    }

    const users = JSON.parse(localStorage.getItem('users')) || []

    const updatedUsers = users.map((user) =>
      user.id === currentUser.id
        ? {
            ...user,
            password: form.newPassword
          }
        : user
    )

    localStorage.setItem('users', JSON.stringify(updatedUsers))

    const updatedLoggedUser = {
      ...currentUser,
      password: form.newPassword
    }

    localStorage.setItem('loggedUser', JSON.stringify(updatedLoggedUser))

    localStorage.setItem('currentUser', JSON.stringify(updatedLoggedUser))

    setForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })

    showToast('Senha alterada com sucesso!', 'success')
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
            <label>Senha atual</label>

            <input
              type="password"
              name="currentPassword"
              value={form.currentPassword}
              onChange={handleChange}
              autoComplete="current-password"
            />
          </div>

          <div className="password-field">
            <label>Nova senha</label>

            <input
              type="password"
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>

          <div className="password-field">
            <label>Confirmar nova senha</label>

            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="change-password-btn">
            Alterar senha
          </button>
        </form>
      </div>

      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  )
}
