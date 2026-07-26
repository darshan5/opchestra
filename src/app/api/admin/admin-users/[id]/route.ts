import { NextResponse } from 'next/server';

import { logAuditEvent } from '@/lib/audit';
import { getAdminSession } from '@/lib/auth/admin-session';
import { prisma } from '@/lib/db';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminSession();
    if (!admin || admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    if (id === admin.id) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
    }

    const target = await prisma.adminUser.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    await prisma.adminUser.delete({ where: { id } });

    await logAuditEvent('REMOVE_ADMIN', admin.id, null, { email: target.email });

    return NextResponse.json({ message: 'Admin removed' });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
