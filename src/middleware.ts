export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - /login (auth page)
     * - /api/auth/* (NextAuth endpoints)
     * - /_next/static (static files)
     * - /_next/image (image optimization)
     * - /favicon.ico
     */
    '/((?!login|api/auth|_next/static|_next/image|favicon\\.ico).*)',
  ],
}
