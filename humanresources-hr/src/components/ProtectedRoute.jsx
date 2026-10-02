import { Navigate } from 'react-router-dom'

import { hasPermission } from '../services/permissions'

export default function ProtectedRoute({ children, permission }) {
  const user = localStorage.getItem('loggedUser')

  /*
   * ============================================================
   * USUÁRIO NÃO AUTENTICADO
   * ============================================================
   *
   * Se não existir usuário logado, o acesso continua sendo
   * direcionado para a tela de login.
   */
  if (!user) {
    return <Navigate to="/" replace />
  }

  /*
   * ============================================================
   * VALIDAÇÃO DE PERMISSÃO
   * ============================================================
   *
   * Algumas rotas exigem uma permissão específica.
   *
   * Quando a rota não informa "permission", apenas verificamos
   * se o usuário está autenticado.
   */
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/dashboard" replace />
  }

  /*
   * Usuário autenticado e com a permissão necessária.
   */
  return children
}
