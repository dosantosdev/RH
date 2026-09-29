import { getEmployees } from './employee'
import { addMonths, differenceInDays, parseBrazilianDate } from '../utils/date'

export function getBirthdayEmployees(date = new Date()) {
  const currentMonth = date.getMonth() + 1

  return getEmployees()
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

export function getPeriodicExamAlerts(
  date = new Date(),
  alertWindowInDays = 30
) {
  return getEmployees()
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
