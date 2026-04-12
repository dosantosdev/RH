// Importa o React (necessário para rodar JSX)
import React from 'react'

// Importa o ReactDOM para renderizar no navegador
import ReactDOM from 'react-dom/client'

// Importa o componente principal da aplicação
import App from './App.jsx'

// Renderiza o App dentro da div #root do index.html
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* StrictMode ajuda a identificar erros */}
    <App />
  </React.StrictMode>
)