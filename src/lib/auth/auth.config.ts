import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
    newUser: '/signup',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

      if (nextUrl.pathname.startsWith('/admin')) {
        return isLoggedIn || Response.redirect(new URL('/login', nextUrl));
      }

      if (nextUrl.pathname.startsWith('/app')) {
        return isLoggedIn || Response.redirect(new URL('/login', nextUrl));
      }

      return true;
    },
  },
  providers: [],
};
