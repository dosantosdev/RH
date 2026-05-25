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

  const [examAlerts, setExamAlerts] = useState([])

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

  // ⚠️ ALERTAS EXAMES

  useEffect(() => {
    const employees = JSON.parse(localStorage.getItem('employees')) || []

    const today = new Date()

    const alerts = employees.filter((employee) => {
      if (!employee.periodicExamDate) return false

      const [day, month, year] = employee.periodicExamDate.split('/')

      const examDate = new Date(`${year}-${month}-${day}`)

      // +6 meses

      const expirationDate = new Date(examDate)

      expirationDate.setMonth(expirationDate.getMonth() + 6)

      // diferença dias

      const diffTime = expirationDate - today

      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      // alerta 30 dias antes

      return diffDays <= 30 && diffDays >= 0
    })

    setExamAlerts(alerts)
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
        {/* 👤 PERFIL */}

        <div className="profile-card">
          <div className="profile-left">
            <div className="profile-avatar">D</div>

            <div className="profile-info">
              <h2>Bem-vindo(a), Dev! 👋</h2>

              <p>Administrador(a) do sistema</p>

              <span>Último acesso: hoje às 14:32</span>
            </div>
          </div>

          <div className="profile-actions">
            <button>Editar perfil</button>

            <button>Alterar senha</button>
          </div>
        </div>
        {/* TOPO DASHBOARD */}

        <div className="top-dashboard-cards">
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
                  <p className="temp">
                    {weather.current.temp_c}
                    °C
                  </p>

                  <p className="condition">{weather.current.condition.text}</p>

                  <p className="location">📍 {weather.location.name}</p>
                </>
              )}
            </div>
          )}

          {/* ⚠️ CARD EXAMES */}

          <div className="exam-card">
            <div className="birthday-header">
              <h3>⚠️ Exames Periódicos</h3>

              <span>{examAlerts.length} alerta(s)</span>
            </div>

            <div className="birthday-list">
              {examAlerts.length > 0 ? (
                examAlerts.map((employee) => {
                  const [day, month, year] =
                    employee.periodicExamDate.split('/')

                  const examDate = new Date(`${year}-${month}-${day}`)

                  const expirationDate = new Date(examDate)

                  expirationDate.setMonth(expirationDate.getMonth() + 6)

                  const today = new Date()

                  const diffTime = expirationDate - today

                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

                  return (
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

                        <p>Exame vence em {diffDays} dia(s)</p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="no-birthday">Nenhum exame próximo</p>
              )}
            </div>
          </div>
        </div>

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
