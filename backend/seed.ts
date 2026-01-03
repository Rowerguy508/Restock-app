import { db } from "./src/db";
import { auth } from "./src/auth";

async function seed() {
  console.log("🌱 Seeding Pollo Victorina test data...\n");

  // Create test users via Better Auth
  const ownerEmail = "owner@pollovictorina.com";
  const ownerPassword = "owner123";
  const managerEmail = "manager@pollovictorina.com";
  const managerPassword = "manager123";

  // Check if users already exist
  const existingOwner = await db.user.findUnique({ where: { email: ownerEmail } });
  const existingManager = await db.user.findUnique({ where: { email: managerEmail } });

  let ownerId: string;
  let managerId: string;

  if (existingOwner) {
    console.log("Owner already exists, using existing account");
    ownerId = existingOwner.id;
  } else {
    // Create owner account
    const ownerResult = await auth.api.signUpEmail({
      body: {
        email: ownerEmail,
        password: ownerPassword,
        name: "Carlos Victorina",
      },
    });
    if (!ownerResult.user) throw new Error("Failed to create owner");
    ownerId = ownerResult.user.id;
    console.log("✅ Created owner: Carlos Victorina (owner@pollovictorina.com)");
  }

  if (existingManager) {
    console.log("Manager already exists, using existing account");
    managerId = existingManager.id;
  } else {
    // Create manager account
    const managerResult = await auth.api.signUpEmail({
      body: {
        email: managerEmail,
        password: managerPassword,
        name: "Maria Santos",
      },
    });
    if (!managerResult.user) throw new Error("Failed to create manager");
    managerId = managerResult.user.id;
    console.log("✅ Created manager: Maria Santos (manager@pollovictorina.com)");
  }

  // Check if organization already exists
  const existingOrg = await db.organization.findFirst({
    where: { name: "Pollo Victorina" },
  });

  if (existingOrg) {
    console.log("\n⚠️  Pollo Victorina already exists. Cleaning up old data...");
    await db.organization.delete({ where: { id: existingOrg.id } });
  }

  // Create organization
  const org = await db.organization.create({
    data: {
      name: "Pollo Victorina",
    },
  });
  console.log("\n✅ Created organization: Pollo Victorina");

  // Create locations
  const zonaColonial = await db.location.create({
    data: {
      name: "Zona Colonial",
      address: "Calle El Conde 123, Santo Domingo",
      organizationId: org.id,
    },
  });

  const piantini = await db.location.create({
    data: {
      name: "Piantini",
      address: "Av. Abraham Lincoln 456, Santo Domingo",
      organizationId: org.id,
    },
  });

  const santiago = await db.location.create({
    data: {
      name: "Santiago Centro",
      address: "Calle del Sol 789, Santiago",
      organizationId: org.id,
    },
  });

  console.log("✅ Created 3 locations: Zona Colonial, Piantini, Santiago Centro");

  // Create memberships - delete existing first
  await db.membership.deleteMany({
    where: { userId: { in: [ownerId, managerId] } },
  });

  await db.membership.create({
    data: {
      userId: ownerId,
      organizationId: org.id,
      role: "OWNER",
    },
  });

  await db.membership.create({
    data: {
      userId: managerId,
      organizationId: org.id,
      role: "MANAGER",
      locationId: zonaColonial.id,
    },
  });
  console.log("✅ Created memberships (Owner: all locations, Manager: Zona Colonial only)");

  // Create suppliers
  const suppliers = await Promise.all([
    db.supplier.create({
      data: {
        name: "Pollos Del Cibao",
        contactName: "Juan Perez",
        phone: "+1 809 555 1001",
        email: "ventas@pollosdelcibao.com",
        address: "Carretera Duarte Km 5, Santiago",
        organizationId: org.id,
      },
    }),
    db.supplier.create({
      data: {
        name: "Verduras Frescas RD",
        contactName: "Ana Rodriguez",
        phone: "+1 809 555 1002",
        email: "pedidos@verdurasfrescas.com",
        address: "Mercado Nuevo, Santo Domingo",
        organizationId: org.id,
      },
    }),
    db.supplier.create({
      data: {
        name: "Distribuidora Colonial",
        contactName: "Pedro Martinez",
        phone: "+1 809 555 1003",
        email: "orders@colonial.com",
        address: "Zona Industrial Haina",
        organizationId: org.id,
      },
    }),
    db.supplier.create({
      data: {
        name: "Bebidas del Caribe",
        contactName: "Rosa Fernandez",
        phone: "+1 809 555 1004",
        email: "ventas@bebidascaribe.com",
        address: "Av. Independencia 500, Santo Domingo",
        organizationId: org.id,
      },
    }),
  ]);
  console.log("✅ Created 4 suppliers");

  // Create products (typical Dominican chicken restaurant inventory)
  const products = await Promise.all([
    // Proteins
    db.product.create({
      data: { name: "Pollo Entero", sku: "POLL-001", unit: "unit", category: "Meat", organizationId: org.id },
    }),
    db.product.create({
      data: { name: "Pechuga de Pollo", sku: "POLL-002", unit: "kg", category: "Meat", organizationId: org.id },
    }),
    db.product.create({
      data: { name: "Muslos de Pollo", sku: "POLL-003", unit: "kg", category: "Meat", organizationId: org.id },
    }),
    db.product.create({
      data: { name: "Alitas de Pollo", sku: "POLL-004", unit: "kg", category: "Meat", organizationId: org.id },
    }),
    // Sides
    db.product.create({
      data: { name: "Arroz", sku: "ARR-001", unit: "kg", category: "Dry Goods", organizationId: org.id },
    }),
    db.product.create({
      data: { name: "Habichuelas Rojas", sku: "HAB-001", unit: "kg", category: "Dry Goods", organizationId: org.id },
    }),
    db.product.create({
      data: { name: "Platanos Verdes", sku: "PLA-001", unit: "unit", category: "Produce", organizationId: org.id },
    }),
    db.product.create({
      data: { name: "Platanos Maduros", sku: "PLA-002", unit: "unit", category: "Produce", organizationId: org.id },
    }),
    db.product.create({
      data: { name: "Yuca", sku: "YUC-001", unit: "kg", category: "Produce", organizationId: org.id },
    }),
    db.product.create({
      data: { name: "Ensalada Mixta", sku: "ENS-001", unit: "kg", category: "Produce", organizationId: org.id },
    }),
    // Seasonings & Oils
    db.product.create({
      data: { name: "Aceite Vegetal", sku: "ACE-001", unit: "liter", category: "Dry Goods", organizationId: org.id },
    }),
    db.product.create({
      data: { name: "Sazon Completo", sku: "SAZ-001", unit: "kg", category: "Dry Goods", organizationId: org.id },
    }),
    db.product.create({
      data: { name: "Ajo", sku: "AJO-001", unit: "kg", category: "Produce", organizationId: org.id },
    }),
    db.product.create({
      data: { name: "Cebolla", sku: "CEB-001", unit: "kg", category: "Produce", organizationId: org.id },
    }),
    db.product.create({
      data: { name: "Aji Gustoso", sku: "AJI-001", unit: "kg", category: "Produce", organizationId: org.id },
    }),
    // Beverages
    db.product.create({
      data: { name: "Coca-Cola 2L", sku: "BEB-001", unit: "unit", category: "Beverages", organizationId: org.id },
    }),
    db.product.create({
      data: { name: "Presidente (Cerveza)", sku: "BEB-002", unit: "case", category: "Beverages", organizationId: org.id },
    }),
    db.product.create({
      data: { name: "Agua Cristal 1L", sku: "BEB-003", unit: "case", category: "Beverages", organizationId: org.id },
    }),
    db.product.create({
      data: { name: "Jugo de Chinola", sku: "BEB-004", unit: "liter", category: "Beverages", organizationId: org.id },
    }),
    // Packaging
    db.product.create({
      data: { name: "Contenedores Foam", sku: "PAK-001", unit: "case", category: "Other", organizationId: org.id },
    }),
    db.product.create({
      data: { name: "Bolsas Para Llevar", sku: "PAK-002", unit: "case", category: "Other", organizationId: org.id },
    }),
    db.product.create({
      data: { name: "Servilletas", sku: "PAK-003", unit: "case", category: "Other", organizationId: org.id },
    }),
  ]);
  console.log("✅ Created 22 products");

  // Create stock levels with varying statuses
  const stockData = [
    // Zona Colonial - some critical, some ok
    { locationId: zonaColonial.id, productIdx: 0, onHand: 15, dailyUsage: 12 }, // Pollo Entero - LOW
    { locationId: zonaColonial.id, productIdx: 1, onHand: 8, dailyUsage: 5 }, // Pechuga - OK
    { locationId: zonaColonial.id, productIdx: 2, onHand: 3, dailyUsage: 4 }, // Muslos - CRITICAL
    { locationId: zonaColonial.id, productIdx: 3, onHand: 0, dailyUsage: 2 }, // Alitas - OUT
    { locationId: zonaColonial.id, productIdx: 4, onHand: 25, dailyUsage: 8 }, // Arroz - OK
    { locationId: zonaColonial.id, productIdx: 5, onHand: 5, dailyUsage: 3 }, // Habichuelas - LOW
    { locationId: zonaColonial.id, productIdx: 6, onHand: 50, dailyUsage: 20 }, // Platanos Verdes - LOW
    { locationId: zonaColonial.id, productIdx: 7, onHand: 30, dailyUsage: 15 }, // Platanos Maduros - LOW
    { locationId: zonaColonial.id, productIdx: 8, onHand: 10, dailyUsage: 4 }, // Yuca - OK
    { locationId: zonaColonial.id, productIdx: 9, onHand: 2, dailyUsage: 3 }, // Ensalada - CRITICAL
    { locationId: zonaColonial.id, productIdx: 10, onHand: 20, dailyUsage: 5 }, // Aceite - OK
    { locationId: zonaColonial.id, productIdx: 15, onHand: 24, dailyUsage: 8 }, // Coca-Cola - OK
    { locationId: zonaColonial.id, productIdx: 16, onHand: 5, dailyUsage: 3 }, // Presidente - LOW
    { locationId: zonaColonial.id, productIdx: 19, onHand: 2, dailyUsage: 1 }, // Contenedores - LOW

    // Piantini - mostly well stocked
    { locationId: piantini.id, productIdx: 0, onHand: 40, dailyUsage: 10 }, // Pollo Entero - OK
    { locationId: piantini.id, productIdx: 1, onHand: 15, dailyUsage: 4 }, // Pechuga - OK
    { locationId: piantini.id, productIdx: 2, onHand: 12, dailyUsage: 3 }, // Muslos - OK
    { locationId: piantini.id, productIdx: 4, onHand: 30, dailyUsage: 6 }, // Arroz - OK
    { locationId: piantini.id, productIdx: 5, onHand: 8, dailyUsage: 2 }, // Habichuelas - OK
    { locationId: piantini.id, productIdx: 10, onHand: 15, dailyUsage: 4 }, // Aceite - OK
    { locationId: piantini.id, productIdx: 15, onHand: 36, dailyUsage: 6 }, // Coca-Cola - OK

    // Santiago - some issues
    { locationId: santiago.id, productIdx: 0, onHand: 5, dailyUsage: 8 }, // Pollo Entero - CRITICAL
    { locationId: santiago.id, productIdx: 1, onHand: 2, dailyUsage: 3 }, // Pechuga - CRITICAL
    { locationId: santiago.id, productIdx: 4, onHand: 10, dailyUsage: 5 }, // Arroz - LOW
    { locationId: santiago.id, productIdx: 5, onHand: 0, dailyUsage: 2 }, // Habichuelas - OUT
    { locationId: santiago.id, productIdx: 10, onHand: 8, dailyUsage: 3 }, // Aceite - OK
    { locationId: santiago.id, productIdx: 16, onHand: 1, dailyUsage: 2 }, // Presidente - CRITICAL
  ];

  for (const stock of stockData) {
    await db.stockLevel.create({
      data: {
        productId: products[stock.productIdx].id,
        locationId: stock.locationId,
        onHand: stock.onHand,
        dailyUsage: stock.dailyUsage,
      },
    });
  }
  console.log("✅ Created stock levels for all locations");

  // Create reorder rules
  const reorderRules = [
    { productIdx: 0, supplierIdx: 0, safetyDays: 3, reorderQty: 50, mode: "ASSISTED" }, // Pollo Entero
    { productIdx: 1, supplierIdx: 0, safetyDays: 2, reorderQty: 20, mode: "AUTO" }, // Pechuga
    { productIdx: 2, supplierIdx: 0, safetyDays: 2, reorderQty: 15, mode: "AUTO" }, // Muslos
    { productIdx: 3, supplierIdx: 0, safetyDays: 2, reorderQty: 10, mode: "MANUAL" }, // Alitas
    { productIdx: 4, supplierIdx: 2, safetyDays: 4, reorderQty: 50, mode: "ASSISTED" }, // Arroz
    { productIdx: 5, supplierIdx: 2, safetyDays: 3, reorderQty: 20, mode: "ASSISTED" }, // Habichuelas
    { productIdx: 6, supplierIdx: 1, safetyDays: 3, reorderQty: 100, mode: "AUTO" }, // Platanos Verdes
    { productIdx: 10, supplierIdx: 2, safetyDays: 5, reorderQty: 40, mode: "MANUAL" }, // Aceite
    { productIdx: 15, supplierIdx: 3, safetyDays: 3, reorderQty: 48, mode: "AUTO" }, // Coca-Cola
    { productIdx: 16, supplierIdx: 3, safetyDays: 2, reorderQty: 10, mode: "EMERGENCY" }, // Presidente
  ];

  for (const rule of reorderRules) {
    await db.reorderRule.create({
      data: {
        productId: products[rule.productIdx].id,
        supplierId: suppliers[rule.supplierIdx].id,
        safetyDays: rule.safetyDays,
        reorderQty: rule.reorderQty,
        automationMode: rule.mode,
      },
    });
  }
  console.log("✅ Created 10 reorder rules");

  // Create some purchase orders
  const po1 = await db.purchaseOrder.create({
    data: {
      orderNumber: "PO2026-001",
      locationId: zonaColonial.id,
      supplierId: suppliers[0].id,
      status: "SENT",
      sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      notes: "Urgent chicken order",
      items: {
        create: [
          { productId: products[0].id, quantity: 30, unitPrice: 250 },
          { productId: products[2].id, quantity: 10, unitPrice: 180 },
        ],
      },
    },
  });

  const po2 = await db.purchaseOrder.create({
    data: {
      orderNumber: "PO2026-002",
      locationId: piantini.id,
      supplierId: suppliers[2].id,
      status: "DELIVERED",
      sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      confirmedById: managerId,
      items: {
        create: [
          { productId: products[4].id, quantity: 50, unitPrice: 45 },
          { productId: products[5].id, quantity: 20, unitPrice: 65 },
        ],
      },
    },
  });

  const po3 = await db.purchaseOrder.create({
    data: {
      orderNumber: "PO2026-003",
      locationId: santiago.id,
      supplierId: suppliers[3].id,
      status: "DRAFT",
      notes: "Weekly beverage order",
      items: {
        create: [
          { productId: products[15].id, quantity: 48 },
          { productId: products[16].id, quantity: 10 },
          { productId: products[17].id, quantity: 5 },
        ],
      },
    },
  });
  console.log("✅ Created 3 purchase orders");

  // Create alerts
  await db.alert.create({
    data: {
      type: "LOW_STOCK",
      severity: "CRIT",
      title: "Critical: Alitas de Pollo Out of Stock",
      message: "Zona Colonial has run out of Alitas de Pollo. Immediate reorder required.",
      organizationId: org.id,
      locationId: zonaColonial.id,
      relatedId: products[3].id,
      relatedType: "product",
    },
  });

  await db.alert.create({
    data: {
      type: "LOW_STOCK",
      severity: "WARN",
      title: "Low Stock: Habichuelas Rojas",
      message: "Santiago Centro is running low on Habichuelas Rojas (0 units remaining).",
      organizationId: org.id,
      locationId: santiago.id,
      relatedId: products[5].id,
      relatedType: "product",
    },
  });

  await db.alert.create({
    data: {
      type: "DELIVERY_NOT_CONFIRMED",
      severity: "WARN",
      title: "Delivery Pending Confirmation",
      message: "PO2026-001 was sent 2 days ago but delivery has not been confirmed.",
      organizationId: org.id,
      locationId: zonaColonial.id,
      relatedId: po1.id,
      relatedType: "purchase_order",
    },
  });

  await db.alert.create({
    data: {
      type: "DRAFT_PO_PENDING",
      severity: "INFO",
      title: "Draft PO Pending Review",
      message: "PO2026-003 for Santiago Centro is ready for review and sending.",
      organizationId: org.id,
      locationId: santiago.id,
      relatedId: po3.id,
      relatedType: "purchase_order",
    },
  });
  console.log("✅ Created 4 alerts");

  console.log("\n" + "=".repeat(60));
  console.log("🎉 SEED COMPLETE - Pollo Victorina Test Data Created!");
  console.log("=".repeat(60));
  console.log("\n📧 TEST ACCOUNTS:\n");
  console.log("   OWNER LOGIN:");
  console.log("   Email:    owner@pollovictorina.com");
  console.log("   Password: owner123");
  console.log("   Access:   All 3 locations, full management\n");
  console.log("   MANAGER LOGIN:");
  console.log("   Email:    manager@pollovictorina.com");
  console.log("   Password: manager123");
  console.log("   Access:   Zona Colonial only, delivery confirmation\n");
  console.log("=".repeat(60));

  await db.$disconnect();
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
