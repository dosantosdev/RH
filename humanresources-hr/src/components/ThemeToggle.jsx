import { useState } from 'react'
import { toggleTheme } from '../utils/theme'

export default function ThemeToggle() {
  const [, setUpdate] = useState(0)

  function handleClick() {
    toggleTheme()
    setUpdate((prev) => prev + 1) // 👈 força atualização
  }

  return (
    <span className="theme-lamp" onClick={handleClick}>
      💡
    </span>
  )
}
