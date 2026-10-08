/*
 * ============================================================
 * ENCARGOS E RETENÇÕES DA FOLHA
 * ============================================================
 *
 * Regras parametrizadas para o ano-calendário de 2026.
 *
 * Fontes oficiais consultadas em 08/10/2026:
 *
 * INSS:
 * https://www.gov.br/inss/pt-br/direitos-e-deveres/inscricao-e-contribuicao/tabela-de-contribuicao-mensal
 *
 * IRPF/IRRF:
 * https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026
 *
 * FGTS:
 * Lei 8.036/1990, art. 15 / Ministério do Trabalho e Emprego.
 *
 * ATENÇÃO:
 * O serviço é uma camada de cálculo do sistema e não substitui
 * a apuração oficial no eSocial/DCTFWeb nem orientação contábil.
 * Regras especiais, múltiplos vínculos, rubricas com incidências
 * específicas, decisões judiciais, pensão alimentícia e outras
 * situações não modeladas devem ser tratadas separadamente.
 * ============================================================
 */

export const PAYROLL_TAX_YEAR = 2026

export const INSS_2026 = {
  ceiling: 8475.55,

  brackets: [
    {
      limit: 1621.0,
      rate: 0.075
    },
    {
      limit: 2902.84,
      rate: 0.09
    },
    {
      limit: 4354.27,
      rate: 0.12
    },
    {
      limit: 8475.55,
      rate: 0.14
    }
  ]
}

export const IRRF_2026 = {
  dependentDeduction: 189.59,

  simplifiedDeduction: 607.2,

  monthlyBrackets: [
    {
      limit: 2428.8,
      rate: 0,
      deduction: 0
    },
    {
      limit: 2826.65,
      rate: 0.075,
      deduction: 182.16
    },
    {
      limit: 3751.05,
      rate: 0.15,
      deduction: 394.16
    },
    {
      limit: 4664.68,
      rate: 0.225,
      deduction: 675.49
    },
    {
      limit: Infinity,
      rate: 0.275,
      deduction: 908.73
    }
  ],

  /*
   * Redução mensal criada pela Lei 15.270/2025.
   *
   * Até R$ 5.000:
   *   reduz o imposto até zerá-lo.
   *
   * De R$ 5.000,01 a R$ 7.350:
   *   redução = 978,62 - 0,133145 x rendimento tributável.
   *
   * Acima de R$ 7.350:
   *   não há redução.
   */
  reduction: {
    fullExemptionIncome: 5000,
    maximumReductionIncome: 7350,
    coefficient: 0.133145,
    constant: 978.62
  }
}

export const FGTS_2026 = {
  regularRate: 0.08,
  apprenticeRate: 0.02
}

