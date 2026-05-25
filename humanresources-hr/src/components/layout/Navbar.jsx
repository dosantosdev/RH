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

        {/* CADASTRO */}

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

        {/* FINANCEIRO */}

        <div className="dropdown">
          <button className="dropbtn">Financeiro</button>

          <div className="dropdown-content">
            <Link to="#">Horas</Link>

            <Link to="#">Folha</Link>
          </div>
        </div>

        {/* RELATÓRIOS */}

        <div className="dropdown">
          <button className="dropbtn">Relatórios</button>

          <div className="dropdown-content">
            <Link to="#">Checklist</Link>

            <Link to="#">Exames</Link>

            <Link to="#">Quadro de Funcionários</Link>
          </div>
        </div>

        {/* ÁREA DO CANDIDATO */}

        <div className="dropdown">
          <button className="dropbtn">Área do Candidato</button>

          <div className="dropdown-content">
            <Link to="#">Currículo</Link>

            <Link to="#">Pré-cadastro</Link>

            <Link to="#">Vagas</Link>

            <Link to="#">Entrevistas</Link>
          </div>
        </div>

        {/* ARQUIVO */}

        <div className="dropdown">
          <button className="dropbtn">Arquivo</button>

          <div className="dropdown-content">
            <Link to="#">Busca</Link>

            <Link to="#">Docs</Link>

            <Link to="#">Currículos</Link>
          </div>
        </div>
      </div>

      <button className="logout-btn primary-btn" onClick={handleLogout}>
        Sair
      </button>
    </nav>
  )
}
