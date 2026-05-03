import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import EmployeeSearch from './pages/EmployeeSearch'
import EmployeeCreate from './pages/EmployeeCreate'
import Roles from './pages/Roles'
import Users from './pages/Users'

import Header from './components/Header'

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
    </Routes>
  )
}

export default App
