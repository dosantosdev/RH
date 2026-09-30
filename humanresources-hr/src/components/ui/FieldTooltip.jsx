import './fieldTooltip.css'

export default function FieldTooltip({ message, visible }) {
  if (!message || !visible) {
    return null
  }

  return (
    <div className="field-tooltip" role="alert">
      {message}
    </div>
  )
}
