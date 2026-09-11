-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('NABAVKA', 'IZDAVANJE', 'POVRACAJ', 'OTPAD', 'KOREKCIJA');

-- CreateEnum
CREATE TYPE "ProductMovementType" AS ENUM ('PROIZVODNJA', 'PRODAJA', 'POVRACAJ_PRODAJE', 'KOREKCIJA');

-- AlterTable — purchase_price se PREIMENUJE (zatečena vrednost je validan početni prosek),
-- ne briše se i ne dodaje ponovo, jer bi to obrisalo podatke.
ALTER TABLE "materials" RENAME COLUMN "purchase_price" TO "avg_purchase_price";
ALTER TABLE "materials" ALTER COLUMN "avg_purchase_price" TYPE DECIMAL(12,4);
ALTER TABLE "materials" ALTER COLUMN "avg_purchase_price" SET DEFAULT 0;
ALTER TABLE "materials" RENAME CONSTRAINT "materials_purchase_price_non_negative" TO "materials_avg_purchase_price_non_negative";
ALTER TABLE "materials" ADD COLUMN     "reserved" DECIMAL(12,3) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "reserved" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "material_purchases" (
    "id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "supplier_id" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit_price" DECIMAL(12,4) NOT NULL,
    "total_cost" DECIMAL(12,2) NOT NULL,
    "document_no" TEXT,
    "purchased_at" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit_price" DECIMAL(12,4) NOT NULL,
    "purchase_id" TEXT,
    "batch_id" TEXT,
    "note" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_stock_movements" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "type" "ProductMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_cost" DECIMAL(12,4),
    "batch_id" TEXT,
    "order_id" TEXT,
    "note" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "material_purchases_material_id_purchased_at_idx" ON "material_purchases"("material_id", "purchased_at");

-- CreateIndex
CREATE INDEX "stock_movements_material_id_created_at_idx" ON "stock_movements"("material_id", "created_at");

-- CreateIndex
CREATE INDEX "stock_movements_batch_id_idx" ON "stock_movements"("batch_id");

-- CreateIndex
CREATE INDEX "product_stock_movements_product_id_created_at_idx" ON "product_stock_movements"("product_id", "created_at");

-- AddForeignKey
ALTER TABLE "material_purchases" ADD CONSTRAINT "material_purchases_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_purchases" ADD CONSTRAINT "material_purchases_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_purchases" ADD CONSTRAINT "material_purchases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "material_purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_stock_movements" ADD CONSTRAINT "product_stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_stock_movements" ADD CONSTRAINT "product_stock_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "materials" ADD CONSTRAINT "materials_reserved_nonneg" CHECK ("reserved" >= 0);
ALTER TABLE "materials" ADD CONSTRAINT "materials_reserved_lte_stock" CHECK ("reserved" <= "stock");
ALTER TABLE "products" ADD CONSTRAINT "products_reserved_nonneg" CHECK ("reserved" >= 0);
ALTER TABLE "products" ADD CONSTRAINT "products_reserved_lte_stock" CHECK ("reserved" <= "stock");
ALTER TABLE "material_purchases" ADD CONSTRAINT "purchase_qty_pos" CHECK ("quantity" > 0);
ALTER TABLE "material_purchases" ADD CONSTRAINT "purchase_price_nonneg" CHECK ("unit_price" >= 0);
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movement_qty_pos" CHECK ("quantity" > 0);
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movement_price_nonneg" CHECK ("unit_price" >= 0);
ALTER TABLE "product_stock_movements" ADD CONSTRAINT "product_movement_qty_pos" CHECK ("quantity" > 0);

-- Migracija zatečenih podataka: postojeće stanje svake sirovine postaje "početna nabavka",
-- da bi stock, prosečna cena i istorija kretanja bili međusobno konzistentni.
DO $$
DECLARE
  actor TEXT;
BEGIN
  SELECT "id" INTO actor FROM "users" WHERE "role" = 'ADMIN' AND "active" = true ORDER BY "created_at" LIMIT 1;
  IF actor IS NULL THEN
    SELECT "id" INTO actor FROM "users" ORDER BY "created_at" LIMIT 1;
  END IF;
  IF actor IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO "material_purchases" ("id", "material_id", "supplier_id", "quantity", "unit_price", "total_cost", "document_no", "purchased_at", "note", "created_by", "created_at")
  SELECT 'init_purchase_' || m."id", m."id", m."supplier_id", m."stock", m."avg_purchase_price",
         ROUND(m."stock" * m."avg_purchase_price", 2), NULL, NOW(),
         'Početno stanje preneto pri uvođenju evidencije nabavki', actor, NOW()
  FROM "materials" m
  WHERE m."stock" > 0;

  INSERT INTO "stock_movements" ("id", "material_id", "type", "quantity", "unit_price", "purchase_id", "batch_id", "note", "created_by", "created_at")
  SELECT 'init_movement_' || m."id", m."id", 'NABAVKA', m."stock", m."avg_purchase_price",
         'init_purchase_' || m."id", NULL, 'Početno stanje', actor, NOW()
  FROM "materials" m
  WHERE m."stock" > 0;
END
$$;
