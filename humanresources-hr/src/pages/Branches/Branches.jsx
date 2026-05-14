import { useState, useEffect } from 'react'
import './branches.css'

import BranchForm from '../../components/branches/BranchForm'
import BranchList from '../../components/branches/BranchList'

import ConfirmModal from '../../components/ui/ConfirmModal'
import Toast from '../../components/ui/Toast'

import useToast from '../../hooks/useToast'

import { hasPermission } from '../../services/permissions'

export default function Branches() {
  const initialBranch = {
    name: '',
    cnpj: '',
    address: '',
    city: '',
    state: '',
    active: true
  }

  // 🔒 BLOQUEIA ACESSO À PÁGINA
  if (!hasPermission('branches_view')) {
    return <h2>Acesso negado</h2>
  }

  const [branch, setBranch] = useState(initialBranch)

  const [branches, setBranches] = useState([])

  const [search, setSearch] = useState('')

  const [editingId, setEditingId] = useState(null)

  const [deleteId, setDeleteId] = useState(null)

  const { toast, showToast } = useToast()

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('branches')) || []

    setBranches(stored)
  }, [])

  const filteredBranches = branches.filter((branch) =>
    branch.name?.toLowerCase().includes(search.toLowerCase())
  )

  function handleChange(e) {
    const { name, value, type, checked } = e.target

    setBranch({
      ...branch,

      [name]: type === 'checkbox' ? checked : value
    })
  }

  function handleSubmit(e) {
    e.preventDefault()

    // 🔒 BLOQUEIA CRIAÇÃO
    if (!editingId && !hasPermission('branches_create')) {
      showToast('Você não tem permissão para criar filiais', 'warning')

      return
    }

    // 🔒 BLOQUEIA EDIÇÃO
    if (editingId && !hasPermission('branches_edit')) {
      showToast('Você não tem permissão para editar filiais', 'warning')

      return
    }

    let updated

    if (editingId) {
      updated = branches.map((b) =>
        b.id === editingId
          ? {
              ...branch,
              id: editingId
            }
          : b
      )
    } else {
      const newBranch = {
        ...branch,

        id: Date.now()
      }

      updated = [...branches, newBranch]
    }

    localStorage.setItem('branches', JSON.stringify(updated))

    setBranches(updated)

    showToast(
      editingId ? 'Filial atualizada!' : 'Filial cadastrada!',
      'success'
    )

    setBranch(initialBranch)

    setEditingId(null)
  }

  function handleEdit(branch) {
    // 🔒 BLOQUEIA EDIÇÃO
    if (!hasPermission('branches_edit')) {
      showToast('Você não tem permissão para editar filiais', 'warning')

      return
    }

    setBranch(branch)

    setEditingId(branch.id)
  }

  function handleDelete(id) {
    // 🔒 BLOQUEIA EXCLUSÃO
    if (!hasPermission('branches_delete')) {
      showToast('Você não tem permissão para excluir filiais', 'warning')

      return
    }

    setDeleteId(id)
  }

  function confirmDeleteBranch() {
    const updated = branches.filter((b) => b.id !== deleteId)

    localStorage.setItem('branches', JSON.stringify(updated))

    setBranches(updated)

    setDeleteId(null)
  }

  return (
    <div className="roles-page">
      <BranchForm
        branch={branch}
        editingId={editingId}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
      />

      <div className="roles-search">
        <input
          type="text"
          placeholder="🔍 Buscar filial..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <BranchList
        branches={filteredBranches}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
      />

      <ConfirmModal
        isOpen={deleteId !== null}
        title="Excluir filial"
        message="Tem certeza que deseja excluir esta filial?"
        onConfirm={confirmDeleteBranch}
        onCancel={() => setDeleteId(null)}
      />

      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  )
}
