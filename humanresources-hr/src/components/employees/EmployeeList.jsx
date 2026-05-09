import './employeeList.css'

export default function EmployeeList({ employees, onSelect }) {
  return (
    <div className="employee-list">
      {employees.map((emp, index) => (
        <div
          key={index}
          className="employee-item"
          onClick={() => onSelect(emp)}
        >
          {emp.name}
        </div>
      ))}

      {employees.length === 0 && <p>Nenhum funcionário encontrado</p>}
    </div>
  )
}
