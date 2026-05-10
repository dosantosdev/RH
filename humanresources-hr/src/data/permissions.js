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
  }
]
