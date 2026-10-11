import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof ZodError || error instanceof SyntaxError) {
    return Response.json(
      { error: "입력값을 확인해 주세요.", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  if (error instanceof HttpError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    return Response.json(
      { error: "이미 사용 중인 이메일입니다.", code: "EMAIL_CONFLICT" },
      { status: 409 },
    );
  }

  return Response.json(
    { error: "요청을 처리하지 못했습니다.", code: "INTERNAL_ERROR" },
    { status: 500 },
  );
}
