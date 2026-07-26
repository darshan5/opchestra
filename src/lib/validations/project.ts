import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  description: z.string().max(1000).optional(),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});
