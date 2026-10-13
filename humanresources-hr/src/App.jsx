import EmployeeProfile from './pages/EmployeeProfile/EmployeeProfile'

import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { WorkspaceProvider, useWorkspace } from './contexts/WorkspaceContext'
import WorkspaceHost from './components/layout/WorkspaceHost'

import Navbar from './components/layout/Navbar'

import ProtectedRoute from './components/ProtectedRoute'

import Profile from './pages/Profile/Profile'

import ChangePassword from './pages/ChangePassword/ChangePassword'

import Login from './pages/Login/Login'

import Dashboard from './pages/Dashboard/Dashboard'

import EmployeeSearch from './pages/EmployeeSearch/EmployeeSearch'

import EmployeeCreate from './pages/EmployeeCreate/EmployeeCreate'

import Cargos from './pages/Organograma/Cargos/Cargos'

import Organograma from './pages/Organograma/Organograma/Organograma'

import Departamentos from './pages/Organograma/Departamentos/Departamentos'

import Users from './pages/Users/Users'

import AccessRoles from './pages/AccessRoles/AccessRoles'

import Filiais from './pages/Organograma/Filiais/Filiais'

import Settings from './pages/Settings/Settings'

import BaterPonto from './pages/Ponto/BaterPonto/BaterPonto'

import MeuEspelho from './pages/Ponto/MeuEspelho/MeuEspelho'

import ControlePonto from './pages/Ponto/ControlePonto/ControlePonto'

import BancoHoras from './pages/Ponto/BancoHoras/BancoHoras'

import HorasExtras from './pages/Ponto/HorasExtras/HorasExtras'

import FaltasAtrasos from './pages/Ponto/FaltasAtrasos/FaltasAtrasos'

import Atestados from './pages/Ponto/Atestados/Atestados'

import FechamentoMensal from './pages/Ponto/FechamentoMensal/FechamentoMensal'

import Relatorios from './pages/Ponto/Relatorios/Relatorios'

import Treinamentos from './pages/Treinamentos/Treinamentos'

import MeusTreinamentos from './pages/MeusTreinamentos/MeusTreinamentos'

import JornadasEscalas from './pages/Ponto/JornadasEscalas/JornadasEscalas'

import Avaliacoes from './pages/Avaliacoes/Avaliacoes'

import ModelosAvaliacao from './pages/Avaliacoes/ModelosAvaliacao'

import MinhasAvaliacoes from './pages/Avaliacoes/MinhasAvaliacoes'

import HistoricoAvaliacoes from './pages/Avaliacoes/HistoricoAvaliacoes'

import Salarios from './pages/Financeiro/Salarios/Salarios'

import ProventosDescontos from './pages/Financeiro/ProventosDescontos/ProventosDescontos'

import Folha from './pages/Financeiro/Folha/Folha'

import GestaoFinanceira from './pages/Financeiro/GestaoFinanceira'

import RelatoriosRH from './pages/Relatorios/Relatorios'

import Header from './components/layout/Header'

import Candidatos from './pages/Candidatos/Candidatos'
import Arquivo from './pages/Arquivo/Arquivo'
import CandidaturaPublica from './pages/Candidatos/CandidaturaPublica'

/*
 * ============================================================
 * LAYOUT PRINCIPAL
 * ============================================================
 *
 * Mantemos o Header e o Navbar em todas as páginas protegidas.
 *
 */

