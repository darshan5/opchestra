import type { NextAuthConfig } from 'next-auth';

import bcrypt from 'bcryptjs';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';

import { prisma } from '@/lib/db';

import { authConfig } from './auth.config';

export const fullAuthConfig: NextAuthConfig = {
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = z
          .object({
            email: z.string().email(),
            password: z.string().min(8),
          })
          .safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user?.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        if (!user.emailVerified) {
          throw new Error('EMAIL_NOT_VERIFIED');
        }

        if (!user.isSaasAdmin) {
          const platformSettings = await prisma.platformSettings.findUnique({
            where: { id: 'platform' },
            select: { disableLogin: true },
          });
          if (platformSettings?.disableLogin) {
            throw new Error('LOGIN_DISABLED');
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
};
