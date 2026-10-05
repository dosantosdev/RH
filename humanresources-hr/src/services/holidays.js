/*
 * ============================================================
 * FERIADOS
 * ============================================================
 *
 * Responsável por calcular automaticamente os feriados
 * utilizados pelo módulo de ponto.
 *
 * Neste momento consideramos:
 *
 * - feriados nacionais do Brasil;
 * - Paixão de Cristo;
 * - feriado estadual do Rio Grande do Sul.
 *
 * Carnaval e Corpus Christi não entram aqui porque são pontos
 * facultativos em âmbito geral.
 */

/*
 * ============================================================
 * PÁSCOA
 * ============================================================
 *
 * Calcula o Domingo de Páscoa para determinado ano.
 *
 * O resultado é utilizado para encontrar a Sexta-feira
 * da Paixão automaticamente.
 */
function getEasterSunday(year) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)

  const month = Math.floor((h + l - 7 * m + 114) / 31)

  const day = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(year, month - 1, day)
}

/*
 * ============================================================
 * FORMATAR DATA
 * ============================================================
 *
 * Retorna:
 *
 * YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear()

  const month = String(date.getMonth() + 1).padStart(2, '0')

  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/*
 * ============================================================
 * ADICIONAR DIAS
 * ============================================================
 */
function addDays(date, amount) {
  const result = new Date(date)

  result.setDate(result.getDate() + amount)

  return result
}

/*
 * ============================================================
 * FERIADOS DO ANO
 * ============================================================
 *
 * Os feriados são calculados automaticamente para o ano
 * informado.
 *
 * Dessa forma não precisamos cadastrar manualmente:
 *
 * 2026
 * 2027
 * 2028
 * 2029
 * ...
 */
export function getHolidaysForYear(year) {
  /*
   * A Paixão de Cristo ocorre dois dias antes da Páscoa.
   */
  const easterSunday = getEasterSunday(year)

  const goodFriday = addDays(easterSunday, -2)

  return [
    /*
     * --------------------------------------------------------
     * JANEIRO
     * --------------------------------------------------------
     */

    {
      date: `${year}-01-01`,
      name: 'Confraternização Universal',
      type: 'national',
      scope: 'nacional'
    },

    /*
     * --------------------------------------------------------
     * PAIXÃO DE CRISTO
     * --------------------------------------------------------
     *
     * Data móvel.
     */
    {
      date: formatDate(goodFriday),
      name: 'Paixão de Cristo',
      type: 'national_religious',
      scope: 'nacional'
    },

    /*
     * --------------------------------------------------------
     * ABRIL
     * --------------------------------------------------------
     */

    {
      date: `${year}-04-21`,
      name: 'Tiradentes',
      type: 'national',
      scope: 'nacional'
    },

    /*
     * --------------------------------------------------------
     * MAIO
     * --------------------------------------------------------
     */

    {
      date: `${year}-05-01`,
      name: 'Dia Mundial do Trabalho',
      type: 'national',
      scope: 'nacional'
    },

    /*
     * --------------------------------------------------------
     * SETEMBRO
     * --------------------------------------------------------
     */

    {
      date: `${year}-09-07`,
      name: 'Independência do Brasil',
      type: 'national',
      scope: 'nacional'
    },

    /*
     * --------------------------------------------------------
     * RIO GRANDE DO SUL
     * --------------------------------------------------------
     *
     * Data Magna do Estado.
     */
    {
      date: `${year}-09-20`,
      name: 'Revolução Farroupilha',
      type: 'state',
      scope: 'Rio Grande do Sul'
    },

    /*
     * --------------------------------------------------------
     * OUTUBRO
     * --------------------------------------------------------
     */

    {
      date: `${year}-10-12`,
      name: 'Nossa Senhora Aparecida',
      type: 'national',
      scope: 'nacional'
    },

    /*
     * --------------------------------------------------------
     * NOVEMBRO
     * --------------------------------------------------------
     */

    {
      date: `${year}-11-02`,
      name: 'Finados',
      type: 'national',
      scope: 'nacional'
    },

    {
      date: `${year}-11-15`,
      name: 'Proclamação da República',
      type: 'national',
      scope: 'nacional'
    },

    {
      date: `${year}-11-20`,
      name: 'Dia Nacional de Zumbi e da Consciência Negra',
      type: 'national',
      scope: 'nacional'
    },

    /*
     * --------------------------------------------------------
     * DEZEMBRO
     * --------------------------------------------------------
     */

    {
      date: `${year}-12-25`,
      name: 'Natal',
      type: 'national',
      scope: 'nacional'
    }
  ].sort((first, second) => first.date.localeCompare(second.date))
}

/*
 * ============================================================
 * BUSCAR FERIADO POR DATA
 * ============================================================
 */
export function getHolidayByDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null
  }

  const dateKey = formatDate(date)

  const holidays = getHolidaysForYear(date.getFullYear())

  return holidays.find((holiday) => holiday.date === dateKey) || null
}

/*
 * ============================================================
 * VERIFICAR SE É FERIADO
 * ============================================================
 */
export function isHoliday(date) {
  return Boolean(getHolidayByDate(date))
}
