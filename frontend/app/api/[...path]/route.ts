import { type NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8080";

async function proxy(req: NextRequest): Promise<NextResponse> {
  const path = req.nextUrl.pathname; // e.g. /api/v1/activity
  const search = req.nextUrl.search;
  const url = `${BACKEND}${path}${search}`;

  const headers = new Headers();
  const auth = req.headers.get("authorization");
  if (auth) headers.set("authorization", auth);
  const ct = req.headers.get("content-type");
  if (ct) headers.set("content-type", ct);

  const body =
    req.method !== "GET" && req.method !== "HEAD"
      ? await req.arrayBuffer()
      : undefined;

  const upstream = await fetch(url, {
    method: req.method,
    headers,
    body: body as BodyInit | undefined,
  });

  const data = await upstream.arrayBuffer();
  const resHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    // Skip hop-by-hop headers that Next.js manages
    if (!["transfer-encoding", "connection", "keep-alive"].includes(key)) {
      resHeaders.set(key, value);
    }
  });

  return new NextResponse(data, {
    status: upstream.status,
    headers: resHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
