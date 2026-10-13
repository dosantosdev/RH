import { useState, useEffect } from 'react'
import './filiais.css'
import BranchForm from '../../../components/branches/BranchForm'
import BranchList from '../../../components/branches/BranchList'
import ConfirmModal from '../../../components/ui/ConfirmModal'
import Toast from '../../../components/ui/Toast'
import useToast from '../../../hooks/useToast'
import { hasPermission } from '../../../services/permissions'
import { listBranches, createBranch, updateBranch, deleteBranch } from '../../../services/organizationApi'

const initialBranch = { name: '', cnpj: '', address: '', city: '', state: '', active: true }

export default function Branches() {
  const [branch, setBranch] = useState(initialBranch)
  const [branches, setBranches] = useState([])
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [loading, setLoading] = useState(true)
  const { toast, showToast } = useToast()

  async function loadBranches() {
    setLoading(true)
    try { setBranches(await listBranches()) }
    catch (error) { showToast(error.message || 'Não foi possível carregar as filiais.', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    let active = true
    listBranches().then((items) => { if (active) setBranches(items) })
      .catch((error) => { if (active) showToast(error.message || 'Não foi possível carregar as filiais.', 'error') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  if (!hasPermission('branches_view')) return <h2>Acesso negado</h2>
  const filteredBranches = branches.filter((item) => item.name?.toLowerCase().includes(search.toLowerCase()))

  function handleChange(event) {
    const { name, value, type, checked } = event.target
    setBranch((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!branch.name.trim()) { showToast('Informe o nome da filial.', 'warning'); return }
    if (!editingId && !hasPermission('branches_create')) { showToast('Você não tem permissão para criar filiais.', 'warning'); return }
    if (editingId && !hasPermission('branches_edit')) { showToast('Você não tem permissão para editar filiais.', 'warning'); return }
    const payload = { ...branch, name: branch.name.trim() }
    try {
      if (editingId) await updateBranch(editingId, payload)
      else await createBranch(payload)
      await loadBranches()
      showToast(editingId ? 'Filial atualizada!' : 'Filial cadastrada!', 'success')
      setBranch(initialBranch); setEditingId(null)
    } catch (error) { showToast(error.message || 'Não foi possível salvar a filial.', 'error') }
  }

  function handleEdit(item) {
    if (!hasPermission('branches_edit')) { showToast('Você não tem permissão para editar filiais.', 'warning'); return }
    setBranch({ ...initialBranch, ...item, cnpj: item.cnpj || item.document_number || '' })
    setEditingId(item.id)
  }

  function handleDelete(id) {
    if (!hasPermission('branches_delete')) { showToast('Você não tem permissão para excluir filiais.', 'warning'); return }
    setDeleteId(id)
  }

  async function confirmDeleteBranch() {
    try {
      await deleteBranch(deleteId)
      setDeleteId(null)
      await loadBranches()
      showToast('Filial excluída com sucesso!', 'success')
    } catch (error) { showToast(error.message || 'Não foi possível excluir a filial.', 'error'); setDeleteId(null) }
  }

  return <div className="roles-page">
    <BranchForm branch={branch} editingId={editingId} handleChange={handleChange} handleSubmit={handleSubmit} />
    <div className="roles-search"><input type="text" placeholder="🔍 Buscar filial..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
    {loading ? <p>Carregando filiais...</p> : <BranchList branches={filteredBranches} handleEdit={handleEdit} handleDelete={handleDelete} />}
    <ConfirmModal isOpen={deleteId !== null} title="Excluir filial" message="Tem certeza que deseja excluir esta filial?" onConfirm={confirmDeleteBranch} onCancel={() => setDeleteId(null)} />
    <Toast show={toast.show} message={toast.message} type={toast.type} />
  </div>
}
