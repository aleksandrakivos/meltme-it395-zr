-- quantity > 0
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "batch_consumption" ADD CONSTRAINT "batch_consumption_quantity_positive" CHECK ("quantity" > 0);

-- stock >= 0
ALTER TABLE "materials" ADD CONSTRAINT "materials_stock_non_negative" CHECK ("stock" >= 0);
ALTER TABLE "products" ADD CONSTRAINT "products_stock_non_negative" CHECK ("stock" >= 0);

-- price >= 0
ALTER TABLE "materials" ADD CONSTRAINT "materials_purchase_price_non_negative" CHECK ("purchase_price" >= 0);
ALTER TABLE "products" ADD CONSTRAINT "products_selling_price_non_negative" CHECK ("selling_price" >= 0);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_price_non_negative" CHECK ("price" >= 0);
ALTER TABLE "batch_consumption" ADD CONSTRAINT "batch_consumption_unit_price_non_negative" CHECK ("unit_price" >= 0);
