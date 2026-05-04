import { useEffect } from 'react'
import ThemeToggle from '../components/ThemeToggle'
import logo from '../assets/logo.png'
import './header.css'

export default function Header() {
  return (
    <div className="header">
      <img src={logo} alt="Logo" className="header-logo" />
      <div className="header-right">
        <span>Sistema de RH</span>
        <ThemeToggle />
        <p>Gestão de Funcionários</p>
      </div>
    </div>
  )
}
