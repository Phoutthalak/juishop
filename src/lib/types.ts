export type Currency = "THB" | "LAK";
export type PayMethod = "cash" | "qr";
export type ProductType = "clothes" | "gift" | "box";
export type OrderStatus = "completed" | "void";

export interface Settings {
  shopName: string;
  baseCurrency: Currency;
  /** How many LAK equal 1 THB (e.g. 550). */
  lakPerThb: number;
  qrNote: string;
  receiptFooter: string;
}

export interface Variant {
  id: string;
  sku: string;
  size?: string;
  color?: string;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  /** Unit price in shop base currency. */
  price: number;
  cost: number;
  barcode?: string;
  lowStockAt: number;
  active: boolean;
  variants: Variant[];
}

export interface CartLineInput {
  productId: string;
  variantId: string;
  qty: number;
}

export interface OrderItem {
  productId: string;
  variantId: string;
  name: string;
  sku: string;
  qty: number;
  unitPriceBase: number;
  lineTotalBase: number;
}

export interface Payment {
  method: PayMethod;
  currency: Currency;
  amount: number;
}

export interface Order {
  id: string;
  createdAt: string;
  items: OrderItem[];
  discountBase: number;
  totalBase: number;
  payment: Payment;
  fxRateUsed: number;
  status: OrderStatus;
  note?: string;
}

export interface StoreData {
  settings: Settings;
  products: Product[];
  orders: Order[];
}
