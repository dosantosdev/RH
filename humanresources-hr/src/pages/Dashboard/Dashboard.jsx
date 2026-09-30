import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import './dashboard.css'

import {
  getBirthdayEmployees,
  getPeriodicExamAlerts
} from '../../services/dashboard'

import { hasPermission } from '../../services/permissions'

export default function Dashboard() {
  const [examAlerts, setExamAlerts] = useState([])

  const [birthdayEmployees, setBirthdayEmployees] = useState([])

  const navigate = useNavigate()

  useEffect(() => {
    setExamAlerts(getPeriodicExamAlerts())

    setBirthdayEmployees(getBirthdayEmployees())
  }, [])

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
            <button type="button">Editar perfil</button>

            <button type="button">Alterar senha</button>
          </div>
        </div>

        {/* TOPO DASHBOARD */}
        <div className="top-dashboard-cards">
          {/* ⚠️ CARD EXAMES */}
          <div className="exam-card">
            <div className="birthday-header">
              <h3>⚠️ Exames Periódicos</h3>

              <span>{examAlerts.length} alerta(s)</span>
            </div>

            <div className="birthday-list">
              {examAlerts.length > 0 ? (
                examAlerts.map((employee) => (
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

                      <p>
                        {employee.daysUntilExpiration === 0
                          ? 'Exame vence hoje'
                          : `Exame vence em ${employee.daysUntilExpiration} dia(s)`}
                      </p>
                    </div>
                  </div>
                ))
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
