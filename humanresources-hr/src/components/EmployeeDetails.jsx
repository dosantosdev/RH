export default function EmployeeDetails({ selectedEmployee }) {
  if (!selectedEmployee) return null

  return (
    <div className="details">
      <h3>Detalhes do Funcionário</h3>

      <p>
        <strong>Nome:</strong> {selectedEmployee.name}
      </p>
      <p>
        <strong>CPF:</strong> {selectedEmployee.cpf}
      </p>
      <p>
        <strong>RG:</strong> {selectedEmployee.rg}
      </p>
      <p>
        <strong>Telefone:</strong> {selectedEmployee.phone}
      </p>
      <p>
        <strong>Email:</strong> {selectedEmployee.email}
      </p>

      <p>
        <strong>Cidade:</strong> {selectedEmployee.city}
      </p>
      <p>
        <strong>Estado:</strong> {selectedEmployee.state}
      </p>

      <p>
        <strong>Cargo:</strong> {selectedEmployee.role}
      </p>
      <p>
        <strong>Admissão:</strong> {selectedEmployee.admissionDate}
      </p>

      {selectedEmployee.photo && (
        <img
          src={selectedEmployee.photo}
          alt="Foto"
          style={{ width: '150px', marginTop: '10px' }}
        />
      )}
    </div>
  )
}
