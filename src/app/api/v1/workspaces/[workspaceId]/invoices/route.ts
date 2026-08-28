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

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where: { workspaceId },
      include: {
        company: { select: { name: true } },
        contact: { select: { name: true, email: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.invoice.count({ where: { workspaceId } }),
  ]);

  return NextResponse.json({
    data: invoices.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      status: i.status,
      subtotal: i.subtotal,
      tax: i.tax,
      total: i.total,
      issueDate: i.issueDate,
      dueDate: i.dueDate,
      paidAt: i.paidAt,
      company: i.company?.name ?? null,
      contact: i.contact ? { name: i.contact.name, email: i.contact.email } : null,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
