export function parseBrazilianDate(value) {
  if (!value) return null

  const [day, month, year] = value.split('/').map(Number)

  if (!day || !month || !year || year < 1900) return null

  const date = new Date(year, month - 1, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  date.setHours(0, 0, 0, 0)

  return date
}

export function addMonths(date, months) {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

export function differenceInDays(from, to) {
  const fromDate = new Date(from)
  const toDate = new Date(to)

  fromDate.setHours(0, 0, 0, 0)
  toDate.setHours(0, 0, 0, 0)

  return Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24))
}

export function isValidBrazilianDate(value) {
  return Boolean(parseBrazilianDate(value))
}
