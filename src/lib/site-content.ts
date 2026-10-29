import { prisma } from '@/lib/prisma'
export const defaults = {
  title: '제주 조천읍 만생귤',
  introduction: '늘 드시던 우리 귤, 올해도 반갑게 만나보세요.',
  storyTitle: '우리 귤은 만생귤입니다',
  story: '조생귤보다 늦게 익는 만생귤입니다. 제주 조천읍 농장에서 직접 키우고 포장해 보내드립니다.',
}
export async function getHomeContent() {
 const rows = await prisma.$queryRaw<{data: typeof defaults}[]>`SELECT data FROM "SiteContent" WHERE id = 'home'`
 return {...defaults,...rows[0]?.data}
}
