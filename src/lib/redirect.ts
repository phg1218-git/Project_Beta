export function safeRedirect(url: string, baseUrl: string): string {
  try {
    const base = new URL(baseUrl)
    const target = new URL(url, base)
    if (target.origin === base.origin && !target.username && !target.password) {
      return target.href
    }
  } catch {
    // 잘못된 URL은 기본 화면으로 복귀한다.
  }
  return baseUrl
}

export function safeReturnPath(value: string | null, fallback = '/products'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback
  const base = 'https://return.invalid'
  const resolved = safeRedirect(value, base)
  if (resolved === base) return fallback
  const url = new URL(resolved)
  if (['/login', '/profile/setup'].some((path) => url.pathname === path || url.pathname.startsWith(path + '/'))) {
    return fallback
  }
  return url.pathname + url.search + url.hash
}
