import logo from '../../assets/logo-light.png'

import WeatherWidget from '../weather/WeatherWidget'

import './header.css'

export default function Header() {
  return (
    <header className="header">
      <div className="header-weather">
        <WeatherWidget />
      </div>

      <img src={logo} alt="Logo" className="header-logo" />

      <div className="header-right">
        <h2>Sistema de RH</h2>

        <p>Gestão de Funcionários</p>
      </div>
    </header>
  )
}
