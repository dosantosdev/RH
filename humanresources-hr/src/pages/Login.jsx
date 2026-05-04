import { useState, useEffect } from 'react'
import ThemeToggle from '../components/ThemeToggle'
import { useNavigate } from 'react-router-dom'
import './login.css'
import logoLight from '../assets/logo-light.png'
import logoDark from '../assets/logo-dark.png'
import useTheme from '../hooks/useTheme'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const theme = useTheme()

  function handleLogin() {
    const users = JSON.parse(localStorage.getItem('users')) || []

    const user = users.find(
      (u) => u.username === username && u.password === password
    )

    if (!user) {
      alert('Usuário ou senha inválidos')
      return
    }

    // salva usuário logado
    localStorage.setItem('loggedUser', JSON.stringify(user))

    navigate('/dashboard') // redireciona após login
  }

  return (
    <div className="login-container">
      <form className="login-box" onSubmit={handleLogin}>
        {/* 🖼️ LOGO */}
        <div className="login-header">
          <img
            src={theme === 'dark' ? logoDark : logoLight}
            alt="Logo"
            className={`login-logo ${theme === 'light' ? 'logo-light' : ''}`}
          />

          <ThemeToggle />
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
    </div>
  )
}
