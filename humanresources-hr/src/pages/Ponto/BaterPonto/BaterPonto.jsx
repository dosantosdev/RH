import { useEffect, useState } from 'react'

import './baterPonto.css'

import { hasPermission } from '../../../services/permissions'
import { getEmployees } from '../../../services/employee'

import {
  getCurrentTime,
  getNextPunchType,
  getTodayTimeClockRecord,
  getTimeClockStatusLabel,
  PUNCH_TYPE_LABELS,
  registerPunch
} from '../../../services/timeClock'

import {
  getCurrentLocationWithAddress,
  formatLocationAddress,
  GEOCODING_ATTRIBUTION
} from '../../../services/geolocation'

export default function BaterPonto() {
  const [currentUser, setCurrentUser] = useState(null)

  const [employee, setEmployee] = useState(null)

  const [record, setRecord] = useState(null)

  const [currentTime, setCurrentTime] = useState(getCurrentTime())

  const [message, setMessage] = useState('')

  const [messageType, setMessageType] = useState('')

  const [locationLoading, setLocationLoading] = useState(false)

  /*
   * ============================================================
   * MODO DE REGISTRO
   * ============================================================
   *
   * biometric:
   * Registro através do equipamento biométrico.
   *
   * remote:
   * Registro manual pelo sistema, utilizado principalmente
   * em situações excepcionais, como trabalho externo/viagem.
   */

  const [activeMode, setActiveMode] = useState('biometric')

  /*
   * Enquanto o equipamento biométrico real ainda não está
   * integrado, deixamos a interface preparada.
   *
   * Quando o equipamento existir, esta variável poderá ser
   * controlada pela integração real.
   */

  const [biometricAvailable] = useState(false)

  /*
   * ============================================================
   * CARREGAMENTO
   * ============================================================
   */

  useEffect(() => {
    const loggedUser = JSON.parse(localStorage.getItem('loggedUser'))

    setCurrentUser(loggedUser)

    if (!loggedUser?.employeeId) {
      return
    }

    const employees = getEmployees()

    const linkedEmployee = employees.find(
      (item) => Number(item.id) === Number(loggedUser.employeeId)
    )

    setEmployee(linkedEmployee || null)

    if (linkedEmployee) {
      setRecord(getTodayTimeClockRecord(linkedEmployee.id))
    }
  }, [])

  /*
   * ============================================================
   * RELÓGIO
   * ============================================================
   */

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTime())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  /*
   * ============================================================
   * ATUALIZA O REGISTRO
   * ============================================================
   */

  function refreshRecord() {
    if (!employee) {
      return
    }

    setRecord(getTodayTimeClockRecord(employee.id))
  }

  /*
   * ============================================================
   * PERMISSÃO
   * ============================================================
   */

  if (!hasPermission('ponto_bater')) {
    return (
      <div className="time-clock-page">
        <div className="time-clock-access-denied">
          <h2>Acesso negado</h2>

          <p>Você não possui permissão para registrar o ponto.</p>
        </div>
      </div>
    )
  }

  /*
   * ============================================================
   * USUÁRIO SEM FUNCIONÁRIO VINCULADO
   * ============================================================
   */

  if (!currentUser?.employeeId) {
    return (
      <div className="time-clock-page">
        <div className="time-clock-container">
          <div className="time-clock-card time-clock-warning-card">
            <div className="time-clock-page-header">
              <div>
                <span>PONTO</span>

                <h1>Bater Ponto</h1>

                <p>Registro eletrônico da jornada de trabalho.</p>
              </div>
            </div>

            <div className="time-clock-warning">
              <strong>Funcionário não vinculado</strong>

              <p>
                Este usuário ainda não está vinculado a um funcionário. Vincule
                o usuário a um cadastro de funcionário para permitir o registro
                do ponto.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /*
   * ============================================================
   * FUNCIONÁRIO NÃO ENCONTRADO
   * ============================================================
   */

  if (!employee) {
    return (
      <div className="time-clock-page">
        <div className="time-clock-container">
          <div className="time-clock-card time-clock-warning-card">
            <div className="time-clock-warning">
              <strong>Funcionário não encontrado</strong>

              <p>
                O funcionário vinculado a este usuário não foi encontrado no
                cadastro.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /*
   * ============================================================
   * PRÓXIMA BATIDA
   * ============================================================
   */

  const nextPunchType = getNextPunchType(record)

  const nextPunchLabel = nextPunchType
    ? PUNCH_TYPE_LABELS[nextPunchType]
    : 'Jornada encerrada'

  /*
   * ============================================================
   * REGISTRAR PONTO
   * ============================================================
   */

  async function handlePunch(source = 'remote') {
    if (!employee || !nextPunchType) {
      return
    }

    setMessage('')

    setLocationLoading(true)

    try {
      /*
       * A localização continua sendo obtida antes da batida.
       */

      const location = await getCurrentLocationWithAddress()

      /*
       * O campo source identifica como o ponto foi registrado.
       *
       * Futuramente:
       *
       * biometric
       * terminal
       * facial
       * aplicativo
       * etc.
       */

      const result = registerPunch(employee.id, {
        location,

        source,

        registrationMethod: source
      })

      if (!result.success) {
        setMessageType('error')

        setMessage(result.message)

        return
      }

      setRecord(result.record)

      setMessageType('success')

      setMessage(
        `${PUNCH_TYPE_LABELS[result.punch.type]} registrada às ${result.punch.time}.`
      )
    } catch (error) {
      setMessageType('error')

      setMessage(
        error.message ||
          'Não foi possível obter a localização para registrar o ponto.'
      )
    } finally {
      setLocationLoading(false)
    }
  }

  /*
   * ============================================================
   * SIMULAÇÃO BIOMÉTRICA
   * ============================================================
   *
   * Esta função existe somente enquanto o equipamento físico
   * ainda não estiver integrado.
   *
   * Quando houver o equipamento, esta chamada será substituída
   * pela leitura real da biometria.
   */

  async function handleBiometricTest() {
    if (!nextPunchType) {
      return
    }

    await handlePunch('biometric')
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="time-clock-page">
      <div className="time-clock-container">
        {/* ======================================================
            CABEÇALHO
        ====================================================== */}

        <header className="time-clock-page-header">
          <div>
            <span>PONTO</span>

            <h1>Bater Ponto</h1>

            <p>Registre suas marcações de entrada, intervalo e saída.</p>
          </div>
        </header>

        {/* ======================================================
            CONTEÚDO PRINCIPAL
        ====================================================== */}

        <div className="time-clock-layout">
          {/* ====================================================
              ÁREA DE REGISTRO
          ==================================================== */}

          <section className="time-clock-card time-clock-main-card">
            {/* --------------------------------------------------
                FUNCIONÁRIO
            -------------------------------------------------- */}

            <div className="time-clock-employee">
              <div className="time-clock-avatar">
                {employee.name?.charAt(0).toUpperCase() || '?'}
              </div>

              <div>
                <span>Funcionário</span>

                <h2>{employee.name}</h2>

                <p>{employee.position || employee.jobTitle || 'Funcionário'}</p>
              </div>
            </div>

            {/* --------------------------------------------------
                RELÓGIO / STATUS
            -------------------------------------------------- */}

            <div className="time-clock-top-info">
              <div className="time-clock-current">
                <span>Horário atual</span>

                <strong>{currentTime}</strong>

                <small>{new Date().toLocaleDateString('pt-BR')}</small>
              </div>

              <div className="time-clock-status">
                <span>Status</span>

                <strong>{getTimeClockStatusLabel(record)}</strong>
              </div>
            </div>

            {/* --------------------------------------------------
                ESCOLHA DO TIPO DE REGISTRO
            -------------------------------------------------- */}

            <div className="time-clock-mode-tabs">
              <button
                type="button"
                className={activeMode === 'biometric' ? 'active' : ''}
                onClick={() => {
                  setActiveMode('biometric')
                  setMessage('')
                }}
              >
                <span className="time-clock-tab-icon">◉</span>

                <span>
                  <strong>Biometria</strong>

                  <small>Registro pelo equipamento</small>
                </span>
              </button>

              <button
                type="button"
                className={activeMode === 'remote' ? 'active' : ''}
                onClick={() => {
                  setActiveMode('remote')
                  setMessage('')
                }}
              >
                <span className="time-clock-tab-icon">📍</span>

                <span>
                  <strong>Ponto remoto</strong>

                  <small>Registro pelo sistema</small>
                </span>
              </button>
            </div>

            {/* --------------------------------------------------
                ÁREA BIOMÉTRICA
            -------------------------------------------------- */}

            {activeMode === 'biometric' && (
              <div className="time-clock-registration-area">
                <div className="time-clock-biometric-icon">
                  <span>⌁</span>
                </div>

                <span className="time-clock-registration-label">
                  REGISTRO BIOMÉTRICO
                </span>

                <h2>{nextPunchLabel}</h2>

                {biometricAvailable ? (
                  <>
                    <p>
                      Posicione sua digital no leitor para registrar o ponto.
                    </p>

                    <button
                      type="button"
                      className="time-clock-punch-button"
                      onClick={() => handlePunch('biometric')}
                      disabled={!nextPunchType || locationLoading}
                    >
                      {locationLoading
                        ? 'Processando...'
                        : `Registrar ${nextPunchLabel}`}
                    </button>
                  </>
                ) : (
                  <>
                    <p>
                      O equipamento biométrico ainda não está conectado. A
                      estrutura já está preparada para receber a integração com
                      o aparelho.
                    </p>

                    <div className="time-clock-device-status">
                      <span />
                      Equipamento não conectado
                    </div>

                    <button
                      type="button"
                      className="time-clock-secondary-button"
                      onClick={handleBiometricTest}
                      disabled={!nextPunchType || locationLoading}
                    >
                      {locationLoading
                        ? 'Processando...'
                        : 'Simular leitura biométrica'}
                    </button>

                    <small className="time-clock-test-info">
                      Opção disponível somente para testes. Quando o equipamento
                      físico for integrado, esta ação será substituída pela
                      leitura real da digital.
                    </small>
                  </>
                )}
              </div>
            )}

            {/* --------------------------------------------------
                ÁREA DE PONTO REMOTO
            -------------------------------------------------- */}

            {activeMode === 'remote' && (
              <div className="time-clock-registration-area remote">
                <div className="time-clock-remote-icon">📍</div>

                <span className="time-clock-registration-label">
                  PONTO REMOTO
                </span>

                <h2>{nextPunchLabel}</h2>

                <p>
                  Utilize esta opção quando precisar registrar o ponto fora do
                  local habitual de trabalho.
                </p>

                <div className="time-clock-remote-info">
                  <strong>A localização será obrigatória.</strong>

                  <span>
                    O sistema registrará o endereço, cidade, estado, coordenadas
                    e precisão aproximada do local da batida.
                  </span>
                </div>

                <button
                  type="button"
                  className="time-clock-punch-button"
                  onClick={() => handlePunch('remote')}
                  disabled={!nextPunchType || locationLoading}
                >
                  {locationLoading
                    ? 'Obtendo localização...'
                    : nextPunchType
                      ? `Registrar ${nextPunchLabel}`
                      : 'Jornada encerrada'}
                </button>
              </div>
            )}

            {/* --------------------------------------------------
                MENSAGEM
            -------------------------------------------------- */}

            {message && (
              <div className={`time-clock-message ${messageType}`}>
                {message}
              </div>
            )}
          </section>

          {/* ====================================================
              HISTÓRICO
          ==================================================== */}

          <section className="time-clock-card time-clock-history-card">
            <div className="time-clock-history-header">
              <div>
                <span>HOJE</span>

                <h2>Marcações</h2>

                <p>Horários e locais registrados nesta jornada.</p>
              </div>

              <strong>{record?.punches?.length || 0} registro(s)</strong>
            </div>

            {!record?.punches?.length ? (
              <div className="time-clock-empty">
                <span>🕐</span>

                <h3>Nenhuma marcação registrada</h3>

                <p>
                  Registre sua primeira marcação para acompanhar o histórico
                  aqui.
                </p>
              </div>
            ) : (
              <div className="time-clock-punches">
                {record.punches.map((punch, index) => (
                  <div className="time-clock-punch" key={punch.id}>
                    <div className="time-clock-punch-top">
                      <div className="time-clock-punch-number">{index + 1}</div>

                      <div className="time-clock-punch-info">
                        <strong>{PUNCH_TYPE_LABELS[punch.type]}</strong>

                        <span>
                          {punch.registrationMethod === 'biometric'
                            ? 'Registro biométrico'
                            : 'Registro remoto'}
                        </span>
                      </div>

                      <time>{punch.time}</time>
                    </div>

                    {/* ------------------------------------------
                        LOCALIZAÇÃO
                    ------------------------------------------ */}

                    {punch.location && (
                      <div className="time-clock-punch-location">
                        <strong>📍 Local do registro</strong>

                        <span>{formatLocationAddress(punch.location)}</span>

                        {(punch.location.city || punch.location.state) && (
                          <span>
                            {punch.location.city || 'Cidade não identificada'}

                            {punch.location.stateCode || punch.location.state
                              ? `/${
                                  punch.location.stateCode ||
                                  punch.location.state
                                }`
                              : ''}
                          </span>
                        )}

                        {punch.location.postcode && (
                          <span>CEP: {punch.location.postcode}</span>
                        )}

                        {punch.location.latitude != null &&
                          punch.location.longitude != null && (
                            <small>
                              Coordenadas: {punch.location.latitude},{' '}
                              {punch.location.longitude}
                            </small>
                          )}

                        {punch.location.accuracy && (
                          <small>
                            Precisão aproximada: ±{punch.location.accuracy}m
                          </small>
                        )}

                        <small className="time-clock-location-attribution">
                          {GEOCODING_ATTRIBUTION}
                        </small>
                      </div>
                    )}

                    {!punch.location && (
                      <div className="time-clock-no-location">
                        📍 Localização não disponível
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
