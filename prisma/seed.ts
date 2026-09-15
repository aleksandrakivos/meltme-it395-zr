import {
  BatchStatus,
  MaterialType,
  OrderStatus,
  PrismaClient,
  ProductMovementType,
  Role,
  StockMovementType,
  Unit,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  purchaseTotalCost,
  roundTo,
  weightedAveragePrice,
} from "../src/lib/services/material-costing";
import {
  planCancellation,
  planCompletion,
  planIssue,
  planReservation,
} from "../src/lib/services/batch-service";

const prisma = new PrismaClient();

const IDS = {
  users: {
    admin: "seed_user_admin",
    proizvodnja: "seed_user_proizvodnja",
    prodaja: "seed_user_prodaja",
  },
  suppliers: {
    zlatar: "seed_supplier_zlatar",
    glasspack: "seed_supplier_glasspack",
  },
  materials: {
    sojaVosak: "seed_mat_soja_vosak",
    pcelinjiVosak: "seed_mat_pcelinji_vosak",
    fitilj: "seed_mat_fitilj",
    mirisLavanda: "seed_mat_miris_lavanda",
    mirisVanila: "seed_mat_miris_vanila",
    teglica200: "seed_mat_tegliica_200",
  },
  products: {
    lavanda: "seed_prod_lavanda",
    vanila: "seed_prod_vanila",
    pcelinja: "seed_prod_pcelinja",
  },
  customers: {
    ana: "seed_customer_ana",
    marko: "seed_customer_marko",
  },
  orders: {
    nova: "seed_order_nova",
    poslata: "seed_order_poslata",
  },
} as const;

type MaterialSeed = {
  id: string;
  name: string;
  type: MaterialType;
  unit: Unit;
  minStock: number;
  supplierId: string;
};

const MATERIALS: MaterialSeed[] = [
  {
    id: IDS.materials.sojaVosak,
    name: "Soja vosak",
    type: MaterialType.VOSAK,
    unit: Unit.G,
    minStock: 5000,
    supplierId: IDS.suppliers.zlatar,
  },
  {
    id: IDS.materials.pcelinjiVosak,
    name: "Pčelinji vosak",
    type: MaterialType.VOSAK,
    unit: Unit.G,
    minStock: 2000,
    supplierId: IDS.suppliers.zlatar,
  },
  {
    id: IDS.materials.fitilj,
    name: "Fitilj",
    type: MaterialType.FITILJ,
    unit: Unit.KOM,
    minStock: 100,
    supplierId: IDS.suppliers.glasspack,
  },
  {
    id: IDS.materials.mirisLavanda,
    name: "Miris lavanda",
    type: MaterialType.MIRIS,
    unit: Unit.ML,
    minStock: 200,
    supplierId: IDS.suppliers.zlatar,
  },
  {
    id: IDS.materials.mirisVanila,
    name: "Miris vanila",
    type: MaterialType.MIRIS,
    unit: Unit.ML,
    minStock: 200,
    supplierId: IDS.suppliers.zlatar,
  },
  {
    id: IDS.materials.teglica200,
    name: "Teglica 200ml",
    type: MaterialType.TEGLICA,
    unit: Unit.KOM,
    minStock: 60,
    supplierId: IDS.suppliers.glasspack,
  },
];

/** Po dve nabavke sa RAZLIČITIM cenama — demo za ponderisani prosek. */
type PurchaseSeed = {
  key: string;
  materialId: string;
  supplierId: string;
  quantity: number;
  unitPrice: number;
  purchasedAt: string;
  documentNo: string;
};

