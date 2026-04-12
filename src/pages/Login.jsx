import { useState } from 'react'

// Importa funções de autenticação
import { login, register } from '../services/auth'

function Login({ setUser }) {
  // Estados do formulário
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('rh') // padrão RH

  // 🔐 Função de login
  function handleLogin() {
    const user = login(email, password)

    if (user) {
      setUser(user)
    } else {
      alert('Usuário ou senha inválidos')
    }
  }

  // 📝 Função de cadastro
  function handleRegister() {
    register({ email, password, role })
    alert('Usuário cadastrado com sucesso!')
  }

  return (
    <div>
      <h2>Login</h2>

      {/* Input de email */}
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      {/* Input de senha */}
      <input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {/* Seleção de permissão */}
      <select onChange={(e) => setRole(e.target.value)}>
        <option value="rh">RH</option>
        <option value="admin">Admin</option>
      </select>

      <br /><br />

      {/* Botões */}
      <button onClick={handleLogin}>Entrar</button>
    </div>
  )
}

export default Login