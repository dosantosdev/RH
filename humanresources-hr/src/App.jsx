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
import Roles from './pages/Roles/Roles'
import Users from './pages/Users/Users'
import Branches from './pages/branches/Branches'
import Settings from './pages/Settings/Settings'
import BaterPonto from './pages/Ponto/BaterPonto/BaterPonto'
import MeuEspelho from './pages/Ponto/MeuEspelho/MeuEspelho'
import ControlePonto from './pages/Ponto/ControlePonto/ControlePonto'
import BancoHoras from './pages/Ponto/BancoHoras/BancoHoras'
import HorasExtras from './pages/Ponto/HorasExtras/HorasExtras'
import FaltasAtrasos from './pages/Ponto/FaltasAtrasos/FaltasAtrasos'
import FechamentoMensal from './pages/Ponto/FechamentoMensal/FechamentoMensal'
import Relatorios from './pages/Ponto/Relatorios/Relatorios'

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
      {/* LOGIN */}

      <Route path="/" element={<Login />} />

      {/* ROTAS PROTEGIDAS */}

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

      <Route
        path="/buscar"
        element={
          <ProtectedRoute>
            <Layout>
              <EmployeeSearch />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/funcionario/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <EmployeeProfile />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/cadastrar"
        element={
          <ProtectedRoute>
            <Layout>
              <EmployeeCreate />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/cargos"
        element={
          <ProtectedRoute>
            <Layout>
              <Roles />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/usuarios"
        element={
          <ProtectedRoute>
            <Layout>
              <Users />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/filiais"
        element={
          <ProtectedRoute>
            <Layout>
              <Branches />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/perfil"
        element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/alterar-senha"
        element={
          <ProtectedRoute>
            <Layout>
              <ChangePassword />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* PONTO */}

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

      {/* CONFIGURAÇÕES */}

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
