import NextAuth from 'next-auth';

import { fullAuthConfig } from './config';

export const { auth, handlers, signIn, signOut } = NextAuth(fullAuthConfig);