const WORKSPACE_ROUTE_TITLES = {
  '/dashboard': 'Dashboard',
  '/buscar': 'Buscar funcionários',
  '/cadastrar': 'Cadastro de funcionário',
  '/usuarios': 'Usuários',
  '/perfis-acesso': 'Perfis de acesso',
  '/organograma': 'Organograma',
  '/filiais': 'Filiais',
  '/departamentos': 'Departamentos',
  '/cargos': 'Cargos',
  '/treinamentos': 'Treinamentos',
  '/meus-treinamentos': 'Meus treinamentos',
  '/avaliacoes': 'Avaliações',
  '/avaliacoes/minhas': 'Minhas avaliações',
  '/avaliacoes/modelos': 'Modelos de avaliação',
  '/avaliacoes/historico': 'Histórico de avaliações',
  '/ponto/bater': 'Bater ponto',
  '/ponto/jornadas': 'Jornadas e escalas',
  '/ponto/espelho': 'Meu espelho',
  '/ponto/controle': 'Controle de ponto',
  '/ponto/banco-horas': 'Banco de horas',
  '/ponto/horas-extras': 'Horas extras',
  '/ponto/faltas-atrasos': 'Faltas e atrasos',
  '/ponto/atestados': 'Atestados',
  '/ponto/fechamento': 'Fechamento mensal',
  '/ponto/relatorios': 'Relatórios de ponto',
  '/financeiro/salarios': 'Salários',
  '/financeiro/proventos-descontos': 'Proventos e descontos',
  '/financeiro/folha': 'Folha de pagamento',
  '/financeiro/gestao': 'Gestão financeira',
  '/relatorios': 'Relatórios de RH',
  '/candidatos': 'Área do candidato',
  '/arquivo': 'Arquivo',
  '/configuracoes': 'Configurações',
}

function Layout({ children }) {
  const location = useLocation()
  const { registerTab } = useWorkspace()

  useEffect(() => {
    // Cada rota é registrada uma única vez. Ao retornar, a tela permanece montada.
    if (location.pathname === '/' || location.pathname === '/candidatura') {
      return
    }

    const title =
      WORKSPACE_ROUTE_TITLES[location.pathname] ||
      (location.pathname.startsWith('/funcionario/')
        ? 'Perfil do funcionário'
        : 'Human Resources HR')

    registerTab(location.pathname, title, children)
  }, [location.pathname, children, registerTab])

  return (
    <>
      <Header />
      <Navbar />
    </>
  )
}

/*
 * ============================================================
 * APLICAÇÃO
 * ============================================================
 */

