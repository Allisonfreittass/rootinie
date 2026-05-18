export function applyTheme(mode) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(mode === 'dark' ? 'dark' : 'light');
}

export async function initTheme() {
  const current = await window.devlog.theme.current();
  applyTheme(current);
  window.devlog.theme.onChange(applyTheme);
}
