import { requiredFieldsConfig } from '../data/requiredFields'

const STORAGE_KEY = 'requiredFields'

function createDefaultConfig() {
  return Object.fromEntries(
    Object.entries(requiredFieldsConfig).map(([sectionKey, section]) => [
      sectionKey,
      Object.fromEntries(
        Object.entries(section.fields).map(([fieldKey, field]) => [
          fieldKey,
          field.required
        ])
      )
    ])
  )
}

function mergeWithDefaultConfig(storedConfig) {
  const defaultConfig = createDefaultConfig()

  return Object.fromEntries(
    Object.entries(defaultConfig).map(([sectionKey, section]) => [
      sectionKey,
      Object.fromEntries(
        Object.entries(section).map(([fieldKey, defaultValue]) => [
          fieldKey,
          storedConfig?.[sectionKey]?.[fieldKey] ?? defaultValue
        ])
      )
    ])
  )
}

export function getRequiredFields() {
  const stored = localStorage.getItem(STORAGE_KEY)

  if (!stored) {
    const defaultConfig = createDefaultConfig()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultConfig))
    return defaultConfig
  }

  try {
    const parsed = JSON.parse(stored)
    const mergedConfig = mergeWithDefaultConfig(parsed)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedConfig))

    return mergedConfig
  } catch {
    const defaultConfig = createDefaultConfig()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultConfig))
    return defaultConfig
  }
}

export function saveRequiredFields(config) {
  const mergedConfig = mergeWithDefaultConfig(config)

  localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedConfig))

  return mergedConfig
}

export function isFieldRequired(section, field) {
  const config = getRequiredFields()

  return Boolean(config?.[section]?.[field])
}

export function getRequiredFieldsStructure() {
  return requiredFieldsConfig
}
