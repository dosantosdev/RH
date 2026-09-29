export function hasPermission(permission) {
  const currentUser = JSON.parse(localStorage.getItem('loggedUser'))

  if (!currentUser) return false

  const roles = JSON.parse(localStorage.getItem('roles')) || []

  // Suporta tanto o formato atual (roleId) quanto usuários antigos (role).
  const role = roles.find(
    (item) =>
      item.id === currentUser.roleId ||
      item.id === Number(currentUser.roleId) ||
      item.name === currentUser.role ||
      item.name === currentUser.roleName
  )

  if (!role || role.active === false) return false

  // O cargo admin possui acesso total.
  if (role.name === 'admin' || role.permissions?.includes('all')) {
    return true
  }

  return role.permissions?.includes(permission) || false
}
