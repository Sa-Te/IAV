import { type NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8080";

async function proxy(req: NextRequest): Promise<NextResponse> {
  const url = `${BACKEND}${req.nextUrl.pathname}${req.nextUrl.search}`;

  const headers = new Headers();
  const auth = req.headers.get("authorization");
  if (auth) headers.set("authorization", auth);
  const ct = req.headers.get("content-type");
  if (ct) headers.set("content-type", ct);

  const body =
    req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined;

  const upstream = await fetch(url, { method: req.method, headers, body });

  // Stream the response directly — never buffer large payloads
  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
