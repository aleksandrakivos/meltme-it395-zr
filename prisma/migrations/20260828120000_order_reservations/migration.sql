-- Porudžbine prelaze sa neposrednog otpisa na rezervaciju.
-- Ranije je kreiranje porudžbine odmah skidalo stanje. Za porudžbine koje još
-- nisu poslate, to stanje se vraća i evidentira kao rezervacija.
UPDATE "products" p
SET "stock" = p."stock" + sub."qty",
    "reserved" = p."reserved" + sub."qty"
FROM (
  SELECT oi."product_id" AS product_id, SUM(oi."quantity")::int AS qty
  FROM "order_items" oi
  JOIN "orders" o ON o."id" = oi."order_id"
  WHERE o."status" IN ('NOVA', 'U_PRIPREMI')
  GROUP BY oi."product_id"
) AS sub
WHERE p."id" = sub.product_id;

-- Poslate i završene porudžbine su već otpisane sa stanja — dobijaju samo
-- red u evidenciji kretanja gotovih proizvoda.
INSERT INTO "product_stock_movements" ("id", "product_id", "type", "quantity", "unit_cost", "batch_id", "order_id", "note", "created_by", "created_at")
SELECT 'hist_order_' || oi."id", oi."product_id", 'PRODAJA', oi."quantity",
       NULL, NULL, o."id", 'Preneto iz ranije evidencije porudžbina', o."created_by", o."date"
FROM "order_items" oi
JOIN "orders" o ON o."id" = oi."order_id"
WHERE o."status" IN ('POSLATA', 'ZAVRSENA');
