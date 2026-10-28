import { adminAuth } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { defaults, getHomeContent } from '@/lib/site-content'
import { NextResponse } from 'next/server'
export async function GET() {
 if ((await adminAuth())?.user?.role !== 'ADMIN') return NextResponse.json({error:'권한 없음'},{status:403})
 return NextResponse.json(await getHomeContent())
}
export async function PUT(req: Request) {
 if ((await adminAuth())?.user?.role !== 'ADMIN') return NextResponse.json({error:'권한 없음'},{status:403})
 const body = await req.json().catch(() => null)
 if (!body || Object.keys(defaults).some(k => typeof body[k] !== 'string' || !body[k].trim() || body[k].length > 5000)) return NextResponse.json({error:'입력값 확인'},{status:400})
 const data = JSON.stringify(Object.fromEntries(Object.keys(defaults).map(k => [k,body[k].trim()])))
 await prisma.$executeRaw`INSERT INTO "SiteContent" (id,data,"updatedAt") VALUES ('home',${data}::jsonb,NOW()) ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data,"updatedAt"=NOW()`
 return NextResponse.json({success:true})
}
