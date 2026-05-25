import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { BrowserRouter } from 'react-router-dom'

import './index.css'
import './styles/forms.css'
import './styles/cards.css'
import './styles/buttons.css'
import './styles/search.css'
import './styles/sections.css'

import { defaultCertificates } from './data/defaultCertificates'

if (!localStorage.getItem('certificates')) {
  localStorage.setItem('certificates', JSON.stringify(defaultCertificates))
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
