import { addMonths, differenceInDays, parseBrazilianDate } from '../utils/date'

/**
 * Calcula os aniversariantes a partir dos funcionários carregados pela API.
 * A função não lê mais localStorage: a lista recebida deve vir do PostgreSQL.
 */
export function getBirthdayEmployees(employees = [], date = new Date()) {
  const currentMonth = date.getMonth() + 1

  return employees
    .filter((employee) => {
      const birthDate = parseBrazilianDate(employee.birthDate)
      return birthDate && birthDate.getMonth() + 1 === currentMonth
    })
    .sort((a, b) => {
      const dayA = parseBrazilianDate(a.birthDate)?.getDate() || 0
      const dayB = parseBrazilianDate(b.birthDate)?.getDate() || 0
      return dayA - dayB
    })
}

/**
 * Calcula alertas de exame periódico a partir dos dados atuais da API.
 */
export function getPeriodicExamAlerts(
  employees = [],
  date = new Date(),
  alertWindowInDays = 30
) {
  return employees
    .map((employee) => {
      const examDate = parseBrazilianDate(employee.periodicExamDate)
      if (!examDate) return null

      const expirationDate = addMonths(examDate, 6)
      const daysUntilExpiration = differenceInDays(date, expirationDate)

      if (daysUntilExpiration < 0 || daysUntilExpiration > alertWindowInDays) {
        return null
      }

      return {
        ...employee,
        examExpirationDate: expirationDate,
        daysUntilExpiration
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration)
}
