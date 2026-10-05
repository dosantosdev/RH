/*
 * ============================================================
 * GEOLOCALIZAÇÃO
 * ============================================================
 *
 * Responsável por:
 *
 * 1. Obter a localização atual do dispositivo.
 * 2. Tentar obter a maior precisão possível.
 * 3. Converter latitude/longitude em endereço.
 * 4. Retornar cidade e estado.
 * 5. Informar a precisão da localização obtida.
 *
 * IMPORTANTE:
 *
 * As coordenadas são a informação oficial da localização.
 *
 * O endereço é uma representação amigável das coordenadas
 * e depende da qualidade dos dados do serviço de geocodificação.
 *
 * Futuramente poderemos substituir o Nominatim por:
 *
 * - Google Maps
 * - Mapbox
 * - HERE
 * - outro provedor de geocodificação
 *
 * sem precisar alterar a estrutura das batidas.
 */

/*
 * ============================================================
 * CONFIGURAÇÃO
 * ============================================================
 */

const REVERSE_GEOCODING_URL = 'https://nominatim.openstreetmap.org/reverse'

/*
 * ============================================================
 * PRECISÃO TEMPORÁRIA PARA TESTES
 * ============================================================
 *
 * ATENÇÃO:
 *
 * Este valor está propositalmente alto neste momento.
 *
 * Estamos permitindo até aproximadamente ±50.000 metros
 * para que seja possível testar o registro do ponto pelo
 * computador, mesmo quando o navegador não consegue obter
 * uma localização GPS precisa.
 *
 * Isso é TEMPORÁRIO.
 *
 * Quando voltarmos para a validação real da localização,
 * este valor deverá ser reduzido novamente.
 *
 * Exemplo:
 *
 * accuracy = 20
 * → localização estimada em aproximadamente ±20 metros.
 *
 * accuracy = 50000
 * → localização estimada em aproximadamente ±50 km.
 */

const MAX_ALLOWED_ACCURACY = 50000

/*
 * ============================================================
 * QUANTIDADE DE TENTATIVAS
 * ============================================================
 *
 * Fazemos algumas tentativas para encontrar uma localização
 * mais precisa.
 */

const MAX_LOCATION_ATTEMPTS = 3

/*
 * ============================================================
 * TEMPO MÁXIMO DE CADA TENTATIVA
 * ============================================================
 */

const LOCATION_TIMEOUT = 15000

/*
 * ============================================================
 * OBTER UMA LOCALIZAÇÃO
 * ============================================================
 */

function getPosition() {
  return new Promise((resolve, reject) => {
    /*
     * Verifica se o navegador suporta geolocalização.
     */

    if (!navigator.geolocation) {
      reject(new Error('Este navegador não oferece suporte à geolocalização.'))

      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,

          longitude: position.coords.longitude,

          accuracy: position.coords.accuracy,

          capturedAt: new Date().toISOString()
        })
      },

      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(
              new Error(
                'A permissão de localização foi negada. Autorize a localização para registrar o ponto.'
              )
            )
            break

          case error.POSITION_UNAVAILABLE:
            reject(
              new Error(
                'Não foi possível determinar a localização do dispositivo.'
              )
            )
            break

          case error.TIMEOUT:
            reject(
              new Error(
                'A localização demorou demais para responder. Tente novamente.'
              )
            )
            break

          default:
            reject(new Error('Não foi possível obter a localização.'))
        }
      },

      {
        /*
         * Solicita GPS/alta precisão quando o dispositivo
         * possuir esse recurso.
         */

        enableHighAccuracy: true,

        /*
         * Não utiliza uma localização antiga armazenada
         * pelo navegador.
         */

        maximumAge: 0,

        timeout: LOCATION_TIMEOUT
      }
    )
  })
}

/*
 * ============================================================
 * OBTER A MELHOR LOCALIZAÇÃO DISPONÍVEL
 * ============================================================
 *
 * Faz algumas tentativas e mantém a localização com
 * menor valor de accuracy.
 *
 * Exemplo:
 *
 * tentativa 1 -> ±80m
 * tentativa 2 -> ±35m
 * tentativa 3 -> ±18m
 *
 * Será utilizada a terceira.
 */

