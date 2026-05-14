import { Link, useNavigate } from 'react-router-dom'

import './navbar.css'

import { hasPermission } from '../../services/permissions'

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
            {hasPermission('employees_view') && (
              <Link to="/buscar">Buscar Funcionários</Link>
            )}

            {hasPermission('employees_create') && (
              <Link to="/cadastrar">Cadastrar Funcionários</Link>
            )}

            {hasPermission('roles_view') && (
              <Link to="/cargos">Cadastrar Cargos</Link>
            )}

            {hasPermission('branches_view') && (
              <Link to="/filiais">Cadastrar Filiais</Link>
            )}

            {hasPermission('users_view') && (
              <Link to="/usuarios">Cadastrar Usuários</Link>
            )}
          </div>
        </div>
      </div>

      <button className="logout-btn primary-btn" onClick={handleLogout}>
        Sair
      </button>
    </nav>
  )
}
