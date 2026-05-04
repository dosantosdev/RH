import { useEffect, useState } from 'react'
import './dashboard.css'

export default function Dashboard() {
  const [weather, setWeather] = useState(null)

  useEffect(() => {
    fetch(
      'https://api.weatherapi.com/v1/current.json?key=0274017409e24f7b9da21350260305&q=Sao Lourenco do Sul&lang=pt'
    )
      .then((res) => res.json())
      .then((data) => setWeather(data))
      .catch((err) => console.error(err))
  }, [])

  return (
    <div className="container">
      <div className="dashboard-cards">
        {/* 🌤️ CARD CLIMA */}
        <div
          className={`weather-card ${
            weather?.current?.is_day === 1 ? 'day' : 'night'
          }`}
        >
          <h3>Previsão do tempo</h3>

          {!weather && <p>Carregando...</p>}

          {weather && (
            <>
              <div className="weather-icon-top">
                {/* DIA */}
                {weather?.current?.is_day === 1 && (
                  <>
                    {(weather?.current?.condition?.text
                      ?.toLowerCase()
                      .includes('sol') ||
                      weather?.current?.condition?.text
                        ?.toLowerCase()
                        .includes('limpo')) && <div className="sun"></div>}

                    {weather?.current?.condition?.text
                      ?.toLowerCase()
                      .includes('nublado') && <div className="cloud"></div>}
                  </>
                )}

                {/* NOITE */}
                {weather?.current?.is_day === 0 && (
                  <>
                    {weather?.current?.condition?.text
                      ?.toLowerCase()
                      .includes('limpo') && <div className="moon"></div>}

                    {weather?.current?.condition?.text
                      ?.toLowerCase()
                      .includes('nublado') && (
                      <div className="cloud-night"></div>
                    )}
                  </>
                )}

                {/* CHUVA */}
                {weather?.current?.condition?.text
                  ?.toLowerCase()
                  .includes('chuva') && <div className="rain"></div>}
              </div>

              <p className="location">📍 {weather.location.name}</p>

              <p className="temp">{weather.current.temp_c}°C</p>

              <p className="condition">{weather.current.condition.text}</p>
            </>
          )}
        </div>

        {/* 🎂 CARD ANIVERSÁRIOS */}
        <div className="birthday-card">
          <h3>🎂 Aniversariantes do mês</h3>

          <ul>
            <li>
              <strong>Maria</strong> - 05/05
            </li>
            <li>
              <strong>João</strong> - 12/05
            </li>
            <li>
              <strong>Ana</strong> - 28/05
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
