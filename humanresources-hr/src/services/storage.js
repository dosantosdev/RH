export function getStoredArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key))
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export function getStoredObject(key, fallback = null) {
  try {
    const value = JSON.parse(localStorage.getItem(key))
    return value ?? fallback
  } catch {
    return fallback
  }
}

export function setStored(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function removeStored(key) {
  localStorage.removeItem(key)
}
