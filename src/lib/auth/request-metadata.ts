export function getRequestMetadata(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";

  return {
    ipAddress: ipAddress.slice(0, 64),
    userAgent: request.headers.get("user-agent")?.slice(0, 512) ?? null,
  };
}
