/*
 * ============================================================
 * ADAPTADOR GENÉRICO DE BIOMETRIA
 * ============================================================
 *
 * O sistema não fica preso a uma marca ou modelo de equipamento.
 *
 * Quando o leitor físico estiver disponível, a integração poderá
 * disponibilizar um objeto em:
 *
 * window.HR_BIOMETRIC_ADAPTER
 *
 * Contrato mínimo esperado:
 *
 * {
 *   identify: async () => ({
 *     employeeId: 123,
 *     biometricId: 'ID-DO-EQUIPAMENTO',
 *     deviceId: 'LEITOR-01'
 *   })
 * }
 *
 * O driver/ponte do equipamento será responsável por conversar
 * com USB, rede, SDK do fabricante ou outro meio necessário.
 *
 * Dessa forma, a tela do RH não precisa conhecer a marca do
 * equipamento.
 */

/*
 * Recupera o adaptador biométrico disponibilizado pelo equipamento.
 */
export function getBiometricAdapter() {
  if (typeof window === 'undefined') {
    return null
  }

  const adapter = window.HR_BIOMETRIC_ADAPTER

  if (!adapter || typeof adapter.identify !== 'function') {
    return null
  }

  return adapter
}

/*
 * Informa se existe um equipamento/adaptador disponível.
 */
export function isBiometricAvailable() {
  return Boolean(getBiometricAdapter())
}

/*
 * Solicita a identificação ao equipamento biométrico.
 */
export async function identifyByBiometric() {
  const adapter = getBiometricAdapter()

  /*
   * Nenhum equipamento conectado/configurado.
   */
  if (!adapter) {
    return {
      success: false,
      code: 'DEVICE_NOT_CONFIGURED',
      message:
        'Nenhum equipamento biométrico foi configurado. O terminal está pronto para receber o dispositivo.'
    }
  }

  try {
    const result = await adapter.identify()

    /*
     * O equipamento precisa devolver pelo menos o ID
     * do funcionário identificado.
     */
    if (!result?.employeeId) {
      return {
        success: false,
        code: 'EMPLOYEE_NOT_IDENTIFIED',
        message: 'A biometria não identificou um funcionário válido.'
      }
    }

    return {
      success: true,

      employeeId: Number(result.employeeId),

      biometricId: result.biometricId || '',

      deviceId: result.deviceId || '',

      /*
       * Mantemos a resposta original caso futuramente
       * o equipamento forneça informações adicionais.
       */
      raw: result
    }
  } catch (error) {
    return {
      success: false,

      code: 'BIOMETRIC_ERROR',

      message:
        error?.message ||
        'Não foi possível comunicar com o equipamento biométrico.'
    }
  }
}
