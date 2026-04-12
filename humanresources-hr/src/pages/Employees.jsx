import '../styles/employees.css'
import { useState, useEffect } from 'react'

import {
  getEmployees,
  addEmployee,
  deleteEmployee,
  updateEmployee
} from '../services/employee'

// 🔢 Só números
function onlyNumbers(value) {
  return value.replace(/\D/g, '')
}

// CPF
function formatCPF(value) {
  value = onlyNumbers(value).slice(0, 11)
  value = value.replace(/(\d{3})(\d)/, '$1.$2')
  value = value.replace(/(\d{3})(\d)/, '$1.$2')
  value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  return value
}

// Telefone
function formatPhone(value) {
  value = onlyNumbers(value).slice(0, 11)
  value = value.replace(/(\d{2})(\d)/, '($1) $2')
  value = value.replace(/(\d{5})(\d)/, '$1-$2')
  return value
}

// 🪪 RG com regra de estrangeiro
function formatRG(value, isForeigner) {
  // 🌍 Se for estrangeiro → permite letras e números
  if (isForeigner) {
    return value.slice(0, 15) // limite maior
  }

  // 🇧🇷 Se NÃO for estrangeiro → só números
  return value.replace(/\D/g, '').slice(0, 15)
}

// Data
function formatDate(value) {
  value = onlyNumbers(value).slice(0, 8)
  value = value.replace(/(\d{2})(\d)/, '$1/$2')
  value = value.replace(/(\d{2})(\d)/, '$1/$2')
  return value
}

function Employees({ user }) {
  const [employees, setEmployees] = useState([])

  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [rg, setRg] = useState('')
  // 🌍 Define se o funcionário é estrangeiro
  const [isForeigner, setIsForeigner] = useState(false)
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [role, setRole] = useState('')

  const [admissionDate, setAdmissionDate] = useState('')
  const [dismissalDate, setDismissalDate] = useState('')
  // 🧠 true = ativo | false = ex-funcionário
  const [isActive, setIsActive] = useState(true)

  const [editingEmployee, setEditingEmployee] = useState(null)

  const [search, setSearch] = useState('')
  // 🧠 Guarda o funcionário selecionado (quando clicar em "Ver detalhes")
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    setEmployees(getEmployees())
  }, [])

  // 💾 salvar
  function handleSaveEmployee() {
    // ⚠️ validação básica
    if (!name || !cpf) {
      alert('Preencha nome e CPF')
      return
    }

    const employeeData = {
      id: editingEmployee ? editingEmployee.id : Date.now(),
      name,
      cpf,
      rg,
      isForeigner,
      phone,
      email,
      address,
      role,
      admissionDate,
      dismissalDate,
      isActive,
    }

    if (editingEmployee) {
        updateEmployee(employeeData)

  // 🧠 Atualiza o funcionário selecionado na tela (IMPORTANTE)
        setSelectedEmployee(employeeData)

        setEditingEmployee(null)
    } else {
        addEmployee(employeeData)
    }

    setEmployees(getEmployees())

    // limpar
    setName('')
    setCpf('')
    setRg('')
    setPhone('')
    setEmail('')
    setAddress('')
    setRole('')
    setAdmissionDate('')
    setDismissalDate('')
    setIsActive(true)
    setIsForeigner(false) // 🌍 desmarca o checkbox após salvar
  }

  // ✏️ editar
  function handleEdit(emp) {
    setEditingEmployee(emp)

    setName(emp.name)
    setCpf(emp.cpf)
    setRg(emp.rg)
    setIsForeigner(emp.isForeigner || false)
    setPhone(emp.phone)
    setEmail(emp.email)
    setAddress(emp.address)
    setRole(emp.role)
    setAdmissionDate(emp.admissionDate || '')
    setDismissalDate(emp.dismissalDate || '')
    setIsActive(emp.isActive ?? true)
  }

  // 🗑️ excluir
  function handleDelete(id) {
    deleteEmployee(id)
    setEmployees(getEmployees())
  }

