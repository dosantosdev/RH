import { useState, useEffect } from 'react'

export default function useTheme() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')

  useEffect(() => {
    function updateTheme() {
      setTheme(localStorage.getItem('theme') || 'light')
    }

    window.addEventListener('themeChange', updateTheme)

    return () => window.removeEventListener('themeChange', updateTheme)
  }, [])

  return theme
}
