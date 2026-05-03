import logo from '../assets/logo.png'
import './header.css'

export default function Header() {
  return (
    <div className="header">
      <img src={logo} alt="Logo" className="header-logo" />

      <div className="header-info">
        <h2>Sistema de RH</h2>
        <p>Gestão de Funcionários</p>
      </div>
    </div>
  )
}
