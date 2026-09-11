-- Preimenovanje vrednosti Role enum-a bez gubitka podataka.
-- Prisma bi podrazumevano obrisala i ponovo kreirala tip; RENAME VALUE čuva redove.
ALTER TYPE "Role" RENAME VALUE 'VLASNIK' TO 'ADMIN';
ALTER TYPE "Role" RENAME VALUE 'PROIZVODNJA' TO 'MENADZER_PROIZVODNJE';
ALTER TYPE "Role" RENAME VALUE 'PRODAJA' TO 'MENADZER_PRODAJE';

-- Nalozi iz seed-a prate nove nazive uloga.
UPDATE "users" SET "email" = 'admin@meltme.local' WHERE "email" = 'vlasnik@meltme.local';
UPDATE "users" SET "email" = 'menadzer.proizvodnje@meltme.local' WHERE "email" = 'proizvodnja@meltme.local';
UPDATE "users" SET "email" = 'menadzer.prodaje@meltme.local' WHERE "email" = 'prodaja@meltme.local';
