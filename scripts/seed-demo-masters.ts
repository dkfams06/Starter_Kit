import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true, quiet: true });

async function main() {
  if (process.env.DEMO_MODE !== "true" || !process.env.DEMO_DATABASE_NAME) {
    throw new Error("DEMO_MODE=true and an explicit DEMO_DATABASE_NAME are required.");
  }
  // Instantiate the client only after .env.local has been loaded.
  const { prisma } = await import("../src/lib/prisma");
  try {
  const database = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
  if (database[0].name !== process.env.DEMO_DATABASE_NAME) throw new Error("Demo database identity mismatch.");
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock_shared(73110402)`;
    for (const suffix of ["001", "002", "003"]) {
      const code = `DEMO-C-${suffix}`;
      if (await tx.customer.findUnique({ where: { code } })) continue;
      const item = await tx.customer.create({ data: {
        code, name: `(가상) 데모 거래처 ${suffix}`, defaultAddress: "가상 배송지 · 실제 주소 아님", memo: "포트폴리오 체험용 가상 데이터",
      } });
      await tx.auditLog.create({ data: { action: "CUSTOMER_CREATED", targetType: "Customer", targetId: item.id, metadata: { source: "demo-seed", code } } });
    }
    for (const [suffix, name, unit, price] of [
      ["001", "샘플 포장 박스", "BOX", "1250.00"],
      ["002", "샘플 보호 패드", "EA", "350.50"],
      ["003", "샘플 포장 테이프", "EA", "2800.00"],
    ]) {
      const code = `DEMO-P-${suffix}`;
      if (await tx.product.findUnique({ where: { code } })) continue;
      const item = await tx.product.create({ data: { code, name, unit, defaultUnitPrice: price, memo: "포트폴리오 체험용 가상 데이터" } });
      await tx.auditLog.create({ data: { action: "PRODUCT_CREATED", targetType: "Product", targetId: item.id, metadata: { source: "demo-seed", code } } });
    }
  });
  console.log("Demo master records prepared. Existing records were preserved.");
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error("Demo seed failed; verify demo mode and database identity."); process.exitCode = 1; });
