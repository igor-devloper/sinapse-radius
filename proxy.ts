import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)", "/api/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return NextResponse.next();

  const { userId, sessionClaims } = await auth.protect();

  if (req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // ⚠️ Tenta ambos os caminhos possíveis do metadata
  const cargo =
    (sessionClaims?.publicMetadata as { cargo?: string })?.cargo ??
    (sessionClaims?.metadata as { cargo?: string })?.cargo ??
    (sessionClaims as Record<string, unknown>)?.cargo as string | undefined;

  if (!cargo) {
    if (req.nextUrl.pathname !== "/sem-acesso") {
      return NextResponse.redirect(new URL("/sem-acesso", req.url));
    }
    return NextResponse.next();
  }

  if (req.nextUrl.pathname === "/sem-acesso") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

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