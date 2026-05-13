import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../../assets/logo-light.png'
import './login.css'
import Toast from '../../components/ui/Toast'
import useToast from '../../hooks/useToast'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const { toast, showToast } = useToast()

  function handleLogin(e) {
    e.preventDefault()

    const users = JSON.parse(localStorage.getItem('users')) || []

    const user = users.find(
      (u) => u.username === username && u.password === password
    )

    if (!user) {
      showToast('Usuário ou senha inválidos', 'error')

      return
    }

    localStorage.setItem('loggedUser', JSON.stringify(user))

    navigate('/dashboard')
  }

  return (
    <div className="login-container">
      <form className="login-box" onSubmit={handleLogin}>
        {/* 🖼️ LOGO */}
        <div className="login-header">
          <img src={logo} alt="Logo" className="login-logo" />
        </div>

        <h2>Login</h2>

        <input
          placeholder="Usuário"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Entrar</button>
      </form>

      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  )
}
