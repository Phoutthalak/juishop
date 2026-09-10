import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { getSql, usesPostgres } from "./db";
import { defaultStore } from "./seed";
import type {
  CartLineInput,
  Order,
  OrderItem,
  PayMethod,
  Currency,
  Product,
  Settings,
  StoreData,
} from "./types";
import { convertFromBase, roundMoney } from "./money";

const dataDir = path.join(process.cwd(), "data");
const storePath = path.join(dataDir, "store.json");

type StoreRow = { payload: unknown; version: number };

let initPromise: Promise<void> | null = null;

function cloneStore(data: StoreData): StoreData {
  return structuredClone(data);
}

function asStore(payload: unknown): StoreData {
  const data =
    typeof payload === "string"
      ? (JSON.parse(payload) as StoreData)
      : (payload as StoreData);
  return normalizeStore(data);
}

function normalizeStore(data: StoreData): StoreData {
  return {
    settings: {
      shopName: data.settings?.shopName ?? "AllNew Shop",
      baseCurrency: data.settings?.baseCurrency ?? "LAK",
      lakPerThb: data.settings?.lakPerThb ?? 550,
      qrNote: data.settings?.qrNote ?? "",
      receiptFooter: data.settings?.receiptFooter ?? "",
      accessPin: data.settings?.accessPin ?? "",
      qrImage: data.settings?.qrImage ?? "",
    },
    products: data.products ?? [],
    orders: data.orders ?? [],
  };
}

export function toPublicSettings(settings: Settings): Settings {
  const { accessPin, ...rest } = settings;
  return {
    ...rest,
    hasAccessPin: Boolean(accessPin),
  };
}

export function toPublicStore(store: StoreData): StoreData {
  return {
    ...store,
    settings: toPublicSettings(store.settings),
  };
}

export function verifyAccessPin(settings: Settings, pin: string): boolean {
  const expected = settings.accessPin ?? "";
  if (!expected) return true;
  return pin === expected;
}

function readFileStore(): StoreData {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(storePath)) {
    const seed = defaultStore();
    writeFileSync(storePath, JSON.stringify(seed, null, 2), "utf8");
    return seed;
  }
  return normalizeStore(JSON.parse(readFileSync(storePath, "utf8")) as StoreData);
}

function writeFileStore(data: StoreData) {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  writeFileSync(storePath, JSON.stringify(data, null, 2), "utf8");
}