const PURCHASES: PurchaseSeed[] = [
  {
    key: "soja_1",
    materialId: IDS.materials.sojaVosak,
    supplierId: IDS.suppliers.zlatar,
    quantity: 20000,
    unitPrice: 0.085,
    purchasedAt: "2026-05-04",
    documentNo: "OT-2026-101",
  },
  {
    key: "soja_2",
    materialId: IDS.materials.sojaVosak,
    supplierId: IDS.suppliers.zlatar,
    quantity: 20000,
    unitPrice: 0.11,
    purchasedAt: "2026-07-06",
    documentNo: "OT-2026-142",
  },
  {
    key: "pcela_1",
    materialId: IDS.materials.pcelinjiVosak,
    supplierId: IDS.suppliers.zlatar,
    quantity: 8000,
    unitPrice: 0.14,
    purchasedAt: "2026-05-04",
    documentNo: "OT-2026-102",
  },
  {
    key: "pcela_2",
    materialId: IDS.materials.pcelinjiVosak,
    supplierId: IDS.suppliers.zlatar,
    quantity: 4000,
    unitPrice: 0.17,
    purchasedAt: "2026-07-06",
    documentNo: "OT-2026-143",
  },
  {
    key: "fitilj_1",
    materialId: IDS.materials.fitilj,
    supplierId: IDS.suppliers.glasspack,
    quantity: 300,
    unitPrice: 4.5,
    purchasedAt: "2026-05-11",
    documentNo: "GP-2026-77",
  },
  {
    key: "fitilj_2",
    materialId: IDS.materials.fitilj,
    supplierId: IDS.suppliers.glasspack,
    quantity: 200,
    unitPrice: 5.5,
    purchasedAt: "2026-07-13",
    documentNo: "GP-2026-91",
  },
  {
    key: "lavanda_1",
    materialId: IDS.materials.mirisLavanda,
    supplierId: IDS.suppliers.zlatar,
    quantity: 600,
    unitPrice: 2.4,
    purchasedAt: "2026-05-11",
    documentNo: "OT-2026-108",
  },
  {
    key: "lavanda_2",
    materialId: IDS.materials.mirisLavanda,
    supplierId: IDS.suppliers.zlatar,
    quantity: 400,
    unitPrice: 2.8,
    purchasedAt: "2026-07-13",
    documentNo: "OT-2026-150",
  },
  {
    key: "vanila_1",
    materialId: IDS.materials.mirisVanila,
    supplierId: IDS.suppliers.zlatar,
    quantity: 600,
    unitPrice: 2.1,
    purchasedAt: "2026-05-11",
    documentNo: "OT-2026-109",
  },
  {
    key: "vanila_2",
    materialId: IDS.materials.mirisVanila,
    supplierId: IDS.suppliers.zlatar,
    quantity: 400,
    unitPrice: 2.4,
    purchasedAt: "2026-07-13",
    documentNo: "OT-2026-151",
  },
  {
    key: "teglica_1",
    materialId: IDS.materials.teglica200,
    supplierId: IDS.suppliers.glasspack,
    quantity: 200,
    unitPrice: 43,
    purchasedAt: "2026-05-11",
    documentNo: "GP-2026-78",
  },
  {
    key: "teglica_2",
    materialId: IDS.materials.teglica200,
    supplierId: IDS.suppliers.glasspack,
    quantity: 150,
    unitPrice: 48,
    purchasedAt: "2026-07-13",
    documentNo: "GP-2026-92",
  },
];

const PRODUCTS = [
  {
    id: IDS.products.lavanda,
    name: "Lavanda 200ml",
    waxType: "soja",
    scent: "lavanda",
    size: "200",
    sellingPrice: 890,
  },
  {
    id: IDS.products.vanila,
    name: "Vanila 200ml",
    waxType: "soja",
    scent: "vanila",
    size: "200",
    sellingPrice: 890,
  },
  {
    id: IDS.products.pcelinja,
    name: "Čista pčelinja",
    waxType: "pčelinji",
    scent: null,
    size: "200",
    sellingPrice: 1200,
  },
] as const;

