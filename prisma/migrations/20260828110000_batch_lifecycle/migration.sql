-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PLANIRANA', 'ZAPOCETA', 'U_TOKU', 'ZAVRSENA', 'DELIMICNO_USPESNA', 'OTKAZANA');

-- AlterTable — kolone se PREIMENUJU, ne brišu: zatečene serije moraju preživeti.
ALTER TABLE "production_batches" DROP CONSTRAINT "production_batches_quantity_positive";
ALTER TABLE "production_batches" RENAME COLUMN "date" TO "planned_at";
ALTER TABLE "production_batches" RENAME COLUMN "quantity" TO "planned_quantity";

ALTER TABLE "production_batches" ADD COLUMN     "cancel_reason" TEXT,
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "completed_by" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "produced_quantity" INTEGER,
ADD COLUMN     "scrap_quantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "started_at" TIMESTAMP(3),
ADD COLUMN     "started_by" TEXT,
ADD COLUMN     "status" "BatchStatus" NOT NULL DEFAULT 'PLANIRANA';

-- batch_consumption → batch_material_lines: tabela se PREIMENUJE zajedno sa
-- svojim ograničenjima i indeksima, pa se dopunjuje kolonama faza.
ALTER TABLE "batch_consumption" DROP CONSTRAINT "batch_consumption_quantity_positive";
ALTER TABLE "batch_consumption" RENAME TO "batch_material_lines";
ALTER TABLE "batch_material_lines" RENAME CONSTRAINT "batch_consumption_pkey" TO "batch_material_lines_pkey";
ALTER TABLE "batch_material_lines" RENAME CONSTRAINT "batch_consumption_batch_id_fkey" TO "batch_material_lines_batch_id_fkey";
ALTER TABLE "batch_material_lines" RENAME CONSTRAINT "batch_consumption_material_id_fkey" TO "batch_material_lines_material_id_fkey";
ALTER TABLE "batch_material_lines" RENAME CONSTRAINT "batch_consumption_unit_price_non_negative" TO "batch_material_lines_unit_price_non_negative";
ALTER INDEX "batch_consumption_batch_id_idx" RENAME TO "batch_material_lines_batch_id_idx";

ALTER TABLE "batch_material_lines" RENAME COLUMN "quantity" TO "consumed_quantity";
ALTER TABLE "batch_material_lines" ALTER COLUMN "consumed_quantity" SET DEFAULT 0;
ALTER TABLE "batch_material_lines" ALTER COLUMN "unit_price" TYPE DECIMAL(12,4);
ALTER TABLE "batch_material_lines" ALTER COLUMN "unit_price" SET DEFAULT 0;
ALTER TABLE "batch_material_lines"
  ADD COLUMN "planned_quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN "reserved_quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN "issued_quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN "waste_quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN "returned_quantity" DECIMAL(12,3) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "batch_material_lines_batch_id_material_id_key" ON "batch_material_lines"("batch_id", "material_id");

-- CreateIndex
CREATE INDEX "production_batches_status_idx" ON "production_batches"("status");

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_started_by_fkey" FOREIGN KEY ("started_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;



-- Zatečeni podaci: stare serije su po definiciji već proizvedene i otpisane,
-- pa se prevode u status ZAVRSENA sa planirano = proizvedeno = izdato = utrošeno.
UPDATE "production_batches"
SET "status" = 'ZAVRSENA',
    "produced_quantity" = "planned_quantity",
    "scrap_quantity" = 0,
    "started_at" = "planned_at",
    "completed_at" = "planned_at",
    "started_by" = "created_by",
    "completed_by" = "created_by";

UPDATE "batch_material_lines"
SET "planned_quantity" = "consumed_quantity",
    "issued_quantity" = "consumed_quantity",
    "reserved_quantity" = 0,
    "waste_quantity" = 0,
    "returned_quantity" = 0;

ALTER TABLE "batch_material_lines" ALTER COLUMN "planned_quantity" DROP DEFAULT;

-- Evidencija kretanja za zatečene serije (ulaz gotovih proizvoda i izdavanje sirovina).
INSERT INTO "stock_movements" ("id", "material_id", "type", "quantity", "unit_price", "purchase_id", "batch_id", "note", "created_by", "created_at")
SELECT 'hist_issue_' || l."id", l."material_id", 'IZDAVANJE', l."issued_quantity", l."unit_price",
       NULL, l."batch_id", 'Preneto iz ranije evidencije serija', b."created_by", b."planned_at"
FROM "batch_material_lines" l
JOIN "production_batches" b ON b."id" = l."batch_id"
WHERE l."issued_quantity" > 0;

INSERT INTO "product_stock_movements" ("id", "product_id", "type", "quantity", "unit_cost", "batch_id", "order_id", "note", "created_by", "created_at")
SELECT 'hist_batch_' || b."id", b."product_id", 'PROIZVODNJA', b."produced_quantity",
       CASE WHEN b."produced_quantity" > 0
            THEN ROUND(COALESCE((SELECT SUM(l."consumed_quantity" * l."unit_price") FROM "batch_material_lines" l WHERE l."batch_id" = b."id"), 0) / b."produced_quantity", 4)
            ELSE NULL END,
       b."id", NULL, 'Preneto iz ranije evidencije serija', b."created_by", b."planned_at"
FROM "production_batches" b
WHERE b."produced_quantity" IS NOT NULL AND b."produced_quantity" > 0;
ALTER TABLE "production_batches" ADD CONSTRAINT "batch_planned_qty_pos" CHECK ("planned_quantity" > 0);
ALTER TABLE "production_batches" ADD CONSTRAINT "batch_produced_qty_nonneg" CHECK ("produced_quantity" IS NULL OR "produced_quantity" >= 0);
ALTER TABLE "production_batches" ADD CONSTRAINT "batch_scrap_nonneg" CHECK ("scrap_quantity" >= 0);
ALTER TABLE "batch_material_lines" ADD CONSTRAINT "bml_quantities_nonneg"
  CHECK ("planned_quantity" >= 0 AND "reserved_quantity" >= 0 AND "issued_quantity" >= 0
         AND "consumed_quantity" >= 0 AND "waste_quantity" >= 0 AND "returned_quantity" >= 0);
ALTER TABLE "batch_material_lines" ADD CONSTRAINT "bml_issued_balance"
  CHECK ("consumed_quantity" + "waste_quantity" + "returned_quantity" <= "issued_quantity");