function AppRoutes() {
  return (
    <Routes>
      {/* ======================================================
          LOGIN
      ====================================================== */}

      <Route path="/" element={<Login />} />

      {/* ======================================================
          DASHBOARD
      ====================================================== */}

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* ======================================================
          FUNCIONÁRIOS
      ====================================================== */}

      <Route
        path="/buscar"
        element={
          <ProtectedRoute permission="employees_view">
            <Layout>
              <EmployeeSearch />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/funcionario/:id"
        element={
          <ProtectedRoute permission="employees_view">
            <Layout>
              <EmployeeProfile />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/cadastrar"
        element={
          <ProtectedRoute permission="employees_create">
            <Layout>
              <EmployeeCreate />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* ======================================================
          ORGANOGRAMA
      ====================================================== */}

      <Route
        path="/cargos"
        element={
          <ProtectedRoute permission="roles_view">
            <Layout>
              <Cargos />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/organograma"
        element={
          <ProtectedRoute>
            <Layout>
              <Organograma />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/departamentos"
        element={
          <ProtectedRoute permission="departments_view">
            <Layout>
              <Departamentos />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/filiais"
        element={
          <ProtectedRoute permission="branches_view">
            <Layout>
              <Filiais />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* ======================================================
          USUÁRIOS
      ====================================================== */}

      <Route
        path="/usuarios"
        element={
          <ProtectedRoute permission="users_view">
            <Layout>
              <Users />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* ======================================================
          PERFIS DE ACESSO
      ====================================================== */}

      <Route
        path="/perfis-acesso"
        element={
          <ProtectedRoute permission="access_roles_view">
            <Layout>
              <AccessRoles />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* ======================================================
          PERFIL
      ====================================================== */}

      <Route
        path="/perfil"
        element={
          <ProtectedRoute permission="profile_view">
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/alterar-senha"
        element={
          <ProtectedRoute permission="password_change">
            <Layout>
              <ChangePassword />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* ======================================================
          TREINAMENTOS
      ====================================================== */}

      <Route
        path="/treinamentos"
        element={
          <ProtectedRoute permission="trainings_view">
            <Layout>
              <Treinamentos />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/meus-treinamentos"
        element={
          <ProtectedRoute permission="my_trainings_view">
            <Layout>
              <MeusTreinamentos />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* ======================================================
          AVALIAÇÕES
      ======================================================
      
      IMPORTANTE:
      Cada rota existe apenas UMA vez.

      /avaliacoes
        → Avaliações de desempenho

      /avaliacoes/minhas
        → Minhas avaliações

      /avaliacoes/modelos
        → Modelos de avaliação

      /avaliacoes/historico
        → Histórico

      ====================================================== */}

      <Route
        path="/avaliacoes"
        element={
          <ProtectedRoute>
            <Layout>
              <Avaliacoes />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/avaliacoes/minhas"
        element={
          <ProtectedRoute>
            <Layout>
              <MinhasAvaliacoes />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/avaliacoes/modelos"
        element={
          <ProtectedRoute>
            <Layout>
              <ModelosAvaliacao />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/avaliacoes/historico"
        element={
          <ProtectedRoute>
            <Layout>
              <HistoricoAvaliacoes />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* ============================================================
          PONTO
      ============================================================ */}

      <Route
        path="/ponto/bater"
        element={
          <ProtectedRoute>
            <Layout>
              <BaterPonto />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/ponto/jornadas"
        element={
          <ProtectedRoute permission="work_schedules_view">
            <Layout>
              <JornadasEscalas />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/ponto/espelho"
        element={
          <ProtectedRoute>
            <Layout>
              <MeuEspelho />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/ponto/controle"
        element={
          <ProtectedRoute>
            <Layout>
              <ControlePonto />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/ponto/banco-horas"
        element={
          <ProtectedRoute>
            <Layout>
              <BancoHoras />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/ponto/horas-extras"
        element={
          <ProtectedRoute>
            <Layout>
              <HorasExtras />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/ponto/faltas-atrasos"
        element={
          <ProtectedRoute>
            <Layout>
              <FaltasAtrasos />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/ponto/atestados"
        element={
          <ProtectedRoute>
            <Layout>
              <Atestados />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/ponto/fechamento"
        element={
          <ProtectedRoute>
            <Layout>
              <FechamentoMensal />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/ponto/relatorios"
        element={
          <ProtectedRoute>
            <Layout>
              <Relatorios />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* ============================================================
          FINANCEIRO
      ============================================================ */}

      <Route
        path="/financeiro/salarios"
        element={
          <ProtectedRoute permission="finance_salary_view">
            <Layout>
              <Salarios />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/financeiro/proventos-descontos"
        element={
          <ProtectedRoute permission="finance_events_view">
            <Layout>
              <ProventosDescontos />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/financeiro/folha"
        element={
          <ProtectedRoute permission="finance_payroll_view">
            <Layout>
              <Folha />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/financeiro/gestao"
        element={
          <ProtectedRoute permission="finance_payroll_view">
            <Layout>
              <GestaoFinanceira />
            </Layout>
          </ProtectedRoute>
        }
      />


      {/* ============================================================
          RELATÓRIOS GERAIS DE RH
      ============================================================ */}

      <Route
        path="/relatorios"
        element={
          <ProtectedRoute permission="reports_view">
            <Layout>
              <RelatoriosRH />
            </Layout>
          </ProtectedRoute>
        }
      />


      {/* ============================================================
          ÁREA DO CANDIDATO / RECRUTAMENTO
      ============================================================ */}

      <Route
        path="/candidatura"
        element={<CandidaturaPublica />}
      />

      <Route
        path="/candidatos"
        element={
          <ProtectedRoute permission="recruitment_view">
            <Layout>
              <Candidatos />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* ======================================================
          ARQUIVO
      ====================================================== */}

      <Route
        path="/arquivo"
        element={
          <ProtectedRoute permission="documents_view">
            <Layout>
              <Arquivo />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* ======================================================
          CONFIGURAÇÕES
      ====================================================== */}

      <Route
        path="/configuracoes"
        element={
          <ProtectedRoute>
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <WorkspaceProvider>
      <AppRoutes />
      <WorkspaceHost />
    </WorkspaceProvider>
  )
}

export default App
