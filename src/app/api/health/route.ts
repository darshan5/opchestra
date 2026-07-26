import { prisma } from '@/lib/db';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ db: 'connected', status: 'healthy' });
  } catch {
    return Response.json({ db: 'disconnected', status: 'unhealthy' }, { status: 503 });
  }
}
