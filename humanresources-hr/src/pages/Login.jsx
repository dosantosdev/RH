import { useState } from 'react'
import { login } from '../services/auth'

function Login({ setUser }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleLogin() {
    const user = login(email, password)

    if (user) {
      setUser(user)
    } else {
      alert('Usuário ou senha inválidos')
    }
  }

  return (
    <div>
      <h2>Login</h2>

      <input
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Senha"
        onChange={(e) => setPassword(e.target.value)}
      />

      <br /><br />

      <button onClick={handleLogin}>Entrar</button>
    </div>
  )
}

export default Login