const RECIPES: Array<{
  productId: string;
  materialId: string;
  quantity: number;
}> = [
  {
    productId: IDS.products.lavanda,
    materialId: IDS.materials.sojaVosak,
    quantity: 180,
  },
  {
    productId: IDS.products.lavanda,
    materialId: IDS.materials.fitilj,
    quantity: 1,
  },
  {
    productId: IDS.products.lavanda,
    materialId: IDS.materials.teglica200,
    quantity: 1,
  },
  {
    productId: IDS.products.lavanda,
    materialId: IDS.materials.mirisLavanda,
    quantity: 12,
  },
  {
    productId: IDS.products.vanila,
    materialId: IDS.materials.sojaVosak,
    quantity: 180,
  },
  {
    productId: IDS.products.vanila,
    materialId: IDS.materials.fitilj,
    quantity: 1,
  },
  {
    productId: IDS.products.vanila,
    materialId: IDS.materials.teglica200,
    quantity: 1,
  },
  {
    productId: IDS.products.vanila,
    materialId: IDS.materials.mirisVanila,
    quantity: 12,
  },
  {
    productId: IDS.products.pcelinja,
    materialId: IDS.materials.pcelinjiVosak,
    quantity: 180,
  },
  {
    productId: IDS.products.pcelinja,
    materialId: IDS.materials.fitilj,
    quantity: 1,
  },
  {
    productId: IDS.products.pcelinja,
    materialId: IDS.materials.teglica200,
    quantity: 1,
  },
];

/** Po jedna serija u svakom statusu — demo životnog ciklusa. */
type BatchSeed = {
  id: string;
  productId: string;
  plannedQuantity: number;
  target: BatchStatus;
  plannedAt: string;
  note?: string;
  cancelReason?: string;
  producedQuantity?: number;
  scrapQuantity?: number;
  report?: Array<{
    materialId: string;
    consumedQuantity: number;
    wasteQuantity: number;
  }>;
};

const BATCHES: BatchSeed[] = [
  {
    id: "seed_batch_planirana",
    productId: IDS.products.lavanda,
    plannedQuantity: 20,
    target: BatchStatus.PLANIRANA,
    plannedAt: "2026-08-24",
    note: "Serija za sajam — sirovine rezervisane, stanje netaknuto",
  },
  {
    id: "seed_batch_zapoceta",
    productId: IDS.products.vanila,
    plannedQuantity: 15,
    target: BatchStatus.ZAPOCETA,
    plannedAt: "2026-08-25",
  },
  {
    id: "seed_batch_u_toku",
    productId: IDS.products.pcelinja,
    plannedQuantity: 10,
    target: BatchStatus.U_TOKU,
    plannedAt: "2026-08-26",
  },
  {
    id: "seed_batch_zavrsena",
    productId: IDS.products.lavanda,
    plannedQuantity: 12,
    target: BatchStatus.ZAVRSENA,
    plannedAt: "2026-08-10",
    producedQuantity: 12,
    scrapQuantity: 0,
  },
  {
    id: "seed_batch_delimicno",
    productId: IDS.products.vanila,
    plannedQuantity: 10,
    target: BatchStatus.DELIMICNO_USPESNA,
    plannedAt: "2026-08-14",
    producedQuantity: 8,
    scrapQuantity: 2,
    note: "Dve sveće pukle pri hlađenju",
    report: [
      {
        materialId: IDS.materials.sojaVosak,
        consumedQuantity: 1750,
        wasteQuantity: 30,
      },
      {
        materialId: IDS.materials.fitilj,
        consumedQuantity: 10,
        wasteQuantity: 0,
      },
      {
        materialId: IDS.materials.teglica200,
        consumedQuantity: 9,
        wasteQuantity: 1,
      },
      {
        materialId: IDS.materials.mirisVanila,
        consumedQuantity: 118,
        wasteQuantity: 2,
      },
    ],
  },
  {
    id: "seed_batch_otkazana",
    productId: IDS.products.pcelinja,
    plannedQuantity: 5,
    target: BatchStatus.OTKAZANA,
    plannedAt: "2026-08-18",
    cancelReason: "Kupac je otkazao porudžbinu, sirovine vraćene na zalihe",
  },
];

type MaterialState = {
  stock: number;
  reserved: number;
  avgPrice: number;
};

type MovementRow = {
  id: string;
  materialId: string;
  type: StockMovementType;
  quantity: number;
  unitPrice: number;
  purchaseId?: string;
  batchId?: string;
  note: string;
  createdBy: string;
  createdAt: Date;
};

