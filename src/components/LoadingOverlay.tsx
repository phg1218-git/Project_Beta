export function LoadingOverlay({ message = '로딩 중...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4" role="status" aria-live="polite" aria-busy="true">
      <div className="flex flex-col items-center rounded-2xl bg-white px-10 py-8 shadow-xl">
        <span className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-orange-100 border-t-orange-500" aria-hidden="true" />
        <p className="font-semibold text-gray-800">{message}</p>
      </div>
    </div>
  )
}
