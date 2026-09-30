export const requiredFieldsConfig = {
  personal: {
    title: 'Dados pessoais',
    fields: {
      name: { label: 'Nome completo', required: true },
      cpf: { label: 'CPF', required: true },
      birthDate: { label: 'Data de nascimento', required: true },
      gender: { label: 'Sexo', required: false },
      maritalStatus: { label: 'Estado civil', required: false },
      education: { label: 'Escolaridade', required: false },
      motherName: { label: 'Nome da mãe', required: false },
      fatherName: { label: 'Nome do pai', required: false }
    }
  },

  employment: {
    title: 'Vínculo profissional',
    fields: {
      roleId: { label: 'Cargo', required: true },
      branchId: { label: 'Filial', required: true },
      registration: { label: 'Matrícula', required: false },
      admissionDate: { label: 'Data de admissão', required: true },
      periodicExamDate: { label: 'Exame periódico', required: false }
    }
  },

  documents: {
    title: 'Documentação',
    fields: {
      // O RG deixou de ser obrigatório por padrão.
      rg: { label: 'RG', required: false },
      rgIssuer: { label: 'Órgão emissor do RG', required: false },
      rgDate: { label: 'Data de emissão do RG', required: false },
      rgCity: { label: 'Município do RG', required: false },
      rgState: { label: 'UF do RG', required: false },
      ctpsNumber: { label: 'CTPS', required: false },
      ctpsSeries: { label: 'Série da CTPS', required: false },
      ctpsCity: { label: 'Município da CTPS', required: false },
      pis: { label: 'PIS', required: false },
      susCard: { label: 'Cartão SUS', required: false },
      voterTitle: { label: 'Título eleitoral', required: false },
      voterZone: { label: 'Zona eleitoral', required: false },
      voterSection: { label: 'Seção eleitoral', required: false }
    }
  },

  address: {
    title: 'Endereço',
    fields: {
      cep: { label: 'CEP', required: false },
      street: { label: 'Rua', required: false },
      number: { label: 'Número', required: false },
      complement: { label: 'Complemento', required: false },
      district: { label: 'Bairro', required: false },
      city: { label: 'Cidade', required: false },
      state: { label: 'Estado', required: false },
      country: { label: 'País', required: false },
      propertyType: { label: 'Tipo de propriedade', required: false },
      livingSince: { label: 'Reside desde', required: false }
    }
  },

  contact: {
    title: 'Contato',
    fields: {
      phone: { label: 'Celular', required: false },
      email: { label: 'E-mail', required: false },
      secondaryPhone: {
        label: 'Celular complementar',
        required: false
      }
    }
  },

  banking: {
    title: 'Dados bancários',
    fields: {
      accountType: { label: 'Tipo de conta', required: false },
      bank: { label: 'Banco', required: false },
      agency: { label: 'Agência', required: false },
      account: { label: 'Conta', required: false },
      pixKey: { label: 'Chave PIX', required: false }
    }
  },

  transport: {
    title: 'Transporte',
    fields: {
      transportValue: {
        label: 'Valor da passagem',
        required: false
      },
      busCompany: {
        label: 'Empresa de ônibus',
        required: false
      }
    }
  },

  spouse: {
    title: 'Cônjuge',
    fields: {
      spouseName: { label: 'Nome do cônjuge', required: true },
      spouseGender: { label: 'Sexo do cônjuge', required: true },
      spousePhone: { label: 'Telefone do cônjuge', required: true },
      spouseCpf: { label: 'CPF do cônjuge', required: true },
      spouseRg: { label: 'RG do cônjuge', required: true },
      spouseRgIssuer: {
        label: 'Emissor RG do cônjuge',
        required: true
      },
      spouseUf: { label: 'UF RG do cônjuge', required: true },
      spouseBirthDate: {
        label: 'Data de nascimento do cônjuge',
        required: true
      },
      spouseBirthCity: {
        label: 'Cidade de nascimento do cônjuge',
        required: true
      },
      marriageDate: {
        label: 'Data do casamento/união',
        required: true
      }
    }
  },

  dependents: {
    title: 'Dependentes',
    fields: {
      name: { label: 'Nome do dependente', required: true },
      cpf: { label: 'CPF do dependente', required: true },
      birthDate: {
        label: 'Data de nascimento do dependente',
        required: true
      },
      rg: { label: 'RG do dependente', required: false }
    }
  }
}
