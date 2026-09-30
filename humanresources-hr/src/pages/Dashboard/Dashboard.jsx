import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import './dashboard.css'

import {
  getBirthdayEmployees,
  getPeriodicExamAlerts
} from '../../services/dashboard'

import { hasPermission } from '../../services/permissions'

import Turnover from './turnover/Turnover'

export default function Dashboard() {
  const [examAlerts, setExamAlerts] = useState([])
  const [birthdayEmployees, setBirthdayEmployees] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [linkedEmployee, setLinkedEmployee] = useState(null)

  const navigate = useNavigate()

  useEffect(() => {
    setExamAlerts(getPeriodicExamAlerts())
    setBirthdayEmployees(getBirthdayEmployees())

    const loggedUser = JSON.parse(localStorage.getItem('loggedUser'))

    setCurrentUser(loggedUser)

    if (loggedUser?.employeeId) {
      const employees = JSON.parse(localStorage.getItem('employees')) || []

      const employee = employees.find(
        (item) => item.id === Number(loggedUser.employeeId)
      )

      setLinkedEmployee(employee || null)
    }
  }, [])

  /* =====================================================
     INFORMAÇÕES DO USUÁRIO
  ===================================================== */

  const displayName = linkedEmployee?.name || currentUser?.name || 'Usuário'

  const roleName = currentUser?.roleName || currentUser?.role || 'Usuário'

  const profilePhoto = linkedEmployee?.photo || currentUser?.photo || null

  const userInitial = displayName.charAt(0).toUpperCase()

  return (
    <div className="container">
      <div className="dashboard-cards">
        {/* =====================================================
            CARD DE BOAS-VINDAS
        ===================================================== */}

        <div className="profile-card">
          <div className="profile-left">
            <div className="profile-avatar">
              {profilePhoto ? (
                <img src={profilePhoto} alt={displayName} />
              ) : (
                userInitial
              )}
            </div>

            <div className="profile-info">
              <h2>Bem-vindo(a), {displayName.split(' ')[0]}!</h2>

              <p>{roleName}</p>

              <span>Último acesso: hoje às 14:32</span>
            </div>
          </div>
        </div>

        {/* =====================================================
            CARD DE EXAMES PERIÓDICOS
        ===================================================== */}

        <div className="exam-card">
          <div className="birthday-header">
            <h3>⚠️ Exames Periódicos</h3>

            <span>{examAlerts.length} alerta(s)</span>
          </div>

          <div className="exam-list">
            {examAlerts.length > 0 ? (
              examAlerts.map((employee) => (
                <div
                  key={employee.id}
                  className="exam-item clickable"
                  onClick={() => navigate(`/funcionario/${employee.id}`)}
                >
                  <div className="exam-avatar">
                    {employee.photo ? (
                      <img src={employee.photo} alt={employee.name} />
                    ) : (
                      employee.name.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="exam-info">
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
              <p className="no-exam">Nenhum exame próximo</p>
            )}
          </div>
        </div>

        {/* =====================================================
            CARD DE ANIVERSARIANTES
        ===================================================== */}

        {hasPermission('dashboard_birthdays') && (
          <div className="birthday-card">
            <div className="birthday-header">
              <h3>🎂 Aniversariantes do Mês</h3>

              <span>{birthdayEmployees.length} funcionário(s)</span>
            </div>

            <div className="birthday-grid">
              {birthdayEmployees.length > 0 ? (
                birthdayEmployees.map((employee) => {
                  const firstName = employee.name.split(' ')[0]

                  return (
                    <div
                      key={employee.id}
                      className="birthday-person clickable"
                      onClick={() => navigate(`/funcionario/${employee.id}`)}
                    >
                      <div className="birthday-avatar">
                        {employee.photo ? (
                          <img src={employee.photo} alt={firstName} />
                        ) : (
                          firstName.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div className="birthday-info">
                        <strong title={firstName}>{firstName}</strong>

                        <p>{employee.birthDate}</p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="no-birthday">Nenhum aniversariante este mês</p>
              )}
            </div>
          </div>
        )}

        {/* =====================================================
            CARD DE TURNOVER
        ===================================================== */}

        <Turnover />
      </div>
    </div>
  )
}
