import { useState, useEffect } from 'react'
import { getCurrentUser, initializeSystem } from './services/auth'
import { useState } from 'react'

// Importa páginas
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

// Importa função para pegar usuário logado
import { getCurrentUser } from './services/auth'

function App() {
  const [user, setUser] = useState(getCurrentUser())

  useEffect(() => {
    initializeSystem()
  }, [])

  return (
    <div>
      {!user ? (
        <Login setUser={setUser} />
      ) : (
        <Dashboard user={user} setUser={setUser} />
      )}
    </div>
  )
}


export default App