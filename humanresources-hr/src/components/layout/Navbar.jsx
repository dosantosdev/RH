import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import './navbar.css'

import { hasPermission } from '../../services/permissions'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()

  const [profileOpen, setProfileOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [employee, setEmployee] = useState(null)

  const profileRef = useRef(null)

  // Carrega novamente os dados do usuário e do funcionário vinculado
  // sempre que navegamos para outra página.
  useEffect(() => {
    const loggedUser = JSON.parse(localStorage.getItem('loggedUser'))

    setCurrentUser(loggedUser)

    if (!loggedUser) {
      setEmployee(null)
      return
    }

    const employees = JSON.parse(localStorage.getItem('employees')) || []

    const linkedEmployee = employees.find(
      (item) => item.id === Number(loggedUser.employeeId)
    )

    setEmployee(linkedEmployee || null)
  }, [location.pathname])

  function handleLogout() {
    localStorage.removeItem('loggedUser')
    localStorage.removeItem('currentUser')

    navigate('/')
  }

  // Fecha o menu quando clicar fora dele.
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  function handleProfileClick() {
    setProfileOpen((prev) => !prev)
  }

  if (!currentUser) {
    return null
  }

  const userName = employee?.name || currentUser.name || 'Usuário'

  const userInitial = userName.charAt(0).toUpperCase()

  // A foto vem primeiro do funcionário vinculado.
  // currentUser.photo fica como fallback para usuários que
  // eventualmente tenham uma foto própria.
  const userPhoto = employee?.photo || currentUser.photo || null

  const roleName = currentUser.roleName || currentUser.role || 'Usuário'

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

            {hasPermission('users_view') && (
              <Link to="/usuarios">Cadastrar Usuários</Link>
            )}
          </div>
        </div>

        {/* ORGANOGRAMA */}

        <div className="dropdown">
          <button className="dropbtn">Organograma</button>

          <div className="dropdown-content">
            <Link to="/organograma">Organograma</Link>

            {hasPermission('branches_view') && (
              <Link to="/filiais">Filiais</Link>
            )}

            <Link to="/departamentos">Departamentos</Link>

            {hasPermission('roles_view') && <Link to="/cargos">Cargos</Link>}
          </div>
        </div>

        {/* TREINAMENTOS */}

        <Link to="/treinamentos" className="nav-link">
          Treinamentos
        </Link>

        {/* PONTO */}

        <div className="dropdown">
          <button className="dropbtn">Ponto</button>

          <div className="dropdown-content">
            <Link to="/ponto/bater">Bater Ponto</Link>
            <Link to="/ponto/espelho">Meu Espelho</Link>
            <Link to="/ponto/controle">Controle de Ponto</Link>
            <Link to="/ponto/banco-horas">Banco de Horas</Link>
            <Link to="/ponto/horas-extras">Horas Extras</Link>
            <Link to="/ponto/faltas-atrasos">Faltas e Atrasos</Link>
            <Link to="/ponto/fechamento">Fechamento Mensal</Link>
            <Link to="/ponto/relatorios">Relatórios</Link>
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

        {/* CONFIGURAÇÕES */}

        {hasPermission('system_settings') && (
          <Link to="/configuracoes" className="nav-link">
            Configurações
          </Link>
        )}
      </div>

      {/* ÁREA DO USUÁRIO */}

      <div className="navbar-user-area" ref={profileRef}>
        <button
          type="button"
          className="navbar-user-button"
          onClick={handleProfileClick}
        >
          {userPhoto ? (
            <img
              src={userPhoto}
              alt={userName}
              className="navbar-user-avatar"
            />
          ) : (
            <div className="navbar-user-avatar navbar-user-initial">
              {userInitial}
            </div>
          )}

          <span className="navbar-user-name">{userName}</span>
        </button>

        {profileOpen && (
          <div className="profile-dropdown">
            <div className="profile-dropdown-header">
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt={userName}
                  className="profile-dropdown-avatar"
                />
              ) : (
                <div className="profile-dropdown-avatar profile-dropdown-initial">
                  {userInitial}
                </div>
              )}

              <div>
                <strong>{userName}</strong>

                <span>{roleName}</span>
              </div>
            </div>

            <div className="profile-dropdown-divider" />

            <div className="profile-dropdown-info">
              <span>Usuário</span>

              <strong>{currentUser.username || '-'}</strong>
            </div>

            {hasPermission('profile_view') && (
              <button
                type="button"
                className="profile-dropdown-item"
                onClick={() => {
                  setProfileOpen(false)
                  navigate('/perfil')
                }}
              >
                Meu perfil
              </button>
            )}

            {hasPermission('password_change') && (
              <button
                type="button"
                className="profile-dropdown-item"
                onClick={() => {
                  setProfileOpen(false)
                  navigate('/alterar-senha')
                }}
              >
                Alterar senha
              </button>
            )}

            {/* SAIR */}

            <div className="profile-dropdown-divider" />

            <button
              type="button"
              className="profile-dropdown-item profile-logout-item"
              onClick={handleLogout}
            >
              Sair
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
