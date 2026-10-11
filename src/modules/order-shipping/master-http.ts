import { errorResponse, HttpError } from "@/lib/http-error";

export function masterError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
  if (code === "P2002") return Response.json({ error: "이미 사용 중인 코드입니다." }, { status: 409 });
  if (code === "P2025") return Response.json({ error: "항목을 찾을 수 없습니다." }, { status: 404 });
  if (code === "P2003") return Response.json({ error: "사용 중인 항목은 삭제할 수 없습니다. 비활성화해 주세요." }, { status: 409 });
  if (code === "P2034") return Response.json({ error: "다른 요청이 처리 중입니다. 다시 시도해 주세요." }, { status: 409 });
  return errorResponse(error);
}

export function assertSameOrigin(request: Request) {
  const expected = process.env.AUTH_URL || process.env.NEXTAUTH_URL || request.url;
  const origin = request.headers.get("origin");
  try {
    if (origin && [new URL(expected).origin, new URL(request.url).origin].includes(new URL(origin).origin)) return;
  } catch { /* Malformed origins are rejected as well. */ }
  throw new HttpError("허용되지 않은 요청입니다.", 403, "INVALID_ORIGIN");
}
