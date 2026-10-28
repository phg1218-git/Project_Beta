interface PageHeaderProps {
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
}

// 고객 화면 공통 페이지 제목 바 (뒤로가기는 상단 헤더, 홈·농장소개·첫 로그인은 별도 히어로)
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="px-4 py-4 bg-white border-b border-gray-100 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold text-gray-900 truncate">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  )
}
