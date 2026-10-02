import EmployeeProfile from './pages/EmployeeProfile/EmployeeProfile'
import { Routes, Route } from 'react-router-dom'
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
import FechamentoMensal from './pages/Ponto/FechamentoMensal/FechamentoMensal'
import Relatorios from './pages/Ponto/Relatorios/Relatorios'

import Treinamentos from './pages/Treinamentos/Treinamentos'
import MeusTreinamentos from './pages/MeusTreinamentos/MeusTreinamentos'

import JornadasEscalas from './pages/Ponto/JornadasEscalas/JornadasEscalas'

import Header from './components/layout/Header'

function Layout({ children }) {
  return (
    <>
      <Header />
      <Navbar />
      {children}
    </>
  )
}

function App() {
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

      {/*
       * Gerenciar Treinamentos
       *
       * Esta rota exige explicitamente a permissão:
       *
       * trainings_view
       *
       * Portanto, somente usuários cujo perfil possui essa
       * permissão conseguem acessar esta tela.
       */}
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

      {/*
       * Meus Treinamentos
       *
       * Esta é uma permissão separada de Gerenciar Treinamentos.
       *
       * Um funcionário pode ter:
       *
       * my_trainings_view
       *
       * sem possuir:
       *
       * trainings_view
       *
       * Assim ele consegue realizar os treinamentos atribuídos
       * a ele, mas não consegue administrar os treinamentos
       * da empresa.
       */}
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
          PONTO
      ====================================================== */}

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

export default App
