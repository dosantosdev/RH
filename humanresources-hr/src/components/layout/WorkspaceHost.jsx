import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import './workspace.css'

const ROUTE_TITLES = {
  '/dashboard': 'Dashboard',
  '/buscar': 'Buscar funcionários',
  '/cadastrar': 'Cadastro de funcionário',
  '/usuarios': 'Usuários',
  '/perfis-acesso': 'Perfis de acesso',
  '/organograma': 'Organograma',
  '/filiais': 'Filiais',
  '/departamentos': 'Departamentos',
  '/cargos': 'Cargos',
  '/treinamentos': 'Treinamentos',
  '/meus-treinamentos': 'Meus treinamentos',
  '/avaliacoes': 'Avaliações',
  '/avaliacoes/minhas': 'Minhas avaliações',
  '/avaliacoes/modelos': 'Modelos de avaliação',
  '/avaliacoes/historico': 'Histórico de avaliações',
  '/ponto/bater': 'Bater ponto',
  '/ponto/jornadas': 'Jornadas e escalas',
  '/ponto/espelho': 'Meu espelho',
  '/ponto/controle': 'Controle de ponto',
  '/ponto/banco-horas': 'Banco de horas',
  '/ponto/horas-extras': 'Horas extras',
  '/ponto/faltas-atrasos': 'Faltas e atrasos',
  '/ponto/atestados': 'Atestados',
  '/ponto/fechamento': 'Fechamento mensal',
  '/ponto/relatorios': 'Relatórios de ponto',
  '/financeiro/salarios': 'Salários',
  '/financeiro/proventos-descontos': 'Proventos e descontos',
  '/financeiro/folha': 'Folha de pagamento',
  '/financeiro/gestao': 'Gestão financeira',
  '/relatorios': 'Relatórios de RH',
  '/candidatos': 'Área do candidato',
  '/arquivo': 'Arquivo',
  '/configuracoes': 'Configurações',
}


export default function WorkspaceHost() {
  const location = useLocation()
  const navigate = useNavigate()
  const { tabs, activePath, activateTab, closeTab, clearTabs } = useWorkspace()

  // Limpa telas em memória ao sair da sessão e não mostra abas nas rotas públicas.
  useEffect(() => {
    const loggedUser = localStorage.getItem('loggedUser')

    if (location.pathname === '/' || !loggedUser) {
      clearTabs()
      return
    }

    if (location.pathname !== '/candidatura') {
      activateTab(location.pathname)
    }
  }, [location.pathname, activateTab, clearTabs])

  function handleActivate(path) {
    activateTab(path)
    navigate(path)
  }

  function handleClose(event, path) {
    event.stopPropagation()
    const wasActive = path === activePath
    const index = tabs.findIndex((tab) => tab.path === path)
    closeTab(path)

    if (wasActive) {
      const remaining = tabs.filter((tab) => tab.path !== path)
      const nextTab = remaining[Math.min(index, remaining.length - 1)] || null
      navigate(nextTab?.path || '/dashboard')
    }
  }

  if (location.pathname === '/' || location.pathname === '/candidatura') return null
  if (!tabs.length) return null

  return (
    <section className="workspace-shell" aria-label="Área de trabalho">
      <div className="workspace-tabs" role="tablist" aria-label="Telas abertas">
        {tabs.map((tab) => (
          <button
            key={tab.path}
            type="button"
            role="tab"
            aria-selected={tab.path === activePath}
            className={`workspace-tab ${tab.path === activePath ? 'is-active' : ''}`}
            onClick={() => handleActivate(tab.path)}
            title={tab.title}
          >
            <span className="workspace-tab-title">{tab.title}</span>
            <span
              className="workspace-tab-close"
              role="button"
              tabIndex={0}
              aria-label={`Fechar ${tab.title}`}
              onClick={(event) => handleClose(event, tab.path)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  handleClose(event, tab.path)
                }
              }}
            >
              ×
            </span>
          </button>
        ))}
      </div>

      <div className="workspace-panels">
        {tabs.map((tab) => (
          <div
            key={tab.path}
            className={`workspace-panel ${tab.path === activePath ? 'is-active' : ''}`}
            role="tabpanel"
            hidden={tab.path !== activePath}
          >
            {tab.element}
          </div>
        ))}
      </div>
    </section>
  )
}
