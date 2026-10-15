import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import './dashboard.css'

import {
  getBirthdayEmployees,
  getPeriodicExamAlerts
} from '../../services/dashboard'
import { apiRequest } from '../../services/api'
import { normalizeEmployee } from '../../services/employeeApi'
import { hasPermission } from '../../services/permissions'

import Turnover from './turnover/Turnover'

export default function Dashboard() {
  const [examAlerts, setExamAlerts] = useState([])
  const [birthdayEmployees, setBirthdayEmployees] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [linkedEmployee, setLinkedEmployee] = useState(null)
  const [employeeDataLoading, setEmployeeDataLoading] = useState(true)
  const [employeeDataError, setEmployeeDataError] = useState('')

  const navigate = useNavigate()
  const canViewEmployees = hasPermission('employees_view')
  const canViewBirthdays = hasPermission('dashboard_birthdays')

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      setEmployeeDataLoading(true)
      setEmployeeDataError('')

      try {
        // A identidade é consultada na API; o token determina o usuário e a empresa.
        const profileResult = await apiRequest('/me')
        const apiUser = profileResult?.user

        if (active && apiUser) {
          setCurrentUser({
            id: apiUser.id,
            name: apiUser.name || '',
            username: apiUser.username || '',
            email: apiUser.email || '',
            employeeId: apiUser.employee_id || null,
            roleName: apiUser.access_role_display_name || apiUser.access_role_name || 'Usuário',
            accessRoleName: apiUser.access_role_name || '',
            permissions: profileResult.permissions || [],
            isAdmin: Boolean(profileResult.isAdmin)
          })
        }

        // Dados pessoais e indicadores vêm da API PostgreSQL, não do cache local.
        if (!canViewEmployees) {
          if (active) {
            setExamAlerts([])
            setBirthdayEmployees([])
            setLinkedEmployee(null)
          }
          return
        }

        const employeeRows = await apiRequest('/employees')
        const employees = employeeRows.map(normalizeEmployee)

        if (!active) return

        const userEmployeeId = apiUser?.employee_id
        const linked = userEmployeeId
          ? employees.find((employee) => String(employee.id) === String(userEmployeeId))
          : null

        setLinkedEmployee(linked || null)
        setExamAlerts(getPeriodicExamAlerts(employees))
        setBirthdayEmployees(
          canViewBirthdays ? getBirthdayEmployees(employees) : []
        )
      } catch (error) {
        if (!active) return
        setEmployeeDataError(
          error.status === 403
            ? 'Seu perfil não tem permissão para consultar os dados de funcionários do painel.'
            : error.message || 'Não foi possível carregar os dados do painel.'
        )
        setExamAlerts([])
        setBirthdayEmployees([])
      } finally {
        if (active) setEmployeeDataLoading(false)
      }
    }

    loadDashboard()

    return () => {
      active = false
    }
  }, [canViewEmployees, canViewBirthdays])

  const displayName = linkedEmployee?.name || currentUser?.name || 'Usuário'
  const roleName = currentUser?.roleName || currentUser?.role || 'Usuário'
  const profilePhoto = linkedEmployee?.photo || null
  const userInitial = displayName.charAt(0).toUpperCase()

  return (
    <div className="container">
      <div className="dashboard-cards">
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
              <span>Último acesso: hoje</span>
            </div>
          </div>
        </div>

        {canViewEmployees && (
          <div className="exam-card">
            <div className="birthday-header">
              <h3>⚠️ Exames Periódicos</h3>
              <span>{employeeDataLoading ? 'Carregando...' : `${examAlerts.length} alerta(s)`}</span>
            </div>

            <div className="exam-list">
              {employeeDataError ? (
                <p className="no-exam">{employeeDataError}</p>
              ) : examAlerts.length > 0 ? (
                examAlerts.map((employee) => (
                  <div
                    key={employee.id}
                    className="exam-item clickable"
                    onClick={() => navigate(`/funcionario/${employee.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        navigate(`/funcionario/${employee.id}`)
                      }
                    }}
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
                <p className="no-exam">
                  {employeeDataLoading ? 'Carregando exames...' : 'Nenhum exame próximo'}
                </p>
              )}
            </div>
          </div>
        )}

        {canViewBirthdays && canViewEmployees && (
          <div className="birthday-card">
            <div className="birthday-header">
              <h3>🎂 Aniversariantes do Mês</h3>
              <span>
                {employeeDataLoading ? 'Carregando...' : `${birthdayEmployees.length} funcionário(s)`}
              </span>
            </div>

            <div className="birthday-grid">
              {employeeDataError ? (
                <p className="no-birthday">{employeeDataError}</p>
              ) : birthdayEmployees.length > 0 ? (
                birthdayEmployees.map((employee) => {
                  const firstName = employee.name.split(' ')[0]

                  return (
                    <div
                      key={employee.id}
                      className="birthday-person clickable"
                      onClick={() => navigate(`/funcionario/${employee.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          navigate(`/funcionario/${employee.id}`)
                        }
                      }}
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
                <p className="no-birthday">
                  {employeeDataLoading ? 'Carregando aniversariantes...' : 'Nenhum aniversariante este mês'}
                </p>
              )}
            </div>
          </div>
        )}

        {canViewEmployees && <Turnover />}
      </div>
    </div>
  )
}