const filteredEmployees = employees.filter((emp) => {
  if (search.trim() === '') return false

  const searchLower = search.toLowerCase()

  return (
    (emp.name || '').toLowerCase().includes(searchLower) ||
    (emp.cpf || '').includes(search) ||
    (emp.phone || '').includes(search)
  )
})

   return (
     <div className="container">
       <h2>Funcionários</h2>
       <div className="form">
         <input
           placeholder="Buscar funcionário"
           value={search}
           onChange={(e) => setSearch(e.target.value)}
         />

         <br />
         <br />

         <input
           placeholder="Nome completo"
           value={name}
           onChange={(e) => setName(e.target.value)}
         />

         <input
           placeholder="CPF"
           value={cpf}
           onChange={(e) => setCpf(formatCPF(e.target.value))}
         />

         <input
           placeholder="RG"
           value={rg}
           onChange={(e) => setRg(formatRG(e.target.value, isForeigner))}
         />

         {/* 🌍 Checkbox de estrangeiro */}
         <label>
           <input
             type="checkbox"
             checked={isForeigner}
             onChange={(e) => setIsForeigner(e.target.checked)}
           />
           Estrangeiro
         </label>

         <input
           placeholder="Telefone"
           value={phone}
           onChange={(e) => setPhone(formatPhone(e.target.value))}
         />

         <input
           placeholder="Email"
           value={email}
           onChange={(e) => setEmail(e.target.value)}
         />

         <input
           placeholder="Endereço"
           value={address}
           onChange={(e) => setAddress(e.target.value)}
         />
       </div>

       <select value={role} onChange={(e) => setRole(e.target.value)}>
         <option value="">Selecione o cargo</option>
         <option value="auxiliar_escritorio">Auxiliar de Escritório</option>
         <option value="auxiliar_administrativo">
           Auxiliar Administrativo
         </option>
         <option value="motorista">Motorista</option>
         <option value="gestao_pessoas">Gestão de Pessoas</option>
       </select>

       <input
         placeholder="Data de Admissão"
         value={admissionDate}
         onChange={(e) => setAdmissionDate(formatDate(e.target.value))}
       />

       <input
         placeholder="Data de Demissão"
         value={dismissalDate}
         onChange={(e) => setDismissalDate(formatDate(e.target.value))}
       />
       {/* 👤 Status do funcionário */}
       <label>
         <input
           type="checkbox"
           checked={isActive}
           onChange={(e) => setIsActive(e.target.checked)}
         />
         Funcionário Ativo
       </label>

       <br />
       <br />

       <button onClick={handleSaveEmployee}>
         {editingEmployee ? "Atualizar" : "Cadastrar"}
       </button>

       <hr />
       {search !== "" && filteredEmployees.length === 0 && (
         <p>Nenhum funcionário encontrado</p>
       )}
       {/* 🧠 Só aparece se um funcionário foi selecionado */}
       {selectedEmployee && (
         <div className="details">
           <h3>Detalhes do Funcionário</h3>

           {/* 📋 Exibe TODOS os dados */}
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
             <strong>Endereço:</strong> {selectedEmployee.address}
           </p>
           <p>
             <strong>Cargo:</strong> {selectedEmployee.role}
           </p>
           <p>
             <strong>Status:</strong>{" "}
             {selectedEmployee.isActive ? "Ativo" : "Ex-funcionário"}
           </p>
           <p>
             <strong>Admissão:</strong> {selectedEmployee.admissionDate}
           </p>
           <p>
             <strong>Demissão:</strong> {selectedEmployee.dismissalDate}
           </p>

           {/* ✏️ Botão editar */}
           <button onClick={() => handleEdit(selectedEmployee)}>Editar</button>

           {/* 🗑️ Só admin ou gestão pode excluir */}
           {user && (user.role === "admin" || user.role === "gestao_rh") && (
             <button className="delete" onClick={() => handleDelete(emp.id)}>
               Excluir
             </button>
           )}

           <br />
           <br />

           {/* ❌ Fecha os detalhes */}
           <button onClick={() => setSelectedEmployee(null)}>Fechar</button>

           <hr />
         </div>
       )}
       <ul className="employee-list">
         {filteredEmployees.map((emp) => (
           <li key={emp.id} className="employee-card">
             {/* 🧾 Mostra só o básico */}
             <strong>{emp.name}</strong> - {emp.role}
             <br />
             {/* 👆 Ao clicar, salva o funcionário selecionado */}
             <button onClick={() => setSelectedEmployee(emp)}>
               Ver detalhes
             </button>
           </li>
         ))}
       </ul>
     </div>
   );
}

export default Employees