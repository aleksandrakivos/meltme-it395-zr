import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";
import { canAccessRoute, isAppRoute, isLoginRoute } from "@/lib/routes";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(isLoggedIn ? "/dashboard" : "/login", req.nextUrl),
    );
  }

  if (isAppRoute(pathname) && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginRoute(pathname) && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  if (
    isAppRoute(pathname) &&
    isLoggedIn &&
    role &&
    !canAccessRoute(pathname, role)
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard/:path*",
    "/materials/:path*",
    "/purchases/:path*",
    "/movements/:path*",
    "/suppliers/:path*",
    "/recipes/:path*",
    "/batches/:path*",
    "/products/:path*",
    "/customers/:path*",
    "/orders/:path*",
    "/users/:path*",
    "/reports/:path*",
    "/profile/:path*",
  ],
};
