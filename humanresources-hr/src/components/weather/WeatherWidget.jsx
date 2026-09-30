import { useEffect, useState } from 'react'

import './weatherWidget.css'

import sol from '../../assets/sol.png'
import chuva from '../../assets/chuva.png'
import nublado from '../../assets/nublado.png'

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null)

  useEffect(() => {
    fetch(
      'https://api.weatherapi.com/v1/current.json?key=0274017409e24f7b9da21350260305&q=Sao Lourenco do Sul&lang=pt'
    )
      .then((res) => res.json())
      .then((data) => setWeather(data))
      .catch((err) => console.error(err))
  }, [])

  function getWeatherIcon() {
    const condition = weather?.current?.condition?.text?.toLowerCase() || ''

    if (condition.includes('chuva')) {
      return chuva
    }

    if (condition.includes('nublado') || condition.includes('nuvem')) {
      return nublado
    }

    return sol
  }

  if (!weather) {
    return (
      <div className="weather-widget">
        <span className="weather-loading">Carregando clima...</span>
      </div>
    )
  }

  return (
    <div className="weather-widget">
      <img
        src={getWeatherIcon()}
        alt={weather.current.condition.text}
        className="weather-widget-icon"
      />

      <div className="weather-widget-info">
        <strong>{weather.current.temp_c}°C</strong>

        <span>{weather.current.condition.text}</span>

        <small>📍 {weather.location.name}</small>
      </div>
    </div>
  )
}
