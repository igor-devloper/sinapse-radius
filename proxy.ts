import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Rotas públicas passam direto
  if (isPublicRoute(req)) return NextResponse.next();

  // Protege todas as outras rotas — redireciona para /sign-in se não autenticado
  const { userId, sessionClaims } = await auth.protect();

  // Redireciona raiz para /dashboard (fallback caso env não resolva)
  if (req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const cargo = (sessionClaims?.publicMetadata as { cargo?: string })?.cargo;

  // Sem cargo: só pode acessar /sem-acesso
  if (!cargo) {
    if (req.nextUrl.pathname !== "/sem-acesso") {
      return NextResponse.redirect(new URL("/sem-acesso", req.url));
    }
    return NextResponse.next();
  }

  // Com cargo: bloqueia /sem-acesso
  if (req.nextUrl.pathname === "/sem-acesso") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Rotas admin: só ADMIN
  if (isAdminRoute(req) && cargo !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};