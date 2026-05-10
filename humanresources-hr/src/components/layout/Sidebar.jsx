import { Link } from 'react-router-dom'

import './sidebar.css'

import { hasPermission } from '../../services/permissions'

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {hasPermission('employees_view') && (
          <Link to="/buscar">Funcionários</Link>
        )}

        {hasPermission('roles_view') && <Link to="/cargos">Cargos</Link>}

        {hasPermission('users_view') && <Link to="/usuarios">Usuários</Link>}
      </nav>
    </aside>
  )
}
