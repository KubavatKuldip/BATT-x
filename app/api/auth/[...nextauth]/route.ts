// @ts-nocheck - NextAuth v5 beta type incompatibility with Next.js 16 generated types
//
// NextAuth v5 returns { handlers: { GET, POST }, ... } from a single
// NextAuth() call. To avoid two competing instances (one here, one in
// lib/auth.ts) we'd otherwise end up with two sets of session cookies
// and JWTs that don't verify against each other. So this file just
// re-exports the handlers produced in lib/auth.ts.
//
// Earlier this file did its own `const handler = NextAuth(authOptions);`
// and exported `handler as GET, handler as POST`, which broke at request
// time with:
//   "TypeError: Function.prototype.apply was called on #<Object>"
// because Next was trying to call the object as a function.
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
