import { NextResponse } from 'next/server';

import { logAuditEvent } from '@/lib/audit';
import { auth } from '@/lib/auth';
import { isSaasAdmin } from '@/lib/auth/admin';
import { prisma } from '@/lib/db';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id || !(await isSaasAdmin(session.user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    if (id === session.user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || !target.isSaasAdmin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    await prisma.user.update({
      where: { id },
      data: { isSaasAdmin: false },
    });

    await logAuditEvent('REMOVE_ADMIN', session.user.id, id, { email: target.email });

    return NextResponse.json({ message: 'Admin removed' });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
