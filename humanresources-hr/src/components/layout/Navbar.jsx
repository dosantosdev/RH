import { useEffect, useMemo, useRef, useState } from 'react'

import { Link, useNavigate } from 'react-router-dom'

import './navbar.css'

import { hasPermission } from '../../services/permissions'

export default function Navbar() {
  const navigate = useNavigate()

  const [profileOpen, setProfileOpen] = useState(false)

  const profileRef = useRef(null)

  /*
   * ============================================================
   * USUÁRIO LOGADO
   * ============================================================
   */

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('loggedUser'))
    } catch {
      return null
    }
  }, [])

  /*
   * ============================================================
   * FUNCIONÁRIO VINCULADO
   * ============================================================
   */

  const employee = useMemo(() => {
    if (!currentUser) {
      return null
    }

    const employees = JSON.parse(localStorage.getItem('employees')) || []

    return (
      employees.find((item) => item.id === Number(currentUser.employeeId)) ||
      null
    )
  }, [currentUser])

  /*
   * ============================================================
   * FECHAR MENU DE PERFIL
   * ============================================================
   */

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

  /*
   * ============================================================
   * LOGOUT
   * ============================================================
   */

  function handleLogout() {
    localStorage.removeItem('loggedUser')

    localStorage.removeItem('currentUser')

    navigate('/')
  }

  function handleProfileClick() {
    setProfileOpen((prev) => !prev)
  }

  if (!currentUser) {
    return null
  }

  const userName = employee?.name || currentUser.name || 'Usuário'

  const userInitial = userName.charAt(0).toUpperCase()

  const userPhoto = employee?.photo || currentUser.photo || null

  /*
   * ============================================================
   * TREINAMENTOS
   * ============================================================
   */

  const canManageTrainings = hasPermission('trainings_view')

  const canViewMyTrainings = hasPermission('my_trainings_view')

  const canAccessTrainings = canManageTrainings || canViewMyTrainings

  /*
   * ============================================================
   * FINANCEIRO
   * ============================================================
   */

  const canViewSalaries = hasPermission('finance_salary_view')

  const canViewEvents = hasPermission('finance_events_view')

  const canViewPayroll = hasPermission('finance_payroll_view')

  const canViewAdvancedFinance = hasPermission('finance_advanced_view')

  const canAccessFinance =
    canViewSalaries || canViewEvents || canViewPayroll || canViewAdvancedFinance

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <nav className="navbar">
      <div className="nav-left">
        <Link to="/dashboard" className="nav-link">
          Dashboard
        </Link>

        {/* ======================================================
            CADASTRO
        ====================================================== */}

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

            {hasPermission('access_roles_view') && (
              <Link to="/perfis-acesso">Perfis de Acesso</Link>
            )}
          </div>
        </div>

        {/* ======================================================
            ORGANOGRAMA
        ====================================================== */}

        <div className="dropdown">
          <button className="dropbtn">Organograma</button>

          <div className="dropdown-content">
            <Link to="/organograma">Organograma</Link>

            {hasPermission('branches_view') && (
              <Link to="/filiais">Filiais</Link>
            )}

            {hasPermission('departments_view') && (
              <Link to="/departamentos">Departamentos</Link>
            )}

            {hasPermission('roles_view') && <Link to="/cargos">Cargos</Link>}
          </div>
        </div>

        {/* ======================================================
            TREINAMENTOS
        ====================================================== */}

        {canAccessTrainings && (
          <div className="dropdown">
            <button className="dropbtn">Treinamentos</button>

            <div className="dropdown-content">
              {canManageTrainings && (
                <Link to="/treinamentos">Gerenciar treinamentos</Link>
              )}

              {canViewMyTrainings && (
                <Link to="/meus-treinamentos">Meus treinamentos</Link>
              )}
            </div>
          </div>
        )}

        {/* ======================================================
            AVALIAÇÕES
        ====================================================== */}

        {(hasPermission('evaluations_view') ||
          hasPermission('my_evaluations_view') ||
          hasPermission('evaluation_models_view') ||
          hasPermission('evaluations_history_view')) && (
          <div className="dropdown">
            <button className="dropbtn">Avaliações</button>

            <div className="dropdown-content">
              {hasPermission('evaluations_view') && (
                <Link to="/avaliacoes">Avaliações de desempenho</Link>
              )}

              {hasPermission('my_evaluations_view') && (
                <Link to="/avaliacoes/minhas">Minhas avaliações</Link>
              )}

              {hasPermission('evaluation_models_view') && (
                <Link to="/avaliacoes/modelos">Modelos de avaliação</Link>
              )}

              {hasPermission('evaluations_history_view') && (
                <Link to="/avaliacoes/historico">Histórico</Link>
              )}
            </div>
          </div>
        )}

        {/* ======================================================
            PONTO
        ====================================================== */}

        <div className="dropdown">
          <button className="dropbtn">Ponto</button>

          <div className="dropdown-content">
            <Link to="/ponto/bater">Bater Ponto</Link>

            {hasPermission('work_schedules_view') && (
              <Link to="/ponto/jornadas">Jornadas e Escalas</Link>
            )}

            <Link to="/ponto/espelho">Meu Espelho</Link>

            <Link to="/ponto/controle">Controle de Ponto</Link>

            <Link to="/ponto/banco-horas">Banco de Horas</Link>

            <Link to="/ponto/horas-extras">Horas Extras</Link>

            <Link to="/ponto/faltas-atrasos">Faltas e Atrasos</Link>

            <Link to="/ponto/atestados">Atestados</Link>

            <Link to="/ponto/fechamento">Fechamento Mensal</Link>

            <Link to="/ponto/relatorios">Relatórios</Link>
          </div>
        </div>

        {/* ======================================================
            FINANCEIRO
        ====================================================== */}

        {canAccessFinance && (
          <div className="dropdown">
            <button className="dropbtn">Financeiro</button>

            <div className="dropdown-content">
              {canViewSalaries && (
                <Link to="/financeiro/salarios">Salários</Link>
              )}

              {canViewEvents && (
                <Link to="/financeiro/proventos-descontos">
                  Proventos e Descontos
                </Link>
              )}

              {canViewPayroll && (
                <Link to="/financeiro/folha">Folha de Pagamento</Link>
              )}

              {canViewAdvancedFinance && (
                <Link to="/financeiro/gestao">Gestão Financeira</Link>
              )}
            </div>
          </div>
        )}

        {/* ======================================================
            RELATÓRIOS
        ====================================================== */}

        <div className="dropdown">
          <button className="dropbtn">Relatórios</button>

          <div className="dropdown-content">
            <Link to="/relatorios">Relatórios de RH</Link>

            <Link to="/ponto/relatorios">Relatórios de Ponto</Link>
          </div>
        </div>

        {/* ======================================================
            ÁREA DO CANDIDATO
        ====================================================== */}

        <div className="dropdown">
          <button className="dropbtn">Área do Candidato</button>

          <div className="dropdown-content">
            {hasPermission('recruitment_view') && (
              <>
                <Link to="/candidatos">Visão geral</Link>
                <Link to="/candidatos?tab=vacancies">Cadastro de vagas</Link>
                <Link to="/candidatos?tab=vacancies">Vagas abertas</Link>
                <Link to="/candidatos?tab=candidates">Candidatos</Link>
                <Link to="/candidatos?tab=curriculums">Currículos</Link>
                <Link to="/candidatos?tab=stages">Etapas do processo seletivo</Link>
                <Link to="/candidatos?tab=interviews">Entrevistas</Link>
                <Link to="/candidatos?tab=conversion">Aprovação / reprovação</Link>
                <Link to="/candidatos?tab=conversion">Transformar candidato em funcionário</Link>
              </>
            )}
          </div>
        </div>

        {/* ======================================================
            ARQUIVO
        ====================================================== */}

        <div className="dropdown">
          <button className="dropbtn">Arquivo</button>

          <div className="dropdown-content">
            <Link to="#">Arquivo</Link>
          </div>
        </div>
      </div>

      {/* ========================================================
          PERFIL
      ======================================================== */}

      <div className="nav-profile" ref={profileRef}>
        <button
          type="button"
          className="nav-profile-button"
          onClick={handleProfileClick}
        >
          {userPhoto ? (
            <img src={userPhoto} alt={userName} className="nav-profile-photo" />
          ) : (
            <span className="nav-profile-initial">{userInitial}</span>
          )}

          <span className="nav-profile-name">{userName}</span>
        </button>

        {profileOpen && (
          <div className="nav-profile-menu">
            {hasPermission('profile_view') && (
              <Link to="/perfil" onClick={() => setProfileOpen(false)}>
                Meu perfil
              </Link>
            )}

            {hasPermission('password_change') && (
              <Link to="/alterar-senha" onClick={() => setProfileOpen(false)}>
                Alterar senha
              </Link>
            )}

            <button type="button" onClick={handleLogout}>
              Sair
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
