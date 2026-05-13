import { useState } from 'react'

export default function useToast() {
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success'
  })

  function showToast(message, type = 'success') {
    setToast({
      show: true,
      message,
      type
    })

    setTimeout(() => {
      setToast((prev) => ({
        ...prev,
        show: false
      }))
    }, 3000)
  }

  return {
    toast,
    showToast
  }
}
