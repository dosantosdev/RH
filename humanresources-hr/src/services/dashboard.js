export function getBirthdayEmployees() {
  const employees = JSON.parse(localStorage.getItem('employees')) || []

  const currentMonth = new Date().getMonth() + 1

  return employees
    .filter((employee) => {
      if (!employee.birthDate) return false

      const parts = employee.birthDate.split('/')

      const birthMonth = Number(parts[1])

      return birthMonth === currentMonth
    })
    .sort((a, b) => {
      const dayA = Number(a.birthDate.split('/')[0])
      const dayB = Number(b.birthDate.split('/')[0])

      return dayA - dayB
    })
}
