export function hasPermission(permission) {
  const currentUser = JSON.parse(localStorage.getItem('loggedUser'))

  if (!currentUser) return false

  const roles = JSON.parse(localStorage.getItem('roles')) || []

  const role = roles.find((r) => r.id === currentUser.roleId)

  if (!role) return false

  return role.permissions?.includes(permission)
}
