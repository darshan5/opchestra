import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { sendTaskReminderEmail } from '@/lib/email';

export async function POST() {
  try {
    const now = new Date();

    const dueReminders = await prisma.taskReminder.findMany({
      where: {
        sent: false,
        triggerAt: { lte: now },
      },
      include: {
        task: { select: { title: true, id: true } },
        user: { select: { email: true, name: true } },
        workspace: { select: { name: true, slug: true } },
      },
      take: 50,
    });

    let sent = 0;
    for (const r of dueReminders) {
      try {
        const taskUrl = `${process.env.NEXTAUTH_URL}/app/${r.workspace.slug}/all-tasks?task=${r.task.id}`;

        await sendTaskReminderEmail(
          r.user.email,
          r.task.title,
          r.reminderType,
          r.workspace.name,
          taskUrl,
        );

        await prisma.taskReminder.update({
          where: { id: r.id },
          data: { sent: true },
        });

        sent++;
      } catch {
        // skip failed individual reminders
      }
    }

    return NextResponse.json({ processed: dueReminders.length, sent });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
