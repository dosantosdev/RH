import './toast.css'

export default function Toast({ show, message, type = 'success' }) {
  if (!show) return null

  return (
    <div className={`toast toast-${type}`}>
      <span>{message}</span>
    </div>
  )
}
