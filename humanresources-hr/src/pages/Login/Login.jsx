import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../../assets/logo-light.png'
import './login.css'
import Toast from '../../components/ui/Toast'
import useToast from '../../hooks/useToast'
import { apiLogin } from '../../services/api'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { toast, showToast } = useToast()

  async function handleLogin(event) {
    event.preventDefault()

    if (loading) return

    const normalizedUsername = username.trim()

    if (!normalizedUsername || !password) {
      showToast('Informe o usuário e a senha.', 'error')
      return
    }

    setLoading(true)

    try {
      // A API valida a senha armazenada com hash no PostgreSQL.
      const result = await apiLogin(normalizedUsername, password)

      if (!result?.user || !result?.token) {
        throw new Error('A API retornou uma resposta de login inválida.')
      }

      // Preserva o formato de sessão esperado pelos módulos atuais.
      const sessionUser = {
        ...result.user,
        roleId: result.user.accessRoleId ?? '',
        roleName: result.user.accessRoleName ?? '',
        active: true
      }

      localStorage.setItem('loggedUser', JSON.stringify(sessionUser))
      localStorage.setItem('currentUser', JSON.stringify(sessionUser))

      showToast('Login realizado com sucesso.', 'success')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      console.error('Falha no login:', error)

      if (error.name === 'AbortError') {
        showToast('A API demorou para responder. Tente novamente.', 'error')
      } else if (
        error instanceof TypeError &&
        /fetch/i.test(error.message)
      ) {
        showToast(
          'Não foi possível conectar à API. Verifique se o servidor está ativo.',
          'error'
        )
      } else {
        showToast(error.message || 'Usuário ou senha inválidos.', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <form className="login-box" onSubmit={handleLogin}>
        <div className="login-header">
          <img src={logo} alt="Logo" className="login-logo" />
        </div>

        <h2>Login</h2>

        <input
          type="text"
          name="username"
          autoComplete="username"
          placeholder="Usuário"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          disabled={loading}
          required
        />

        <input
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Senha"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={loading}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  )
}