async function ensurePostgres() {
  if (!initPromise) {
    initPromise = (async () => {
      const sql = getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS pos_store (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          payload JSONB NOT NULL,
          version INTEGER NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      const seed = JSON.stringify(defaultStore());
      await sql`
        INSERT INTO pos_store (id, payload, version)
        VALUES (1, ${seed}::jsonb, 0)
        ON CONFLICT (id) DO NOTHING
      `;
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  await initPromise;
}

async function loadStore(): Promise<{ data: StoreData; version: number }> {
  if (!usesPostgres()) {
    return { data: cloneStore(readFileStore()), version: 0 };
  }

  await ensurePostgres();
  const sql = getSql();
  const rows = (await sql`
    SELECT payload, version FROM pos_store WHERE id = 1
  `) as StoreRow[];
  const row = rows[0];
  if (!row) {
    const seed = defaultStore();
    return { data: seed, version: 0 };
  }
  return { data: cloneStore(asStore(row.payload)), version: Number(row.version) };
}

async function saveStore(data: StoreData, version: number): Promise<boolean> {
  if (!usesPostgres()) {
    writeFileStore(data);
    return true;
  }

  await ensurePostgres();
  const sql = getSql();
  const payload = JSON.stringify(data);
  const rows = (await sql`
    UPDATE pos_store
    SET payload = ${payload}::jsonb,
        version = version + 1,
        updated_at = NOW()
    WHERE id = 1 AND version = ${version}
    RETURNING version
  `) as Array<{ version: number }>;
  return rows.length > 0;
}

async function withStore<T>(mutator: (store: StoreData) => T): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, version } = await loadStore();
    const result = mutator(data);
    if (await saveStore(data, version)) return result;
  }
  throw new Error("Could not save — another sale updated stock. Please try again.");
}

export async function getStore(): Promise<StoreData> {
  const { data } = await loadStore();
  return data;
}

export async function getSettings(): Promise<Settings> {
  return (await getStore()).settings;
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  return withStore((store) => {
    const nextPin =
      patch.accessPin !== undefined && patch.accessPin !== ""
        ? patch.accessPin
        : store.settings.accessPin;
    const safePatch = { ...patch };
    delete safePatch.accessPin;
    delete safePatch.hasAccessPin;
    store.settings = {
      ...store.settings,
      ...safePatch,
      accessPin: nextPin,
    };
    return store.settings;
  });
}

export async function listProducts(): Promise<Product[]> {
  return (await getStore()).products;
}

export async function upsertProduct(product: Product): Promise<Product> {
  return withStore((store) => {
    const idx = store.products.findIndex((p) => p.id === product.id);
    if (idx >= 0) store.products[idx] = product;
    else store.products.push(product);
    return product;
  });
}

export async function listOrders(): Promise<Order[]> {
  return (await getStore()).orders;
}

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function createSale(input: {
  lines: CartLineInput[];
  discountBase?: number;
  method: PayMethod;
  currency: Currency;
  note?: string;
  cashier?: string;
}): Promise<Order> {
  return withStore((store) => {
    const { settings } = store;
    if (!input.lines.length) throw new Error("Cart is empty");

    const items: OrderItem[] = [];

    for (const line of input.lines) {
      const product = store.products.find((p) => p.id === line.productId && p.active);
      if (!product) throw new Error(`Product not found: ${line.productId}`);
      const variant = product.variants.find((v) => v.id === line.variantId);
      if (!variant) throw new Error(`Variant not found: ${line.variantId}`);
      if (line.qty <= 0) throw new Error("Quantity must be positive");
      if (variant.stock < line.qty) {
        throw new Error(`Not enough stock for ${product.name} (${variant.sku})`);
      }

      const labelParts = [product.name];
      if (variant.size) labelParts.push(variant.size);
      if (variant.color) labelParts.push(variant.color);

      items.push({
        productId: product.id,
        variantId: variant.id,
        name: labelParts.join(" · "),
        sku: variant.sku,
        qty: line.qty,
        unitPriceBase: product.price,
        lineTotalBase: roundMoney(product.price * line.qty, settings.baseCurrency),
      });
    }

    const subtotal = items.reduce((s, i) => s + i.lineTotalBase, 0);
    const discountBase = Math.max(0, input.discountBase ?? 0);
    if (discountBase > subtotal) throw new Error("Discount exceeds subtotal");
    const totalBase = roundMoney(subtotal - discountBase, settings.baseCurrency);
    const amount = convertFromBase(totalBase, input.currency, settings);

    for (const line of input.lines) {
      const product = store.products.find((p) => p.id === line.productId)!;
      const variant = product.variants.find((v) => v.id === line.variantId)!;
      variant.stock -= line.qty;
    }

    const order: Order = {
      id: newId("ord"),
      createdAt: new Date().toISOString(),
      items,
      discountBase,
      totalBase,
      payment: {
        method: input.method,
        currency: input.currency,
        amount,
      },
      fxRateUsed: settings.lakPerThb,
      status: "completed",
      note: input.note,
      cashier: input.cashier?.trim() || undefined,
    };

    store.orders.unshift(order);
    return order;
  });
}

export async function voidOrder(orderId: string): Promise<Order> {
  return withStore((store) => {
    const order = store.orders.find((o) => o.id === orderId);
    if (!order) throw new Error("Order not found");
    if (order.status === "void") return order;

    for (const item of order.items) {
      const product = store.products.find((p) => p.id === item.productId);
      const variant = product?.variants.find((v) => v.id === item.variantId);
      if (variant) variant.stock += item.qty;
    }

    order.status = "void";
    return order;
  });
}
