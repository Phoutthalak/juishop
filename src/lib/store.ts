import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
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

// const dataDir = path.join(process.cwd(), "data");
// const storePath = path.join(dataDir, "store.json");
// Replace your existing dataDir and storePath declarations with this:
const dataDir = path.join("/tmp", "data");
const storePath = path.join(dataDir, "store.json");

function ensureStore(): StoreData {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(storePath)) {
    const seed = defaultStore();
    writeFileSync(storePath, JSON.stringify(seed, null, 2), "utf8");
    return seed;
  }
  const raw = readFileSync(storePath, "utf8");
  return JSON.parse(raw) as StoreData;
}

function saveStore(data: StoreData) {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  writeFileSync(storePath, JSON.stringify(data, null, 2), "utf8");
}

export function getStore(): StoreData {
  return ensureStore();
}

export function getSettings(): Settings {
  return getStore().settings;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const store = getStore();
  store.settings = { ...store.settings, ...patch };
  saveStore(store);
  return store.settings;
}

export function listProducts(): Product[] {
  return getStore().products;
}

export function upsertProduct(product: Product): Product {
  const store = getStore();
  const idx = store.products.findIndex((p) => p.id === product.id);
  if (idx >= 0) store.products[idx] = product;
  else store.products.push(product);
  saveStore(store);
  return product;
}

export function listOrders(): Order[] {
  return getStore().orders;
}

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createSale(input: {
  lines: CartLineInput[];
  discountBase?: number;
  method: PayMethod;
  currency: Currency;
  note?: string;
}): Order {
  const store = getStore();
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

  // Deduct stock
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
  };

  store.orders.unshift(order);
  saveStore(store);
  return order;
}

export function voidOrder(orderId: string): Order {
  const store = getStore();
  const order = store.orders.find((o) => o.id === orderId);
  if (!order) throw new Error("Order not found");
  if (order.status === "void") return order;

  for (const item of order.items) {
    const product = store.products.find((p) => p.id === item.productId);
    const variant = product?.variants.find((v) => v.id === item.variantId);
    if (variant) variant.stock += item.qty;
  }

  order.status = "void";
  saveStore(store);
  return order;
}

export function resetToSeed(): StoreData {
  const seed = defaultStore();
  saveStore(seed);
  return seed;
}