export async function getCurrentLocation() {
  let bestLocation = null

  let lastError = null

  for (let attempt = 0; attempt < MAX_LOCATION_ATTEMPTS; attempt += 1) {
    try {
      const location = await getPosition()

      /*
       * Guarda a primeira localização recebida.
       */

      if (!bestLocation) {
        bestLocation = location
      }

      /*
       * Se esta localização for mais precisa,
       * substitui a anterior.
       */

      if (Number(location.accuracy) < Number(bestLocation.accuracy)) {
        bestLocation = location
      }

      /*
       * Se já conseguimos uma precisão dentro do limite
       * temporário permitido, não precisamos continuar.
       */

      if (location.accuracy <= MAX_ALLOWED_ACCURACY) {
        break
      }
    } catch (error) {
      lastError = error
    }
  }

  /*
   * Se nenhuma localização foi obtida,
   * devolvemos o erro original.
   */

  if (!bestLocation) {
    throw (
      lastError ||
      new Error('Não foi possível obter a localização do dispositivo.')
    )
  }

  /*
   * Arredondamos somente a precisão para exibição.
   *
   * As coordenadas permanecem com toda a precisão
   * fornecida pelo navegador.
   */

  return {
    latitude: bestLocation.latitude,

    longitude: bestLocation.longitude,

    accuracy: Math.round(bestLocation.accuracy),

    capturedAt: bestLocation.capturedAt
  }
}

/*
 * ============================================================
 * VALIDAR PRECISÃO
 * ============================================================
 */

export function isLocationAccurate(location) {
  if (!location) {
    return false
  }

  if (typeof location.accuracy !== 'number') {
    return false
  }

  return location.accuracy <= MAX_ALLOWED_ACCURACY
}

/*
 * ============================================================
 * GEOCODIFICAÇÃO REVERSA
 * ============================================================
 *
 * Converte:
 *
 * latitude + longitude
 *
 * em:
 *
 * endereço
 * cidade
 * estado
 * CEP
 * bairro
 * número
 *
 * ATENÇÃO:
 *
 * O endereço depende dos dados existentes no mapa.
 *
 * Mesmo que o GPS seja muito preciso, o serviço pode não
 * possuir o número exato daquele imóvel.
 */

export async function reverseGeocode(latitude, longitude) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new Error('Coordenadas inválidas para localizar o endereço.')
  }

  const params = new URLSearchParams({
    lat: String(latitude),

    lon: String(longitude),

    format: 'jsonv2',

    addressdetails: '1',

    /*
     * Zoom alto para tentar identificar o objeto mais
     * específico possível naquela coordenada.
     */

    zoom: '18',

    'accept-language': 'pt-BR'
  })

  const response = await fetch(
    `${REVERSE_GEOCODING_URL}?${params.toString()}`,
    {
      headers: {
        Accept: 'application/json'
      }
    }
  )

  if (!response.ok) {
    throw new Error('Não foi possível consultar o endereço da localização.')
  }

  const data = await response.json()

  const address = data.address || {}

  /*
   * ==========================================================
   * RUA
   * ==========================================================
   */

  const street =
    address.road ||
    address.pedestrian ||
    address.residential ||
    address.footway ||
    address.path ||
    ''

  /*
   * ==========================================================
   * NÚMERO
   * ==========================================================
   */

  const number = address.house_number || address.house_name || ''

  /*
   * ==========================================================
   * BAIRRO
   * ==========================================================
   */

  const neighborhood =
    address.neighbourhood ||
    address.suburb ||
    address.quarter ||
    address.district ||
    ''

  /*
   * ==========================================================
   * CIDADE
   * ==========================================================
   */

  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.city_district ||
    ''

  /*
   * ==========================================================
   * ESTADO
   * ==========================================================
   */

  const state = address.state || ''

  /*
   * ==========================================================
   * UF
   * ==========================================================
   */

  const stateCode =
    address['ISO3166-2-lvl4']?.replace(/^BR-/, '') ||
    address['ISO3166-2-lvl6']?.replace(/^BR-/, '') ||
    ''

  /*
   * ==========================================================
   * CEP
   * ==========================================================
   */

  const postcode = address.postcode || ''

  /*
   * ==========================================================
   * MONTA ENDEREÇO
   * ==========================================================
   */

  const addressParts = []

  if (street) {
    if (number) {
      addressParts.push(`${street}, ${number}`)
    } else {
      addressParts.push(street)
    }
  }

  if (neighborhood) {
    addressParts.push(neighborhood)
  }

  /*
   * Se conseguimos encontrar rua/número, utilizamos
   * o endereço estruturado.
   *
   * Caso contrário, utilizamos o display_name retornado
   * pelo serviço.
   */

  const formattedAddress =
    addressParts.length > 0
      ? addressParts.join(' — ')
      : data.display_name || 'Endereço não identificado'

  return {
    address: formattedAddress,

    street,

    number,

    neighborhood,

    city,

    state,

    stateCode,

    postcode,

    displayName: data.display_name || formattedAddress,

    /*
     * Informa se o serviço conseguiu encontrar
     * efetivamente um número de imóvel.
     */

    hasHouseNumber: Boolean(number),

    /*
     * Mantemos o retorno original do serviço para
     * futuras necessidades.
     */

    raw: data
  }
}

