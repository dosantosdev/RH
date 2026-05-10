import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './dashboard.css'
import { getBirthdayEmployees } from '../../services/dashboard'
import sol from '../../assets/sol.png'
import chuva from '../../assets/chuva.png'
import nublado from '../../assets/nublado.png'
import { hasPermission } from '../../services/permissions'

export default function Dashboard({ setSelectedEmployee }) {
  const [weather, setWeather] = useState(null)
  const birthdayEmployees = getBirthdayEmployees()
  const navigate = useNavigate()

  useEffect(() => {
    fetch(
      'https://api.weatherapi.com/v1/current.json?key=0274017409e24f7b9da21350260305&q=Sao Lourenco do Sul&lang=pt'
    )
      .then((res) => res.json())
      .then((data) => setWeather(data))
      .catch((err) => console.error(err))
  }, [])

  function getWeatherBackground() {
    const condition = weather?.current?.condition?.text?.toLowerCase() || ''

    if (condition.includes('chuva')) {
      return chuva
    }

    if (condition.includes('nublado') || condition.includes('nuvem')) {
      return nublado
    }

    return sol
  }

  return (
    <div className="container">
      <div className="dashboard-cards">
        {/* 🌤️ CARD CLIMA */}
        {hasPermission('dashboard_weather') && (
          <div
            className="weather-card"
            style={{
              backgroundImage: `url(${getWeatherBackground()})`
            }}
          >
            <h3>Previsão do tempo</h3>

            {!weather && <p>Carregando...</p>}

            {weather && (
              <>
                <p className="temp">{weather.current.temp_c}°C</p>

                <p className="condition">{weather.current.condition.text}</p>

                <p className="location">📍 {weather.location.name}</p>
              </>
            )}
          </div>
        )}

        {/* 🎂 CARD ANIVERSÁRIOS */}
        {hasPermission('dashboard_birthdays') && (
          <div className="birthday-card">
            <div className="birthday-header">
              <h3>🎂 Aniversariantes do Mês</h3>

              <span>{birthdayEmployees.length} funcionário(s)</span>
            </div>

            <div className="birthday-list">
              {birthdayEmployees.length > 0 ? (
                birthdayEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="birthday-item clickable"
                    onClick={() => navigate(`/funcionario/${employee.id}`)}
                  >
                    <div className="birthday-avatar">
                      {employee.photo ? (
                        <img src={employee.photo} alt={employee.name} />
                      ) : (
                        employee.name.charAt(0)
                      )}
                    </div>

                    <div className="birthday-info">
                      <strong>{employee.name}</strong>

                      <p>{employee.birthDate}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-birthday">Nenhum aniversariante este mês</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
