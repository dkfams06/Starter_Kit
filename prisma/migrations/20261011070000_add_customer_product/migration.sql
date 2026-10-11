ALTER TYPE "AuditAction" ADD VALUE 'CUSTOMER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CUSTOMER_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'CUSTOMER_DEACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'CUSTOMER_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'PRODUCT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PRODUCT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PRODUCT_DEACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'PRODUCT_DELETED';

CREATE TABLE "Customer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "businessNumber" TEXT,
  "contactName" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "defaultAddress" TEXT,
  "memo" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");
CREATE INDEX "Customer_isActive_name_idx" ON "Customer"("isActive", "name");

CREATE TABLE "Product" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "specification" TEXT,
  "unit" TEXT NOT NULL,
  "defaultUnitPrice" DECIMAL(14,2) CHECK ("defaultUnitPrice" >= 0),
  "memo" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");
CREATE INDEX "Product_isActive_name_idx" ON "Product"("isActive", "name");
