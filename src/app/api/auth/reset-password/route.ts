import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';

import { resetPasswordRequestSchema, resetPasswordSchema } from '@/lib/auth/validation';
import { prisma } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.token) {
      const parsed = resetPasswordSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      }

      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token: parsed.data.token },
      });

      if (!resetToken || resetToken.expiresAt < new Date()) {
        if (resetToken) {
          await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
        }
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
      }

      const passwordHash = await bcrypt.hash(parsed.data.password, 12);

      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetToken.userId },
          data: { passwordHash },
        }),
        prisma.passwordResetToken.delete({ where: { id: resetToken.id } }),
      ]);

      return NextResponse.json({ message: 'Password reset successfully' });
    }

    const parsed = resetPasswordRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ message: 'If an account exists, a reset link has been sent' });
    }

    const token = uuid();
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await sendPasswordResetEmail(user.email, token);

    return NextResponse.json({ message: 'If an account exists, a reset link has been sent' });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
