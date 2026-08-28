import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; companyId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { workspaceId, companyId } = await params;
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        contacts: { orderBy: { name: 'asc' } },
        _count: { select: { contacts: true, ticketsByCompany: true } },
      },
    });
    if (!company || company.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; companyId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { workspaceId, companyId } = await params;
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.company.findUnique({ where: { id: companyId } });
    if (!existing || existing.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};
    const fields = [
      'name', 'domain', 'industry',
      'hourlyRate', 'clientSince', 'companySize', 'annualRevenue',
      'billingAddress', 'billingAddress2', 'billingCity',
      'billingState', 'billingZip', 'billingCountry',
      'pipelineStageId',
    ];
    for (const f of fields) {
      if (body[f] !== undefined) {
        if (f === 'hourlyRate' || f === 'annualRevenue') {
          data[f] = body[f] !== null ? parseFloat(body[f]) : null;
        } else if (f === 'clientSince') {
          data[f] = body[f] ? new Date(body[f]) : null;
        } else {
          data[f] = body[f];
        }
      }
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json(existing);
    }
    const company = await prisma.company.update({
      where: { id: companyId },
      data,
    });

    return NextResponse.json(company);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; companyId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { workspaceId, companyId } = await params;
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.company.findUnique({ where: { id: companyId } });
    if (!existing || existing.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.note.deleteMany({ where: { entityType: 'company', entityId: companyId } });
    await prisma.company.delete({ where: { id: companyId } });
    return NextResponse.json({ message: 'Deleted' });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
