export function maskCPF(value) {
  const cleaned = value.replace(/\D/g, '').slice(0, 11)

  return cleaned
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function maskCEP(value) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 9)
}

export function maskDate(value) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .slice(0, 10)
}

export function maskRG(value, foreigner) {
  if (foreigner) {
    return value.toUpperCase()
  }

  return value.replace(/\D/g, '')
}
