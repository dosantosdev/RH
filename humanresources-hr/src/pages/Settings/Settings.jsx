import { useState } from 'react'

import {
  getRequiredFields,
  saveRequiredFields,
  getRequiredFieldsStructure
} from '../../services/requiredFields'

import { hasPermission } from '../../services/permissions'

import './settings.css'

const tabs = [
  { id: 'required-fields', label: 'Campos obrigatórios' },
  { id: 'users', label: 'Usuários e permissões' },
  { id: 'security', label: 'Segurança' },
  { id: 'system', label: 'Sistema' },
  { id: 'company', label: 'Empresa' },
  { id: 'backup', label: 'Backup e dados' },
  { id: 'audit', label: 'Logs e auditoria' },
  { id: 'notifications', label: 'Notificações' },
  { id: 'integrations', label: 'Integrações' },
  { id: 'maintenance', label: 'Manutenção' }
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState('required-fields')
  const [requiredFields, setRequiredFields] = useState(getRequiredFields)

  const structure = getRequiredFieldsStructure()

  function handleRequiredFieldChange(section, field) {
    setRequiredFields((prev) => {
      const updated = {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: !prev[section]?.[field]
        }
      }

      return saveRequiredFields(updated)
    })
  }

  if (!hasPermission('system_settings')) {
    return (
      <div className="settings-page">
        <div className="settings-access-denied">
          <h2>Acesso negado</h2>
          <p>Você não possui permissão para acessar as configurações.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>Configurações</h2>
        <p>Gerencie as configurações e regras utilizadas pelo sistema.</p>
      </div>

      <div className="settings-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={
              activeTab === tab.id
                ? 'settings-tab active'
                : 'settings-tab'
            }
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'required-fields' && (
        <section className="settings-card">
          <div className="settings-card-header">
            <div>
              <h3>Campos obrigatórios</h3>
              <p>
                Defina quais informações devem ser preenchidas no cadastro
                de funcionários.
              </p>
            </div>

            <span className="settings-card-icon">✓</span>
          </div>

          <div className="required-fields-list">
            {Object.entries(structure).map(([sectionKey, section]) => (
              <div className="required-fields-section" key={sectionKey}>
                <h4>{section.title}</h4>

                <div className="required-fields-grid">
                  {Object.entries(section.fields).map(
                    ([fieldKey, field]) => (
                      <label
                        className="required-field-option"
                        key={fieldKey}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(
                            requiredFields?.[sectionKey]?.[fieldKey]
                          )}
                          onChange={() =>
                            handleRequiredFieldChange(
                              sectionKey,
                              fieldKey
                            )
                          }
                        />

                        <span>{field.label}</span>
                      </label>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'users' && (
        <SettingsPlaceholder
          icon="👥"
          title="Usuários e permissões"
          description="Área reservada para centralizar usuários, perfis e níveis de acesso."
        />
      )}

      {activeTab === 'security' && (
        <SettingsPlaceholder
          icon="🔐"
          title="Segurança"
          description="Área reservada para alteração de senha, política de senhas, sessões e outras regras de segurança."
        />
      )}

      {activeTab === 'system' && (
        <SettingsPlaceholder
          icon="⚙️"
          title="Sistema"
          description="Área reservada para configurações gerais da empresa, aparência, notificações e preferências do sistema."
        />
      )}

      {activeTab === 'company' && (
        <SettingsPlaceholder
          icon="🏢"
          title="Empresa"
          description="Área reservada para dados da empresa, informações institucionais e configurações utilizadas em documentos e relatórios."
        />
      )}

      {activeTab === 'backup' && (
        <SettingsPlaceholder
          icon="💾"
          title="Backup e dados"
          description="Área reservada para criação, restauração, exportação, importação e gerenciamento dos backups do sistema."
        />
      )}

      {activeTab === 'audit' && (
        <SettingsPlaceholder
          icon="📋"
          title="Logs e auditoria"
          description="Área reservada para o histórico de ações realizadas pelos usuários e alterações efetuadas no sistema."
        />
      )}

      {activeTab === 'notifications' && (
        <SettingsPlaceholder
          icon="🔔"
          title="Notificações"
          description="Área reservada para regras de alertas, avisos e notificações do sistema."
        />
      )}

      {activeTab === 'integrations' && (
        <SettingsPlaceholder
          icon="🔗"
          title="Integrações"
          description="Área reservada para futuras integrações com APIs, sistemas externos e outros serviços."
        />
      )}

      {activeTab === 'maintenance' && (
        <SettingsPlaceholder
          icon="🛠️"
          title="Manutenção"
          description="Área reservada para ferramentas administrativas, informações do sistema e rotinas de manutenção."
        />
      )}
    </div>
  )
}

function SettingsPlaceholder({ icon, title, description }) {
  return (
    <section className="settings-card">
      <div className="settings-card-header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>

        <span className="settings-card-icon">{icon}</span>
      </div>

      <div className="settings-placeholder">
        <span>Em desenvolvimento</span>
        <p>{description}</p>
      </div>
    </section>
  )
}
