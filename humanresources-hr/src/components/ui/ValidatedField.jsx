import { cloneElement } from 'react'
import FieldTooltip from './FieldTooltip'

export default function ValidatedField({
  name,
  error,
  children,
  wrapperClassName = '',
  inputClassName = ''
}) {
  const childClassName = [
    children.props.className,
    inputClassName,
    error ? 'field-error' : ''
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={`field-tooltip-wrapper ${wrapperClassName}`.trim()}
      data-error-field={name}
    >
      {cloneElement(children, {
        name,
        className: childClassName
      })}

      <FieldTooltip
        message={error}
        visible={Boolean(error)}
      />
    </div>
  )
}
