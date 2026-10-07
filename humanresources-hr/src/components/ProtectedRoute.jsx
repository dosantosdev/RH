import { Navigate, useLocation } from 'react-router-dom'

import { hasPermission } from '../services/permissions'

/*
 * ============================================================
 * PERMISSÕES DAS ROTAS DE AVALIAÇÃO
 * ============================================================
 *
 * Além da permissão definida diretamente no App, mantemos
 * esta proteção central para impedir que alguém simplesmente
 * digite a URL no navegador.
 */

const routePermissions = {
  '/avaliacoes': 'evaluations_view',

  '/avaliacoes/minhas': 'my_evaluations_view',

  '/avaliacoes/modelos': 'evaluation_models_view',

  '/avaliacoes/historico': 'evaluations_history_view'
}

export default function ProtectedRoute({ children, permission }) {
  const location = useLocation()

  const user = localStorage.getItem('loggedUser')

  /*
   * Usuário não autenticado.
   */
  if (!user) {
    return <Navigate to="/" replace />
  }

  /*
   * Permissão explícita da rota.
   */
  const routePermission = routePermissions[location.pathname]

  const requiredPermission = permission || routePermission

  /*
   * Usuário autenticado, mas sem a permissão necessária.
   */
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
