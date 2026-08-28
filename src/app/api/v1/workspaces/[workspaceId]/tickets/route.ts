import crypto from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

async function authenticateApiKey(req: NextRequest, workspaceId: string) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const key = authHeader.slice(7);
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');
  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } });
  if (!apiKey || apiKey.workspaceId !== workspaceId) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;
  await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
  return apiKey;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const apiKey = await authenticateApiKey(req, workspaceId);
  if (!apiKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20')));
  const skip = (page - 1) * limit;

  const where = { workspaceId, ticketNumber: { not: null } } as const;

  const [tickets, total] = await Promise.all([
    prisma.task.findMany({
      where,
      select: {
        id: true,
        title: true,
        ticketNumber: true,
        status: true,
        priority: true,
        createdAt: true,
        completedAt: true,
        contact: { select: { name: true, email: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.task.count({ where }),
  ]);

  return NextResponse.json({
    data: tickets.map((t) => ({
      id: t.id,
      title: t.title,
      ticketNumber: t.ticketNumber,
      status: t.status,
      priority: t.priority,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
      contact: t.contact ? { name: t.contact.name, email: t.contact.email } : null,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
