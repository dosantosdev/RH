import { useEffect, useState } from 'react'
import { getStoredArray } from '../services/storage'

/** Mantém telas legadas sincronizadas com catálogos carregados pelas APIs PostgreSQL. */
export default function useOrganizationCache(key, transform = (items) => items) {
  const [items, setItems] = useState(() => transform(getStoredArray(key)))

  useEffect(() => {
    const refresh = (event) => {
      if (event?.detail?.key && event.detail.key !== key) return
      setItems(transform(getStoredArray(key)))
    }
    window.addEventListener('hr:organization-cache-updated', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('hr:organization-cache-updated', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [key, transform])

  return [items, setItems]
}
