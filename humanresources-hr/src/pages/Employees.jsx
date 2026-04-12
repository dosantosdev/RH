import { useState, useEffect } from 'react'

// Importa funções do serviço
import { getEmployees, addEmployee } from '../services/employee'

// 🔢 Remove tudo que NÃO for número
function onlyNumbers(value) {
  return value.replace(/\D/g, '')
}

// 🧾 Formata CPF: 111.111.111-11
function formatCPF(value) {
  value = onlyNumbers(value)

  value = value.slice(0, 11) // limita a 11 números

  value = value.replace(/(\d{3})(\d)/, '$1.$2')
  value = value.replace(/(\d{3})(\d)/, '$1.$2')
  value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2')

  return value
}

// 📞 Formata telefone: (053) 99911-1111
function formatPhone(value) {
  value = onlyNumbers(value)

  value = value.slice(0, 11) // limita a 11 números

  value = value.replace(/(\d{2})(\d)/, '($1) $2')
  value = value.replace(/(\d{5})(\d)/, '$1-$2')

  return value
}

// 🪪 RG (somente números, sem máscara por enquanto)
function formatRG(value) {
  value = onlyNumbers(value)

  return value.slice(0, 10) // limite básico
}

function Employees() {
  // 🧠 Lista de funcionários
  const [employees, setEmployees] = useState([])

  // 🧠 Estados do formulário (cada campo = um estado)
  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [rg, setRg] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [role, setRole] = useState('')

  // 🔍 Campo de busca
  const [search, setSearch] = useState('')

  // 🚀 Carrega funcionários ao abrir página
  useEffect(() => {
    setEmployees(getEmployees())
  }, [])

  // 🧑‍💼 Função para cadastrar funcionário
  function handleAddEmployee() {
    const newEmployee = {
      id: Date.now(), // ID único

      // 📋 Dados do funcionário
      name,
      cpf,
      rg,
      phone,
      email,
      address,
      role
    }

    // Salva
    addEmployee(newEmployee)

    // Atualiza lista
    setEmployees(getEmployees())

    // 🧹 Limpa formulário
    setName('')
    setCpf('')
    setRg('')
    setPhone('')
    setEmail('')
    setAddress('')
    setRole('')
  }

  // 🔍 Filtro por nome
  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <h2>Funcionários</h2>

      {/* 🔍 BUSCA */}
      <input
        placeholder="Buscar funcionário"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <br />
      <br />

      {/* 🧾 FORMULÁRIO */}

      {/* 📌 Nome */}
      <input
        placeholder="Nome completo"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {/* 📌 CPF */}
      <input
        placeholder="CPF"
        value={cpf}
        onChange={(e) => setCpf(formatCPF(e.target.value))}
      />
      {/* 📌 RG */}
      <input
        placeholder="RG"
        value={rg}
        onChange={(e) => setRg(formatRG(e.target.value))}
      />

      {/* 📌 Telefone */}
      <input
        placeholder="Telefone"
        value={phone}
        onChange={(e) => setPhone(formatPhone(e.target.value))}
      />

      {/* 📌 Email */}
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      {/* 📌 Endereço */}
      <input
        placeholder="Endereço"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />

      {/* 🏢 Cargo */}
      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="">Selecione o cargo</option>
        <option value="auxiliar_escritorio">Auxiliar de Escritório</option>
        <option value="auxiliar_administrativo">Auxiliar Administrativo</option>
        <option value="motorista">Motorista</option>
        <option value="gestao_pessoas">Gestão de Pessoas</option>
      </select>

      <br />
      <br />

      <button onClick={handleAddEmployee}>Cadastrar Funcionário</button>

      <hr />

      {/* 📋 LISTA */}
      <ul>
        {filteredEmployees.map((emp) => (
          <li key={emp.id}>
            <strong>{emp.name}</strong> - {emp.role}
            <br />
            CPF: {emp.cpf} | Tel: {emp.phone}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Employees