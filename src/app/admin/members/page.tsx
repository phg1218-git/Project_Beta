import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { formatPhoneNumber } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function getMembers() {
  try {
    return await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    })
  } catch {
    return []
  }
}

export default async function AdminMembersPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/')
  }

  const members = await getMembers()

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">👥 회원 관리</h1>
        <p className="text-gray-500 mt-1">전체 회원 {members.length}명</p>
      </div>

      {/* 회원 목록 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {members.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            등록된 회원이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">회원</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">연락처</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">주소</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">주문수</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">권한</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">가입일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                          {member.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={member.image}
                              alt={member.name || ''}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-lg">👤</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {member.name || '이름 없음'}
                          </p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {member.phone ? formatPhoneNumber(member.phone) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 truncate max-w-[200px] block">
                        {member.addressBase || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-900">
                        {member._count.orders}건
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        member.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {member.role === 'ADMIN' ? '관리자' : '일반회원'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">
                        {new Date(member.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}