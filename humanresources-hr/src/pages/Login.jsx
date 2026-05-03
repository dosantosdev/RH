import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './login.css'
import logo from '../assets/logo.png'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

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
        <img src={logo} alt="Logo" className="login-logo" />

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
