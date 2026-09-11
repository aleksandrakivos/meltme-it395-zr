# MeltMe

Web aplikacija za mali atelje sveća: sirovine i nabavke sa ponderisanom prosečnom cenom, evidencija kretanja zaliha, recepture, pun životni ciklus proizvodne serije, katalog, kupci, porudžbine sa rezervacijom, planska i stvarna cena koštanja, i RBAC (administrator / menadžer proizvodnje / menadžer prodaje).

## Preduslovi

- Node.js 20+
- Docker (za Postgres)

## Pokretanje

```bash
# 1) zavisnosti
npm install

# 2) env
cp .env.example .env
# generiši AUTH_SECRET npr. sa: npx auth secret
# DATABASE_URL u .env.example koristi host port 5433 (5432 često zauzet)
# `npm install` automatski pokreće `prisma generate` (postinstall)

# 3) baza
npm run db:up
npx prisma migrate deploy
npm run db:seed

# 4) razvoj
npm run dev
```

### Prisma komande

| Komanda              | Opis                                |
| -------------------- | ----------------------------------- |
| `npm run db:migrate` | `prisma migrate dev`                |
| `npm run db:seed`    | idempotentan seed                   |
| `npm run db:clear`   | briše sve podatke osim admin naloga |
| `npm run db:reset`   | reset migracija + seed              |

## Seed nalozi

Lozinka za sva tri naloga: `Lozinka!123`

| Uloga                | Email                               |
| -------------------- | ----------------------------------- |
| Administrator        | `admin@meltme.local`                |
| Menadžer proizvodnje | `menadzer.proizvodnje@meltme.local` |
| Menadžer prodaje     | `menadzer.prodaje@meltme.local`     |
