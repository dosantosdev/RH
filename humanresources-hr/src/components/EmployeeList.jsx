export default function EmployeeList({
  employees,
  setSelectedEmployee
}) {
  return (
    <ul className="employee-list">
      {employees.map((emp) => (
        <li key={emp.id} className="employee-card">
          <strong>{emp.name}</strong>

          <br />

          <button onClick={() => setSelectedEmployee(emp)}>
            Ver detalhes
          </button>
        </li>
      ))}
    </ul>
  )
}