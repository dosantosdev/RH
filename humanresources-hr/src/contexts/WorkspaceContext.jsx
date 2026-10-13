import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const WorkspaceContext = createContext(null)

export function WorkspaceProvider({ children }) {
  const [tabs, setTabs] = useState([])
  const [activePath, setActivePath] = useState('/dashboard')

  const registerTab = useCallback((path, title, element) => {
    setTabs((currentTabs) => {
      const existingTab = currentTabs.find((tab) => tab.path === path)

      if (existingTab) {
        // Atualiza o elemento sem criar uma segunda aba para a mesma rota.
        return currentTabs.map((tab) =>
          tab.path === path ? { ...tab, title, element } : tab,
        )
      }

      return [...currentTabs, { path, title, element }]
    })
    setActivePath(path)
  }, [])

  const activateTab = useCallback((path) => {
    setActivePath(path)
  }, [])

  const closeTab = useCallback((path) => {
    setTabs((currentTabs) => currentTabs.filter((tab) => tab.path !== path))
  }, [])

  const clearTabs = useCallback(() => {
    setTabs([])
    setActivePath('/dashboard')
  }, [])

  const value = useMemo(
    () => ({
      tabs,
      activePath,
      registerTab,
      activateTab,
      closeTab,
      clearTabs,
    }),
    [tabs, activePath, registerTab, activateTab, closeTab, clearTabs],
  )

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

/* eslint-disable react-refresh/only-export-components */
export function useWorkspace() {
  const context = useContext(WorkspaceContext)

  if (!context) {
    throw new Error('useWorkspace deve ser usado dentro de WorkspaceProvider.')
  }

  return context
}
