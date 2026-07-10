export type UserRole = "admin" | "client" | "reseller";

export interface UserProfile {
  email: string;
  role: UserRole;
  addedAt: string;
  password?: string;
  username?: string;
}

export interface Shelf {
  id: string;
  rackNumber: string;
  scentName: string;
  pricePerMl: number;
}

export interface ScentPrice {
  scentName: string;
  pricePerMl: number;
  updatedAt: string;
}

export interface StockItem {
  id: string;
  type: "essence" | "alcohol" | "bottle";
  scentName?: string;
  size?: string; // For bottles (e.g. "30ml", "50ml", "100ml")
  bottleType?: "Kaca" | "Plastik";
  quantity: number; // in ml or units
}

export interface SaleItem {
  id: string;
  scentName: string;
  volumeMl: number;
  bottleSize: string; // "None" (Hanya Bibit) or size (e.g. "30ml", "50ml", "100ml")
  bottleType?: "Kaca" | "Plastik";
  bottleCount: number;
  noBottleStockDeduct?: boolean;
}

export interface Transaction {
  id: string;
  type: "purchase" | "sale" | "transfer";
  date: string; // ISO String or local Date string
  timestamp?: string; // Optional timestamp
  category: "bibit" | "alkohol" | "botol" | "other";
  scentName?: string; // If bibit/essence is selected
  volumeMl?: number; // Volume of bibit
  bottleSize?: string; // "None" or size (e.g. "30ml", "50ml", "100ml")
  bottleType?: "Kaca" | "Plastik";
  bottleCount?: number; // Quantity of bottles
  totalPrice: number;
  discountType?: "none" | "free_bottle" | "nominal";
  discountNominal?: number;
  description: string;
  operatorEmail: string;
  customerName?: string;
  claimPromoOnThisTx?: boolean;
  noBottleStockDeduct?: boolean;
  items?: SaleItem[];
  resellerEmail?: string;
  paymentStatus?: "Lunas" | "Belum Dibayar";
  isConsignment?: boolean;
  packageName?: string;
}

export interface Salary {
  id: string;
  employeeName: string;
  amount: number;
  month: string; // e.g. "July 2026"
  datePaid: string;
  notes: string;
}

export interface CashMutation {
  id: string;
  date: string;
  type: "in" | "out";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  referenceId?: string;
}

export interface BottleSize {
  id: string;
  size: string;
  price: number; // legacy/fallback
  priceKaca?: number;
  pricePlastik?: number;
  purchasePriceKaca?: number;
  purchasePricePlastik?: number;
  addedAt: string;
}

export interface InvoiceSettings {
  storeName: string;
  slogan: string;
  address: string;
  phone: string;
  headerMessage: string;
  footerMessage1: string;
  footerMessage2: string;
  paperWidth: "58mm" | "80mm";
  logoUrl: string;
  showLogo: boolean;
  appIconUrl?: string;
}

export interface Customer {
  id: string;
  name: string;
  totalPurchase: number;
  claimedPromos: number;
  updatedAt: string;
}

export interface ResellerStock {
  id: string; // resellerEmail_stockType_scentName/size
  resellerEmail: string;
  type: "essence" | "alcohol" | "bottle";
  scentName?: string;
  size?: string; // For bottles
  quantity: number;
}

export interface ResellerPackageStock {
  id: string; // resellerEmail_packageId
  resellerEmail: string;
  packageId: string;
  packageName: string;
  scentName: string;
  bottleSize: string;
  quantity: number;
}

export interface BundlingPackage {
  id: string;
  packageName: string;
  scentName?: string;
  bottleSize: string;
  essenceMl: number;
  alcoholMl: number;
  price: number;
  solventType?: "Absolut Cair" | "Absolut Gel";
  addedAt: string;
}



