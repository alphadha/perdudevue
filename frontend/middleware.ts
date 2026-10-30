import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const guards: Array<{ prefix: string; login: string }> = [
  { prefix: "/client", login: "/login?space=client" },
  { prefix: "/opticien", login: "/login?space=opticien" },
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const guard = guards.find((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`));
  if (!guard) {
    return NextResponse.next();
  }

  if (!request.cookies.get("pdv_token")?.value) {
    const url = request.nextUrl.clone();
    const [path, query] = guard.login.split("?");
    url.pathname = path;
    url.search = query ? `?${query}` : "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/client/:path*", "/client", "/opticien/:path*", "/opticien"],
};
