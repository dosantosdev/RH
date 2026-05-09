import { Routes, Route } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/Login/Login'
import Dashboard from './pages/Dashboard/Dashboard'
import EmployeeSearch from './pages/EmployeeSearch/EmployeeSearch'
import EmployeeCreate from './pages/EmployeeCreate/EmployeeCreate'
import Roles from './pages/Roles/Roles'
import Users from './pages/Users/Users'

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
