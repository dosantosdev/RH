import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  console.warn('JWT_SECRET is not configured. Set it in server/.env before production.')
}

export function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET || 'development-only-secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h'
  })
}

export function authenticate(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ message: 'Autenticação necessária.' })
  }

  try {
    req.user = jwt.verify(
      token,
      JWT_SECRET || 'development-only-secret'
    )
    return next()
  } catch {
    return res.status(401).json({ message: 'Sessão inválida ou expirada.' })
  }
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (req.user?.isAdmin) return next()

    const permissions = Array.isArray(req.user?.permissions)
      ? req.user.permissions
      : []

    if (!permissions.includes(permission)) {
      return res.status(403).json({ message: 'Permissão insuficiente.' })
    }

    return next()
  }
}