export function roundTax(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

/*
 * ============================================================
 * INSS PROGRESSIVO
 * ============================================================
 */

export function calculateINSS(grossSalary) {
  const salary = Math.max(
    0,
    Math.min(
      Number(grossSalary) || 0,
      INSS_2026.ceiling
    )
  )

  if (salary <= 0) {
    return {
      base: 0,
      amount: 0,
      effectiveRate: 0
    }
  }

  let previousLimit = 0
  let amount = 0

  for (const bracket of INSS_2026.brackets) {
    const taxableInBracket =
      Math.max(
        0,
        Math.min(
          salary,
          bracket.limit
        ) - previousLimit
      )

    amount +=
      taxableInBracket *
      bracket.rate

    previousLimit =
      bracket.limit

    if (salary <= bracket.limit) {
      break
    }
  }

  amount = roundTax(amount)

  return {
    base: salary,

    amount,

    effectiveRate:
      salary > 0
        ? roundTax(
            (amount / salary) * 100
          )
        : 0
  }
}

/*
 * ============================================================
 * IRRF - TABELA PROGRESSIVA
 * ============================================================
 */

function calculateProgressiveIRRF(base) {
  const normalizedBase =
    Math.max(0, Number(base) || 0)

  const bracket =
    IRRF_2026.monthlyBrackets.find(
      (item) =>
        normalizedBase <= item.limit
    )

  if (!bracket) {
    return {
      base: normalizedBase,
      rate: 0,
      deduction: 0,
      tax: 0
    }
  }

  const tax = Math.max(
    0,
    normalizedBase * bracket.rate -
      bracket.deduction
  )

  return {
    base: normalizedBase,

    rate: bracket.rate,

    deduction:
      bracket.deduction,

    tax: roundTax(tax)
  }
}

/*
 * ============================================================
 * REDUÇÃO DO IRRF 2026
 * ============================================================
 */

function calculateIRRFReduction(
  taxableIncome,
  progressiveTax
) {
  const income =
    Math.max(
      0,
      Number(taxableIncome) || 0
    )

  const tax =
    Math.max(
      0,
      Number(progressiveTax) || 0
    )

  if (tax <= 0) {
    return 0
  }

  if (
    income <=
    IRRF_2026.reduction.fullExemptionIncome
  ) {
    return roundTax(tax)
  }

  if (
    income <=
    IRRF_2026.reduction.maximumReductionIncome
  ) {
    const reduction =
      IRRF_2026.reduction.constant -
      IRRF_2026.reduction.coefficient *
        income

    return roundTax(
      Math.min(
        tax,
        Math.max(0, reduction)
      )
    )
  }

  return 0
}

/*
 * ============================================================
 * IRRF
 * ============================================================
 *
 * Compara:
 *
 * 1. Deduções legais:
 *    INSS + dependentes
 *
 * 2. Desconto simplificado:
 *    R$ 607,20
 *
 * Utiliza a opção mais vantajosa para o trabalhador.
 * ============================================================
 */

export function calculateIRRF({
  grossSalary = 0,
  inss = 0,
  dependents = 0
} = {}) {
  const gross =
    Math.max(
      0,
      Number(grossSalary) || 0
    )

  const inssAmount =
    Math.max(
      0,
      Number(inss) || 0
    )

  const dependentCount =
    Math.max(
      0,
      Math.floor(
        Number(dependents) || 0
      )
    )

  const dependentDeduction =
    roundTax(
      dependentCount *
        IRRF_2026.dependentDeduction
    )

  const legalDeductions =
    roundTax(
      inssAmount +
        dependentDeduction
    )

  const chosenDeduction =
    Math.max(
      legalDeductions,
      IRRF_2026.simplifiedDeduction
    )

  const deductionMethod =
    legalDeductions >=
    IRRF_2026.simplifiedDeduction
      ? 'legal'
      : 'simplified'

  const base =
    roundTax(
      Math.max(
        0,
        gross - chosenDeduction
      )
    )

  const progressive =
    calculateProgressiveIRRF(
      base
    )

  const reduction =
    calculateIRRFReduction(
      gross,
      progressive.tax
    )

  const amount =
    roundTax(
      Math.max(
        0,
        progressive.tax -
          reduction
      )
    )

  return {
    grossSalary: gross,

    inss: inssAmount,

    dependents:
      dependentCount,

    dependentDeduction,

    legalDeductions,

    simplifiedDeduction:
      IRRF_2026.simplifiedDeduction,

    chosenDeduction,

    deductionMethod,

    base,

    rate:
      progressive.rate,

    progressiveTax:
      progressive.tax,

    reduction,

    amount
  }
}

/*
 * ============================================================
 * FGTS
 * ============================================================
 */

export function calculateFGTS(
  grossSalary,
  options = {}
) {
  const gross =
    Math.max(
      0,
      Number(grossSalary) || 0
    )

  const apprentice =
    options.isApprentice === true

  const rate =
    apprentice
      ? FGTS_2026.apprenticeRate
      : FGTS_2026.regularRate

  return {
    base: gross,

    rate,

    amount:
      roundTax(
        gross * rate
      ),

    isApprentice:
      apprentice
  }
}

/*
 * ============================================================
 * CÁLCULO COMPLETO
 * ============================================================
 */

export function calculatePayrollTaxes({
  grossSalary = 0,
  dependents = 0,
  isApprentice = false
} = {}) {
  const inss =
    calculateINSS(
      grossSalary
    )

  const irrf =
    calculateIRRF({
      grossSalary,
      inss: inss.amount,
      dependents
    })

  const fgts =
    calculateFGTS(
      grossSalary,
      {
        isApprentice
      }
    )

  return {
    inss,
    irrf,
    fgts,

    employeeDeductions:
      roundTax(
        inss.amount +
          irrf.amount
      ),

    employerCharges:
      roundTax(
        fgts.amount
      )
  }
}

/*
 * ============================================================
 * DESCRIÇÃO PARA A FOLHA
 * ============================================================
 */

export function createTaxPayrollItems(
  taxCalculation
) {
  const deductions = []

  if (
    Number(
      taxCalculation?.inss?.amount
    ) > 0
  ) {
    deductions.push({
      code: 'INSS',
      name: 'INSS',
      description:
        'Contribuição previdenciária do segurado - cálculo progressivo 2026.',
      amount:
        roundTax(
          taxCalculation.inss.amount
        ),
      automatic: true,
      source: 'legal'
    })
  }

  if (
    Number(
      taxCalculation?.irrf?.amount
    ) > 0
  ) {
    deductions.push({
      code: 'IRRF',
      name: 'IRRF',
      description:
        'Imposto de renda retido na fonte - tabela mensal 2026.',
      amount:
        roundTax(
          taxCalculation.irrf.amount
        ),
      automatic: true,
      source: 'legal'
    })
  }

  return deductions
}
