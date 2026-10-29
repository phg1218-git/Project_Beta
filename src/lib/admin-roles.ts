// 최고관리자 명단은 서버 환경변수에서만 관리한다. DB의 ADMIN 권한만으로는
// 다른 회원의 권한을 변경할 수 없다.
export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .some((entry) => entry.trim().toLowerCase() === normalized)
}
