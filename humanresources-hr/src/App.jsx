import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { getCurrentUser, initializeSystem } from './services/auth'

function App() {
  const [user, setUser] = useState(getCurrentUser())

  // Inicializa admin automaticamente
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