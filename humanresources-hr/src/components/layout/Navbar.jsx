import { Link, useNavigate } from 'react-router-dom'
import './navbar.css'

export default function Navbar() {
  const navigate = useNavigate()

  function handleLogout() {
    localStorage.removeItem('loggedUser')
    navigate('/')
  }

  return (
    <nav className="navbar">
      <div className="nav-left">
        <Link to="/dashboard" className="nav-link">
          Dashboard
        </Link>

        <div className="dropdown">
          <button className="dropbtn">Cadastro</button>

          <div className="dropdown-content">
            <Link to="/buscar">Buscar Funcionários</Link>
            <Link to="/cadastrar">Cadastrar Funcionários</Link>
            <Link to="/cargos">Cadastrar Cargos</Link>
            <Link to="/usuarios">Cadastrar Usuários</Link>
          </div>
        </div>
      </div>

      <button className="logout-btn" onClick={handleLogout}>
        Sair
      </button>
    </nav>
  )
}
