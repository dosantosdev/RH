export function toggleTheme() {
  const isDark = document.body.classList.contains('dark')
  const newTheme = isDark ? 'light' : 'dark'

  document.body.classList.remove('light', 'dark')
  document.body.classList.add(newTheme)

  localStorage.setItem('theme', newTheme)

  // 👇 DISPARA EVENTO GLOBAL
  window.dispatchEvent(new Event('themeChange'))
}
