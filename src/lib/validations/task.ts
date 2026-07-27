import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.any().optional(),
  status: z.string().optional(),
  priority: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  parentTaskId: z.string().uuid().optional().nullable(),
  taskGroupId: z.string().uuid().optional().nullable(),
  phaseId: z.string().uuid().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  timeEstimate: z.number().int().min(0).optional().nullable(),
  isMilestone: z.boolean().optional(),
  labels: z.array(z.string()).optional(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  position: z.number().optional(),
});

export const createCommentSchema = z.object({
  content: z.any(),
});

export const createDependencySchema = z.object({
  dependsOnId: z.string().uuid(),
  type: z.enum(['FS', 'SS', 'FF', 'SF']).optional(),
  mode: z.enum(['STRICT', 'FLEXIBLE']).optional(),
});
