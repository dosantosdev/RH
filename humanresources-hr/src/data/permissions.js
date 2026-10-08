export const permissions = [
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

  {
    category: 'Cargos',

    items: [
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

  {
    category: 'Perfis de acesso',

    items: [
      {
        key: 'access_roles_view',
        label: 'Visualizar perfis de acesso'
      },
      {
        key: 'access_roles_create',
        label: 'Cadastrar perfis de acesso'
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

  {
    category: 'Filiais',

    items: [
      {
        key: 'branches_view',
        label: 'Visualizar filiais'
      },
      {
        key: 'branches_create',
        label: 'Criar filiais'
      },
      {
        key: 'branches_edit',
        label: 'Editar filiais'
      },
      {
        key: 'branches_delete',
        label: 'Excluir filiais'
      }
    ]
  },

  {
    category: 'Departamentos',

    items: [
      {
        key: 'departments_view',
        label: 'Visualizar departamentos'
      },
      {
        key: 'departments_create',
        label: 'Criar departamentos'
      },
      {
        key: 'departments_edit',
        label: 'Editar departamentos'
      },
      {
        key: 'departments_delete',
        label: 'Excluir departamentos'
      }
    ]
  },

  {
    category: 'Dashboard',

    items: [
      {
        key: 'dashboard_weather',
        label: 'Visualizar clima'
      },
      {
        key: 'dashboard_birthdays',
        label: 'Visualizar aniversariantes'
      }
    ]
  },

  {
    category: 'Perfil',

    items: [
      {
        key: 'profile_view',
        label: 'Visualizar próprio perfil'
      },
      {
        key: 'profile_edit',
        label: 'Editar próprio perfil'
      },
      {
        key: 'password_change',
        label: 'Alterar própria senha'
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
        key: 'ponto_horas_extras_view',
        label: 'Visualizar horas extras'
      },

      {
        key: 'ponto_faltas_view',
        label: 'Visualizar faltas e atrasos'
      },

      {
        key: 'ponto_fechamento_view',
        label: 'Visualizar fechamento mensal'
      },

      {
        key: 'ponto_relatorios_view',
        label: 'Visualizar relatórios de ponto'
      }
    ]
  }
]
