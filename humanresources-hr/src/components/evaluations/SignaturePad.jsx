import { useEffect, useRef, useState } from 'react'

/*
 * ============================================================
 * ASSINATURA DIGITAL
 * ============================================================
 *
 * Componente responsável por permitir que o usuário desenhe
 * sua assinatura utilizando:
 *
 * - mouse;
 * - touch;
 * - caneta/stylus.
 *
 * A assinatura é convertida para uma imagem PNG em Base64.
 *
 * Essa imagem é então salva dentro do workflow da avaliação.
 * ============================================================
 */

export default function SignaturePad({
  value = '',
  onChange,
  disabled = false,
  width = 500,
  height = 180
}) {
  const canvasRef = useRef(null)

  const isDrawingRef = useRef(false)

  const hasDrawnRef = useRef(false)

  const [isEmpty, setIsEmpty] = useState(!value)

  /*
   * ==========================================================
   * PREPARAR CANVAS
   * ==========================================================
   */

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    /*
     * Configuração visual da assinatura.
     */
    context.lineWidth = 2

    context.lineCap = 'round'

    context.lineJoin = 'round'

    context.strokeStyle = '#111827'

    /*
     * Fundo branco.
     */
    context.fillStyle = '#ffffff'

    context.fillRect(0, 0, canvas.width, canvas.height)

    /*
     * Se já existir uma assinatura salva,
     * carregamos novamente no canvas.
     */
    if (value) {
      const image = new Image()

      image.onload = () => {
        context.drawImage(image, 0, 0, canvas.width, canvas.height)

        hasDrawnRef.current = true

        setIsEmpty(false)
      }

      image.src = value
    } else {
      hasDrawnRef.current = false

      setIsEmpty(true)
    }
  }, [value, width, height])

  /*
   * ==========================================================
   * POSIÇÃO DO MOUSE/TOUCH
   * ==========================================================
   */

  function getCanvasPosition(event) {
    const canvas = canvasRef.current

    if (!canvas) {
      return {
        x: 0,
        y: 0
      }
    }

    const rect = canvas.getBoundingClientRect()

    let clientX
    let clientY

    /*
     * Touch.
     */
    if (event.touches && event.touches.length > 0) {
      clientX = event.touches[0].clientX

      clientY = event.touches[0].clientY
    } else {
      /*
       * Mouse / pointer.
       */
      clientX = event.clientX

      clientY = event.clientY
    }

    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,

      y: ((clientY - rect.top) / rect.height) * canvas.height
    }
  }

  /*
   * ==========================================================
   * INICIAR DESENHO
   * ==========================================================
   */

  function startDrawing(event) {
    if (disabled) {
      return
    }

    event.preventDefault()

    const canvas = canvasRef.current

    const context = canvas?.getContext('2d')

    if (!canvas || !context) {
      return
    }

    const position = getCanvasPosition(event)

    context.beginPath()

    context.moveTo(position.x, position.y)

    isDrawingRef.current = true

    hasDrawnRef.current = true

    setIsEmpty(false)
  }

  /*
   * ==========================================================
   * DESENHAR
   * ==========================================================
   */

  function draw(event) {
    if (disabled || !isDrawingRef.current) {
      return
    }

    event.preventDefault()

    const canvas = canvasRef.current

    const context = canvas?.getContext('2d')

    if (!canvas || !context) {
      return
    }

    const position = getCanvasPosition(event)

    context.lineTo(position.x, position.y)

    context.stroke()
  }

  /*
   * ==========================================================
   * FINALIZAR DESENHO
   * ==========================================================
   */

  function finishDrawing(event) {
    if (!isDrawingRef.current) {
      return
    }

    if (event) {
      event.preventDefault()
    }

    isDrawingRef.current = false

    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    /*
     * Converte a assinatura para PNG.
     */
    const dataUrl = canvas.toDataURL('image/png')

    if (onChange) {
      onChange(dataUrl)
    }
  }

  /*
   * ==========================================================
   * LIMPAR
   * ==========================================================
   */

  function clearSignature() {
    if (disabled) {
      return
    }

    const canvas = canvasRef.current

    const context = canvas?.getContext('2d')

    if (!canvas || !context) {
      return
    }

    context.clearRect(0, 0, canvas.width, canvas.height)

    /*
     * Recria o fundo branco.
     */
    context.fillStyle = '#ffffff'

    context.fillRect(0, 0, canvas.width, canvas.height)

    hasDrawnRef.current = false

    setIsEmpty(true)

    if (onChange) {
      onChange('')
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: '100%'
      }}
    >
      <div
        style={{
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          background: '#ffffff',
          overflow: 'hidden',
          width: '100%',
          maxWidth: `${width}px`
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={finishDrawing}
          onMouseLeave={finishDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={finishDrawing}
          style={{
            display: 'block',
            width: '100%',
            height: `${height}px`,
            cursor: disabled ? 'not-allowed' : 'crosshair',
            touchAction: 'none',
            background: '#ffffff'
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <span
          style={{
            fontSize: '13px',
            color: '#6b7280'
          }}
        >
          {isEmpty
            ? 'Desenhe sua assinatura no campo acima.'
            : 'Assinatura preenchida.'}
        </span>

        <button
          type="button"
          onClick={clearSignature}
          disabled={disabled || isEmpty}
          style={{
            border: '1px solid #d1d5db',
            background: '#ffffff',
            color: '#374151',
            borderRadius: '6px',
            padding: '7px 12px',
            cursor: disabled || isEmpty ? 'not-allowed' : 'pointer',
            opacity: disabled || isEmpty ? 0.5 : 1
          }}
        >
          Limpar assinatura
        </button>
      </div>
    </div>
  )
}
