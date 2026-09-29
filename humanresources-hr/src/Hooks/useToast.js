import { useEffect, useRef, useState } from 'react'

export default function useToast() {
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success'
  })

  const timeoutRef = useRef(null)

  function showToast(message, type = 'success') {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    setToast({
      show: true,
      message,
      type
    })

    timeoutRef.current = setTimeout(() => {
      setToast((prev) => ({
        ...prev,
        show: false
      }))
    }, 3000)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    toast,
    showToast
  }
}