type BatchLineRow = {
  materialId: string;
  plannedQuantity: number;
  reservedQuantity: number;
  issuedQuantity: number;
  consumedQuantity: number;
  wasteQuantity: number;
  returnedQuantity: number;
  unitPrice: number;
};

type BatchRow = {
  seed: BatchSeed;
  status: BatchStatus;
  lines: BatchLineRow[];
  producedQuantity: number | null;
  scrapQuantity: number;
  actualUnitCost: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
};

function day(iso: string, hour = 9): Date {
  return new Date(`${iso}T${String(hour).padStart(2, "0")}:00:00.000Z`);
}

async function main() {
  const passwordHash = await bcrypt.hash("Lozinka!123", 10);

  const users = [
    {
      id: IDS.users.admin,
      email: "admin@meltme.local",
      name: "Ana Administrator",
      role: Role.ADMIN,
    },
    {
      id: IDS.users.proizvodnja,
      email: "menadzer.proizvodnje@meltme.local",
      name: "Petar Menadžer proizvodnje",
      role: Role.MENADZER_PROIZVODNJE,
    },
    {
      id: IDS.users.prodaja,
      email: "menadzer.prodaje@meltme.local",
      name: "Mila Menadžer prodaje",
      role: Role.MENADZER_PRODAJE,
    },
  ];

  const userIds: Record<string, string> = {};
  for (const user of users) {
    const saved = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, passwordHash, active: true },
      create: { ...user, passwordHash, active: true },
    });
    userIds[user.id] = saved.id;
  }
  const productionUserId = userIds[IDS.users.proizvodnja];
  const salesUserId = userIds[IDS.users.prodaja];

  const suppliers = [
    {
      id: IDS.suppliers.zlatar,
      name: "Pčelarstvo Zlatar",
      contact: "Jovan Zlatar",
      phone: "+381641111111",
      email: "info@pcelarstvo-zlatar.rs",
    },
    {
      id: IDS.suppliers.glasspack,
      name: "GlassPack d.o.o.",
      contact: "Ivana Glass",
      phone: "+381642222222",
      email: "prodaja@glasspack.rs",
    },
  ];
  for (const supplier of suppliers) {
    await prisma.supplier.upsert({
      where: { id: supplier.id },
      update: supplier,
      create: supplier,
    });
  }

  const customers = [
    {
      id: IDS.customers.ana,
      name: "Ana Petrović",
      email: "ana.petrovic@example.com",
      phone: "+381601111111",
      address: "Bulevar kralja Aleksandra 1, Beograd",
    },
    {
      id: IDS.customers.marko,
      name: "Marko Jovanović",
      email: "marko.jovanovic@example.com",
      phone: "+381602222222",
      address: "Njegoševa 12, Novi Sad",
    },
  ];
  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { id: customer.id },
      update: customer,
      create: customer,
    });
  }

  // 1) Nabavke: prosek se pomera istom funkcijom koju koristi recordPurchase.
  const state = new Map<string, MaterialState>(
    MATERIALS.map((m) => [m.id, { stock: 0, reserved: 0, avgPrice: 0 }]),
  );
  const movements: MovementRow[] = [];

  for (const purchase of PURCHASES) {
    const current = state.get(purchase.materialId)!;
    current.avgPrice = weightedAveragePrice(
      current.stock,
      current.avgPrice,
      purchase.quantity,
      purchase.unitPrice,
    );
    current.stock = roundTo(current.stock + purchase.quantity, 3);
    movements.push({
      id: `seed_mov_purchase_${purchase.key}`,
      materialId: purchase.materialId,
      type: StockMovementType.NABAVKA,
      quantity: purchase.quantity,
      unitPrice: purchase.unitPrice,
      purchaseId: `seed_purchase_${purchase.key}`,
      note: purchase.documentNo,
      createdBy: productionUserId,
      createdAt: day(purchase.purchasedAt),
    });
  }

  // 2) Serije: rezervacija → izdavanje → završetak / otkazivanje.
  const recipeByProduct = new Map<string, typeof RECIPES>();
  for (const line of RECIPES) {
    const list = recipeByProduct.get(line.productId) ?? [];
    list.push(line);
    recipeByProduct.set(line.productId, list);
  }
  const materialById = new Map(MATERIALS.map((m) => [m.id, m]));

  const batchRows: BatchRow[] = [];
  const producedByProduct = new Map<string, number>();

  for (const seed of BATCHES) {
    const recipe = (recipeByProduct.get(seed.productId) ?? []).map((line) => {
      const material = state.get(line.materialId)!;
      return {
        materialId: line.materialId,
        materialName: materialById.get(line.materialId)!.name,
        quantityPerUnit: line.quantity,
        stock: material.stock,
        reserved: material.reserved,
        avgPurchasePrice: material.avgPrice,
      };
    });

    const reservation = planReservation(recipe, seed.plannedQuantity);
    if (!reservation.ok) {
      throw new Error(`${seed.id}: ${reservation.error}`);
    }

    const lines: BatchLineRow[] = reservation.lines.map((line) => ({
      materialId: line.materialId,
      plannedQuantity: line.plannedQuantity,
      reservedQuantity: line.reservedQuantity,
      issuedQuantity: 0,
      consumedQuantity: 0,
      wasteQuantity: 0,
      returnedQuantity: 0,
      unitPrice: 0,
    }));

    for (const line of lines) {
      const material = state.get(line.materialId)!;
      material.reserved = roundTo(material.reserved + line.reservedQuantity, 3);
    }

    let status: BatchStatus = BatchStatus.PLANIRANA;
    let startedAt: Date | null = null;
    let completedAt: Date | null = null;
    let actualUnitCost: number | null = null;
    let producedQuantity: number | null = null;
    let scrapQuantity = 0;

    const needsIssue = seed.target !== BatchStatus.PLANIRANA;

    if (needsIssue) {
      const issue = planIssue(
        lines.map((line) => {
          const material = state.get(line.materialId)!;
          return {
            materialId: line.materialId,
            materialName: materialById.get(line.materialId)!.name,
            plannedQuantity: line.plannedQuantity,
            reservedQuantity: line.reservedQuantity,
            stock: material.stock,
            avgPrice: material.avgPrice,
          };
        }),
      );
      if (!issue.ok) {
        throw new Error(`${seed.id}: ${issue.error}`);
      }

      for (const issued of issue.lines) {
        const line = lines.find((l) => l.materialId === issued.materialId)!;
        const material = state.get(issued.materialId)!;
        material.stock = roundTo(material.stock - issued.issuedQuantity, 3);
        material.reserved = roundTo(
          material.reserved - issued.releaseReservation,
          3,
        );
        line.issuedQuantity = issued.issuedQuantity;
        line.reservedQuantity = 0;
        line.unitPrice = issued.unitPrice;
        movements.push({
          id: `seed_mov_issue_${seed.id}_${issued.materialId}`,
          materialId: issued.materialId,
          type: StockMovementType.IZDAVANJE,
          quantity: issued.issuedQuantity,
          unitPrice: issued.unitPrice,
          batchId: seed.id,
          note: "Izdavanje pri započinjanju serije",
          createdBy: productionUserId,
          createdAt: day(seed.plannedAt, 10),
        });
      }
      status = BatchStatus.ZAPOCETA;
      startedAt = day(seed.plannedAt, 10);
    }

    if (
      seed.target === BatchStatus.U_TOKU ||
      seed.target === BatchStatus.ZAVRSENA ||
      seed.target === BatchStatus.DELIMICNO_USPESNA
    ) {
      status = BatchStatus.U_TOKU;
    }

    if (
      seed.target === BatchStatus.ZAVRSENA ||
      seed.target === BatchStatus.DELIMICNO_USPESNA
    ) {
      const completion = planCompletion(
        lines.map((line) => ({
          materialId: line.materialId,
          materialName: materialById.get(line.materialId)!.name,
          plannedQuantity: line.plannedQuantity,
          issuedQuantity: line.issuedQuantity,
          unitPrice: line.unitPrice,
        })),
        seed.report ?? [],
        seed.producedQuantity ?? seed.plannedQuantity,
        seed.scrapQuantity ?? 0,
        seed.plannedQuantity,
      );
      if (!completion.ok) {
        throw new Error(`${seed.id}: ${completion.error}`);
      }
      if (completion.status !== seed.target) {
        throw new Error(
          `${seed.id}: izvedeni status ${completion.status} ≠ traženi ${seed.target}`,
        );
      }

      for (const done of completion.lines) {
        const line = lines.find((l) => l.materialId === done.materialId)!;
        const material = state.get(done.materialId)!;
        line.consumedQuantity = done.consumedQuantity;
        line.wasteQuantity = done.wasteQuantity;
        line.returnedQuantity = done.returnedQuantity;
        if (done.returnedQuantity > 0) {
          material.stock = roundTo(material.stock + done.returnedQuantity, 3);
          movements.push({
            id: `seed_mov_return_${seed.id}_${done.materialId}`,
            materialId: done.materialId,
            type: StockMovementType.POVRACAJ,
            quantity: done.returnedQuantity,
            unitPrice: done.unitPrice,
            batchId: seed.id,
            note: "Povraćaj neutrošene sirovine",
            createdBy: productionUserId,
            createdAt: day(seed.plannedAt, 16),
          });
        }
        if (done.wasteQuantity > 0) {
          movements.push({
            id: `seed_mov_waste_${seed.id}_${done.materialId}`,
            materialId: done.materialId,
            type: StockMovementType.OTPAD,
            quantity: done.wasteQuantity,
            unitPrice: done.unitPrice,
            batchId: seed.id,
            note: "Otpad u proizvodnji",
            createdBy: productionUserId,
            createdAt: day(seed.plannedAt, 16),
          });
        }
      }

      status = completion.status;
      producedQuantity = seed.producedQuantity ?? seed.plannedQuantity;
      scrapQuantity = seed.scrapQuantity ?? 0;
      actualUnitCost = completion.actualUnitCost;
      completedAt = day(seed.plannedAt, 16);
      producedByProduct.set(
        seed.productId,
        (producedByProduct.get(seed.productId) ?? 0) + producedQuantity,
      );
    }

    if (seed.target === BatchStatus.OTKAZANA) {
      const cancellation = planCancellation(
        status,
        lines.map((line) => ({
          materialId: line.materialId,
          materialName: materialById.get(line.materialId)!.name,
          reservedQuantity: line.reservedQuantity,
          issuedQuantity: line.issuedQuantity,
          unitPrice: line.unitPrice,
        })),
        status === BatchStatus.ZAPOCETA
          ? lines.map((line) => ({
              materialId: line.materialId,
              consumedQuantity: 0,
              wasteQuantity: 0,
            }))
          : [],
      );
      if (!cancellation.ok) {
        throw new Error(`${seed.id}: ${cancellation.error}`);
      }

      for (const cancelled of cancellation.lines) {
        const line = lines.find((l) => l.materialId === cancelled.materialId)!;
        const material = state.get(cancelled.materialId)!;
        material.reserved = roundTo(
          material.reserved - cancelled.releaseReservation,
          3,
        );
        line.reservedQuantity = 0;
        line.consumedQuantity = cancelled.consumedQuantity;
        line.wasteQuantity = cancelled.wasteQuantity;
        if (cancelled.returnToStock > 0) {
          material.stock = roundTo(material.stock + cancelled.returnToStock, 3);
          line.returnedQuantity = cancelled.returnToStock;
          movements.push({
            id: `seed_mov_cancel_${seed.id}_${cancelled.materialId}`,
            materialId: cancelled.materialId,
            type: StockMovementType.POVRACAJ,
            quantity: cancelled.returnToStock,
            unitPrice: line.unitPrice,
            batchId: seed.id,
            note: "Povraćaj pri otkazivanju serije",
            createdBy: productionUserId,
            createdAt: day(seed.plannedAt, 15),
          });
        }
        if (cancelled.wasteQuantity > 0) {
          movements.push({
            id: `seed_mov_cancel_waste_${seed.id}_${cancelled.materialId}`,
            materialId: cancelled.materialId,
            type: StockMovementType.OTPAD,
            quantity: cancelled.wasteQuantity,
            unitPrice: line.unitPrice,
            batchId: seed.id,
            note: "Otpad pri otkazivanju serije",
            createdBy: productionUserId,
            createdAt: day(seed.plannedAt, 15),
          });
        }
      }

      status = BatchStatus.OTKAZANA;
      completedAt = day(seed.plannedAt, 15);
    }

    batchRows.push({
      seed,
      status,
      lines,
      producedQuantity,
      scrapQuantity,
      actualUnitCost,
      startedAt,
      completedAt,
    });
  }

  // 3) Porudžbine: jedna rezerviše, jedna je poslata (otpisana).
  const orders = [
    {
      id: IDS.orders.nova,
      customerId: IDS.customers.ana,
      status: OrderStatus.NOVA,
      date: day("2026-08-27", 11),
      items: [{ productId: IDS.products.lavanda, quantity: 2, price: 890 }],
    },
    {
      id: IDS.orders.poslata,
      customerId: IDS.customers.marko,
      status: OrderStatus.POSLATA,
      date: day("2026-08-20", 11),
      items: [{ productId: IDS.products.lavanda, quantity: 3, price: 890 }],
    },
  ];

  const productState = new Map<string, { stock: number; reserved: number }>(
    PRODUCTS.map((p) => [
      p.id,
      { stock: producedByProduct.get(p.id) ?? 0, reserved: 0 },
    ]),
  );
  for (const order of orders) {
    for (const item of order.items) {
      const product = productState.get(item.productId)!;
      if (order.status === OrderStatus.NOVA) {
        product.reserved += item.quantity;
      } else if (order.status === OrderStatus.POSLATA) {
        product.stock -= item.quantity;
      }
    }
  }

  // 4) Upis izračunatih stanja.
  for (const material of MATERIALS) {
    const current = state.get(material.id)!;
    const data = {
      name: material.name,
      type: material.type,
      unit: material.unit,
      minStock: material.minStock,
      supplierId: material.supplierId,
      stock: current.stock,
      reserved: current.reserved,
      avgPurchasePrice: current.avgPrice,
    };
    await prisma.material.upsert({
      where: { id: material.id },
      update: data,
      create: { id: material.id, ...data },
    });
  }

  for (const product of PRODUCTS) {
    const current = productState.get(product.id)!;
    const data = {
      name: product.name,
      waxType: product.waxType,
      scent: product.scent,
      size: product.size,
      sellingPrice: product.sellingPrice,
      stock: current.stock,
      reserved: current.reserved,
      active: true,
    };
    await prisma.product.upsert({
      where: { id: product.id },
      update: data,
      create: { id: product.id, ...data },
    });
  }

  for (const line of RECIPES) {
    await prisma.recipeItem.upsert({
      where: {
        productId_materialId: {
          productId: line.productId,
          materialId: line.materialId,
        },
      },
      update: { quantity: line.quantity },
      create: line,
    });
  }

  for (const purchase of PURCHASES) {
    const data = {
      materialId: purchase.materialId,
      supplierId: purchase.supplierId,
      quantity: purchase.quantity,
      unitPrice: purchase.unitPrice,
      totalCost: purchaseTotalCost(purchase.quantity, purchase.unitPrice),
      documentNo: purchase.documentNo,
      purchasedAt: day(purchase.purchasedAt),
      createdBy: productionUserId,
    };
    await prisma.materialPurchase.upsert({
      where: { id: `seed_purchase_${purchase.key}` },
      update: data,
      create: { id: `seed_purchase_${purchase.key}`, ...data },
    });
  }

  for (const batch of batchRows) {
    const data = {
      productId: batch.seed.productId,
      status: batch.status,
      plannedQuantity: batch.seed.plannedQuantity,
      producedQuantity: batch.producedQuantity,
      scrapQuantity: batch.scrapQuantity,
      note: batch.seed.note ?? null,
      cancelReason: batch.seed.cancelReason ?? null,
      plannedAt: day(batch.seed.plannedAt),
      startedAt: batch.startedAt,
      completedAt: batch.completedAt,
      createdBy: productionUserId,
      startedBy: batch.startedAt ? productionUserId : null,
      completedBy: batch.completedAt ? productionUserId : null,
    };
    await prisma.productionBatch.upsert({
      where: { id: batch.seed.id },
      update: data,
      create: { id: batch.seed.id, ...data },
    });

    for (const line of batch.lines) {
      const lineData = {
        plannedQuantity: line.plannedQuantity,
        reservedQuantity: line.reservedQuantity,
        issuedQuantity: line.issuedQuantity,
        consumedQuantity: line.consumedQuantity,
        wasteQuantity: line.wasteQuantity,
        returnedQuantity: line.returnedQuantity,
        unitPrice: line.unitPrice,
      };
      await prisma.batchMaterialLine.upsert({
        where: {
          batchId_materialId: {
            batchId: batch.seed.id,
            materialId: line.materialId,
          },
        },
        update: lineData,
        create: {
          batchId: batch.seed.id,
          materialId: line.materialId,
          ...lineData,
        },
      });
    }

    if (batch.producedQuantity && batch.producedQuantity > 0) {
      const movementData = {
        productId: batch.seed.productId,
        type: ProductMovementType.PROIZVODNJA,
        quantity: batch.producedQuantity,
        unitCost: batch.actualUnitCost,
        batchId: batch.seed.id,
        note: "Ulaz iz proizvodnje",
        createdBy: productionUserId,
        createdAt: batch.completedAt ?? day(batch.seed.plannedAt, 16),
      };
      await prisma.productStockMovement.upsert({
        where: { id: `seed_pmov_batch_${batch.seed.id}` },
        update: movementData,
        create: { id: `seed_pmov_batch_${batch.seed.id}`, ...movementData },
      });
    }
  }

  for (const movement of movements) {
    const data = {
      materialId: movement.materialId,
      type: movement.type,
      quantity: movement.quantity,
      unitPrice: movement.unitPrice,
      purchaseId: movement.purchaseId ?? null,
      batchId: movement.batchId ?? null,
      note: movement.note,
      createdBy: movement.createdBy,
      createdAt: movement.createdAt,
    };
    await prisma.stockMovement.upsert({
      where: { id: movement.id },
      update: data,
      create: { id: movement.id, ...data },
    });
  }

  for (const order of orders) {
    const data = {
      customerId: order.customerId,
      status: order.status,
      date: order.date,
      createdBy: salesUserId,
    };
    await prisma.order.upsert({
      where: { id: order.id },
      update: data,
      create: { id: order.id, ...data },
    });

    for (const item of order.items) {
      await prisma.orderItem.upsert({
        where: {
          orderId_productId: {
            orderId: order.id,
            productId: item.productId,
          },
        },
        update: { quantity: item.quantity, price: item.price },
        create: {
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        },
      });

      if (order.status === OrderStatus.POSLATA) {
        const movementData = {
          productId: item.productId,
          type: ProductMovementType.PRODAJA,
          quantity: item.quantity,
          batchId: null,
          orderId: order.id,
          note: "Slanje porudžbine",
          createdBy: salesUserId,
          createdAt: order.date,
        };
        await prisma.productStockMovement.upsert({
          where: { id: `seed_pmov_order_${order.id}_${item.productId}` },
          update: movementData,
          create: {
            id: `seed_pmov_order_${order.id}_${item.productId}`,
            ...movementData,
          },
        });
      }
    }
  }

  console.log("Seed završen. Stanja sirovina:");
  for (const material of MATERIALS) {
    const current = state.get(material.id)!;
    console.log(
      `  ${material.name}: stanje ${current.stock}, rezervisano ${current.reserved}, prosečna cena ${current.avgPrice}`,
    );
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
