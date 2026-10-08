/*
 * ============================================================
 * PERMISSÕES DO SISTEMA
 * ============================================================
 *
 * Todas as permissões utilizadas pelo sistema ficam
 * centralizadas neste arquivo.
 *
 * Cada categoria possui uma lista de permissões.
 *
 * ============================================================
 */

export const permissionGroups = [
  /*
   * ============================================================
   * FUNCIONÁRIOS
   * ============================================================
   */

  {
    category: 'Funcionários',

    items: [
      {
        key: 'employees_view',
        label: 'Visualizar funcionários'
      },

      {
        key: 'employees_create',
        label: 'Cadastrar funcionários'
      },

      {
        key: 'employees_edit',
        label: 'Editar funcionários'
      },

      {
        key: 'employees_delete',
        label: 'Excluir funcionários'
      }
    ]
  },

  /*
   * ============================================================
   * USUÁRIOS
   * ============================================================
   */

  {
    category: 'Usuários',

    items: [
      {
        key: 'users_view',
        label: 'Visualizar usuários'
      },

      {
        key: 'users_create',
        label: 'Cadastrar usuários'
      },

      {
        key: 'users_edit',
        label: 'Editar usuários'
      },

      {
        key: 'users_delete',
        label: 'Excluir usuários'
      }
    ]
  },

  /*
   * ============================================================
   * PERFIS DE ACESSO
   * ============================================================
   */

  {
    category: 'Perfis de Acesso',

    items: [
      {
        key: 'access_roles_view',
        label: 'Visualizar perfis de acesso'
      },

      {
        key: 'access_roles_create',
        label: 'Criar perfis de acesso'
      },

      {
        key: 'access_roles_edit',
        label: 'Editar perfis de acesso'
      },

      {
        key: 'access_roles_delete',
        label: 'Excluir perfis de acesso'
      }
    ]
  },

  /*
   * ============================================================
   * ORGANOGRAMA
   * ============================================================
   */

  {
    category: 'Organograma',

    items: [
      {
        key: 'branches_view',
        label: 'Visualizar filiais'
      },

      {
        key: 'branches_create',
        label: 'Cadastrar filiais'
      },

      {
        key: 'branches_edit',
        label: 'Editar filiais'
      },

      {
        key: 'branches_delete',
        label: 'Excluir filiais'
      },

      {
        key: 'departments_view',
        label: 'Visualizar departamentos'
      },

      {
        key: 'departments_create',
        label: 'Cadastrar departamentos'
      },

      {
        key: 'departments_edit',
        label: 'Editar departamentos'
      },

      {
        key: 'departments_delete',
        label: 'Excluir departamentos'
      },

      {
        key: 'roles_view',
        label: 'Visualizar cargos'
      },

      {
        key: 'roles_create',
        label: 'Cadastrar cargos'
      },

      {
        key: 'roles_edit',
        label: 'Editar cargos'
      },

      {
        key: 'roles_delete',
        label: 'Excluir cargos'
      }
    ]
  },

  /*
   * ============================================================
   * TREINAMENTOS
   * ============================================================
   */

  {
    category: 'Treinamentos',

    items: [
      {
        key: 'trainings_view',
        label: 'Visualizar treinamentos'
      },

      {
        key: 'trainings_create',
        label: 'Cadastrar treinamentos'
      },

      {
        key: 'trainings_edit',
        label: 'Editar treinamentos'
      },

      {
        key: 'trainings_delete',
        label: 'Excluir treinamentos'
      },

      {
        key: 'my_trainings_view',
        label: 'Visualizar meus treinamentos'
      }
    ]
  },

  /*
   * ============================================================
   * AVALIAÇÕES
   * ============================================================
   */

  {
    category: 'Avaliações',

    items: [
      {
        key: 'evaluations_view',
        label: 'Visualizar avaliações'
      },

      {
        key: 'evaluations_create',
        label: 'Criar avaliações'
      },

      {
        key: 'evaluations_edit',
        label: 'Editar avaliações'
      },

      {
        key: 'evaluations_delete',
        label: 'Excluir avaliações'
      },

      {
        key: 'evaluation_models_view',
        label: 'Visualizar modelos de avaliação'
      },

      {
        key: 'evaluation_models_create',
        label: 'Criar modelos de avaliação'
      },

      {
        key: 'evaluation_models_edit',
        label: 'Editar modelos de avaliação'
      },

      {
        key: 'evaluation_models_delete',
        label: 'Excluir modelos de avaliação'
      },

      {
        key: 'evaluations_history_view',
        label: 'Visualizar histórico de avaliações'
      },

      {
        key: 'evaluations_results_view',
        label: 'Visualizar resultados das avaliações'
      },

      {
        key: 'evaluations_180_view',
        label: 'Visualizar resultados do 180°'
      },

      {
        key: 'my_evaluations_view',
        label: 'Visualizar minhas avaliações'
      },

      {
        key: 'my_evaluations_answer',
        label: 'Responder minhas avaliações'
      }
    ]
  },

  /*
   * ============================================================
   * FINANCEIRO
   * ============================================================
   */

  {
    category: 'Financeiro',

    items: [
      {
        key: 'finance_salary_view',
        label: 'Visualizar informações salariais'
      },

      {
        key: 'finance_salary_manage',
        label: 'Gerenciar salários e histórico salarial'
      },

      {
        key: 'finance_events_view',
        label: 'Visualizar proventos e descontos'
      },

      {
        key: 'finance_events_manage',
        label: 'Gerenciar proventos e descontos'
      },

      {
        key: 'finance_payroll_view',
        label: 'Visualizar folha de pagamento'
      },

      {
        key: 'finance_payroll_manage',
        label: 'Gerenciar folha de pagamento'
      },

      {
        key: 'finance_advanced_view',
        label: 'Visualizar gestão financeira'
      },

      {
        key: 'finance_advanced_manage',
        label: 'Gerenciar banco de horas, férias, 13º e rescisões'
      }
    ]
  },


  /*
   * ============================================================
   * RECRUTAMENTO / ÁREA DO CANDIDATO
   * ============================================================
   */

  {
    category: 'Área do Candidato',

    items: [
      {
        key: 'recruitment_view',
        label: 'Visualizar área do candidato'
      },

      {
        key: 'recruitment_create',
        label: 'Cadastrar vagas, candidatos e entrevistas'
      },

      {
        key: 'recruitment_edit',
        label: 'Editar vagas, candidatos e etapas do processo'
      },

      {
        key: 'recruitment_delete',
        label: 'Excluir vagas, candidatos e entrevistas'
      },

      {
        key: 'recruitment_convert',
        label: 'Transformar candidato aprovado em funcionário'
      }
    ]
  },

  /*
   * ============================================================
   * RELATÓRIOS
   * ============================================================
   */

  {
    category: 'Relatórios',

    items: [
      {
        key: 'reports_view',
        label: 'Visualizar relatórios gerais de RH'
      }
    ]
  },

  /*
   * ============================================================
   * PONTO
   * ============================================================
   */

  {
    category: 'Ponto',

    items: [
      {
        key: 'ponto_bater',
        label: 'Registrar próprio ponto'
      },

      {
        key: 'ponto_espelho_view',
        label: 'Visualizar próprio espelho de ponto'
      },

      {
        key: 'ponto_controle_view',
        label: 'Visualizar controle de ponto'
      },

      {
        key: 'ponto_controle_edit',
        label: 'Ajustar registros de ponto'
      },

      {
        key: 'ponto_jornadas_view',
        label: 'Visualizar jornadas e escalas'
      },

      {
        key: 'ponto_jornadas_create',
        label: 'Cadastrar jornadas e escalas'
      },

      {
        key: 'ponto_jornadas_edit',
        label: 'Editar jornadas e escalas'
      },

      {
        key: 'ponto_jornadas_delete',
        label: 'Excluir jornadas e escalas'
      },

      {
        key: 'ponto_banco_horas_view',
        label: 'Visualizar banco de horas'
      },

      {
        key: 'ponto_banco_horas_manage',
        label: 'Gerenciar banco de horas'
      },

      {
        key: 'ponto_horas_extras_view',
        label: 'Visualizar horas extras'
      },

      {
        key: 'ponto_horas_extras_manage',
        label: 'Gerenciar horas extras'
      },

      {
        key: 'ponto_faltas_view',
        label: 'Visualizar faltas e atrasos'
      },

      {
        key: 'ponto_faltas_manage',
        label: 'Gerenciar faltas e atrasos'
      },

      {
        key: 'ponto_atestados_view',
        label: 'Visualizar atestados'
      },

      {
        key: 'ponto_atestados_manage',
        label: 'Gerenciar atestados'
      },

      {
        key: 'ponto_fechamento_view',
        label: 'Visualizar fechamento mensal'
      },

      {
        key: 'ponto_fechamento_manage',
        label: 'Gerenciar fechamento mensal'
      },

      {
        key: 'ponto_relatorios_view',
        label: 'Visualizar relatórios de ponto'
      }
    ]
  },

  /*
   * ============================================================
   * PERFIL
   * ============================================================
   */

  {
    category: 'Perfil',

    items: [
      {
        key: 'profile_view',
        label: 'Visualizar meu perfil'
      },

      {
        key: 'password_change',
        label: 'Alterar senha'
      }
    ]
  }
]

/*
 * ============================================================
 * COMPATIBILIDADE
 * ============================================================
 *
 * Alguns componentes antigos podem importar `permissions`
 * diretamente.
 *
 * Mantemos o alias para evitar quebra de compatibilidade.
 * ============================================================
 */

export const permissions = permissionGroups

export default permissionGroups