/*
 * ============================================================
 * LOCALIZAÇÃO COMPLETA
 * ============================================================
 *
 * Função utilizada pelo módulo de ponto.
 *
 * Fluxo:
 *
 * 1. Obtém GPS.
 * 2. Procura a melhor precisão disponível.
 * 3. Valida a precisão.
 * 4. Consulta o endereço.
 * 5. Retorna tudo junto.
 */

export async function getCurrentLocationWithAddress() {
  /*
   * ==========================================================
   * 1. OBTÉM LOCALIZAÇÃO
   * ==========================================================
   */

  const coordinates = await getCurrentLocation()

  /*
   * ==========================================================
   * 2. VALIDA PRECISÃO
   * ==========================================================
   *
   * Neste momento o limite é de 50.000 metros para permitir
   * os testes pelo computador.
   *
   * Esse limite será reduzido posteriormente quando
   * retomarmos a validação real da localização.
   */

  if (!isLocationAccurate(coordinates)) {
    throw new Error(
      `A localização obtida não possui precisão suficiente para registrar o ponto. Precisão atual: aproximadamente ±${coordinates.accuracy} metros. Tente novamente em um local com melhor sinal de GPS.`
    )
  }

  /*
   * ==========================================================
   * 3. DADOS PADRÃO DO ENDEREÇO
   * ==========================================================
   */

  let addressData = {
    address: '',

    street: '',

    number: '',

    neighborhood: '',

    city: '',

    state: '',

    stateCode: '',

    postcode: '',

    displayName: '',

    hasHouseNumber: false
  }

  /*
   * ==========================================================
   * 4. GEOCODIFICAÇÃO REVERSA
   * ==========================================================
   */

  try {
    addressData = await reverseGeocode(
      coordinates.latitude,
      coordinates.longitude
    )
  } catch (error) {
    /*
     * A localização continua válida mesmo se o serviço
     * de endereço estiver indisponível.
     */

    console.warn('Não foi possível obter o endereço:', error)
  }

  /*
   * ==========================================================
   * 5. RETORNO FINAL
   * ==========================================================
   */

  return {
    ...coordinates,

    ...addressData
  }
}

/*
 * ============================================================
 * FORMATAÇÃO DO ENDEREÇO
 * ============================================================
 */

export function formatLocationAddress(location) {
  if (!location) {
    return 'Localização não disponível'
  }

  /*
   * Se temos endereço estruturado, usamos ele.
   */

  if (location.address) {
    return location.address
  }

  /*
   * Caso contrário, mostramos cidade/estado.
   */

  if (location.city || location.state) {
    return [location.city, location.stateCode || location.state]
      .filter(Boolean)
      .join('/')
  }

  return 'Endereço não identificado'
}

/*
 * ============================================================
 * FORMATAÇÃO DA PRECISÃO
 * ============================================================
 */

export function formatLocationAccuracy(location) {
  if (!location || typeof location.accuracy !== 'number') {
    return 'Precisão não disponível'
  }

  return `±${Math.round(location.accuracy)} metros`
}

/*
 * ============================================================
 * ATRIBUIÇÃO
 * ============================================================
 */

export const GEOCODING_ATTRIBUTION = 'Endereço consultado via OpenStreetMap'
