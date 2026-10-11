import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/auth/audit";
import { HttpError } from "@/lib/http-error";
import { assertMasterAccess } from "./master-policy";
import { productSchema, updateProductSchema, deleteMasterSchema, masterQuerySchema } from "./master-validation";

export async function listProducts(actor: CurrentUser, query: unknown = {}) {
  assertMasterAccess(actor);
  const { q, active, page } = masterQuerySchema.parse(query);
  const where: Prisma.ProductWhereInput = {
    ...(active === "all" ? {} : { isActive: active === "true" }),
    ...(q ? { OR: [{ code: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({ where, orderBy: [{ name: "asc" }, { id: "asc" }], take: 20, skip: (page - 1) * 20 }),
    prisma.product.count({ where }),
  ]);
  return { items, total, page, pageSize: 20 };
}

export async function getProduct(actor: CurrentUser, id: string) {
  assertMasterAccess(actor);
  const item = await prisma.product.findUnique({ where: { id } });
  if (!item) throw new HttpError("품목를 찾을 수 없습니다.", 404, "NOT_FOUND");
  return item;
}

export async function createProduct(actor: CurrentUser, input: unknown) {
  assertMasterAccess(actor, true);
  const data = productSchema.parse(input);
  return prisma.$transaction(async tx => {
    const item = await tx.product.create({ data });
    await writeAuditLog({ actorId: actor.id, action: "PRODUCT_CREATED", targetType: "Product", targetId: item.id, metadata: { code: item.code } }, tx);
    return item;
  });
}

export async function updateProduct(actor: CurrentUser, id: string, input: unknown) {
  assertMasterAccess(actor, true);
  const data = updateProductSchema.parse(input);
  return prisma.$transaction(async tx => {
    const previous = await tx.product.findUniqueOrThrow({ where: { id } });
    const item = await tx.product.update({ where: { id }, data });
    await writeAuditLog({
      actorId: actor.id, action: previous.isActive && !item.isActive ? "PRODUCT_DEACTIVATED" : "PRODUCT_UPDATED",
      targetType: "Product", targetId: id,
      metadata: { code: item.code, changedFields: Object.keys(data), isActive: item.isActive },
    }, tx);
    return item;
  }, { isolationLevel: "Serializable" });
}

export async function deleteProduct(actor: CurrentUser, id: string, input: unknown) {
  assertMasterAccess(actor, true);
  const { reason } = deleteMasterSchema.parse(input);
  return prisma.$transaction(async tx => {
    const item = await tx.product.findUniqueOrThrow({ where: { id } });
    // Order references do not exist in this release. Order integration must add
    // history checks and RESTRICT foreign keys before accepting orders.
    await tx.product.delete({ where: { id } });
    await writeAuditLog({ actorId: actor.id, action: "PRODUCT_DELETED", targetType: "Product", targetId: id, metadata: { code: item.code, reason } }, tx);
  }, { isolationLevel: "Serializable" });
}
