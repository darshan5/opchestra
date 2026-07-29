import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_TEST_ENDPOINTS) {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
  }

  const body = await request.json();
  const taskIds: string[] = body.taskIds ?? [];

  if (taskIds.length === 0) {
    return NextResponse.json({ error: 'taskIds required' }, { status: 400 });
  }

  const orphans: Record<string, number> = {};

  const [
    timeEntries,
    comments,
    activeTimers,
    taskLabels,
    customFieldValues,
    notes,
    files,
    taskDependencies,
  ] = await Promise.all([
    prisma.timeEntry.count({ where: { taskId: { in: taskIds } } }),
    prisma.comment.count({ where: { taskId: { in: taskIds } } }),
    prisma.activeTimer.count({ where: { taskId: { in: taskIds } } }),
    prisma.taskLabel.count({ where: { taskId: { in: taskIds } } }),
    prisma.customFieldValue.count({ where: { taskId: { in: taskIds } } }),
    prisma.note.count({ where: { entityType: 'task', entityId: { in: taskIds } } }),
    prisma.file.count({ where: { taskId: { in: taskIds } } }),
    prisma.taskDependency.count({
      where: { OR: [{ taskId: { in: taskIds } }, { dependsOnId: { in: taskIds } }] },
    }),
  ]);

  if (timeEntries > 0) orphans.timeEntries = timeEntries;
  if (comments > 0) orphans.comments = comments;
  if (activeTimers > 0) orphans.activeTimers = activeTimers;
  if (taskLabels > 0) orphans.taskLabels = taskLabels;
  if (customFieldValues > 0) orphans.customFieldValues = customFieldValues;
  if (notes > 0) orphans.notes = notes;
  if (files > 0) orphans.files = files;
  if (taskDependencies > 0) orphans.taskDependencies = taskDependencies;

  const tasks = await prisma.task.count({ where: { id: { in: taskIds } } });
  if (tasks > 0) orphans.tasksStillExist = tasks;

  return NextResponse.json({
    clean: Object.keys(orphans).length === 0,
    orphans,
    checkedTaskIds: taskIds,
  });
}
