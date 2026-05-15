import { maskCPF, maskCEP, maskDate, maskRG } from './masks'

export function createHandleChange(form, setForm) {
  return function handleChange(e) {
    const { name, value, type, checked } = e.target

    if (type === 'checkbox') {
      setForm((prev) => ({
        ...prev,
        [name]: checked
      }))

      return
    }

    let newValue = value

    if (name === 'cpf') {
      newValue = maskCPF(value)
    }

    if (name === 'cep') {
      newValue = maskCEP(value)
    }

    if (
      name === 'birthDate' ||
      name === 'admissionDate' ||
      name === 'dismissalDate' ||
      name === 'cnhDate' ||
      name === 'rgDate' ||
      name === 'livingSince' ||
      name === 'spouseBirthDate' ||
      name === 'marriageDate' ||
      name === 'cnhValidity'
    ) {
      newValue = maskDate(value)
    }

    if (name === 'rg') {
      newValue = maskRG(value, form.foreigner)
    }

    setForm((prev) => ({
      ...prev,
      [name]: newValue
    }))
  }
}

export function handleCheckboxArray(e, field, setForm) {
  const { value, checked } = e.target

  setForm((prev) => ({
    ...prev,

    [field]: checked
      ? [...prev[field], value]
      : prev[field].filter((item) => item !== value)
  }))
}

export function handleDependents(count, form, setForm) {
  const total = Number(count)

  const updatedDependents = Array.from({ length: total }, (_, index) => ({
    id: index + 1,

    name: form.dependents?.[index]?.name || '',

    cpf: form.dependents?.[index]?.cpf || '',

    birthDate: form.dependents?.[index]?.birthDate || '',

    rg: form.dependents?.[index]?.rg || ''
  }))

  setForm((prev) => ({
    ...prev,

    dependentsCount: total,

    dependents: updatedDependents
  }))
}

export function handleDependentChange(index, field, value, form, setForm) {
  const updated = [...(form.dependents || [])]

  updated[index][field] = value

  setForm((prev) => ({
    ...prev,

    dependents: updated
  }))
}
