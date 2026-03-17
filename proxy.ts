import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Rotas públicas (sem autenticação)
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

// Rotas restritas ao ADMIN
const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return NextResponse.next();

  const { userId, sessionClaims } = await auth.protect();

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // Verifica cargo nas metadata do Clerk
  const cargo = (sessionClaims?.metadata as { cargo?: string })?.cargo;

  // Sem cargo cadastrado → redireciona para página de "aguardando acesso"
  if (!cargo) {
    if (req.nextUrl.pathname !== "/sem-acesso") {
      return NextResponse.redirect(new URL("/sem-acesso", req.url));
    }
    return NextResponse.next();
  }

  // Rota admin: apenas ADMIN
  if (isAdminRoute(req) && cargo !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)","/(api|trpc)(.*)"],
};