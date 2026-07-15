import React, { useState, useEffect } from "react";
import { 
  auth, 
  db,
  doc,
  onSnapshot,
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  createAuthUserWithoutLoggingOut,
  User 
} from "./firebase";
import {
  seedInitialDataIfEmpty,
  subscribeToCashBalance,
  subscribeToShelves,
  addShelf,
  updateShelf,
  deleteShelf,
  subscribeToPrices,
  updateScentPrice,
  subscribeToStocks,
  updateStockManual,
  subscribeToTransactions,
  addTransaction,
  deleteTransaction,
  subscribeToSalaries,
  addSalary,
  deleteSalary,
  subscribeToCashLedger,
  addManualCashMutation,
  subscribeToClients,
  addClientUser,
  deleteClientUser,
  subscribeToBottleSizes,
  addBottleSize,
  deleteBottleSize,
  updateInitialCapital,
  subscribeToInvoiceSettings,
  updateInvoiceSettings,
  subscribeToCustomers,
  subscribeToPromoConfig,
  updatePromoConfig,
  claimCustomerPromo,
  updateCustomerName,
  deleteCustomer,
  exportDatabaseData,
  importDatabaseData,
  clearEntireDatabase,
  subscribeToResellerStocks,
  subscribeToResellerPackageStocks,
  subscribeToBundlingPackages,
  addBundlingPackage,
  deleteBundlingPackage,
  updateBundlingPackage,
  transferStockToReseller,
  sendBundlingPackageToReseller,
  returBundlingPackageFromReseller,
  addResellerSaleTransaction,
  settleResellerTransaction
} from "./dbService";
import { 
  Shelf as ShelfType, 
  ScentPrice, 
  StockItem, 
  Transaction, 
  Salary, 
  CashMutation, 
  UserProfile, 
  UserRole,
  BottleSize,
  InvoiceSettings,
  Customer,
  SaleItem,
  ResellerStock,
  ResellerPackageStock,
  BundlingPackage
} from "./types";
import { 
  ShoppingBag, 
  TrendingUp, 
  Wallet, 
  Users, 
  Layers, 
  Search, 
  Plus, 
  Trash2, 
  Settings, 
  LogOut, 
  Lock, 
  RefreshCw, 
  RotateCcw,
  AlertCircle, 
  Activity, 
  Calendar, 
  DollarSign, 
  Package, 
  Box, 
  Check, 
  PlusCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Filter, 
  UserPlus, 
  Edit3,
  Sparkles,
  Info,
  Coins,
  Save,
  FileSpreadsheet,
  X,
  Printer,
  Upload,
  Database,
  UserCheck
} from "lucide-react";

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [customEmail, setCustomEmail] = useState("");
  const [userRole, setUserRole] = useState<UserRole | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("bastika_user_role") as UserRole | null;
    }
    return null;
  });
  const [userWhitelist, setUserWhitelist] = useState<UserProfile[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLoadingFallback, setShowLoadingFallback] = useState(false);

  // Real Email/Password Auth State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Core Data State
  const [cashBalance, setCashBalance] = useState(0);
  const [shelves, setShelves] = useState<ShelfType[]>([]);
  const [prices, setPrices] = useState<ScentPrice[]>([]);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [cashLedger, setCashLedger] = useState<CashMutation[]>([]);
  const [bottleSizes, setBottleSizes] = useState<BottleSize[]>([]);
  
  // Consignment & Bundling States
  const [resellerStocks, setResellerStocks] = useState<ResellerStock[]>([]);
  const [resellerPackageStocks, setResellerPackageStocks] = useState<ResellerPackageStock[]>([]);
  const [bundlingPackages, setBundlingPackages] = useState<BundlingPackage[]>([]);
  const [showAddBundling, setShowAddBundling] = useState(false);
  const [editingBundling, setEditingBundling] = useState<BundlingPackage | null>(null);
  const [lastFormula, setLastFormula] = useState(() => {
    try {
      const saved = localStorage.getItem("last_bundling_formula");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return {
      bottleSize: "30ml",
      essenceMl: 10,
      alcoholMl: 20,
      price: 35000,
      solventType: "Absolut Cair" as "Absolut Cair" | "Absolut Gel"
    };
  });

  const [newBundling, setNewBundling] = useState({
    packageName: "",
    scentName: "",
    bottleSize: "30ml", // We'll set this using useEffect or keep the default
    essenceMl: 10,
    alcoholMl: 20,
    price: 35000,
    solventType: "Absolut Cair" as "Absolut Cair" | "Absolut Gel",
    customSuffix: ""
  });

  // Sync newBundling initial state with lastFormula on mount
  useEffect(() => {
    setNewBundling(prev => ({
      ...prev,
      bottleSize: lastFormula.bottleSize,
      essenceMl: lastFormula.essenceMl,
      alcoholMl: lastFormula.alcoholMl,
      price: lastFormula.price,
      solventType: lastFormula.solventType || "Absolut Cair"
    }));
  }, [lastFormula]);
  const [showTransferStock, setShowTransferStock] = useState(false);
  const [transferForm, setTransferForm] = useState({
    resellerEmail: "",
    type: "essence" as "essence" | "alcohol" | "bottle",
    scentName: "",
    size: "30ml",
    quantity: 0
  });
  const [sendPackageForm, setSendPackageForm] = useState({
    resellerEmail: "",
    packageId: "",
    quantity: 1
  });
  const [returnPackageForm, setReturnPackageForm] = useState({
    resellerEmail: "",
    packageId: "",
    packageName: "",
    scentName: "",
    bottleSize: "",
    availableQty: 0,
    quantityToReturn: 1
  });
  const [showReturnPackageModal, setShowReturnPackageModal] = useState(false);
  const [resellerSaleForm, setResellerSaleForm] = useState({
    packageId: "",
    scentName: "",
    quantity: 1
  });
  const [resellerActiveTab, setResellerActiveTab] = useState<"setoran" | "penjualan">("penjualan");
  const [adminActiveConsignmentTab, setAdminActiveConsignmentTab] = useState<"dashboard" | "packages" | "transfers" | "piutang">("dashboard");

  // Invoice settings & Print state
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>({
    storeName: "BASTIKA PARFUM",
    slogan: "THE PREMIUM SCENTS",
    address: "Komp. Ruko Bastika, Jl. Raya Wangi No. 5, Jakarta",
    phone: "0812-3456-7890",
    headerMessage: "BUKTI PENJUALAN RESMI",
    footerMessage1: "Terima Kasih Atas Kunjungan Anda",
    footerMessage2: "Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.",
    paperWidth: "58mm",
    logoUrl: "/icon.jpg",
    showLogo: true
  });
  const [tempSettings, setTempSettings] = useState<InvoiceSettings | null>(null);
  const [printTx, setPrintTx] = useState<Transaction | null>(null);
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);

  // State for adding new custom bottle size
  const [newBottleSize, setNewBottleSize] = useState("");
  const [newBottlePriceKaca, setNewBottlePriceKaca] = useState<number>(0);
  const [newBottlePricePlastik, setNewBottlePricePlastik] = useState<number>(0);
  const [newBottlePurchasePriceKaca, setNewBottlePurchasePriceKaca] = useState<number>(0);
  const [newBottlePurchasePricePlastik, setNewBottlePurchasePricePlastik] = useState<number>(0);
  const [showAddBottleSize, setShowAddBottleSize] = useState(false);

  // Material type selection states
  const [saleBottleType, setSaleBottleType] = useState<"Kaca" | "Plastik">("Kaca");
  const [purchaseBottleType, setPurchaseBottleType] = useState<"Kaca" | "Plastik">("Kaca");

  // Navigation / UI State
  const [activeTab, setActiveTab] = useState<string>("dashboard"); // 'dashboard', 'shelves', 'stocks', 'sales', 'purchases', 'accounting', 'users', 'history'
  const [searchTerm, setSearchTerm] = useState("");
  const [searchCaseSensitive, setSearchCaseSensitive] = useState(false);
  const [searchColumn, setSearchColumn] = useState("all");
  const [syncStatus, setSyncStatus] = useState<"synced" | "offline" | "syncing">("synced");

  // History & Transactions filter state variables
  const [historyFilterStartDate, setHistoryFilterStartDate] = useState("");
  const [historyFilterEndDate, setHistoryFilterEndDate] = useState("");
  const [historyFilterMonth, setHistoryFilterMonth] = useState(""); // Format: "MM" (01 to 12)
  const [historyFilterYear, setHistoryFilterYear] = useState(""); // Format: "YYYY"

  // Sales cashier list filtering states
  const [salesSearchTerm, setSalesSearchTerm] = useState("");
  const [salesSearchColumn, setSalesSearchColumn] = useState("all"); // 'all', 'customerName', 'scentName', 'bottle', 'totalPrice'
  const [salesSearchCaseSensitive, setSalesSearchCaseSensitive] = useState(false);
  const [salesFilterStartDate, setSalesFilterStartDate] = useState("");
  const [salesFilterEndDate, setSalesFilterEndDate] = useState("");
  const [salesFilterMonth, setSalesFilterMonth] = useState(""); // Format: "MM" (01 to 12)
  const [salesFilterYear, setSalesFilterYear] = useState(""); // Format: "YYYY"

  // Input forms state
  const [newShelf, setNewShelf] = useState({ rackNumber: "", scentName: "", pricePerMl: 3500 });
  const [editingPrice, setEditingPrice] = useState<{ scentName: string; pricePerMl: number } | null>(null);
  const [editingShelf, setEditingShelf] = useState<{ id: string; rackNumber: string } | null>(null);
  
  // Sales cashier state
  const [saleScent, setSaleScent] = useState("");
  const [saleVolume, setSaleVolume] = useState<number>(0);
  const [saleBottleSize, setSaleBottleSize] = useState("30ml");
  const [saleBottleCount, setSaleBottleCount] = useState<number>(1);
  const [saleTotalPrice, setSaleTotalPrice] = useState<number>(0);
  const [saleDescription, setSaleDescription] = useState("");
  const [saleDiscountType, setSaleDiscountType] = useState<"none" | "free_bottle" | "nominal">("none");
  const [saleDiscountNominal, setSaleDiscountNominal] = useState<number>(0);
  const [saleCustomerName, setSaleCustomerName] = useState("");
  const [saleClaimPromo, setSaleClaimPromo] = useState<boolean>(false);
  const [saleNoBottle, setSaleNoBottle] = useState<boolean>(false);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);

  // Purchase stock state
  const [purchaseCategory, setPurchaseCategory] = useState<"bibit" | "alkohol" | "botol" | "other">("bibit");
  const [purchaseScent, setPurchaseScent] = useState("");
  const [purchaseBottleSize, setPurchaseBottleSize] = useState("30ml");
  const [purchaseVolume, setPurchaseVolume] = useState<number>(0);
  const [purchaseCount, setPurchaseCount] = useState<number>(0);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [purchaseDesc, setPurchaseDesc] = useState("");
  const [purchaseSearchTerm, setPurchaseSearchTerm] = useState("");
  const [purchaseFilterStartDate, setPurchaseFilterStartDate] = useState("");
  const [purchaseFilterEndDate, setPurchaseFilterEndDate] = useState("");
  const [purchaseListCategoryFilter, setPurchaseListCategoryFilter] = useState<string>("all");

  // Salary form state
  const [salEmployee, setSalEmployee] = useState("");
  const [salAmount, setSalAmount] = useState<number>(0);
  const [salMonth, setSalMonth] = useState("");
  const [salNotes, setSalNotes] = useState("");

  // Client whitelisting form state
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientRole, setNewClientRole] = useState<UserRole>("client");
  const [newClientPassword, setNewClientPassword] = useState("");

  // Manual cash mutation state
  const [manualMutationType, setManualMutationType] = useState<"in" | "out">("in");
  const [manualMutationAmount, setManualMutationAmount] = useState<number>(0);
  const [manualMutationDesc, setManualMutationDesc] = useState("");

  // Customer and Promo State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [promoThreshold, setPromoThreshold] = useState<number>(500000);
  const [promoDiscount, setPromoDiscount] = useState<number>(50000);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [adminThresholdInput, setAdminThresholdInput] = useState<string>("500000");
  const [adminDiscountInput, setAdminDiscountInput] = useState<string>("50000");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingCustomerName, setEditingCustomerName] = useState<string>("");


  // Filter & Excel Export state variables
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState<string>(""); // Format: "YYYY-MM"
  const [inputInitialCapital, setInputInitialCapital] = useState<number>(15000000);

  // Notification Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Show Toast helper
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Reset search column filter when switching tabs
  useEffect(() => {
    setSearchColumn("all");
    setSearchTerm("");
  }, [activeTab]);

  // Monitor Network connection for Offline Indicator
  useEffect(() => {
    const handleOnline = () => setSyncStatus("synced");
    const handleOffline = () => setSyncStatus("offline");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (!navigator.onLine) setSyncStatus("offline");
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Safety timeout to prevent infinite loading state (e.g. slow/unstable Firebase on Netlify)
  useEffect(() => {
    let timer1: any;
    let timer2: any;
    if (authLoading) {
      setShowLoadingFallback(false);
      // Show recovery/bypass buttons after 3 seconds of loading
      timer1 = setTimeout(() => {
        setShowLoadingFallback(true);
      }, 3000);
      
      // Auto-bypass loading state after 6 seconds
      timer2 = setTimeout(() => {
        console.warn("Auth loading took too long, forcing authLoading to false.");
        setAuthLoading(false);
      }, 6000);
    }
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [authLoading]);

  // 1. Authenticated User Listeners
  useEffect(() => {
    setAuthLoading(true);
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        const emailClean = user.email?.trim().toLowerCase();
        if (emailClean === "bastikacorp@gmail.com") {
          // Seed database once user is authenticated
          seedInitialDataIfEmpty().then(() => {
            showToast("Koneksi cloud terhubung. Database tersinkronisasi.", "info");
          });
        }
        
        // Optimistic bypass of loading screen if user role is cached locally
        if (typeof window !== "undefined") {
          const cachedRole = localStorage.getItem("bastika_user_role");
          if (cachedRole) {
            setUserRole(cachedRole as UserRole);
            setAuthLoading(false);
          }
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("bastika_user_role");
        }
        setAuthLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 2. Client Whitelist sync & role evaluation (Individual subscription)
  useEffect(() => {
    if (!currentUser) {
      setUserRole(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("bastika_user_role");
      }
      return;
    }

    const emailClean = currentUser.email?.trim().toLowerCase();
    if (!emailClean) {
      setUserRole(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("bastika_user_role");
      }
      setAuthLoading(false);
      return;
    }

    // Subscribe to the individual user's document
    const userDocRef = doc(db, "users", emailClean);
    const unsubscribeUserDoc = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        const role = userData.role as UserRole;
        setUserRole(role);
        if (typeof window !== "undefined") {
          localStorage.setItem("bastika_user_role", role);
        }
      } else {
        // Special case for primary admin
        if (emailClean === "bastikacorp@gmail.com") {
          setUserRole("admin");
          if (typeof window !== "undefined") {
            localStorage.setItem("bastika_user_role", "admin");
          }
          // Auto-create document for primary admin in Firestore if it doesn't exist
          addClientUser("bastikacorp@gmail.com", "admin", undefined, "admin").catch(console.error);
        } else {
          setUserRole(null);
          if (typeof window !== "undefined") {
            localStorage.removeItem("bastika_user_role");
          }
        }
      }
      setAuthLoading(false);
    }, (error) => {
      console.error("Gagal memuat dokumen user:", error);
      // Fallback for primary admin even if doc fetch failed
      if (emailClean === "bastikacorp@gmail.com") {
        setUserRole("admin");
        if (typeof window !== "undefined") {
          localStorage.setItem("bastika_user_role", "admin");
        }
      } else {
        setUserRole(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("bastika_user_role");
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribeUserDoc();
  }, [currentUser]);

  // 2b. Admin-only: Subscribe to all whitelisted users
  useEffect(() => {
    if (userRole !== "admin" || !currentUser) {
      setUserWhitelist([]);
      return;
    }

    const unsubscribe = subscribeToClients((users) => {
      setUserWhitelist(users);
    }, (error) => {
      console.error("Gagal memuat list whitelist:", error);
    });

    return () => unsubscribe();
  }, [userRole, currentUser]);

  // 3. Real-time Subscriptions to DB
  useEffect(() => {
    if (!userRole) return; // Only sync when logged in

    const unsubCash = subscribeToCashBalance(setCashBalance);
    const unsubShelves = subscribeToShelves(setShelves);
    const unsubPrices = subscribeToPrices(setPrices);
    const unsubStocks = subscribeToStocks(setStocks);
    const unsubTx = subscribeToTransactions(setTransactions);
    const unsubBottleSizes = subscribeToBottleSizes(setBottleSizes);
    const unsubInvoice = subscribeToInvoiceSettings(setInvoiceSettings);
    const unsubCustomers = subscribeToCustomers(setCustomers);
    const unsubPromo = subscribeToPromoConfig((config) => {
      setPromoThreshold(config.threshold);
      setAdminThresholdInput(config.threshold.toString());
      setPromoDiscount(config.discountAmount);
      setAdminDiscountInput(config.discountAmount.toString());
    });
    const unsubResellerStocks = subscribeToResellerStocks(setResellerStocks);
    const unsubResellerPackageStocks = subscribeToResellerPackageStocks(setResellerPackageStocks);
    const unsubBundlingPackages = subscribeToBundlingPackages(setBundlingPackages);

    let unsubSalaries = () => {};
    let unsubLedger = () => {};

    if (userRole === "admin") {
      unsubSalaries = subscribeToSalaries(setSalaries);
      unsubLedger = subscribeToCashLedger(setCashLedger);
    }

    return () => {
      unsubCash();
      unsubShelves();
      unsubPrices();
      unsubStocks();
      unsubTx();
      unsubBottleSizes();
      unsubSalaries();
      unsubLedger();
      unsubInvoice();
      unsubCustomers();
      unsubPromo();
      unsubResellerStocks();
      unsubResellerPackageStocks();
      unsubBundlingPackages();
    };
  }, [userRole]);

  // Auto-seed for bypass testing simulation
  useEffect(() => {
    if (customEmail) {
      seedInitialDataIfEmpty();
    }
  }, [customEmail]);

  // Sync local tempSettings with Firestore config
  useEffect(() => {
    if (invoiceSettings) {
      setTempSettings(invoiceSettings);
    }
  }, [invoiceSettings]);

  // Sync initial capital input state with the actual ledger's mut_init mutation
  useEffect(() => {
    const initMut = cashLedger.find((m) => m.id === "mut_init");
    if (initMut) {
      setInputInitialCapital(initMut.amount);
    }
  }, [cashLedger]);

  // Price Calculation Logic for Sales
  useEffect(() => {
    let subtotal = 0;

    if (saleItems.length > 0) {
      subtotal = saleItems.reduce((acc, item) => {
        const matchedPrice = prices.find(p => p.scentName === item.scentName);
        const pricePerMl = matchedPrice ? matchedPrice.pricePerMl : 0;
        let bottleFee = 0;
        if (item.bottleSize !== "None") {
          const matchedBottle = bottleSizes.find(b => b.size === item.bottleSize);
          if (matchedBottle) {
            bottleFee = item.bottleType === "Plastik"
              ? (matchedBottle.pricePlastik ?? Math.round((matchedBottle.price ?? 10000) / 2))
              : (matchedBottle.priceKaca ?? matchedBottle.price ?? 10000);
          }
        }
        if (item.noBottleStockDeduct || saleDiscountType === "free_bottle") {
          bottleFee = 0;
        }
        const baseCost = (item.volumeMl * pricePerMl) + bottleFee;
        return acc + (baseCost * item.bottleCount);
      }, 0);
    } else {
      // Fallback to single item from form
      const matchedPrice = prices.find(p => p.scentName === saleScent);
      const pricePerMl = matchedPrice ? matchedPrice.pricePerMl : 0;
      let bottleFee = 0;
      if (saleBottleSize !== "None") {
        const matchedBottle = bottleSizes.find(b => b.size === saleBottleSize);
        if (matchedBottle) {
          bottleFee = saleBottleType === "Plastik"
            ? (matchedBottle.pricePlastik ?? Math.round((matchedBottle.price ?? 10000) / 2))
            : (matchedBottle.priceKaca ?? matchedBottle.price ?? 10000);
        }
      }
      if (saleDiscountType === "free_bottle" || saleNoBottle) {
        bottleFee = 0;
      }
      const baseCost = (saleVolume * pricePerMl) + bottleFee;
      subtotal = baseCost * saleBottleCount;
    }

    let computedTotal = subtotal;
    // Apply custom nominal discount
    if (saleDiscountType === "nominal") {
      computedTotal = Math.max(0, computedTotal - saleDiscountNominal);
    }

    setSaleTotalPrice(computedTotal);
  }, [saleScent, saleVolume, saleBottleSize, saleBottleCount, saleItems, prices, bottleSizes, saleDiscountType, saleDiscountNominal, saleNoBottle]);

  // Currency Formatter helper (Indonesian Rupiah)
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(value);
  };

  // Login handler with bypass for sandbox environment
  const handleBypassLogin = async (email: string) => {
    setAuthLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      // Use a standard secure default password for automatic simulated registration
      const defaultPassword = "bastikaPassword123";
      
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, cleanEmail, defaultPassword);
      } catch (err: any) {
        if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.code === "auth/invalid-email" || err.code === "auth/invalid-login-credentials") {
          // Auto create account if it doesn't exist
          userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, defaultPassword);
        } else {
          throw err;
        }
      }
      
      setCurrentUser(userCredential.user);
      setCustomEmail(cleanEmail);
      showToast(`Berhasil masuk sebagai ${cleanEmail}`, "success");
      
      if (cleanEmail === "bastikacorp@gmail.com") {
        setActiveTab("dashboard");
      } else {
        setActiveTab("sales");
      }
    } catch (err: any) {
      console.error("Bypass login error:", err);
      showToast("Gagal masuk lewat simulasi email", "error");
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      showToast(`Selamat datang, ${result.user.displayName || result.user.email}!`, "success");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/unauthorized-domain") {
        showToast("Domain belum diotorisasi di Firebase. Gunakan Login Email atau hubungi Admin.", "error");
      } else {
        showToast(err.message || "Gagal masuk lewat Google", "error");
      }
      setAuthLoading(false);
    }
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      showToast("Harap isi nama pengguna/email dan kata sandi!", "error");
      return;
    }
    if (loginPassword.length < 6) {
      showToast("Kata sandi minimal 6 karakter!", "error");
      return;
    }
    setAuthLoading(true);
    try {
      const isEmail = loginEmail.includes("@");
      const cleanEmail = isEmail ? loginEmail.trim().toLowerCase() : `${loginEmail.trim().toLowerCase()}@bastikaparfum.local`;
      
      await signInWithEmailAndPassword(auth, cleanEmail, loginPassword);
      showToast("Berhasil masuk!", "success");
    } catch (err: any) {
      console.error(err);
      let errMsg = "Gagal masuk. Silakan periksa kembali.";
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-email") errMsg = "Nama pengguna atau email tidak terdaftar!";
      else if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential" || err.code === "auth/invalid-login-credentials") errMsg = "Nama pengguna/email atau kata sandi salah!";
      showToast(errMsg, "error");
      setAuthLoading(false);
    }
  };

  // Computed: Get the latest completed sales transaction
  const lastSaleTx = [...transactions]
    .filter((t) => t.type === "sale")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setCustomEmail("");
      setUserRole(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("bastika_user_role");
      }
      showToast("Berhasil keluar sistem.", "info");
    } catch (err: any) {
      showToast("Gagal keluar", "error");
    }
  };

  // FORM SUBMIT HANDLERS
  const handleAddShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShelf.rackNumber || !newShelf.scentName) {
      showToast("Harap isi semua kolom rak!", "error");
      return;
    }
    try {
      await addShelf(newShelf);
      showToast(`Rak ${newShelf.rackNumber} (${newShelf.scentName}) berhasil ditambahkan!`);
      setNewShelf({ rackNumber: "", scentName: "", pricePerMl: 3500 });
    } catch (err: any) {
      showToast(err.message || "Gagal menambahkan rak", "error");
    }
  };

  const handleDeleteShelf = async (id: string, rackNum: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus ${rackNum}?`)) {
      try {
        await deleteShelf(id);
        showToast(`${rackNum} berhasil dihapus.`);
      } catch (err: any) {
        showToast(err.message, "error");
      }
    }
  };

  const handleSettingChange = async (field: keyof InvoiceSettings, value: any) => {
    if (tempSettings) {
      const updated = { ...tempSettings, [field]: value };
      setTempSettings(updated);
      setInvoiceSettings(updated); // Sync local invoiceSettings instantly for real-time print preview
      
      // Auto-save selects and checkboxes immediately to database
      if (field === "paperWidth" || field === "showLogo") {
        try {
          await updateInvoiceSettings(updated);
        } catch (err: any) {
          console.error("Gagal auto-save settings:", err);
        }
      }
    }
  };

  const handleSettingBlur = async () => {
    if (tempSettings) {
      try {
        await updateInvoiceSettings(tempSettings);
      } catch (err: any) {
        console.error("Gagal auto-save settings on blur:", err);
      }
    }
  };

  const handleSaveInvoiceSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempSettings) return;
    try {
      await updateInvoiceSettings(tempSettings);
      showToast("Format kop invoice berhasil disimpan secara realtime ke cloud!", "success");
    } catch (err: any) {
      showToast(err.message || "Gagal menyimpan format invoice", "error");
    }
  };

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrice) return;
    try {
      await updateScentPrice(editingPrice.scentName, editingPrice.pricePerMl);
      showToast(`Harga aroma ${editingPrice.scentName} berhasil diupdate ke Rp ${editingPrice.pricePerMl.toLocaleString()}/ml!`);
      setEditingPrice(null);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleSaveShelfRackNumber = async () => {
    if (!editingShelf) return;
    if (!editingShelf.rackNumber.trim()) {
      showToast("Nomor rak tidak boleh kosong!", "error");
      return;
    }
    try {
      await updateShelf(editingShelf.id, { rackNumber: editingShelf.rackNumber.trim() });
      showToast(`Nomor rak berhasil diubah menjadi "${editingShelf.rackNumber.trim()}"!`, "success");
      setEditingShelf(null);
    } catch (err: any) {
      showToast(err.message || "Gagal mengubah nomor rak", "error");
    }
  };

  const handleSalesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalItems = [...saleItems];
    
    // Fallback: If cart is empty, use current inputs as single item
    if (finalItems.length === 0) {
      const isHanyaBotol = saleScent === "Hanya Botol";
      if (!saleScent) {
        showToast("Harap pilih nama aroma atau tambahkan item ke daftar belanja terlebih dahulu!", "error");
        return;
      }
      if (!isHanyaBotol && saleVolume <= 0) {
        showToast("Volume bibit harus di atas 0 ml!", "error");
        return;
      }
      if (isHanyaBotol && saleBottleSize === "None") {
        showToast("Harap pilih ukuran botol jika hanya membeli botol!", "error");
        return;
      }
      if (saleBottleCount <= 0) {
        showToast("Jumlah botol minimal 1!", "error");
        return;
      }
      finalItems.push({
        id: "item_" + Math.random().toString(36).substring(2, 9),
        scentName: saleScent,
        volumeMl: isHanyaBotol ? 0 : saleVolume,
        bottleSize: saleBottleSize,
        bottleType: saleBottleSize !== "None" ? saleBottleType : undefined,
        bottleCount: saleBottleCount,
        noBottleStockDeduct: saleNoBottle
      });
    }

    const opEmail = currentUser?.email || customEmail || "client_operator@gmail.com";

    // Calculate total discount
    let computedDiscount = 0;
    if (saleDiscountType === "nominal") {
      computedDiscount = saleDiscountNominal;
    } else if (saleDiscountType === "free_bottle") {
      computedDiscount = finalItems.reduce((acc, item) => {
        if (item.bottleSize !== "None" && !item.noBottleStockDeduct) {
          const matchedBottle = bottleSizes.find(b => b.size === item.bottleSize);
          if (matchedBottle) {
            const bottlePrice = item.bottleType === "Plastik"
              ? (matchedBottle.pricePlastik ?? Math.round((matchedBottle.price ?? 10000) / 2))
              : (matchedBottle.priceKaca ?? matchedBottle.price ?? 10000);
            return acc + (bottlePrice * item.bottleCount);
          }
        }
        return acc;
      }, 0);
    }

    // Determine representative legacy properties for compatibility
    const firstItem = finalItems[0];
    const isMulti = finalItems.length > 1;
    const representativeScent = isMulti ? `Multi-item (${finalItems.length} aroma)` : firstItem.scentName;
    const representativeVolume = finalItems.reduce((acc, it) => acc + (it.volumeMl || 0), 0);
    const representativeBottleSize = isMulti ? "Multi-size" : firstItem.bottleSize;
    const representativeBottleType = isMulti ? undefined : firstItem.bottleType;
    const representativeBottleCount = finalItems.reduce((acc, it) => acc + (it.bottleCount || 0), 0);
    const representativeNoBottle = finalItems.some(it => it.noBottleStockDeduct);

    const itemsDescription = finalItems.map(item => {
      const isHBotol = item.scentName === "Hanya Botol";
      const bSizeStr = item.bottleSize !== "None" 
        ? (item.noBottleStockDeduct ? ` + Bawa Botol Sendiri ${item.bottleSize}` : ` + Botol ${item.bottleType || "Kaca"} ${item.bottleSize}`)
        : " (Hanya Bibit)";
      return isHBotol 
        ? `Botol ${item.bottleType || "Kaca"} ${item.bottleSize} x ${item.bottleCount}` 
        : `${item.scentName} (${item.volumeMl}ml)${bSizeStr} x ${item.bottleCount}`;
    }).join(", ");

    const desc = saleDescription || `Penjualan: ${itemsDescription}${saleDiscountType !== 'none' ? ` (Diskon: ${saleDiscountType === 'free_bottle' ? 'Gratis Botol' : formatRupiah(computedDiscount)})` : ''}`;

    try {
      const txId = await addTransaction({
        type: "sale",
        category: finalItems.every(it => it.scentName === "Hanya Botol") ? "botol" : "bibit",
        date: new Date().toISOString(),
        scentName: representativeScent,
        volumeMl: representativeVolume,
        bottleSize: representativeBottleSize,
        bottleType: representativeBottleType,
        bottleCount: representativeBottleCount,
        totalPrice: saleTotalPrice,
        discountType: saleDiscountType,
        discountNominal: computedDiscount,
        claimPromoOnThisTx: saleClaimPromo,
        noBottleStockDeduct: representativeNoBottle,
        description: desc,
        operatorEmail: opEmail,
        customerName: saleCustomerName.trim() || "Pelanggan Umum",
        items: finalItems
      });

      const newTx: Transaction = {
        id: txId,
        type: "sale",
        category: finalItems.every(it => it.scentName === "Hanya Botol") ? "botol" : "bibit",
        date: new Date().toISOString(),
        scentName: representativeScent,
        volumeMl: representativeVolume,
        bottleSize: representativeBottleSize,
        bottleType: representativeBottleType,
        bottleCount: representativeBottleCount,
        totalPrice: saleTotalPrice,
        discountType: saleDiscountType,
        discountNominal: computedDiscount,
        claimPromoOnThisTx: saleClaimPromo,
        noBottleStockDeduct: representativeNoBottle,
        description: desc,
        operatorEmail: opEmail,
        customerName: saleCustomerName.trim() || "Pelanggan Umum",
        items: finalItems
      };
      
      showToast("Transaksi Penjualan berhasil disimpan! Stok berkurang otomatis.", "success");
      setPrintTx(newTx);
      
      // Reset form
      setSaleScent("");
      setSaleVolume(0);
      setSaleBottleSize("30ml");
      setSaleBottleCount(1);
      setSaleDescription("");
      setSaleDiscountType("none");
      setSaleDiscountNominal(0);
      setSaleCustomerName("");
      setSaleClaimPromo(false);
      setSaleNoBottle(false);
      setSaleItems([]);
    } catch (err: any) {
      showToast(err.message || "Gagal mencatat penjualan", "error");
    }
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (purchaseCategory === "bibit" && !purchaseScent) {
      showToast("Harap isi/pilih nama aroma bibit!", "error");
      return;
    }
    if (purchaseTotalPriceCalculation() <= 0) {
      showToast("Total harga belanja harus di atas Rp 0!", "error");
      return;
    }

    let finalScent = purchaseScent.trim();
    if (purchaseCategory === "bibit" && finalScent) {
      const existingMatch = prices.find(
        p => p.scentName.toLowerCase() === finalScent.toLowerCase()
      );
      if (existingMatch) {
        finalScent = existingMatch.scentName;
      }
    }

    const opEmail = currentUser?.email || customEmail || "admin_operator@gmail.com";
    const calculatedTotal = purchaseTotalPriceCalculation();

    try {
      await addTransaction({
        type: "purchase",
        category: purchaseCategory,
        date: new Date().toISOString(),
        scentName: purchaseCategory === "bibit" ? finalScent : (purchaseCategory === "alkohol" ? (purchaseScent || "Absolut Cair") : undefined),
        volumeMl: (purchaseCategory === "bibit" || purchaseCategory === "alkohol") ? purchaseVolume : undefined,
        bottleSize: purchaseCategory === "botol" ? purchaseBottleSize : "None",
        bottleType: purchaseCategory === "botol" ? purchaseBottleType : undefined,
        bottleCount: purchaseCategory === "botol" ? purchaseCount : undefined,
        totalPrice: calculatedTotal,
        description: purchaseDesc || `Pembelian stok ${purchaseCategory === 'bibit' ? `bibit ${finalScent}` : purchaseCategory === 'botol' ? `botol ${purchaseBottleType || "Kaca"} ${purchaseBottleSize}` : purchaseCategory === 'alkohol' ? (purchaseScent || 'Absolut Cair') : 'lainnya'}`,
        operatorEmail: opEmail
      });

      showToast(`Pembelian berhasil dicatat! Kas berkurang ${formatRupiah(calculatedTotal)}.`, "success");
      
      // Reset form
      setPurchaseScent("");
      setPurchaseVolume(0);
      setPurchaseCount(0);
      setPurchasePrice(0);
      setPurchaseDesc("");
    } catch (err: any) {
      showToast(err.message || "Gagal mencatat pembelian", "error");
    }
  };

  const handleAddNewBottleSize = async () => {
    if (!newBottleSize.trim()) {
      showToast("Nama ukuran botol tidak boleh kosong!", "error");
      return;
    }
    if (newBottlePriceKaca <= 0 || newBottlePricePlastik <= 0) {
      showToast("Harga jual botol harus lebih besar dari 0!", "error");
      return;
    }
    if (newBottlePurchasePriceKaca <= 0 || newBottlePurchasePricePlastik <= 0) {
      showToast("Harga belanja botol harus lebih besar dari 0!", "error");
      return;
    }
    try {
      const cleanSize = newBottleSize.trim();
      await addBottleSize(
        cleanSize,
        newBottlePriceKaca,
        newBottlePricePlastik,
        newBottlePurchasePriceKaca,
        newBottlePurchasePricePlastik
      );
      setPurchaseBottleSize(cleanSize);
      setShowAddBottleSize(false);
      setNewBottleSize("");
      setNewBottlePriceKaca(0);
      setNewBottlePricePlastik(0);
      setNewBottlePurchasePriceKaca(0);
      setNewBottlePurchasePricePlastik(0);
      showToast(`Ukuran botol ${cleanSize} berhasil ditambahkan!`, "success");
    } catch (error: any) {
      console.error(error);
      showToast(`Gagal menambahkan ukuran botol: ${error.message}`, "error");
    }
  };

  const purchaseTotalPriceCalculation = () => {
    return purchasePrice; // User inputs standard total price directly
  };

  const handleSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salEmployee || salAmount <= 0 || !salMonth) {
      showToast("Harap lengkapi semua isian gaji!", "error");
      return;
    }

    try {
      await addSalary({
        employeeName: salEmployee,
        amount: salAmount,
        month: salMonth,
        datePaid: new Date().toISOString(),
        notes: salNotes || `Gaji Bulan ${salMonth}`
      });

      showToast(`Gaji ${salEmployee} sebesar ${formatRupiah(salAmount)} berhasil dibayarkan!`);
      setSalEmployee("");
      setSalAmount(0);
      setSalMonth("");
      setSalNotes("");
    } catch (err: any) {
      showToast(err.message || "Gagal membayar gaji", "error");
    }
  };

  const handleDeleteSalary = async (id: string, name: string, amount: number) => {
    if (confirm(`Batalkan pembayaran gaji untuk ${name}? Kas akan dikembalikan.`)) {
      try {
        await deleteSalary(id, amount);
        showToast("Pembayaran gaji dibatalkan.");
      } catch (err: any) {
        showToast(err.message, "error");
      }
    }
  };

  const handleDeleteTransaction = async (id: string, description: string) => {
    if (confirm(`Hapus transaksi "${description}"? Tindakan ini akan mengembalikan stok & saldo kas secara otomatis.`)) {
      try {
        await deleteTransaction(id);
        showToast("Transaksi berhasil dihapus dan disinkronkan!", "success");
      } catch (err: any) {
        showToast(err.message || "Gagal menghapus transaksi", "error");
      }
    }
  };

  const handleClaimPromo = async (customerId: string, customerName: string) => {
    if (confirm(`Klaim promo potongan untuk pelanggan "${customerName}"? Pembelian terakumulasi akan dikurangi sebesar batas nominal promo ${formatRupiah(promoThreshold)}.\n\nPelanggan akan menerima potongan diskon sebesar ${formatRupiah(promoDiscount)} yang tersinkronisasi otomatis dengan transaksi dan invoice!`)) {
      try {
        const opEmail = currentUser?.email || customEmail || "Kasir";
        const newTx = await claimCustomerPromo(customerId, opEmail);
        showToast(`Promo untuk ${customerName} berhasil diklaim dan invoice diskon tercatat!`, "success");
        if (newTx) {
          setPrintTx(newTx);
        }
      } catch (err: any) {
        showToast(err.message || "Gagal mengklaim promo", "error");
      }
    }
  };

  const handleEditCustomerClick = (c: Customer) => {
    setEditingCustomer(c);
    setEditingCustomerName(c.name);
  };

  const handleSaveEditedCustomer = async () => {
    if (!editingCustomer) return;
    const trimmed = editingCustomerName.trim();
    if (!trimmed) {
      showToast("Nama pelanggan tidak boleh kosong!", "error");
      return;
    }
    try {
      await updateCustomerName(editingCustomer.id, trimmed);
      showToast(`Nama pelanggan berhasil diperbarui menjadi "${trimmed}"!`, "success");
      setEditingCustomer(null);
    } catch (err: any) {
      showToast(err.message || "Gagal mengubah nama pelanggan", "error");
    }
  };

  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus pelanggan "${customerName}"?\n\nTindakan ini akan menghapus data loyalitasnya, dan semua transaksi terkait atas nama ini akan diatur menjadi 'Pelanggan Umum'.`)) {
      try {
        await deleteCustomer(customerId);
        showToast(`Pelanggan "${customerName}" berhasil dihapus dari database!`, "success");
      } catch (err: any) {
        showToast(err.message || "Gagal menghapus pelanggan", "error");
      }
    }
  };

  const handleUpdatePromoSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const threshold = parseInt(adminThresholdInput);
    const discount = parseInt(adminDiscountInput);
    if (isNaN(threshold) || threshold <= 0) {
      showToast("Batas minimal belanja harus berupa angka positif!", "error");
      return;
    }
    if (isNaN(discount) || discount < 0) {
      showToast("Nominal potongan diskon promo harus berupa angka positif atau nol!", "error");
      return;
    }
    try {
      await updatePromoConfig(threshold, discount);
      showToast("Pengaturan nominal promo dan batas klaim global berhasil diperbarui!", "success");
    } catch (err: any) {
      showToast(err.message || "Gagal memperbarui pengaturan promo", "error");
    }
  };

  const handleExportBackup = async () => {
    try {
      const data = await exportDatabaseData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup_bastikaparfum_${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast("Database berhasil diekspor!", "success");
    } catch (err: any) {
      showToast(err.message || "Gagal mengekspor database", "error");
    }
  };

  const handleImportBackup = async (file: File, mode: "clean" | "merge") => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const backup = JSON.parse(text);
        
        await importDatabaseData(backup, mode);
        showToast(
          mode === "clean" 
            ? "Database berhasil di-restore (tulis ulang)!" 
            : "Database berhasil digabungkan (merge)!", 
          "success"
        );
      } catch (err: any) {
        showToast("Gagal mengimpor file: " + (err.message || "Format JSON tidak valid"), "error");
      }
    };
    reader.readAsText(file);
  };

  const handleClearDatabase = async () => {
    const confirmation = prompt(
      "PERINGATAN KRITIKAL: Tindakan ini akan menghapus seluruh data transaksi, stok, rak, pengeluaran gaji, kas, dan akun pelanggan secara permanen!\n\nKetik kata kunci 'HAPUS PERMANEN' di bawah untuk melanjutkan:"
    );
    if (confirmation === "HAPUS PERMANEN") {
      try {
        await clearEntireDatabase();
        showToast("Seluruh database berhasil dibersihkan!", "success");
        window.location.reload();
      } catch (err: any) {
        showToast(err.message || "Gagal membersihkan database", "error");
      }
    } else if (confirmation !== null) {
      showToast("Konfirmasi salah! Pembersihan database dibatalkan.", "error");
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientEmail) {
      const msg = newClientRole === "client" ? "Masukkan nama pengguna / username client!" : "Masukkan alamat email admin!";
      showToast(msg, "error");
      return;
    }
    
    if (!newClientPassword) {
      showToast("Kata sandi wajib diisi!", "error");
      return;
    }
    
    if (newClientPassword.length < 6) {
      showToast("Kata sandi minimal 6 karakter!", "error");
      return;
    }

    let finalEmail = "";
    let finalUsername: string | undefined = undefined;

    if (newClientRole === "client" || newClientRole === "reseller") {
      const usernameVal = newClientEmail.trim().toLowerCase();
      if (usernameVal.includes("@")) {
        if (usernameVal.includes(" ")) {
          showToast("Username / Email tidak boleh mengandung spasi!", "error");
          return;
        }
        finalEmail = usernameVal;
        finalUsername = usernameVal.split("@")[0];
      } else {
        if (usernameVal.includes(" ")) {
          showToast("Username tidak boleh mengandung spasi!", "error");
          return;
        }
        finalEmail = `${usernameVal}@bastikaparfum.local`;
        finalUsername = usernameVal;
      }
    } else {
      const emailVal = newClientEmail.trim().toLowerCase();
      if (!emailVal.includes("@")) {
        showToast("Masukkan alamat email admin yang valid!", "error");
        return;
      }
      finalEmail = emailVal;
    }

    try {
      let createdInAuth = false;
      try {
        await createAuthUserWithoutLoggingOut(finalEmail, newClientPassword);
        createdInAuth = true;
      } catch (authErr: any) {
        console.warn("Auth registration info:", authErr);
        if (authErr.code === "auth/email-already-in-use") {
          showToast(`Info: Pengguna sudah terdaftar di Auth. Memperbarui hak akses saja.`, "info");
        } else {
          throw new Error(`Gagal mendaftarkan di Firebase Auth: ${authErr.message}`);
        }
      }

      await addClientUser(finalEmail, newClientRole, newClientPassword, finalUsername);
      
      if (createdInAuth) {
        const successMsg = newClientRole === "client" 
          ? `User @${finalUsername} berhasil didaftarkan sebagai CLIENT!`
          : newClientRole === "reseller"
          ? `User @${finalUsername || finalEmail} berhasil didaftarkan sebagai RESELLER!`
          : `Admin ${finalEmail} berhasil didaftarkan sebagai ADMIN!`;
        showToast(successMsg, "success");
      } else {
        const updateMsg = newClientRole === "client"
          ? `Hak akses @${finalUsername} diperbarui sebagai CLIENT!`
          : newClientRole === "reseller"
          ? `Hak akses @${finalUsername || finalEmail} diperbarui sebagai RESELLER!`
          : `Hak akses ${finalEmail} diperbarui sebagai ADMIN!`;
        showToast(updateMsg, "success");
      }
      
      setNewClientEmail("");
      setNewClientPassword("");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDeleteClient = async (email: string) => {
    if (confirm(`Hapus akses untuk user ${email}?`)) {
      try {
        await deleteClientUser(email);
        showToast(`Akses untuk ${email} berhasil dihapus.`);
      } catch (err: any) {
        showToast(err.message, "error");
      }
    }
  };

  const handleManualMutation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualMutationAmount <= 0 || !manualMutationDesc) {
      showToast("Harap isi nominal dan deskripsi mutasi!", "error");
      return;
    }
    try {
      await addManualCashMutation(manualMutationType, manualMutationAmount, manualMutationDesc);
      showToast(`Mutasi kas manual berhasil dicatat!`);
      setManualMutationAmount(0);
      setManualMutationDesc("");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // FILTERED LISTS
  const filteredShelves = shelves.filter(s => {
    if (!searchTerm) return true;
    const term = searchCaseSensitive ? searchTerm : searchTerm.toLowerCase();
    
    const rack = searchCaseSensitive ? s.rackNumber : s.rackNumber.toLowerCase();
    const scent = searchCaseSensitive ? s.scentName : s.scentName.toLowerCase();
    
    if (searchColumn === "all") {
      return rack.includes(term) || scent.includes(term);
    } else if (searchColumn === "rackNumber") {
      return rack.includes(term);
    } else if (searchColumn === "scentName") {
      return scent.includes(term);
    }
    return true;
  });

  const filteredPrices = prices.filter(p => {
    if (!searchTerm) return true;
    const term = searchCaseSensitive ? searchTerm : searchTerm.toLowerCase();
    const scent = searchCaseSensitive ? p.scentName : p.scentName.toLowerCase();
    return scent.includes(term);
  });

  const filteredStocks = stocks.filter(s => {
    if (!searchTerm) return true;
    const term = searchCaseSensitive ? searchTerm : searchTerm.toLowerCase();
    
    const scent = s.scentName ? (searchCaseSensitive ? s.scentName : s.scentName.toLowerCase()) : "";
    const type = searchCaseSensitive ? s.type : s.type.toLowerCase();
    const size = s.size ? (searchCaseSensitive ? s.size : s.size.toLowerCase()) : "";
    const desc = s.type === "essence" ? scent : s.type === "bottle" ? `botol ${size}` : "alkohol";
    const descMatch = searchCaseSensitive ? desc : desc.toLowerCase();

    if (searchColumn === "all") {
      return scent.includes(term) || type.includes(term) || descMatch.includes(term);
    } else if (searchColumn === "scentName") {
      return scent.includes(term);
    } else if (searchColumn === "type") {
      return type.includes(term);
    } else if (searchColumn === "size") {
      return size.includes(term);
    }
    return true;
  });

  // Helper for date & month range filter
  const isWithinFilter = (dateStr: string) => {
    if (!dateStr) return false;
    const itemDateOnly = dateStr.substring(0, 10); // "YYYY-MM-DD"
    const itemMonthOnly = dateStr.substring(0, 7); // "YYYY-MM"
    
    if (filterMonth && itemMonthOnly !== filterMonth) {
      return false;
    }
    if (filterStartDate && itemDateOnly < filterStartDate) {
      return false;
    }
    if (filterEndDate && itemDateOnly > filterEndDate) {
      return false;
    }
    return true;
  };

  // Filtered lists for reporting
  const filteredTransactions = transactions.filter(t => isWithinFilter(t.date));
  const filteredSalaries = salaries.filter(s => isWithinFilter(s.datePaid));
  const filteredCashLedger = cashLedger.filter(m => isWithinFilter(m.date));

  // ACCOUNTING CALCULATIONS (using filtered data)
  const totalSales = filteredTransactions
    .filter(t => t.type === "sale")
    .reduce((sum, t) => sum + t.totalPrice, 0);

  const totalPurchases = filteredTransactions
    .filter(t => t.type === "purchase")
    .reduce((sum, t) => sum + t.totalPrice, 0);

  const totalSalaries = filteredSalaries.reduce((sum, s) => sum + s.amount, 0);

  const netProfit = totalSales - totalPurchases - totalSalaries;

  // EXCEL EXPORT ENGINE (HTML-Spreadsheet compatible format)
  const exportToExcel = (rows: any[][], fileName: string) => {
    let xml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
    xml += `<head>
      <meta charset="utf-8">
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Laporan</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      <style>
        table { border-collapse: collapse; font-family: Arial, sans-serif; }
        th { background-color: #059669; color: white; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
        td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; color: #1e293b; }
        .header-row { font-weight: bold; background-color: #f1f5f9; color: #0f172a; }
        .title { font-size: 16px; font-weight: bold; color: #059669; }
        .meta { font-size: 11px; color: #64748b; font-style: italic; }
      </style>
    </head>`;
    xml += `<body>`;
    
    // Header title
    xml += `<table>`;
    rows.forEach((row, rowIndex) => {
      xml += `<tr>`;
      row.forEach((cell) => {
        const isHeader = cell === "Tanggal" || cell === "Tanggal Mutasi" || cell === "Tipe" || cell === "Tipe Transaksi" || cell === "NOMINAL" || cell === "KATEGORI" || cell === "Tanggal Mutasi";
        const styleClass = isHeader ? 'class="header-row"' : '';
        xml += `<td ${styleClass}>${cell === null || cell === undefined ? "" : cell}</td>`;
      });
      xml += `</tr>`;
    });
    xml += `</table></body></html>`;

    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}_${new Date().toISOString().substring(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportLabaRugiToExcel = () => {
    const headers = ["Tanggal", "Tipe Transaksi", "Deskripsi / Aroma", "Kapasitas (ml)", "Kemasan", "Jumlah", "Total Harga (Rp)", "Operator"];
    
    const dataRows = [
      ["LAPORAN RINGKASAN LABA RUGI - BASTIKA PARFUM"],
      [`Periode: ${filterMonth ? `Bulan ${filterMonth}` : "Semua Periode"}${filterStartDate ? ` | Mulai: ${filterStartDate}` : ""}${filterEndDate ? ` | Selesai: ${filterEndDate}` : ""}`],
      ["Dibuat Tanggal:", new Date().toLocaleString("id-ID")],
      [""],
      ["KATEGORI LAPORAN", "NOMINAL RUPIAH"],
      ["Total Omset Penjualan (Debit)", totalSales],
      ["Total Belanja Stok (Kredit)", totalPurchases],
      ["Total Beban Gaji Karyawan (Kredit)", totalSalaries],
      ["LABA BERSIH", netProfit],
      [""],
      ["RINCIAN TRANSAKSI PERIODE INI"],
      headers
    ];

    filteredTransactions.forEach(t => {
      dataRows.push([
        new Date(t.date).toLocaleString("id-ID"),
        t.type === "sale" ? "PENJUALAN" : "BELANJA",
        t.scentName || t.category || "-",
        t.volume ? `${t.volume}ml` : "-",
        t.bottleSize || "-",
        t.bottleCount || t.quantity || "-",
        t.totalPrice,
        t.operatorEmail
      ]);
    });

    exportToExcel(dataRows, "Laporan_Laba_Rugi_Bastika_Parfum");
    showToast("Laporan Laba Rugi berhasil diexport ke Excel!");
  };

  const exportBukuKasToExcel = () => {
    const headers = ["Tanggal Mutasi", "Deskripsi Mutasi", "Tipe", "Nominal (Rp)", "Saldo Kas Akhir (Rp)"];
    
    const dataRows = [
      ["LAPORAN MUTASI BUKU KAS BESAR - BASTIKA PARFUM"],
      [`Periode: ${filterMonth ? `Bulan ${filterMonth}` : "Semua Periode"}${filterStartDate ? ` | Mulai: ${filterStartDate}` : ""}${filterEndDate ? ` | Selesai: ${filterEndDate}` : ""}`],
      ["Dibuat Tanggal:", new Date().toLocaleString("id-ID")],
      [""],
      ["Arus Kas Masuk / Omset (Debit)", totalSales],
      ["Belanja Stok / Pengeluaran (Kredit)", totalPurchases],
      ["Beban Gaji Karyawan (Kredit)", totalSalaries],
      ["Sisa Saldo Kas Riil Terakhir", cashBalance],
      [""],
      headers
    ];

    filteredCashLedger.forEach(m => {
      dataRows.push([
        new Date(m.date).toLocaleString("id-ID"),
        m.description,
        m.type === "in" ? "DEBIT" : "KREDIT",
        m.amount,
        m.balanceAfter
      ]);
    });

    exportToExcel(dataRows, "Buku_Kas_Besar_Bastika_Parfum");
    showToast("Buku Kas Besar berhasil diexport ke Excel!");
  };

  const handleInitialCapitalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputInitialCapital <= 0) {
      showToast("Nominal modal awal harus di atas Rp 0!", "error");
      return;
    }
    try {
      await updateInitialCapital(inputInitialCapital);
      showToast(`Modal awal berhasil diperbarui menjadi ${formatRupiah(inputInitialCapital)}!`, "success");
    } catch (err: any) {
      showToast(err.message || "Gagal memperbarui modal awal", "error");
    }
  };

  // Render Login screen if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white selection:bg-emerald-500 selection:text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500 mb-6"></div>
        <h2 className="text-lg font-bold font-display tracking-tight">Memuat data Bastika Parfum...</h2>
        <p className="mt-2 text-xs text-slate-400 max-w-xs leading-relaxed font-sans">
          Sistem sedang menghubungkan ke basis data cloud Firebase. Mohon tunggu beberapa saat.
        </p>
        
        {showLoadingFallback && (
          <div className="mt-8 p-5 bg-slate-800 rounded-2xl border border-slate-700 max-w-sm w-full animate-in fade-in slide-in-from-bottom-4 duration-300 shadow-xl">
            <p className="text-xs text-emerald-400 font-semibold mb-3">
              Koneksi cloud lambat atau terhambat
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setAuthLoading(false)}
                className="w-full text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-md"
              >
                Buka Halaman Login / Mode Darurat
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await signOut(auth);
                    if (typeof window !== "undefined") {
                      localStorage.removeItem("bastika_user_role");
                    }
                    setUserRole(null);
                    setCurrentUser(null);
                    setAuthLoading(false);
                    window.location.reload();
                  } catch (e) {
                    console.error("Logout error:", e);
                  }
                }}
                className="w-full text-xs bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer"
              >
                Keluar (Logout) & Reset Sesi
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // LOGIN SCREEN
  if (!userRole) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 selection:bg-emerald-500 selection:text-white">
        <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl border border-slate-700/50 p-8 overflow-hidden relative">
          {/* Accent Glow */}
          <div className="absolute top-0 left-1/4 w-1/2 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 rounded-full"></div>
          
          <div className="flex flex-col items-center mb-6">
            <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-950/40 mb-3 transform hover:scale-105 transition-transform overflow-hidden p-1">
              <img src={invoiceSettings?.appIconUrl || "/icon.jpg"} alt="Bastika Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <h1 className="text-2xl font-bold font-display text-white tracking-tight text-center">BASTIKA PARFUM</h1>
            <p className="text-emerald-400 font-semibold tracking-widest text-[10px] uppercase mt-0.5">Professional Management & POS</p>
            <p className="text-slate-400 text-xs text-center mt-2 leading-relaxed max-w-xs">
              Sistem POS & Akuntansi Cloud Terintegrasi. Mengelola Rak, Inventori, Mutasi Kas, dan Penggajian Toko Parfum.
            </p>
          </div>

          <div className="space-y-4">
            {/* Real Authentication - Google */}
            <button 
              id="google-signin-btn"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-800 font-semibold py-2.5 px-4 rounded-xl transition-all duration-150 transform hover:-translate-y-0.5 active:translate-y-0 shadow-md cursor-pointer text-xs"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6c-.28 1.5-.1.1.2 1.1-1.12 1.34-3 2.2-6.8 2.2-4.14 0-7.5-3.36-7.5-7.5s3.36-7.5 7.5-7.5c1.86 0 3.55.67 4.88 1.95l2.85-2.85C17.02 1.44 14.65.6 12 .6 5.7.6.6 5.7.6 12s5.1 11.4 11.4 11.4c6.3 0 11.74-5.1 11.74-11.43z"/>
              </svg>
              Masuk dengan Akun Google
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-700/40"></div>
              <span className="flex-shrink mx-3 text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Atau Masuk dengan Kredensial</span>
              <div className="flex-grow border-t border-slate-700/40"></div>
            </div>

            {/* Real Authentication - Email or Username & Password */}
            <form onSubmit={handleEmailAuthSubmit} className="space-y-3 bg-slate-900/40 border border-slate-700/30 rounded-xl p-4">
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Nama Pengguna (Client) / Email (Admin)</label>
                  <input
                    id="username-login-input"
                    type="text"
                    placeholder="Contoh: budi atau admin@gmail.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Kata Sandi</label>
                  <input
                    id="password-login-input"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="pt-1">
                <button
                  id="login-submit-btn"
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-3 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Masuk ke Sistem
                </button>
              </div>
            </form>

            {/* Whitelisted emails notice */}
            {currentUser && !userRole && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex gap-3 text-red-300 text-xs leading-relaxed">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <div>
                  <span className="font-bold">Akses Ditolak:</span> Email Anda <span className="font-semibold text-white">({currentUser.email})</span> tidak terdaftar dalam whitelist sistem Bastika Parfum. Hubungi Admin Utama untuk memberikan akses.
                  <button onClick={handleSignOut} className="mt-2 block text-emerald-400 font-bold hover:underline">Keluar & Ganti Akun</button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-slate-700/50 flex justify-between items-center text-[10px] text-slate-500">
            <span>BASTIKA PARFUM v1.0.0</span>
            <span>Cloud Sync Powered</span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // CONSIGNMENT & BUNDLING HELPER LOGIC
  // ==========================================
  const getResellerStockQty = (resellerEmail: string, type: "essence" | "alcohol" | "bottle", nameOrSize?: string) => {
    const safeEmail = resellerEmail.trim().toLowerCase();
    const stock = resellerStocks.find(s => 
      s.resellerEmail === safeEmail &&
      s.type === type &&
      (type === "essence" ? s.scentName === nameOrSize : type === "bottle" ? s.size === nameOrSize : true)
    );
    return stock ? stock.quantity : 0;
  };

  const handleResellerSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { packageId, scentName, quantity } = resellerSaleForm;
    if (!packageId) {
      showToast("Pilih paket terlebih dahulu!", "error");
      return;
    }
    if (!scentName) {
      showToast("Pilih aroma parfum terlebih dahulu!", "error");
      return;
    }
    if (quantity <= 0) {
      showToast("Jumlah minimal 1!", "error");
      return;
    }

    const pkg = bundlingPackages.find(p => p.id === packageId);
    if (!pkg) {
      showToast("Paket tidak ditemukan!", "error");
      return;
    }

    const emailKey = (currentUser?.email || customEmail || "").trim().toLowerCase();
    const pkgStock = resellerPackageStocks.find(s => s.resellerEmail === emailKey && s.packageId === packageId);
    const availableQty = pkgStock ? pkgStock.quantity : 0;

    if (availableQty < quantity) {
      showToast(`Stok fisik paket bundling tidak mencukupi! Tersedia: ${availableQty} unit, Butuh: ${quantity} unit`, "error");
      return;
    }

    try {
      await addResellerSaleTransaction(
        emailKey,
        pkg.id,
        pkg.packageName,
        scentName,
        pkg.bottleSize,
        pkg.essenceMl,
        pkg.alcoholMl,
        quantity,
        pkg.price,
        emailKey
      );
      showToast(`Berhasil mencatat penjualan ${quantity} unit ${pkg.packageName} (${scentName})!`, "success");
      setResellerSaleForm({ packageId: "", scentName: "", quantity: 1 });
      setResellerActiveTab("setoran");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleTransferStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { resellerEmail, type, scentName, size, quantity } = transferForm;

    if (!resellerEmail) {
      showToast("Pilih reseller tujuan terlebih dahulu!", "error");
      return;
    }
    if (quantity <= 0) {
      showToast("Jumlah transfer harus lebih dari 0!", "error");
      return;
    }
    if (type === "essence" && !scentName) {
      showToast("Pilih aroma parfum terlebih dahulu!", "error");
      return;
    }

    try {
      await transferStockToReseller(
        resellerEmail,
        type,
        type === "essence" ? scentName : undefined,
        type === "bottle" ? size : undefined,
        quantity,
        currentUser?.email || customEmail || "admin"
      );
      showToast(`Berhasil mentransfer stok ke reseller ${resellerEmail}!`, "success");
      setTransferForm({
        resellerEmail: "",
        type: "essence",
        scentName: "",
        size: "30ml",
        quantity: 0
      });
      setShowTransferStock(false);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleSendPackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { resellerEmail, packageId, quantity } = sendPackageForm;
    if (!resellerEmail) {
      showToast("Pilih reseller tujuan terlebih dahulu!", "error");
      return;
    }
    if (!packageId) {
      showToast("Pilih paket bundling terlebih dahulu!", "error");
      return;
    }
    if (quantity <= 0) {
      showToast("Jumlah pengiriman harus minimal 1!", "error");
      return;
    }

    const selectedPkg = bundlingPackages.find(p => p.id === packageId);
    if (!selectedPkg) {
      showToast("Paket bundling tidak ditemukan!", "error");
      return;
    }

    // Client-side verification of stock levels
    const reqBottle = quantity;
    const reqEssence = selectedPkg.essenceMl * quantity;
    const reqAlcohol = selectedPkg.alcoholMl * quantity;

    const availBottle = stocks.find(s => s.type === "bottle" && s.size === selectedPkg.bottleSize)?.quantity || 0;
    const availEssence = stocks.find(s => s.type === "essence" && s.scentName?.trim().toLowerCase() === selectedPkg.scentName?.trim().toLowerCase())?.quantity || 0;
    const availAlcohol = stocks.find(s => s.type === "alcohol")?.quantity || 0;

    if (availBottle < reqBottle) {
      showToast(`Stok utama botol ukuran ${selectedPkg.bottleSize} tidak mencukupi! Tersedia: ${availBottle} pcs, Butuh: ${reqBottle} pcs`, "error");
      return;
    }
    if (availEssence < reqEssence) {
      showToast(`Stok utama bibit aroma ${selectedPkg.scentName} tidak mencukupi! Tersedia: ${availEssence} ml, Butuh: ${reqEssence} ml`, "error");
      return;
    }
    if (availAlcohol < reqAlcohol) {
      showToast(`Stok utama cairan pelarut (Absolut) tidak mencukupi! Tersedia: ${availAlcohol} ml, Butuh: ${reqAlcohol} ml`, "error");
      return;
    }

    try {
      const operator = currentUser?.email || customEmail || "admin";
      await sendBundlingPackageToReseller(resellerEmail, packageId, quantity, operator);
      showToast(`Berhasil mengirimkan ${quantity} unit paket bundling ke reseller!`, "success");
      setSendPackageForm(prev => ({ ...prev, quantity: 1, packageId: "" }));
    } catch (err: any) {
      showToast(err.message || "Gagal mengirimkan paket bundling", "error");
    }
  };

  const handleOpenReturnModal = (ps: ResellerPackageStock) => {
    setReturnPackageForm({
      resellerEmail: ps.resellerEmail,
      packageId: ps.packageId,
      packageName: ps.packageName,
      scentName: ps.scentName,
      bottleSize: ps.bottleSize,
      availableQty: ps.quantity,
      quantityToReturn: ps.quantity
    });
    setShowReturnPackageModal(true);
  };

  const handleReturnPackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { resellerEmail, packageId, quantityToReturn, availableQty } = returnPackageForm;
    if (quantityToReturn <= 0) {
      showToast("Jumlah retur harus lebih besar dari 0!", "error");
      return;
    }
    if (quantityToReturn > availableQty) {
      showToast(`Jumlah retur melebihi stok yang tersedia (${availableQty} pcs)!`, "error");
      return;
    }

    try {
      const operator = currentUser?.email || customEmail || "admin";
      await returBundlingPackageFromReseller(resellerEmail, packageId, quantityToReturn, operator);
      showToast(`Berhasil memproses retur/pembatalan ${quantityToReturn} unit paket bundling dari reseller!`, "success");
      setShowReturnPackageModal(false);
    } catch (err: any) {
      showToast(err.message || "Gagal memproses retur paket bundling", "error");
    }
  };

  const handleAddBundlingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { scentName, bottleSize, essenceMl, price, solventType, customSuffix } = newBundling;
    if (!scentName.trim()) {
      showToast("Nama aroma wajib diisi!", "error");
      return;
    }
    if (!bottleSize) {
      showToast("Ukuran botol wajib dipilih!", "error");
      return;
    }
    if (essenceMl <= 0 || price <= 0) {
      showToast("Nilai volume bibit dan harga harus lebih besar dari 0!", "error");
      return;
    }

    const parseSizeNumber = (sizeStr: string): number => {
      return parseInt(sizeStr.replace(/[^0-9]/g, "")) || 0;
    };

    const capacity = parseSizeNumber(bottleSize);
    const calculatedAlcoholMl = Math.max(0, capacity - essenceMl);
    const suffixStr = customSuffix ? customSuffix.trim() : "";
    const autoPackageName = `Aroma ${scentName.trim()} - ${bottleSize}${suffixStr ? ' (' + suffixStr + ')' : ''}`;

    try {
      if (editingBundling) {
        await updateBundlingPackage(editingBundling.id, {
          packageName: autoPackageName,
          scentName: scentName.trim(),
          bottleSize,
          essenceMl,
          alcoholMl: calculatedAlcoholMl,
          price,
          solventType
        });
        showToast(`Formula paket bundling "${autoPackageName}" berhasil diubah!`, "success");
        setEditingBundling(null);
      } else {
        await addBundlingPackage({
          packageName: autoPackageName,
          scentName: scentName.trim(),
          bottleSize,
          essenceMl,
          alcoholMl: calculatedAlcoholMl,
          price,
          solventType
        });
        showToast(`Formula paket bundling "${autoPackageName}" berhasil ditambahkan!`, "success");
      }
      const updatedFormula = {
        bottleSize,
        essenceMl,
        alcoholMl: calculatedAlcoholMl,
        price,
        solventType
      };
      setLastFormula(updatedFormula);
      try {
        localStorage.setItem("last_bundling_formula", JSON.stringify(updatedFormula));
      } catch (e) {}

      setNewBundling({
        packageName: "",
        scentName: "",
        bottleSize,
        essenceMl,
        alcoholMl: calculatedAlcoholMl,
        price,
        solventType,
        customSuffix: ""
      });
      setShowAddBundling(false);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleStartEditBundling = (pkg: BundlingPackage) => {
    setEditingBundling(pkg);
    let suffix = "";
    const matchResult = pkg.packageName.match(/\(([^)]+)\)$/);
    if (matchResult) {
      suffix = matchResult[1];
    }
    
    setNewBundling({
      packageName: pkg.packageName,
      scentName: pkg.scentName || "",
      bottleSize: pkg.bottleSize,
      essenceMl: pkg.essenceMl,
      alcoholMl: pkg.alcoholMl,
      price: pkg.price,
      solventType: pkg.solventType || "Absolut Cair",
      customSuffix: suffix
    });
    setShowAddBundling(true);
  };

  const handleCancelEditBundling = () => {
    setEditingBundling(null);
    setNewBundling({
      packageName: "",
      scentName: "",
      bottleSize: lastFormula.bottleSize,
      essenceMl: lastFormula.essenceMl,
      alcoholMl: lastFormula.alcoholMl,
      price: lastFormula.price,
      solventType: lastFormula.solventType || "Absolut Cair",
      customSuffix: ""
    });
    setShowAddBundling(false);
  };

  const handleDeleteBundling = async (pkgId: string, pkgName: string) => {
    if (confirm(`Hapus paket bundling ${pkgName}?`)) {
      try {
        await deleteBundlingPackage(pkgId);
        showToast(`Paket bundling ${pkgName} berhasil dihapus.`);
      } catch (err: any) {
        showToast(err.message, "error");
      }
    }
  };

  const handleSettleTransaction = async (txId: string) => {
    if (confirm("Apakah Anda yakin ingin menyelesaikan pembayaran (Pelunasan) untuk transaksi ini? Uang setoran akan masuk ke kas besar.")) {
      try {
        const operatorEmail = currentUser?.email || customEmail || "admin";
        await settleResellerTransaction(txId, operatorEmail);
        showToast("Transaksi berhasil dilunasi dan masuk ke Buku Kas Besar!", "success");
      } catch (err: any) {
        showToast(err.message, "error");
      }
    }
  };

  // ==========================================
  // RESELLER RENDERING LOGIC
  // ==========================================
  const renderResellerPenjualan = () => {
    const emailKey = (currentUser?.email || customEmail || "").trim().toLowerCase();
    const myPackageStocks = resellerPackageStocks.filter(s => 
      s.resellerEmail === emailKey && 
      s.quantity > 0
    );

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel: Katalog Paket Konsinyasi (Siap Jual) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <ShoppingBag className="h-4.5 w-4.5 text-emerald-400" />
              Katalog Paket Siap Jual
            </h3>
            {myPackageStocks.length === 0 ? (
              <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 italic">
                Belum ada paket bundling titipan yang dikirimkan oleh Admin ke Anda.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myPackageStocks.map(pkgStock => {
                  const pkgFormula = bundlingPackages.find(p => p.id === pkgStock.packageId);
                  const price = pkgFormula ? pkgFormula.price : 0;
                  const isSelected = resellerSaleForm.packageId === pkgStock.packageId;

                  return (
                    <div 
                      key={pkgStock.id} 
                      className={`bg-slate-950/40 border rounded-2xl p-5 transition-all flex flex-col justify-between cursor-pointer ${
                        isSelected 
                          ? "border-emerald-500 ring-1 ring-emerald-500 bg-slate-900/60" 
                          : "border-slate-800 hover:border-slate-700"
                      }`}
                      onClick={() => {
                        setResellerSaleForm({
                          packageId: pkgStock.packageId,
                          scentName: pkgStock.scentName,
                          quantity: 1
                        });
                      }}
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-sm font-bold text-white leading-snug">{pkgStock.packageName}</h4>
                          {isSelected && (
                            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/20">
                              Terpilih
                            </span>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-end pt-2 border-t border-slate-800/60">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-500 block">Stok Anda</span>
                            <span className="text-sm font-extrabold text-white">{pkgStock.quantity} pcs</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] uppercase font-bold text-slate-500 block">Harga Jual</span>
                            <span className="text-sm font-extrabold text-emerald-400">Rp {price.toLocaleString("id-ID")}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Panel: Form Input Penjualan Simpel */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl h-fit space-y-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <PlusCircle className="h-4.5 w-4.5 text-emerald-400" />
              Input Penjualan
            </h3>

            {!resellerSaleForm.packageId ? (
              <div className="text-center py-8 px-4 text-slate-500 text-xs italic space-y-2">
                <p>Silakan klik/pilih salah satu paket dari katalog di sebelah kiri untuk mulai menginput penjualan.</p>
              </div>
            ) : (() => {
              const selectedStock = myPackageStocks.find(s => s.packageId === resellerSaleForm.packageId);
              if (!selectedStock) {
                return (
                  <p className="text-xs text-slate-500 italic text-center">Stok paket terpilih tidak tersedia.</p>
                );
              }

              const pkgFormula = bundlingPackages.find(p => p.id === selectedStock.packageId);
              const price = pkgFormula ? pkgFormula.price : 0;
              const isStockOk = selectedStock.quantity >= resellerSaleForm.quantity;
              const totalAmount = price * resellerSaleForm.quantity;

              return (
                <form onSubmit={handleResellerSaleSubmit} className="space-y-5">
                  <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 space-y-3">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Detail Paket Terpilih:</span>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white">{selectedStock.packageName}</p>
                      <div className="flex justify-between text-xs text-slate-400 pt-1">
                        <span>Stok Tersedia:</span>
                        <span className="font-bold text-white">{selectedStock.quantity} pcs</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Harga Satuan:</span>
                        <span className="font-bold text-emerald-400">Rp {price.toLocaleString("id-ID")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Jumlah Terjual (Unit)</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (resellerSaleForm.quantity > 1) {
                            setResellerSaleForm(prev => ({ ...prev, quantity: prev.quantity - 1 }));
                          }
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-extrabold px-3 py-2 rounded-lg text-sm select-none transition-all cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={resellerSaleForm.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setResellerSaleForm(prev => ({ ...prev, quantity: val }));
                        }}
                        className="w-full text-center bg-slate-900 border border-slate-800 rounded-lg py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white font-bold"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (resellerSaleForm.quantity < selectedStock.quantity) {
                            setResellerSaleForm(prev => ({ ...prev, quantity: prev.quantity + 1 }));
                          }
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-extrabold px-3 py-2 rounded-lg text-sm select-none transition-all cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 italic mt-1">Anda dapat mengetik langsung atau menggunakan tombol - / + untuk menyesuaikan jumlah.</p>
                  </div>

                  <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Total Setoran:</span>
                      <span className="font-extrabold text-white text-sm">Rp {totalAmount.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 pt-1.5 border-t border-slate-800">
                      <span>Sisa Stok Anda:</span>
                      <span className={`font-bold ${isStockOk ? "text-emerald-400" : "text-rose-400"}`}>
                        {selectedStock.quantity - resellerSaleForm.quantity} pcs
                      </span>
                    </div>
                  </div>

                  {!isStockOk && (
                    <p className="text-[11px] text-rose-400 font-bold italic bg-rose-950/20 border border-rose-900/40 p-2.5 rounded-lg">
                      Peringatan: Stok titipan Anda tidak mencukupi untuk jumlah ini!
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={!isStockOk}
                      className={`w-full font-bold text-xs py-2.5 px-3 rounded-xl transition-all flex justify-center items-center gap-1.5 cursor-pointer ${
                        isStockOk 
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow" 
                          : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                      }`}
                    >
                      <Check className="h-4 w-4" />
                      Konfirmasi & Jual
                    </button>
                    <button
                      type="button"
                      onClick={() => setResellerSaleForm({ packageId: "", scentName: "", quantity: 1 })}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2.5 px-3 rounded-xl transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      </div>
    );
  };

  const renderResellerSetoran = () => {
    const emailKey = (currentUser?.email || customEmail || "").trim().toLowerCase();
    const resellerTxs = transactions.filter(t => 
      t.resellerEmail?.trim().toLowerCase() === emailKey &&
      t.isConsignment === true &&
      t.type === "sale"
    );

    const unpaidTxs = resellerTxs.filter(t => t.paymentStatus === "Belum Dibayar");
    const totalUnpaidAmount = unpaidTxs.reduce((sum, t) => sum + t.totalPrice, 0);
    const paidTxs = resellerTxs.filter(t => t.paymentStatus === "Lunas");
    const totalPaidAmount = paidTxs.reduce((sum, t) => sum + t.totalPrice, 0);
    const totalSoldUnits = resellerTxs.reduce((sum, t) => sum + (t.bottleCount || 0), 0);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-rose-950/30 border border-rose-900/50 rounded-2xl p-6">
            <span className="text-[10px] uppercase font-bold text-rose-400">Total Belum Disetor (Piutang)</span>
            <p className="text-2xl font-bold text-rose-300 mt-2">Rp {totalUnpaidAmount.toLocaleString("id-ID")}</p>
            <p className="text-xs text-rose-400/80 mt-1">Harus segera disetor ke Admin Toko.</p>
          </div>

          <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-2xl p-6">
            <span className="text-[10px] uppercase font-bold text-emerald-400">Total Sudah Disetor</span>
            <p className="text-2xl font-bold text-emerald-300 mt-2">Rp {totalPaidAmount.toLocaleString("id-ID")}</p>
            <p className="text-xs text-emerald-400/80 mt-1">Selesai disetor ke Admin Utama.</p>
          </div>

          <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Volume Penjualan</span>
            <p className="text-2xl font-bold text-slate-100 mt-2">{totalSoldUnits} Unit</p>
            <p className="text-xs text-slate-400 mt-1">Total seluruh paket bundling laku.</p>
          </div>
        </div>

        <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-slate-300 mb-4">Riwayat Penjualan Paket Anda</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="py-3 px-4">Tanggal / Waktu</th>
                  <th className="py-3 px-4">Nama Paket</th>
                  <th className="py-3 px-4">Aroma</th>
                  <th className="py-3 px-4 text-center">Jumlah</th>
                  <th className="py-3 px-4 text-right">Total Harga</th>
                  <th className="py-3 px-4 text-center">Status Setoran</th>
                </tr>
              </thead>
              <tbody>
                {resellerTxs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                      Belum ada riwayat penjualan paket bundling.
                    </td>
                  </tr>
                ) : (
                  resellerTxs.map(t => (
                    <tr key={t.id} className="border-b border-slate-800/60 hover:bg-slate-900/20">
                      <td className="py-3 px-4 text-slate-300">
                        {new Date(t.date || t.timestamp || "").toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">{t.packageName || "Paket"}</td>
                      <td className="py-3 px-4 text-slate-300">{t.scentName}</td>
                      <td className="py-3 px-4 text-center text-slate-100 font-semibold">{t.bottleCount} unit</td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-bold">
                        Rp {t.totalPrice.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          t.paymentStatus === "Lunas" 
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-900/50" 
                            : "bg-rose-950 text-rose-400 border border-rose-900/50"
                        }`}>
                          {t.paymentStatus || "Belum Dibayar"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // ADMIN CONSIGNMENT & BUNDLING VIEW
  // ==========================================
  const renderConsignmentAdminView = () => {
    const resellers = userWhitelist.filter(u => u.role === "reseller");
    const consignmentSales = transactions.filter(t => t.isConsignment === true && t.type === "sale");

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-0.5">
          <button
            onClick={() => setAdminActiveConsignmentTab("dashboard")}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              adminActiveConsignmentTab === "dashboard"
                ? "bg-emerald-500 text-white font-extrabold"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <Box className="h-4 w-4" />
            Gudang Virtual Reseller
          </button>
          <button
            onClick={() => setAdminActiveConsignmentTab("packages")}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              adminActiveConsignmentTab === "packages"
                ? "bg-emerald-500 text-white font-extrabold"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            Produk Bundling
          </button>
          <button
            onClick={() => setAdminActiveConsignmentTab("piutang")}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              adminActiveConsignmentTab === "piutang"
                ? "bg-emerald-500 text-white font-extrabold"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <Wallet className="h-4 w-4" />
            Manajemen Piutang
          </button>
        </div>

        {adminActiveConsignmentTab === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-950 flex items-center gap-2">
                <Box className="h-4.5 w-4.5 text-emerald-600" />
                Stok Paket Bundling Reseller
              </h3>
              {resellers.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">Belum ada reseller yang terdaftar. Tambahkan reseller di menu "Hak Akses Client".</p>
              ) : (
                <div className="space-y-4">
                  {resellers.map(res => {
                    const myPackageStocks = resellerPackageStocks.filter(s => s.resellerEmail === res.email.trim().toLowerCase());
                    const unpaidForThisReseller = consignmentSales.filter(t => t.resellerEmail?.trim().toLowerCase() === res.email.trim().toLowerCase() && t.paymentStatus === "Belum Dibayar");
                    const unpaidAmount = unpaidForThisReseller.reduce((sum, t) => sum + t.totalPrice, 0);

                    return (
                      <div key={res.email} className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                          <div>
                            <p className="text-xs font-bold text-slate-900">{res.username || res.email}</p>
                            <p className="text-[10px] text-slate-500">{res.email}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Piutang Terhutang</span>
                            <span className={`text-xs font-bold ${unpaidAmount > 0 ? "text-rose-600 animate-pulse" : "text-emerald-600"}`}>
                              Rp {unpaidAmount.toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <span className="font-semibold text-slate-500 block text-[9px] uppercase tracking-wider">Daftar Paket Titipan Tersedia:</span>
                          {myPackageStocks.length === 0 ? (
                            <p className="text-slate-400 italic text-xs">Belum ada paket bundling yang dikirim ke reseller ini.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto pt-1">
                              {myPackageStocks.map(ps => (
                                <div key={ps.id} className="bg-white border border-slate-200 rounded-lg p-2.5 flex justify-between items-center text-xs shadow-sm">
                                  <div>
                                    <span className="font-bold text-slate-900 block">{ps.packageName}</span>
                                    <span className="text-slate-500 text-[10px] block">Aroma: {ps.scentName} ({ps.bottleSize})</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg font-extrabold text-[10px] h-fit">
                                      {ps.quantity} pcs
                                    </span>
                                    {userRole === "admin" && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenReturnModal(ps)}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                        title="Retur / Batal Kirim"
                                      >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-fit space-y-4">
              <h3 className="font-bold text-sm text-slate-950 flex items-center gap-2">
                <PlusCircle className="h-4.5 w-4.5 text-emerald-600" />
                Kirim Paket Bundling ke Reseller
              </h3>
              <form onSubmit={handleSendPackageSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reseller Tujuan</label>
                  <select
                    value={sendPackageForm.resellerEmail}
                    onChange={(e) => setSendPackageForm(prev => ({ ...prev, resellerEmail: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 cursor-pointer font-semibold"
                    required
                  >
                    <option value="">-- Pilih Reseller --</option>
                    {resellers.map(res => (
                      <option key={res.email} value={res.email}>{res.username || res.email}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pilih Paket Bundling</label>
                  <select
                    value={sendPackageForm.packageId}
                    onChange={(e) => setSendPackageForm(prev => ({ ...prev, packageId: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 cursor-pointer font-semibold"
                    required
                  >
                    <option value="">-- Pilih Paket Bundling --</option>
                    {bundlingPackages.map(pkg => (
                      <option key={pkg.id} value={pkg.id}>{pkg.packageName} - Rp {pkg.price.toLocaleString("id-ID")}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Jumlah Kirim (pcs)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={sendPackageForm.quantity || ""}
                    onChange={(e) => setSendPackageForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-semibold"
                    required
                  />
                </div>

                {(() => {
                  const selectedPkg = bundlingPackages.find(p => p.id === sendPackageForm.packageId);
                  if (!selectedPkg) return null;

                  const reqBottle = sendPackageForm.quantity;
                  const reqEssence = selectedPkg.essenceMl * sendPackageForm.quantity;
                  const reqAlcohol = selectedPkg.alcoholMl * sendPackageForm.quantity;

                  const availBottle = stocks.find(s => s.type === "bottle" && s.size === selectedPkg.bottleSize)?.quantity || 0;
                  const availEssence = stocks.find(s => s.type === "essence" && s.scentName === selectedPkg.scentName)?.quantity || 0;
                  const availAlcohol = stocks.find(s => s.id === (selectedPkg.solventType === "Absolut Gel" ? "alcohol_gel" : "alcohol_cair"))?.quantity || 0;

                  const hasEnoughBottle = availBottle >= reqBottle;
                  const hasEnoughEssence = availEssence >= reqEssence;
                  const hasEnoughAlcohol = availAlcohol >= reqAlcohol;
                  const hasEnoughAll = hasEnoughBottle && hasEnoughEssence && hasEnoughAlcohol;

                  return (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                      <span className="font-bold text-slate-600 block text-[10px] uppercase">Estimasi Bahan Diperlukan:</span>
                      <div className="flex justify-between">
                        <span>Botol {selectedPkg.bottleSize}:</span>
                        <span className={hasEnoughBottle ? "text-emerald-600" : "text-rose-600 font-bold"}>
                          {reqBottle} pcs (Stok: {availBottle})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bibit {selectedPkg.scentName}:</span>
                        <span className={hasEnoughEssence ? "text-emerald-600" : "text-rose-600 font-bold"}>
                          {reqEssence} ml (Stok: {availEssence} ml)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cairan {selectedPkg.solventType || "Absolut Cair"}:</span>
                        <span className={hasEnoughAlcohol ? "text-emerald-600" : "text-rose-600 font-bold"}>
                          {reqAlcohol} ml (Stok: {availAlcohol} ml)
                        </span>
                      </div>
                      {!hasEnoughAll && sendPackageForm.quantity > 0 && (
                        <p className="text-[10px] text-rose-500 italic mt-1">Peringatan: Stok bahan utama tidak cukup untuk dirakit!</p>
                      )}
                    </div>
                  );
                })()}

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-2 rounded-xl transition-all cursor-pointer shadow"
                >
                  Kirim Paket ke Reseller
                </button>
              </form>
            </div>
          </div>
        )}

        {adminActiveConsignmentTab === "packages" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-950 flex items-center gap-2">
                <ShoppingBag className="h-4.5 w-4.5 text-emerald-600" />
                Daftar Paket Bundling
              </h3>
              {bundlingPackages.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">Belum ada paket bundling yang dibuat.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bundlingPackages.map(pkg => (
                    <div key={pkg.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-bold text-slate-900">{pkg.packageName}</h4>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleStartEditBundling(pkg)}
                              className="text-amber-600 hover:text-amber-800 p-1"
                              title="Edit Paket"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteBundling(pkg.id, pkg.packageName)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                              title="Hapus Paket"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Ukuran Botol: {pkg.bottleSize}</p>
                        
                        <div className="mt-3 pt-3 border-t border-slate-200 space-y-1 text-[11px] text-slate-700">
                          <div className="flex justify-between">
                            <span>Kebutuhan Bibit:</span>
                            <span className="font-bold">{pkg.essenceMl} ml</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Kebutuhan Absolut:</span>
                            <span className="font-bold">{pkg.alcoholMl} ml ({pkg.solventType || "Absolut Cair"})</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-500">Harga Jual:</span>
                        <span className="font-extrabold text-emerald-600">Rp {pkg.price.toLocaleString("id-ID")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-fit space-y-4">
              <h3 className="font-bold text-sm text-slate-950 flex items-center gap-2">
                <PlusCircle className="h-4.5 w-4.5 text-emerald-600" />
                {editingBundling ? "Edit Formula Paket Bundling" : "Buat Koleksi Paket Bundling Baru"}
              </h3>
              <form onSubmit={handleAddBundlingSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Aroma (Bibit)</label>
                  {(() => {
                    const availableScents = Array.from(new Set(stocks.filter(s => s.type === "essence" && s.scentName).map(s => s.scentName)));
                    return (
                      <>
                        <input
                          type="text"
                          list="scents-autocomplete-list"
                          placeholder="Contoh: Black Opium"
                          value={newBundling.scentName || ""}
                          onChange={(e) => setNewBundling(prev => ({ ...prev, scentName: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-semibold"
                          required
                        />
                        <datalist id="scents-autocomplete-list">
                          {availableScents.map(scent => (
                            <option key={scent} value={scent} />
                          ))}
                        </datalist>
                      </>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ukuran Botol</label>
                  <select
                    value={newBundling.bottleSize}
                    onChange={(e) => setNewBundling(prev => ({ ...prev, bottleSize: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 cursor-pointer font-semibold"
                    required
                  >
                    {bottleSizes.map(bs => (
                      <option key={bs.id} value={bs.size}>{bs.size}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bibit (ml)</label>
                    <input
                      type="number"
                      min="1"
                      value={newBundling.essenceMl || ""}
                      onChange={(e) => setNewBundling(prev => ({ ...prev, essenceMl: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Absolut (ml) - Otomatis</label>
                    <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 font-bold">
                      {(() => {
                        const parseSizeNumber = (sizeStr: string): number => {
                          return parseInt(sizeStr.replace(/[^0-9]/g, "")) || 0;
                        };
                        const capacity = parseSizeNumber(newBundling.bottleSize);
                        return Math.max(0, capacity - (newBundling.essenceMl || 0));
                      })()} ml
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Jenis Pelarut (Solvent)</label>
                  <select
                    value={newBundling.solventType || "Absolut Cair"}
                    onChange={(e) => setNewBundling(prev => ({ ...prev, solventType: e.target.value as "Absolut Cair" | "Absolut Gel" }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 cursor-pointer font-semibold mb-3"
                    required
                  >
                    <option value="Absolut Cair">Absolut Cair</option>
                    <option value="Absolut Gel">Absolut Gel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    min="1000"
                    value={newBundling.price || ""}
                    onChange={(e) => setNewBundling(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Label / Nama Tambahan (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Premium, Formula B, Varian 2"
                    value={newBundling.customSuffix || ""}
                    onChange={(e) => setNewBundling(prev => ({ ...prev, customSuffix: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold"
                  />
                  <p className="text-[9px] text-slate-400 mt-0.5">Gunakan label berbeda jika ingin membuat variasi paket lain dengan aroma & ukuran botol yang sama.</p>
                </div>

                {newBundling.scentName.trim() && (
                  <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 text-[11px] text-slate-600">
                    <span className="font-bold text-emerald-800 block mb-0.5">Preview Nama Paket (Otomatis):</span>
                    <p className="font-mono font-bold text-slate-700">
                      Aroma {newBundling.scentName.trim()} - {newBundling.bottleSize}
                      {newBundling.customSuffix?.trim() ? ` (${newBundling.customSuffix.trim()})` : ""}
                    </p>
                  </div>
                )}

                {editingBundling ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="submit"
                      className="w-full bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow"
                    >
                      Simpan Perubahan
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditBundling}
                      className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-2 rounded-xl transition-all cursor-pointer shadow"
                  >
                    Buat Koleksi Paket
                  </button>
                )}
              </form>
            </div>
          </div>
        )}

        {adminActiveConsignmentTab === "piutang" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-950 flex items-center gap-2">
                <Wallet className="h-4.5 w-4.5 text-emerald-600" />
                Daftar Riwayat Piutang Konsinyasi Reseller
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                      <th className="py-3 px-4">Tanggal Penjualan</th>
                      <th className="py-3 px-4">Reseller</th>
                      <th className="py-3 px-4">Detail Paket & Aroma</th>
                      <th className="py-3 px-4 text-center">Jumlah (Unit)</th>
                      <th className="py-3 px-4 text-right">Piutang Setoran</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Aksi Pelunasan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consignmentSales.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                          Belum ada transaksi penjualan konsinyasi dari reseller.
                        </td>
                      </tr>
                    ) : (
                      consignmentSales.map(t => (
                        <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 text-slate-600">
                            {new Date(t.date || t.timestamp || "").toLocaleString("id-ID")}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900">{t.resellerEmail}</span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {t.packageName || "Paket"} <span className="font-normal text-slate-500">({t.scentName})</span>
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-slate-700">
                            {t.bottleCount} pcs
                          </td>
                          <td className="py-3 px-4 text-right font-extrabold text-emerald-600">
                            Rp {t.totalPrice.toLocaleString("id-ID")}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.paymentStatus === "Lunas"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
                            }`}>
                              {t.paymentStatus || "Belum Dibayar"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {t.paymentStatus !== "Lunas" ? (
                              <button
                                onClick={() => handleSettleTransaction(t.id)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] py-1 px-3 rounded-lg transition-colors cursor-pointer shadow-sm"
                              >
                                Pelunasan
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold italic">Selesai (Lunas)</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // RESELLER FULL LAYOUT REDIRECTION
  // ==========================================
  if (userRole === "reseller") {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col md:flex-row text-slate-100 selection:bg-emerald-500 selection:text-white font-sans">
        {/* Toast Notification */}
        {toast && (
          <div id="toast-notif" className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 py-3 px-5 rounded-xl shadow-2xl border transition-all duration-300 transform translate-y-0 ${
            toast.type === "success" ? "bg-emerald-900 text-emerald-100 border-emerald-700" :
            toast.type === "error" ? "bg-rose-950 text-rose-100 border-rose-800" :
            "bg-slate-900 text-slate-100 border-slate-700"
          }`}>
            {toast.type === "success" && <Check className="h-5 w-5 text-emerald-400" />}
            {toast.type === "error" && <AlertCircle className="h-5 w-5 text-rose-400" />}
            {toast.type === "info" && <Info className="h-5 w-5 text-teal-400" />}
            <span className="text-xs font-semibold">{toast.message}</span>
          </div>
        )}

        {/* Reseller Sidebar */}
        <aside className="w-full md:w-64 bg-slate-950 text-slate-300 flex flex-col border-r border-slate-800 shrink-0">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-white rounded-xl flex items-center justify-center shadow-md overflow-hidden p-0.5">
                <img src={invoiceSettings?.appIconUrl || "/icon.jpg"} alt="Bastika Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
              <div>
                <h2 className="font-bold font-display text-white tracking-tight text-sm">BASTIKA RESELLER</h2>
                <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">KONSINYASI</span>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/40">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">Reseller Aktif</p>
            <p className="text-xs font-bold text-white truncate mt-1">{currentUser?.email || customEmail}</p>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            <button
              onClick={() => setResellerActiveTab("penjualan")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                resellerActiveTab === "penjualan" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              Penjualan Paket
            </button>

            <button
              onClick={() => setResellerActiveTab("setoran")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                resellerActiveTab === "setoran" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Wallet className="h-4 w-4" />
              Status Setoran Uang
            </button>
          </nav>

          <div className="p-4 border-t border-slate-800 bg-slate-900/40">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-950 hover:text-red-300 hover:border-red-900 border border-slate-700 text-slate-300 text-xs font-semibold py-2 px-3 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Keluar Sistem
            </button>
          </div>
        </aside>

        {/* Reseller Main Panel */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-900 text-slate-100 overflow-y-auto">
          {/* Header */}
          <header className="bg-slate-950 border-b border-slate-800 py-4 px-6 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold font-display text-white tracking-tight">
                {resellerActiveTab === "penjualan" ? "Penjualan Paket Konsinyasi" : "Status Tagihan & Setoran"}
              </h1>
              <p className="text-xs text-slate-400">Portal Reseller Resmi Bastika Parfum</p>
            </div>
          </header>

          {/* Content views */}
          <div className="p-6">
            {resellerActiveTab === "penjualan" && renderResellerPenjualan()}
            {resellerActiveTab === "setoran" && renderResellerSetoran()}
          </div>
        </main>
      </div>
    );
  }

  // MAIN DASHBOARD LAYOUT
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800 selection:bg-emerald-500 selection:text-white font-sans">
      {/* Toast Notification */}
      {toast && (
        <div id="toast-notif" className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 py-3 px-5 rounded-xl shadow-2xl border transition-all duration-300 transform translate-y-0 ${
          toast.type === "success" ? "bg-emerald-900 text-emerald-100 border-emerald-700" :
          toast.type === "error" ? "bg-rose-950 text-rose-100 border-rose-800" :
          "bg-slate-900 text-slate-100 border-slate-700"
        }`}>
          {toast.type === "success" && <Check className="h-5 w-5 text-emerald-400" />}
          {toast.type === "error" && <AlertCircle className="h-5 w-5 text-rose-400" />}
          {toast.type === "info" && <Info className="h-5 w-5 text-teal-400" />}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-white rounded-xl flex items-center justify-center shadow-md overflow-hidden p-0.5">
              <img src={invoiceSettings?.appIconUrl || "/icon.jpg"} alt="Bastika Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <div>
              <h2 className="font-bold font-display text-white tracking-tight text-sm">BASTIKA PARFUM</h2>
              <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">Online Cloud DB</span>
            </div>
          </div>
          {/* Connection status badge */}
          <div className="flex items-center">
            <span className={`h-2.5 w-2.5 rounded-full ${
              syncStatus === "synced" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
            }`} title={syncStatus === "synced" ? "Tersambung ke Cloud Firestore" : "Koneksi Offline (Caching aktif)"}></span>
          </div>
        </div>

        {/* Current User Info */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-white font-bold text-xs uppercase">
              {(currentUser?.email || customEmail || "U").substring(0, 2)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{currentUser?.email || customEmail}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                  userRole === "admin" ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}>
                  {userRole}
                </span>
                {syncStatus === "offline" && (
                  <span className="text-[8px] text-amber-400 font-bold uppercase">(Offline Mode)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-bold text-slate-500 px-3 uppercase tracking-wider mb-2">Menu Utama</p>
          
          {userRole === "admin" && (
            <button
              id="nav-dashboard-btn"
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "dashboard" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              Dashboard & Laba
            </button>
          )}

          <button
            id="nav-shelves-btn"
            onClick={() => setActiveTab("shelves")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "shelves" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Layers className="h-4 w-4" />
            Sistem Rak Aroma
          </button>

          <button
            id="nav-stocks-btn"
            onClick={() => setActiveTab("stocks")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "stocks" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Box className="h-4 w-4" />
            Inventori Stok Master
          </button>

          <button
            id="nav-sales-btn"
            onClick={() => setActiveTab("sales")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "sales" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            Input Penjualan (Kasir)
          </button>

          {userRole === "admin" && (
            <>
              <button
                id="nav-consignment-btn"
                onClick={() => setActiveTab("consignment")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === "consignment" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Layers className="h-4 w-4" />
                Konsinyasi & Bundling
              </button>

              <button
                id="nav-purchases-btn"
                onClick={() => setActiveTab("purchases")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === "purchases" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <ArrowDownRight className="h-4 w-4" />
                Catat Belanja Stok
              </button>

              <p className="text-[10px] font-bold text-slate-500 px-3 uppercase tracking-wider pt-4 mb-2">Keuangan & Akses</p>

              <button
                id="nav-accounting-btn"
                onClick={() => setActiveTab("accounting")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === "accounting" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Wallet className="h-4 w-4" />
                Akuntansi & Kas Besar
              </button>

              <button
                id="nav-history-btn"
                onClick={() => setActiveTab("history")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === "history" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Calendar className="h-4 w-4" />
                Riwayat Transaksi
              </button>

              <button
                id="nav-users-btn"
                onClick={() => setActiveTab("users")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === "users" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Users className="h-4 w-4" />
                Hak Akses Client
              </button>

              <button
                id="nav-invoice-settings-btn"
                onClick={() => setActiveTab("invoice_settings")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === "invoice_settings" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Settings className="h-4 w-4" />
                Format Kop Invoice
              </button>

              <button
                id="nav-db-management-btn"
                onClick={() => setActiveTab("db_management")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === "db_management" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Database className="h-4 w-4" />
                Pengaturan Database
              </button>
            </>
          )}

          <button
            id="nav-customers-btn"
            onClick={() => setActiveTab("customers")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "customers" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Database Pelanggan
          </button>
        </nav>

        {/* Footer info & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <button
            id="logout-btn"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-950 hover:text-red-300 hover:border-red-900 border border-slate-700 text-slate-300 text-xs font-semibold py-2 px-3 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Keluar Sistem
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 py-4 px-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-xl font-bold font-display text-slate-900 tracking-tight flex items-center gap-2">
              <span>{activeTab === 'dashboard' ? 'Ringkasan Laba & Omset' :
                     activeTab === 'shelves' ? 'Manajemen Rak Aroma' :
                     activeTab === 'stocks' ? 'Manajemen Stok & Inventori' :
                     activeTab === 'sales' ? 'Kasir Penjualan Parfum' :
                     activeTab === 'purchases' ? 'Pencatatan Belanja Stok' :
                     activeTab === 'accounting' ? 'Buku Kas & Laporan Keuangan' :
                     activeTab === 'users' ? 'Manajemen Akses Karyawan (Client)' :
                     activeTab === 'invoice_settings' ? 'Format Kop Invoice' :
                     activeTab === 'customers' ? 'Sistem Database Pelanggan & Promo' :
                     activeTab === 'db_management' ? 'Pengaturan Backup & Database' :
                     'Riwayat Semua Mutasi'}</span>
              <span className="text-xs font-normal text-slate-500">| Bastika Parfum</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Sistem data real-time, sinkron otomatis ke seluruh perangkat.</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Real-time Indicator status */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold ${
              syncStatus === "synced" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
              {syncStatus === "synced" ? "Cloud Connected" : "Local Caching (Offline)"}
            </div>

            {/* Quick search bar for specific views */}
            {["shelves", "stocks", "history"].includes(activeTab) && (
              <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 shadow-sm">
                
                {/* Search input field */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    id="navbar-search-input"
                    type="text"
                    placeholder="Cari kata kunci..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-medium"
                  />
                </div>

                {/* Column Selector */}
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider pl-1">Kolom:</span>
                  <select
                    value={searchColumn}
                    onChange={(e) => setSearchColumn(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-2 py-1 text-[11px] focus:outline-none text-slate-700 font-bold cursor-pointer"
                  >
                    <option value="all">Semua Kolom</option>
                    {activeTab === "shelves" && (
                      <>
                        <option value="rackNumber">Nomor Rak</option>
                        <option value="scentName">Aroma Parfum</option>
                      </>
                    )}
                    {activeTab === "stocks" && (
                      <>
                        <option value="scentName">Aroma Parfum</option>
                        <option value="type">Jenis Gudang</option>
                        <option value="size">Ukuran Botol</option>
                      </>
                    )}
                    {activeTab === "history" && (
                      <>
                        <option value="id">ID Transaksi</option>
                        <option value="scentName">Aroma Parfum</option>
                        <option value="description">Keterangan</option>
                        <option value="operatorEmail">Operator Kasir</option>
                        <option value="customerName">Nama Pelanggan</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Case Sensitive Toggle Button */}
                <button
                  type="button"
                  onClick={() => setSearchCaseSensitive(!searchCaseSensitive)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all border cursor-pointer select-none ${
                    searchCaseSensitive 
                      ? "bg-rose-50 text-rose-700 border-rose-200 shadow-sm" 
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  }`}
                  title="Sensitif Huruf Kapital (Case-Sensitive)"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${searchCaseSensitive ? "bg-rose-500 animate-pulse" : "bg-slate-300"}`} />
                  Aa Sensitif
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Dashboard content workspace container */}
        <div className="flex-1 p-6 overflow-y-auto">
          
          {/* ==========================================
              1. DASHBOARD VIEW (Admin Only)
              ========================================== */}
          {activeTab === "dashboard" && userRole === "admin" && (
            <div className="space-y-6">
              
              {/* FILTER PERIODE & EXCEL EXPORT */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 bg-emerald-50 rounded-lg flex items-center justify-center">
                      <Filter className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Filter Laporan & Laba Rugi</h4>
                      <p className="text-[10px] text-slate-500">Sesuaikan rentang waktu analisis laba usaha</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 max-w-2xl">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tanggal Mulai</label>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tanggal Selesai</label>
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pilih Bulan & Tahun</label>
                      <input
                        type="month"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="flex sm:items-center gap-2">
                    <button
                      onClick={() => {
                        setFilterStartDate("");
                        setFilterEndDate("");
                        setFilterMonth("");
                        showToast("Filter berhasil dibersihkan.");
                      }}
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Reset Filter"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reset
                    </button>

                    <button
                      onClick={exportLabaRugiToExcel}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-100" />
                      Export Excel
                    </button>
                  </div>
                </div>
              </div>

              {/* Financial Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                
                {/* Total Cash Balance (Kas Besar) */}
                <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-lg relative overflow-hidden">
                  <div className="absolute right-3 top-3 h-10 w-10 bg-slate-800/60 rounded-xl flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-emerald-400" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saldo Kas Besar</p>
                  <p className="text-lg font-bold mt-2 font-mono text-emerald-400 leading-tight">
                    {formatRupiah(cashBalance)}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[10px] text-slate-300">
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span>Real-time terupdate</span>
                  </div>
                </div>

                {/* Total Sales (Omset Kotor) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute right-3 top-3 h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Penjualan</p>
                  <p className="text-lg font-bold mt-2 font-mono text-slate-900 leading-tight">
                    {formatRupiah(totalSales)}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                    <ArrowUpRight className="h-3 w-3" />
                    <span>{transactions.filter(t => t.type === "sale").length} transaksi penjualan</span>
                  </div>
                </div>

                {/* Total Purchases (Pengeluaran Belanja) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute right-3 top-3 h-10 w-10 bg-rose-50 rounded-xl flex items-center justify-center">
                    <ArrowDownRight className="h-5 w-5 text-rose-600" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Belanja Bibit & Botol</p>
                  <p className="text-lg font-bold mt-2 font-mono text-slate-900 leading-tight">
                    {formatRupiah(totalPurchases)}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[10px] text-rose-600 font-medium">
                    <ArrowDownRight className="h-3 w-3" />
                    <span>{transactions.filter(t => t.type === "purchase").length} transaksi belanja</span>
                  </div>
                </div>

                {/* Total Salaries (Pengurang Laba) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute right-3 top-3 h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center">
                    <Users className="h-5 w-5 text-amber-600" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Beban Gaji Karyawan</p>
                  <p className="text-lg font-bold mt-2 font-mono text-slate-900 leading-tight">
                    {formatRupiah(totalSalaries)}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                    <span>{salaries.length} karyawan terbayar</span>
                  </div>
                </div>

                {/* Net Profit (Laba Bersih) */}
                <div className={`rounded-2xl p-5 border shadow-lg relative overflow-hidden ${
                  netProfit >= 0 ? "bg-emerald-50 border-emerald-200 text-emerald-950" : "bg-rose-50 border-rose-200 text-rose-950"
                }`}>
                  <div className="absolute right-3 top-3 h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-emerald-700" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Laba Bersih Otomatis</p>
                  <p className="text-lg font-bold mt-2 font-mono leading-tight">
                    {formatRupiah(netProfit)}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold">
                    <span>Laba Bersih = Omset - Belanja - Gaji</span>
                  </div>
                </div>

              </div>

              {/* Graphical Analysis & Alert Box */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Visual Mutation Bar Chart */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Performa Keuangan Usaha</h3>
                      <p className="text-[11px] text-slate-500">Visualisasi pemasukan vs pengeluaran terakumulasi real-time.</p>
                    </div>
                    <span className="text-[10px] bg-slate-100 px-2 py-1 rounded font-bold text-slate-600 font-mono">2026-07-01 Current</span>
                  </div>

                  {/* SVG Custom Bar chart */}
                  <div className="h-48 flex items-end justify-around gap-4 pt-6 border-b border-slate-200">
                    <div className="flex flex-col items-center w-24">
                      <div 
                        style={{ height: `${Math.min(100, Math.max(10, (totalSales / (totalSales + totalPurchases + totalSalaries || 1)) * 140))}px` }}
                        className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg shadow-sm"
                      ></div>
                      <span className="text-[10px] font-bold text-slate-700 mt-2">Penjualan</span>
                      <span className="text-[9px] font-mono text-slate-500">{formatRupiah(totalSales)}</span>
                    </div>

                    <div className="flex flex-col items-center w-24">
                      <div 
                        style={{ height: `${Math.min(100, Math.max(10, (totalPurchases / (totalSales + totalPurchases + totalSalaries || 1)) * 140))}px` }}
                        className="w-full bg-gradient-to-t from-rose-600 to-rose-400 rounded-t-lg shadow-sm"
                      ></div>
                      <span className="text-[10px] font-bold text-slate-700 mt-2">Belanja</span>
                      <span className="text-[9px] font-mono text-slate-500">{formatRupiah(totalPurchases)}</span>
                    </div>

                    <div className="flex flex-col items-center w-24">
                      <div 
                        style={{ height: `${Math.min(100, Math.max(10, (totalSalaries / (totalSales + totalPurchases + totalSalaries || 1)) * 140))}px` }}
                        className="w-full bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-lg shadow-sm"
                      ></div>
                      <span className="text-[10px] font-bold text-slate-700 mt-2">Gaji</span>
                      <span className="text-[9px] font-mono text-slate-500">{formatRupiah(totalSalaries)}</span>
                    </div>
                  </div>
                </div>

                {/* Low Stock Alerts & Overview */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
                      <AlertCircle className="h-4.5 w-4.5 text-amber-500" />
                      Peringatan Stok Rendah
                    </h3>
                    <div className="space-y-3 overflow-y-auto max-h-48">
                      {stocks.filter(s => s.quantity < (s.type === "essence" ? 100 : s.type === "bottle" ? 15 : 1000)).map(s => (
                        <div key={s.id} className="flex justify-between items-center bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs">
                          <div>
                            <span className="font-bold text-amber-900">
                              {s.type === "essence" ? `Bibit ${s.scentName}` : s.type === "bottle" ? `Botol ${s.bottleType || "Kaca"} ${s.size}` : "Absolut"}
                            </span>
                            <p className="text-[10px] text-amber-700">Perlu re-stock segera!</p>
                          </div>
                          <span className="font-mono font-bold bg-amber-200 text-amber-900 px-2.5 py-1 rounded-lg">
                            {s.quantity} {s.type === "essence" || s.type === "alcohol" ? "ml" : "unit"}
                          </span>
                        </div>
                      ))}
                      {stocks.filter(s => s.quantity < (s.type === "essence" ? 100 : s.type === "bottle" ? 15 : 1000)).length === 0 && (
                        <div className="text-center py-6 text-slate-400">
                          <Check className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                          <p className="text-xs font-semibold">Semua stok aman & memadai.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Total Scent terdata:</span>
                    <span className="font-bold font-mono text-slate-800">{prices.length} aroma</span>
                  </div>
                </div>

              </div>

              {/* Professional Manual Cash Mutation Form & Fast Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Manual Kas Mutation input */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
                    <PlusCircle className="h-4.5 w-4.5 text-emerald-600" />
                    Catat Mutasi Kas Manual (Injeksi Modal / Operasional)
                  </h3>
                  
                  <form onSubmit={handleManualMutation} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setManualMutationType("in")}
                        className={`py-2 px-4 rounded-xl border text-xs font-bold transition-all ${
                          manualMutationType === "in" 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-400" 
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        Uang Masuk (Debit)
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualMutationType("out")}
                        className={`py-2 px-4 rounded-xl border text-xs font-bold transition-all ${
                          manualMutationType === "out" 
                            ? "bg-rose-50 text-rose-700 border-rose-400" 
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        Uang Keluar (Kredit)
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nominal (Rupiah)</label>
                        <input
                          id="manual-mutation-amount"
                          type="number"
                          placeholder="Contoh: 500000"
                          value={manualMutationAmount || ""}
                          onChange={(e) => setManualMutationAmount(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Deskripsi / Keterangan</label>
                        <input
                          id="manual-mutation-desc"
                          type="text"
                          placeholder="Injeksi modal / Operasional..."
                          value={manualMutationDesc}
                          onChange={(e) => setManualMutationDesc(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>
                    </div>

                    <button
                      id="save-manual-mutation"
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                    >
                      <span>Simpan Mutasi Kas</span>
                    </button>
                  </form>
                </div>

                {/* Quick Info panel explaining architecture */}
                <div className="bg-slate-900 text-slate-300 rounded-2xl p-6 border border-slate-800 shadow-lg relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-white mb-2 flex items-center gap-2">
                      <Sparkles className="h-4.5 w-4.5 text-emerald-400" />
                      Arsitektur BASTIKA PARFUM Cloud Sync
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Sistem dirancang dengan arsitektur modern MVVM yang didukung oleh **Google Cloud Firestore**. Seluruh data transaksi penjualan, stok, dan kas besar tersimpan di cloud terenkripsi.
                    </p>
                    <ul className="text-[11px] space-y-2 mt-4 text-slate-400 list-disc list-inside">
                      <li>**Real-time Synchronization**: Setiap perubahan data harga master atau transaksi akan disinkronisasikan ke seluruh perangkat kasir dalam waktu kurang dari 1 detik.</li>
                      <li>**Offline Caching**: Jika toko kehilangan sinyal, aplikasi menyimpan data secara lokal pada IndexedDB. Data akan terkirim otomatis saat koneksi internet kembali pulih.</li>
                      <li>**Keamanan Multi-Level**: Akuntansi laba bersih, buku kas, beban gaji, serta pengelolaan whitelist user dienkripsi dan diatur ketat oleh aturan security rules Firebase.</li>
                    </ul>
                  </div>
                  <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between">
                    <span>Database ID: ai-studio-bastikaparfumbus</span>
                    <span>Role: {userRole?.toUpperCase()}</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ==========================================
              2. SISTEM RAK VIEW
              ========================================== */}
          {activeTab === "shelves" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Add Rack Position Form (Admin Only) */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-fit">
                  <h3 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
                    <Plus className="h-4 w-4 text-emerald-600" />
                    {userRole === 'admin' ? 'Tambah Posisi Rak Aroma Baru' : 'Info Hak Akses'}
                  </h3>
                  
                  {userRole === 'admin' ? (
                    <form onSubmit={handleAddShelf} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nomor / Posisi Rak</label>
                        <input
                          id="shelf-rack-input"
                          type="text"
                          placeholder="Contoh: Rak A-01, Rak C-05"
                          value={newShelf.rackNumber}
                          onChange={(e) => setNewShelf({ ...newShelf, rackNumber: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Aroma / Scent</label>
                        <input
                          id="shelf-scent-input"
                          type="text"
                          placeholder="Contoh: Bacarat Rouge, Black Opium"
                          value={newShelf.scentName}
                          onChange={(e) => setNewShelf({ ...newShelf, scentName: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Harga jual per ML (Rupiah)</label>
                        <input
                          id="shelf-price-input"
                          type="number"
                          placeholder="Contoh: 3500"
                          value={newShelf.pricePerMl || ""}
                          onChange={(e) => setNewShelf({ ...newShelf, pricePerMl: Number(e.target.value) })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>

                      <button
                        id="save-shelf-btn"
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        Simpan ke Rak
                      </button>
                    </form>
                  ) : (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-900 leading-relaxed flex gap-3">
                      <Lock className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <div>
                        <span className="font-bold">Akses Terbatas (Client):</span> Anda hanya memiliki hak untuk membaca sistem penomoran rak dan melakukan pencarian aroma. Pengeditan posisi rak dan harga jual hanya bisa dilakukan oleh Admin.
                      </div>
                    </div>
                  )}

                  {/* MASTER PRICE UPDATE FORM (Admin Only) */}
                  {userRole === "admin" && (
                    <div className="mt-8 pt-8 border-t border-slate-100">
                      <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
                        <Edit3 className="h-4.5 w-4.5 text-emerald-600" />
                        Update Harga Scent Master
                      </h3>
                      <p className="text-[11px] text-slate-500 mb-4">Jika diubah, harga jual bibit akan otomatis terupdate ke seluruh rak yang terkait.</p>
                      
                      {editingPrice ? (
                        <form onSubmit={handleUpdatePrice} className="space-y-4">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <span className="block text-[10px] font-bold text-slate-400">Aroma Dipilih:</span>
                            <span className="text-xs font-bold text-slate-800">{editingPrice.scentName}</span>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Harga jual per ML baru (Rp)</label>
                            <input
                              id="edit-price-input"
                              type="number"
                              value={editingPrice.pricePerMl || ""}
                              onChange={(e) => setEditingPrice({ ...editingPrice, pricePerMl: Number(e.target.value) })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              id="save-update-price-btn"
                              type="submit"
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors"
                            >
                              Simpan Update
                            </button>
                            <button
                              id="cancel-update-price-btn"
                              type="button"
                              onClick={() => setEditingPrice(null)}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-3 rounded-lg text-xs transition-colors"
                            >
                              Batal
                            </button>
                          </div>
                        </form>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">Pilih aroma di tabel kanan untuk mengubah harga master.</p>
                      )}
                    </div>
                  )}

                </div>

                {/* Rak List Table */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Tata Letak Posisi Rak Parfum</h3>
                      <p className="text-[11px] text-slate-500">Mencari letak nomor rak dan aroma parfum yang tersedia.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-slate-100 px-2.5 py-1.5 rounded-xl font-semibold text-slate-600 shrink-0">{filteredShelves.length} rak</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                          <th className="py-3 px-4">Nomor Rak</th>
                          <th className="py-3 px-4">Nama Aroma Scent</th>
                          <th className="py-3 px-4">Harga Jual / ML</th>
                          {userRole === "admin" && <th className="py-3 px-4 text-right">Aksi</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredShelves.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {editingShelf?.id === s.id ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={editingShelf.rackNumber}
                                    onChange={(e) => setEditingShelf({ ...editingShelf, rackNumber: e.target.value })}
                                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 w-24"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSaveShelfRackNumber();
                                      if (e.key === "Escape") setEditingShelf(null);
                                    }}
                                  />
                                  <button
                                    onClick={handleSaveShelfRackNumber}
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                    title="Simpan"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingShelf(null)}
                                    className="p-1 text-slate-400 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                    title="Batal"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 group">
                                  <span>{s.rackNumber}</span>
                                  {userRole === "admin" && (
                                    <button
                                      onClick={() => setEditingShelf({ id: s.id, rackNumber: s.rackNumber })}
                                      className="text-slate-400 hover:text-emerald-600 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                      title="Edit Nomor Rak"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-800 flex items-center gap-2">
                              {s.scentName}
                              {userRole === "admin" && (
                                <button 
                                  onClick={() => setEditingPrice({ scentName: s.scentName, pricePerMl: s.pricePerMl })}
                                  className="text-slate-400 hover:text-emerald-600 p-0.5 rounded transition-colors"
                                  title="Edit Harga Aroma"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-emerald-700">{formatRupiah(s.pricePerMl)}</td>
                            {userRole === "admin" && (
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => handleDeleteShelf(s.id, s.rackNumber)}
                                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus Rak"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                        {filteredShelves.length === 0 && (
                          <tr>
                            <td colSpan={userRole === 'admin' ? 4 : 3} className="py-8 text-center text-slate-400 italic">
                              Tidak ada letak rak atau aroma yang cocok dengan pencarian Anda.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ==========================================
              3. MASTER STOK VIEW
              ========================================== */}
          {activeTab === "stocks" && (
            <div className="space-y-6">
              
              {/* Stok Cards Visual representation */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Bibit card total */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Aroma Bibit Parfum</span>
                    <h4 className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                      {stocks.filter(s => s.type === "essence").reduce((sum, s) => sum + s.quantity, 0).toLocaleString("id-ID")} ml
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-2">Terbagi dalam {stocks.filter(s => s.type === "essence").length} jenis bibit terdaftar.</p>
                  </div>
                  <div className="h-12 w-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                    <Sparkles className="h-6 w-6" />
                  </div>
                </div>

                {/* Alkohol card total */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stok Utama Absolut</span>
                    <div className="h-8 w-8 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium">Absolut Cair</span>
                      <h4 className="text-lg font-extrabold text-slate-900 font-mono">
                        {(stocks.find(s => s.id === "alcohol_cair")?.quantity || 0).toLocaleString("id-ID")} ml
                      </h4>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium">Absolut Gel</span>
                      <h4 className="text-lg font-extrabold text-slate-900 font-mono">
                        {(stocks.find(s => s.id === "alcohol_gel")?.quantity || 0).toLocaleString("id-ID")} ml
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Botol card total */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stok Botol Kosong</span>
                    <h4 className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                      {stocks.filter(s => s.type === "bottle").reduce((sum, s) => sum + s.quantity, 0)} unit
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-2">Mencakup botol ukuran 30ml, 50ml, dan 100ml.</p>
                  </div>
                  <div className="h-12 w-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                    <Package className="h-6 w-6" />
                  </div>
                </div>
              </div>

              {/* Master Stok Grid / Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Bibit Parfum Master Table */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Stok Bibit Parfum (ml)</h3>
                      <p className="text-[11px] text-slate-500">Jumlah ml cairan bibit per jenis aroma yang tersedia.</p>
                    </div>
                    {userRole === 'admin' && <span className="text-[10px] text-emerald-600 font-semibold">*Admin dapat mengubah angka secara manual</span>}
                  </div>

                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                          <th className="py-3 px-4">Nama Aroma Bibit</th>
                          <th className="py-3 px-4 text-right">Volume Sisa (ml)</th>
                          {userRole === "admin" && <th className="py-3 px-4 text-right">Sesuaikan Stok</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStocks.filter(s => s.type === "essence").map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-800">{s.scentName}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                              <span className={`px-2 py-1 rounded-md ${
                                s.quantity < 100 ? "bg-rose-50 text-rose-700 border border-rose-100 animate-pulse" : ""
                              }`}>
                                {s.quantity} ml
                              </span>
                            </td>
                            {userRole === "admin" && (
                              <td className="py-3 px-4 text-right">
                                <input
                                  type="number"
                                  defaultValue={s.quantity}
                                  onBlur={(e) => updateStockManual(s.id, Number(e.target.value))}
                                  className="w-20 bg-slate-100 border border-transparent rounded px-2 py-1 font-mono text-center focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                                  title="Masukkan angka lalu klik luar kotak untuk menyimpan"
                                />
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bottles & Alcohol Stocks */}
                <div className="space-y-6">
                  {/* Bottle Stock */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">Stok Botol & Absolut</h3>
                        <p className="text-[11px] text-slate-500">Mencatat ketersediaan botol kosong dan cairan pelarut Absolut.</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                            <th className="py-3 px-4">Nama Barang</th>
                            <th className="py-3 px-4 text-right">Stok Saat Ini</th>
                            {userRole === "admin" && <th className="py-3 px-4 text-right">Sesuaikan Stok</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {stocks.filter(s => s.type === "bottle" || s.type === "alcohol").map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4 font-bold text-slate-800">
                                {s.type === "alcohol" 
                                  ? (s.scentName || (s.id === "alcohol_gel" ? "Absolut Gel" : "Absolut Cair")) 
                                  : `Botol Parfum ${s.bottleType || "Kaca"} Ukuran ${s.size}`}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                                <span className={`px-2 py-1 rounded-md ${
                                  s.quantity < (s.type === "alcohol" ? 1000 : 15) ? "bg-rose-50 text-rose-700 border border-rose-100" : ""
                                }`}>
                                  {s.quantity} {s.type === "alcohol" ? "ml" : "unit"}
                                </span>
                              </td>
                              {userRole === "admin" && (
                                <td className="py-3 px-4 text-right">
                                  <input
                                    type="number"
                                    defaultValue={s.quantity}
                                    onBlur={(e) => updateStockManual(s.id, Number(e.target.value))}
                                    className="w-20 bg-slate-100 border border-transparent rounded px-2 py-1 font-mono text-center focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                                    title="Masukkan angka lalu klik luar kotak untuk menyimpan"
                                  />
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Stock Alert explanation box */}
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-900 flex gap-3 text-xs leading-relaxed">
                    <Info className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <span className="font-bold">Informasi Stok Otomatis:</span> Stok akan berkurang secara real-time setiap kali kasir menginput data Penjualan. Untuk pencatatan belanja (Pembelian), stok bibit parfum atau botol akan bertambah secara otomatis sesuai dengan isian kategori belanja.
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ==========================================
              4. INPUT PENJUALAN (KASIR) VIEW
              ========================================== */}
          {activeTab === "sales" && (
            <div className="max-w-3xl mx-auto space-y-6">
              
              <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold font-display">KASIR BASTIKA PARFUM</h2>
                    <p className="text-[11px] text-slate-400">Pencatatan Penjualan Parfum (Stok Bibit & Botol Berkurang Otomatis)</p>
                  </div>
                  <span className="text-[11px] font-mono bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-bold px-2 py-1 rounded">
                    Real-time POS
                  </span>
                </div>

                <form onSubmit={handleSalesSubmit} className="p-6 space-y-5">
                  {/* Nama Pelanggan (Customer Name) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Pelanggan (Opsional)</label>
                    <input
                      id="sales-customer-input"
                      type="text"
                      list="customer-suggestions"
                      placeholder="Masukkan nama pelanggan (kosongkan jika Pelanggan Umum)"
                      value={saleCustomerName}
                      onChange={(e) => {
                        setSaleCustomerName(e.target.value);
                        // Reset claim selection if customer name changes
                        setSaleClaimPromo(false);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800 font-medium"
                    />
                    <datalist id="customer-suggestions">
                      {customers.map((c) => (
                        <option key={c.id} value={c.name} />
                      ))}
                    </datalist>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      💡 Ketik nama pelanggan. Jika pelanggan sudah pernah berbelanja, pilih dari daftar saran di atas untuk menghindari duplikasi penulisan.
                    </span>

                    {/* Real-time Loyalty Integration Card */}
                    {(() => {
                      const matchedCustomer = customers.find(
                        (c) => c.name.toLowerCase() === saleCustomerName.trim().toLowerCase()
                      );
                      const custAvailableClaims = matchedCustomer
                        ? Math.floor(matchedCustomer.totalPurchase / promoThreshold)
                        : 0;

                      if (!matchedCustomer || custAvailableClaims <= 0) return null;

                      return (
                        <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-950 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="flex items-start gap-2.5">
                            <span className="text-lg">🎉</span>
                            <div>
                              <p className="font-bold text-emerald-900">Pelanggan Setia Terdeteksi!</p>
                              <p className="text-[11px] text-slate-600 mt-0.5">
                                Memiliki <span className="font-bold text-emerald-700 font-mono">{custAvailableClaims}x</span> hak klaim promo (Sisa Akumulasi Belanja: <span className="font-mono font-bold">{formatRupiah(matchedCustomer.totalPurchase)}</span>)
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const turnOn = !saleClaimPromo;
                              setSaleClaimPromo(turnOn);
                              if (turnOn) {
                                setSaleDiscountType("nominal");
                                setSaleDiscountNominal(promoDiscount);
                              } else {
                                setSaleDiscountType("none");
                                setSaleDiscountNominal(0);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold shadow-sm transition-all cursor-pointer border ${
                              saleClaimPromo
                                ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700"
                                : "bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            }`}
                          >
                            {saleClaimPromo ? "✅ Promo Terpasang" : "Gunakan 1 Klaim Promo"}
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Scent selection */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Aroma / Scent Parfum</label>
                      <select
                        id="sales-scent-select"
                        value={saleScent}
                        onChange={(e) => {
                          setSaleScent(e.target.value);
                          if (e.target.value === "Hanya Botol") {
                            setSaleVolume(0);
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
                      >
                        <option value="">-- Pilih Aroma --</option>
                        <option value="Hanya Botol" className="font-bold text-emerald-700 bg-emerald-50">🛍️ -- Hanya Beli Botol Saja --</option>
                        {prices.map(p => (
                          <option key={p.scentName} value={p.scentName}>
                            {p.scentName} ({formatRupiah(p.pricePerMl)} / ml)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Volume (ml) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Volume Bibit (ml)</label>
                      <input
                        id="sales-volume-input"
                        type="number"
                        placeholder={saleScent === "Hanya Botol" ? "0 (Hanya Botol)" : "Volume cairan bibit (ml)"}
                        value={saleScent === "Hanya Botol" ? "" : (saleVolume || "")}
                        disabled={saleScent === "Hanya Botol"}
                        onChange={(e) => setSaleVolume(Number(e.target.value))}
                        className={`w-full border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                          saleScent === "Hanya Botol"
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : "bg-slate-50 border-slate-200 focus:bg-white text-slate-800"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Bottle size selection */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ukuran Botol (Kemasan)</label>
                      <select
                        id="sales-bottle-select"
                        value={saleBottleSize}
                        onChange={(e) => {
                          setSaleBottleSize(e.target.value);
                          if (e.target.value === "None") {
                            setSaleNoBottle(false);
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
                      >
                        {bottleSizes.map((b) => (
                          <option key={b.id} value={b.size}>
                            Botol {b.size}
                          </option>
                        ))}
                        <option value="None">Hanya Bibit</option>
                      </select>
                    </div>

                    {/* Bottle count */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Jumlah Botol (Unit)</label>
                      <input
                        id="sales-count-input"
                        type="number"
                        min="1"
                        placeholder="Jumlah pesanan botol"
                        value={saleBottleCount || ""}
                        onChange={(e) => setSaleBottleCount(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
                      />
                    </div>

                    {/* Bottle material selection */}
                    {saleBottleSize !== "None" && (
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bahan Botol</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setSaleBottleType("Kaca")}
                            className={`py-2 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                              saleBottleType === "Kaca"
                                ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            Botol Kaca ({formatRupiah(bottleSizes.find(b => b.size === saleBottleSize)?.priceKaca ?? bottleSizes.find(b => b.size === saleBottleSize)?.price ?? 0)})
                          </button>
                          <button
                            type="button"
                            onClick={() => setSaleBottleType("Plastik")}
                            className={`py-2 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                              saleBottleType === "Plastik"
                                ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            Botol Plastik ({formatRupiah(bottleSizes.find(b => b.size === saleBottleSize)?.pricePlastik ?? Math.round((bottleSizes.find(b => b.size === saleBottleSize)?.price ?? 0) / 2))})
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Checkbox Bawa Botol Sendiri */}
                    {saleScent !== "Hanya Botol" && (
                      <div className="sm:col-span-2">
                        <label className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3 cursor-pointer hover:bg-slate-100/70 transition-colors">
                          <input
                            type="checkbox"
                            checked={saleNoBottle}
                            disabled={saleBottleSize === "None"}
                            onChange={(e) => {
                              setSaleNoBottle(e.target.checked);
                            }}
                            className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded cursor-pointer mt-0.5"
                          />
                          <div className="text-left">
                            <span className={`text-xs font-bold ${saleBottleSize === "None" ? "text-slate-400" : "text-slate-700"}`}>
                              Tanpa Potong Stok Botol (Bawa Botol Sendiri / Refill)
                            </span>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                              {saleBottleSize === "None" 
                                ? "Pilih ukuran botol di atas terlebih dahulu jika ingin mengaktifkan perhitungan selisih sisa untuk pengurangan stok Absolut."
                                : "Mengaktifkan ini akan membuat stok botol fisik toko TIDAK berkurang dan harga botol Rp 0 (Gratis/Bawa Sendiri). Stok Absolut akan tetap berkurang secara akurat berdasarkan selisih kapasitas botol dikurangi volume bibit."}
                            </p>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Tambah ke Daftar Item Belanja Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const isHanyaBotol = saleScent === "Hanya Botol";
                        if (!saleScent) {
                          showToast("Harap pilih nama aroma!", "error");
                          return;
                        }
                        if (!isHanyaBotol && saleVolume <= 0) {
                          showToast("Volume bibit harus di atas 0 ml!", "error");
                          return;
                        }
                        if (isHanyaBotol && saleBottleSize === "None") {
                          showToast("Harap pilih ukuran botol jika hanya membeli botol!", "error");
                          return;
                        }
                        if (saleBottleCount <= 0) {
                          showToast("Jumlah botol minimal 1!", "error");
                          return;
                        }

                        // Add to state
                        const newItem: SaleItem = {
                          id: "item_" + Math.random().toString(36).substring(2, 9),
                          scentName: saleScent,
                          volumeMl: isHanyaBotol ? 0 : saleVolume,
                          bottleSize: saleBottleSize,
                          bottleType: saleBottleSize !== "None" ? saleBottleType : undefined,
                          bottleCount: saleBottleCount,
                          noBottleStockDeduct: saleNoBottle
                        };

                        setSaleItems(prev => [...prev, newItem]);
                        showToast(`Berhasil menambahkan ${saleScent} ke daftar belanja!`, "success");

                        // Reset item inputs while keeping customer name etc
                        setSaleScent("");
                        setSaleVolume(0);
                        setSaleBottleCount(1);
                        setSaleNoBottle(false);
                      }}
                      className="w-full bg-emerald-50 hover:bg-emerald-100/80 active:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl py-3 px-4 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow"
                    >
                      <Plus className="h-4 w-4" />
                      Tambah ke Daftar Item Belanja
                    </button>
                  </div>

                  {/* Daftar Item Belanja (Cart List) */}
                  {saleItems.length > 0 && (
                    <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                          <ShoppingBag className="h-4 w-4 text-emerald-600" />
                          Daftar Item Belanja ({saleItems.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSaleItems([]);
                            showToast("Daftar item belanja dibersihkan.", "success");
                          }}
                          className="text-[10px] text-red-500 hover:text-red-700 font-bold hover:underline cursor-pointer"
                        >
                          Hapus Semua
                        </button>
                      </div>
                      
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {saleItems.map((item, idx) => {
                          const isHB = item.scentName === "Hanya Botol";
                          const matchedPrice = prices.find(p => p.scentName === item.scentName);
                          const pPerMl = matchedPrice ? matchedPrice.pricePerMl : 0;
                          let bFee = 0;
                          if (item.bottleSize !== "None") {
                            const matchedB = bottleSizes.find(b => b.size === item.bottleSize);
                            if (matchedB) bFee = matchedB.price;
                          }
                          if (item.noBottleStockDeduct || saleDiscountType === "free_bottle") {
                            bFee = 0;
                          }
                          const itemCost = ((item.volumeMl * pPerMl) + bFee) * item.bottleCount;

                          return (
                            <div key={item.id || idx} className="flex items-center justify-between bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:shadow transition-shadow">
                              <div className="text-left space-y-1">
                                <div className="text-xs font-bold text-slate-800">
                                  {item.scentName}
                                </div>
                                <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-2 gap-y-0.5">
                                  {!isHB && <span>Vol: <strong className="text-slate-700">{item.volumeMl}ml</strong></span>}
                                  <span>Botol: <strong className="text-slate-700">{item.bottleSize !== "None" ? `${item.bottleSize}` : "Tanpa Botol"}</strong></span>
                                  <span>Qty: <strong className="text-slate-700">{item.bottleCount}x</strong></span>
                                  {item.noBottleStockDeduct && <span className="bg-amber-50 text-amber-700 px-1 py-0.5 rounded text-[8px] font-bold">Bawa Botol</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-700">
                                  {formatRupiah(itemCost)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSaleItems(prev => prev.filter(it => it.id !== item.id));
                                    showToast(`Menghapus ${item.scentName} dari daftar belanja.`);
                                  }}
                                  className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Optional Description / Memo */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Keterangan / Catatan Transaksi (Opsional)</label>
                    <input
                      id="sales-desc-input"
                      type="text"
                      placeholder="Contoh: Pesanan aroma soft, campur Absolut standar..."
                      value={saleDescription}
                      onChange={(e) => setSaleDescription(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                    />
                  </div>

                  {/* Discount Section */}
                  <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4 space-y-3">
                    <label className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                      Promo & Diskon Transaksi (Opsional)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSaleDiscountType("none");
                          setSaleDiscountNominal(0);
                        }}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                          saleDiscountType === "none"
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        Tanpa Diskon
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSaleDiscountType("free_bottle");
                          setSaleDiscountNominal(0);
                        }}
                        disabled={saleBottleSize === "None" || saleNoBottle}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                          (saleBottleSize === "None" || saleNoBottle)
                            ? "opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200"
                            : saleDiscountType === "free_bottle"
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-emerald-700 border-emerald-200 hover:bg-slate-50"
                        }`}
                        title={saleNoBottle ? "Harga botol sudah Rp 0" : saleBottleSize === "None" ? "Hanya tersedia jika menggunakan kemasan botol" : ""}
                      >
                        Gratis Botol
                      </button>
                      <button
                        type="button"
                        onClick={() => setSaleDiscountType("nominal")}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                          saleDiscountType === "nominal"
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        Potongan (Rp)
                      </button>
                    </div>

                    {saleDiscountType === "nominal" && (
                      <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nominal Potongan Harga (Rupiah)</label>
                        <input
                          id="sales-discount-input"
                          type="number"
                          placeholder="Contoh: 10000"
                          value={saleDiscountNominal || ""}
                          onChange={(e) => setSaleDiscountNominal(Math.max(0, Number(e.target.value)))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                        />
                      </div>
                    )}
                  </div>

                  {/* Calculations & Total Display Box */}
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-center sm:text-left w-full sm:w-auto">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Rincian Perhitungan Nota</span>
                      <div className="space-y-1.5 text-xs text-slate-600 font-medium max-w-sm">
                        {saleScent ? (
                          <div className="flex justify-between gap-6">
                            <span>Bibit {saleScent} ({saleVolume}ml x {saleBottleCount}):</span>
                            <span className="font-mono text-slate-800">
                              {formatRupiah(saleVolume * (prices.find(p => p.scentName === saleScent)?.pricePerMl || 0) * saleBottleCount)}
                            </span>
                          </div>
                        ) : (
                          <div className="text-rose-500 italic">-- Belum pilih aroma --</div>
                        )}

                        {saleBottleSize !== "None" && (
                          <div className="flex justify-between gap-6">
                            <span>
                              {saleNoBottle 
                                ? `Bawa Botol Sendiri (${saleBottleSize} x ${saleBottleCount} pcs):` 
                                : `Botol ${saleBottleSize} (${saleBottleCount} pcs):`
                              }
                            </span>
                            <span className="font-mono text-slate-800">
                              {saleNoBottle ? "Rp 0 (Bawa Sendiri)" : formatRupiah((bottleSizes.find(b => b.size === saleBottleSize)?.price || 0) * saleBottleCount)}
                            </span>
                          </div>
                        )}

                        <div className="border-t border-slate-200 pt-1.5 flex justify-between gap-6 font-bold text-slate-700">
                          <span>Subtotal:</span>
                          <span className="font-mono">
                            {formatRupiah(
                              (saleScent ? saleVolume * (prices.find(p => p.scentName === saleScent)?.pricePerMl || 0) * saleBottleCount : 0) +
                              (saleBottleSize !== "None" && !saleNoBottle ? (bottleSizes.find(b => b.size === saleBottleSize)?.price || 0) * saleBottleCount : 0)
                            )}
                          </span>
                        </div>

                        {((saleDiscountType === "free_bottle" && (bottleSizes.find(b => b.size === saleBottleSize)?.price || 0) * saleBottleCount > 0) ||
                          (saleDiscountType === "nominal" && saleDiscountNominal > 0)) && (
                          <div className="flex justify-between gap-6 text-emerald-600 font-bold bg-emerald-50/50 border border-emerald-100/30 rounded-lg p-1.5">
                            <span className="flex items-center gap-1">
                              <span>🎁</span>
                              <span>
                                {saleClaimPromo 
                                  ? "Klaim Promo Loyalitas:" 
                                  : saleDiscountType === "free_bottle" 
                                  ? "Diskon Gratis Botol:" 
                                  : "Potongan Harga (Diskon):"
                                }
                              </span>
                            </span>
                            <span className="font-mono">
                              -{formatRupiah(saleDiscountType === "free_bottle" ? (bottleSizes.find(b => b.size === saleBottleSize)?.price || 0) * saleBottleCount : saleDiscountNominal)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-center sm:text-right bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-2.5 w-full sm:w-auto shrink-0">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Total Penjualan</span>
                      <p className="text-xl font-mono font-black text-emerald-700 leading-tight">
                        {formatRupiah(saleTotalPrice)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      id="submit-sale-btn"
                      type="submit"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Check className="h-4.5 w-4.5" />
                      SIMPAN & PROSES TRANSAKSI PENJUALAN
                    </button>
                    {lastSaleTx && (
                      <button
                        type="button"
                        onClick={() => setPrintTx(lastSaleTx)}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-extrabold py-3.5 px-5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        title="Cetak ulang invoice transaksi penjualan terakhir"
                      >
                        <Printer className="h-4.5 w-4.5 text-emerald-400" />
                        PRINT INVOICE TERAKHIR
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Daftar Penjualan Terbaru & Cetak Ulang Cepat */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Printer className="h-4.5 w-4.5 text-emerald-600" />
                      Daftar Penjualan Terbaru (Print Preview & Cetak)
                    </h3>
                    <p className="text-[11px] text-slate-500">Pilih transaksi di bawah untuk menampilkan nota fisik serta melakukan cetak.</p>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-extrabold px-2.5 py-1 rounded-full border border-emerald-100 uppercase tracking-wider shrink-0 self-start sm:self-center">
                    POS Terkoneksi Real-Time
                  </span>
                </div>

                {/* Filter Panel */}
                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Filter className="h-4 w-4 text-emerald-600" />
                    Filter & Cari Data Penjualan
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Search Input */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cari Kata Kunci</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Masukkan kata kunci..."
                          value={salesSearchTerm}
                          onChange={(e) => setSalesSearchTerm(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-medium"
                        />
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      </div>
                    </div>

                    {/* Column Selector */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Berdasarkan Kolom</label>
                      <select
                        value={salesSearchColumn}
                        onChange={(e) => setSalesSearchColumn(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-bold cursor-pointer"
                      >
                        <option value="all">Semua Kolom</option>
                        <option value="customerName">Nama Pelanggan</option>
                        <option value="scentName">Aroma Parfum</option>
                        <option value="bottle">Botol / Kemasan</option>
                        <option value="totalPrice">Total Bayar (Nominal)</option>
                      </select>
                    </div>

                    {/* Case Sensitive Switch */}
                    <div className="flex items-end pb-0.5">
                      <button
                        type="button"
                        onClick={() => setSalesSearchCaseSensitive(!salesSearchCaseSensitive)}
                        className={`w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all border cursor-pointer select-none ${
                          salesSearchCaseSensitive 
                            ? "bg-rose-50 text-rose-700 border-rose-200 shadow-sm" 
                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${salesSearchCaseSensitive ? "bg-rose-500 animate-pulse" : "bg-slate-300"}`} />
                        Aa Sensitif Huruf
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    {/* Dari Tanggal */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dari Tanggal</label>
                      <input
                        type="date"
                        value={salesFilterStartDate}
                        onChange={(e) => setSalesFilterStartDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                      />
                    </div>

                    {/* Sampai Tanggal */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sampai Tanggal</label>
                      <input
                        type="date"
                        value={salesFilterEndDate}
                        onChange={(e) => setSalesFilterEndDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                      />
                    </div>

                    {/* Bulan */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bulan</label>
                      <select
                        value={salesFilterMonth}
                        onChange={(e) => setSalesFilterMonth(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 cursor-pointer font-medium"
                      >
                        <option value="">Semua Bulan</option>
                        <option value="01">Januari</option>
                        <option value="02">Februari</option>
                        <option value="03">Maret</option>
                        <option value="04">April</option>
                        <option value="05">Mei</option>
                        <option value="06">Juni</option>
                        <option value="07">Juli</option>
                        <option value="08">Agustus</option>
                        <option value="09">September</option>
                        <option value="10">Oktober</option>
                        <option value="11">November</option>
                        <option value="12">Desember</option>
                      </select>
                    </div>

                    {/* Tahun */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tahun</label>
                      <div className="flex gap-2">
                        <select
                          value={salesFilterYear}
                          onChange={(e) => setSalesFilterYear(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 cursor-pointer font-medium"
                        >
                          <option value="">Semua Tahun</option>
                          <option value="2024">2024</option>
                          <option value="2025">2025</option>
                          <option value="2026">2026</option>
                          <option value="2027">2027</option>
                          <option value="2028">2028</option>
                        </select>
                        {(salesSearchTerm || salesFilterStartDate || salesFilterEndDate || salesFilterMonth || salesFilterYear) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSalesSearchTerm("");
                              setSalesSearchColumn("all");
                              setSalesSearchCaseSensitive(false);
                              setSalesFilterStartDate("");
                              setSalesFilterEndDate("");
                              setSalesFilterMonth("");
                              setSalesFilterYear("");
                            }}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 p-1.5 rounded-lg border border-rose-200 text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center shrink-0"
                            title="Reset Filter"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                        <th className="py-2.5 px-4">Waktu Transaksi</th>
                        <th className="py-2.5 px-4">Nama Pelanggan</th>
                        <th className="py-2.5 px-4">Aroma Parfum & Takaran</th>
                        <th className="py-2.5 px-4">Botol</th>
                        <th className="py-2.5 px-4">Total Bayar</th>
                        <th className="py-2.5 px-4 text-center">Aksi Nota</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const filteredSales = [...transactions]
                          .filter(t => t.type === "sale")
                          .filter(t => {
                            // 1. Text search filter
                            if (salesSearchTerm) {
                              const term = salesSearchCaseSensitive ? salesSearchTerm : salesSearchTerm.toLowerCase();
                              
                              // Customer Name
                              const cust = t.customerName ? (salesSearchCaseSensitive ? t.customerName : t.customerName.toLowerCase()) : "pelanggan umum";
                              
                              // Scent Name (flat & items)
                              const scents: string[] = [];
                              if (t.scentName) scents.push(t.scentName);
                              if (t.items) t.items.forEach(it => { if (it.scentName) scents.push(it.scentName); });
                              const scentMatch = scents.some(s => salesSearchCaseSensitive ? s.includes(term) : s.toLowerCase().includes(term));
                              
                              // Bottle Size (flat & items)
                              const bottles: string[] = [];
                              if (t.bottleSize && t.bottleSize !== "None") bottles.push(t.bottleSize);
                              if (t.items) t.items.forEach(it => { if (it.bottleSize && it.bottleSize !== "None") bottles.push(it.bottleSize); });
                              const bottleMatch = bottles.some(b => salesSearchCaseSensitive ? b.includes(term) : b.toLowerCase().includes(term));
                              
                              // Total Price
                              const priceStr = t.totalPrice.toString();
                              const priceMatch = priceStr.includes(term);

                              // General search check
                              if (salesSearchColumn === "all") {
                                const matchesAny = cust.includes(term) || scentMatch || bottleMatch || priceMatch || t.id.includes(term);
                                if (!matchesAny) return false;
                              } else if (salesSearchColumn === "customerName") {
                                if (!cust.includes(term)) return false;
                              } else if (salesSearchColumn === "scentName") {
                                if (!scentMatch) return false;
                              } else if (salesSearchColumn === "bottle") {
                                if (!bottleMatch) return false;
                              } else if (salesSearchColumn === "totalPrice") {
                                if (!priceMatch) return false;
                              }
                            }

                            // 2. Date/Month/Year filters
                            const txDate = new Date(t.date);
                            const txDateStr = t.date.substring(0, 10); // "YYYY-MM-DD"
                            
                            if (salesFilterStartDate && txDateStr < salesFilterStartDate) {
                              return false;
                            }
                            if (salesFilterEndDate && txDateStr > salesFilterEndDate) {
                              return false;
                            }

                            // Month Filter (01 - 12)
                            if (salesFilterMonth) {
                              const txMonth = (txDate.getMonth() + 1).toString().padStart(2, "0"); // "01" - "12"
                              if (txMonth !== salesFilterMonth) {
                                return false;
                              }
                            }

                            // Year Filter (YYYY)
                            if (salesFilterYear) {
                              const txYear = txDate.getFullYear().toString(); // "2026" etc
                              if (txYear !== salesFilterYear) {
                                return false;
                              }
                            }

                            return true;
                          })
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                        const hasFilter = salesSearchTerm || salesFilterStartDate || salesFilterEndDate || salesFilterMonth || salesFilterYear;
                        const displayList = hasFilter ? filteredSales : filteredSales.slice(0, 5);

                        if (displayList.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                                {hasFilter 
                                  ? "Tidak ada transaksi penjualan yang cocok dengan kriteria pencarian." 
                                  : "Belum ada transaksi penjualan yang tercatat."}
                              </td>
                            </tr>
                          );
                        }

                        return displayList.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 px-4 font-semibold text-slate-500">
                              {new Date(t.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} - {new Date(t.date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-slate-700">
                              {t.customerName || "Pelanggan Umum"}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-slate-800">
                              {t.items && t.items.length > 0 ? (
                                <div className="space-y-1">
                                  {t.items.map((it, idx) => (
                                    <div key={it.id || idx} className="text-xs">
                                      <span className="font-bold text-slate-800">{it.scentName}</span>{" "}
                                      <span className="text-slate-400 font-normal">({it.volumeMl}ml)</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <>
                                  {t.scentName} <span className="text-slate-400 font-normal">({t.volumeMl}ml)</span>
                                </>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-slate-600 font-medium">
                              {t.items && t.items.length > 0 ? (
                                <div className="space-y-1">
                                  {t.items.map((it, idx) => (
                                    <div key={it.id || idx} className="text-xs text-slate-500">
                                      {it.bottleSize !== "None" 
                                        ? `${it.noBottleStockDeduct ? "Bawa" : `Botol ${it.bottleType || "Kaca"}`} ${it.bottleSize} (${it.bottleCount}x)` 
                                        : "Hanya Bibit"
                                      }
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                t.bottleSize !== "None" ? `Botol ${t.bottleType || "Kaca"} ${t.bottleSize} (${t.bottleCount}x)` : "Hanya Bibit"
                              )}
                            </td>
                            <td className="py-2.5 px-4 font-mono font-bold text-emerald-700">
                              {formatRupiah(t.totalPrice)}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => setPrintTx(t)}
                                className="bg-slate-900 hover:bg-emerald-600 hover:text-white text-slate-300 font-extrabold py-1.5 px-3.5 rounded-xl text-[10px] transition-all flex items-center gap-1.5 mx-auto cursor-pointer shadow-sm"
                                title="Buka Print Preview & Cetak"
                              >
                                <Printer className="h-3 w-3 text-emerald-400" />
                                Preview & Cetak
                              </button>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ==========================================
              5. CATAT BELANJA STOK (Admin Only)
              ========================================== */}
          {activeTab === "purchases" && userRole === "admin" && (
            <div className="max-w-3xl mx-auto space-y-6">
              
              <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold font-display">CATAT BELANJA STOK MASTER</h2>
                    <p className="text-[11px] text-slate-400">Pembelian baru yang menambah stok bibit/botol/Absolut, mengurangi kas toko</p>
                  </div>
                  <span className="text-[11px] font-mono bg-rose-600/20 text-rose-400 border border-rose-500/30 font-bold px-2 py-1 rounded">
                    Uang Keluar (Kredit)
                  </span>
                </div>

                <form onSubmit={handlePurchaseSubmit} className="p-6 space-y-5">
                  
                  {/* Category select */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kategori Pembelian Barang</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(["bibit", "botol", "alkohol", "other"] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setPurchaseCategory(cat)}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all uppercase tracking-wider ${
                            purchaseCategory === cat 
                              ? "bg-slate-900 text-white border-slate-900" 
                              : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {cat === "alkohol" ? "absolut" : cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Category specific fields */}
                    {purchaseCategory === "bibit" && (
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Aroma Bibit Parfum (Pilih dari Master atau Ketik Baru)</label>
                        <div className="relative">
                          <input
                            id="purchase-scent-input"
                            type="text"
                            placeholder="Ketik untuk mencari atau menambah aroma..."
                            value={purchaseScent}
                            onChange={(e) => setPurchaseScent(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
                          />
                          {purchaseScent && (
                            <button
                              type="button"
                              onClick={() => setPurchaseScent("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        
                        {/* Quick filter selection area */}
                        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-emerald-600" />
                            Aroma Terdaftar di Sistem (Klik untuk Pilih):
                          </span>
                          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                            {prices
                              .filter(p => !purchaseScent || p.scentName.toLowerCase().includes(purchaseScent.toLowerCase()))
                              .map(p => (
                                <button
                                  key={p.scentName}
                                  type="button"
                                  onClick={() => setPurchaseScent(p.scentName)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                    purchaseScent.toLowerCase() === p.scentName.toLowerCase()
                                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                      : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40"
                                  }`}
                                >
                                  {p.scentName}
                                </button>
                              ))}
                            {prices.filter(p => !purchaseScent || p.scentName.toLowerCase().includes(purchaseScent.toLowerCase())).length === 0 && (
                              <div className="text-[10px] text-amber-600 font-bold flex items-center gap-1.5 py-0.5">
                                <Info className="h-3.5 w-3.5 text-amber-500" />
                                <span>Aroma baru: "{purchaseScent}" (Akan otomatis didaftarkan ke sistem)</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {purchaseCategory === "alkohol" && (
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Jenis Cairan Absolut</label>
                        <select
                          value={purchaseScent || "Absolut Cair"}
                          onChange={(e) => setPurchaseScent(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800 font-semibold cursor-pointer"
                          required
                        >
                          <option value="Absolut Cair">Absolut Cair</option>
                          <option value="Absolut Gel">Absolut Gel</option>
                        </select>
                      </div>
                    )}

                    {purchaseCategory === "botol" && (
                      <div className="space-y-3 sm:col-span-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ukuran Botol Kosong</label>
                          <div className="flex gap-2">
                            <select
                              id="purchase-bottle-select"
                              value={purchaseBottleSize}
                              onChange={(e) => {
                                setPurchaseBottleSize(e.target.value);
                                const matchedB = bottleSizes.find(b => b.size === e.target.value);
                                if (matchedB && purchaseCount > 0) {
                                  const unitCost = purchaseBottleType === "Plastik"
                                    ? (matchedB.purchasePricePlastik ?? 3000)
                                    : (matchedB.purchasePriceKaca ?? 5000);
                                  setPurchasePrice(unitCost * purchaseCount);
                                }
                              }}
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
                            >
                              {bottleSizes.map((b) => (
                                <option key={b.id} value={b.size}>Botol {b.size}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setShowAddBottleSize(!showAddBottleSize)}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl px-3 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                              title="Tambah Ukuran Botol Baru"
                            >
                              <Plus className="h-4 w-4" />
                              <span className="hidden sm:inline">Ukuran Baru</span>
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bahan Botol Belanja</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setPurchaseBottleType("Kaca");
                                const matchedB = bottleSizes.find(b => b.size === purchaseBottleSize);
                                if (matchedB && purchaseCount > 0) {
                                  setPurchasePrice((matchedB.purchasePriceKaca ?? 5000) * purchaseCount);
                                }
                              }}
                              className={`py-2 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                                purchaseBottleType === "Kaca"
                                  ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              Botol Kaca
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPurchaseBottleType("Plastik");
                                const matchedB = bottleSizes.find(b => b.size === purchaseBottleSize);
                                if (matchedB && purchaseCount > 0) {
                                  setPurchasePrice((matchedB.purchasePricePlastik ?? 3000) * purchaseCount);
                                }
                              }}
                              className={`py-2 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                                purchaseBottleType === "Plastik"
                                  ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              Botol Plastik
                            </button>
                          </div>
                        </div>

                        {showAddBottleSize && (
                          <div className="mt-3 bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-3">
                            <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Tambah Ukuran Botol Baru</span>
                            
                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                <label className="block text-[10px] text-slate-400 mb-0.5 font-semibold">Nama Ukuran</label>
                                <input
                                  type="text"
                                  placeholder="Contoh: 60ml"
                                  value={newBottleSize}
                                  onChange={(e) => setNewBottleSize(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] text-slate-400 mb-0.5 font-semibold">Harga Jual Kaca (Rp)</label>
                                  <input
                                    type="number"
                                    placeholder="Contoh: 18000"
                                    value={newBottlePriceKaca || ""}
                                    onChange={(e) => setNewBottlePriceKaca(Number(e.target.value))}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-400 mb-0.5 font-semibold">Harga Jual Plastik (Rp)</label>
                                  <input
                                    type="number"
                                    placeholder="Contoh: 12000"
                                    value={newBottlePricePlastik || ""}
                                    onChange={(e) => setNewBottlePricePlastik(Number(e.target.value))}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] text-slate-400 mb-0.5 font-semibold">Harga Belanja Kaca (Rp)</label>
                                  <input
                                    type="number"
                                    placeholder="Contoh: 8000"
                                    value={newBottlePurchasePriceKaca || ""}
                                    onChange={(e) => setNewBottlePurchasePriceKaca(Number(e.target.value))}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-slate-400 mb-0.5 font-semibold">Harga Belanja Plastik (Rp)</label>
                                  <input
                                    type="number"
                                    placeholder="Contoh: 5000"
                                    value={newBottlePurchasePricePlastik || ""}
                                    onChange={(e) => setNewBottlePurchasePricePlastik(Number(e.target.value))}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 justify-end pt-1">
                              <button
                                type="button"
                                onClick={handleAddNewBottleSize}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-3 rounded-lg text-[11px] transition-colors cursor-pointer"
                              >
                                Tambah
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAddBottleSize(false);
                                  setNewBottleSize("");
                                  setNewBottlePriceKaca(0);
                                  setNewBottlePricePlastik(0);
                                  setNewBottlePurchasePriceKaca(0);
                                  setNewBottlePurchasePricePlastik(0);
                                }}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-1.5 px-3 rounded-lg text-[11px] transition-colors cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {(purchaseCategory === "bibit" || purchaseCategory === "alkohol") && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Volume Tambah (ml)</label>
                        <input
                          id="purchase-volume-input"
                          type="number"
                          placeholder="Masukkan volume cairan (ml)"
                          value={purchaseVolume || ""}
                          onChange={(e) => setPurchaseVolume(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>
                    )}

                    {purchaseCategory === "botol" && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Jumlah Botol Baru (Unit)</label>
                        <input
                          id="purchase-count-input"
                          type="number"
                          placeholder="Contoh: 100"
                          value={purchaseCount || ""}
                          onChange={(e) => setPurchaseCount(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>
                    )}

                    {/* Total spent on purchase */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Biaya Belanja (Rupiah)</label>
                      <input
                        id="purchase-total-price-input"
                        type="number"
                        placeholder="Contoh: 1250000"
                        value={purchasePrice || ""}
                        onChange={(e) => setPurchasePrice(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Keterangan / Memo */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Keterangan / Catatan Belanja (Opsional)</label>
                    <input
                      id="purchase-desc-input"
                      type="text"
                      placeholder="Contoh: Belanja bibit ke agen parfum utama Jakarta..."
                      value={purchaseDesc}
                      onChange={(e) => setPurchaseDesc(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-950 flex gap-3 leading-relaxed">
                    <Info className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <span className="font-bold">Keamanan Finansial:</span> Transaksi belanja ini memerlukan ketersediaan uang di kas utama toko. Nilai kas besar akan langsung dipotong secara otomatis sebesar total pengeluaran belanja yang dimasukkan.
                    </div>
                  </div>

                  <button
                    id="submit-purchase-btn"
                    type="submit"
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ArrowDownRight className="h-4.5 w-4.5" />
                    SIMPAN & PROSES PENAMBAHAN STOK BELANJA
                  </button>
                </form>
              </div>

              {/* Riwayat Detail Belanja Stok */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                <div className="bg-slate-950 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-extrabold font-display uppercase tracking-wider flex items-center gap-2">
                      <Activity className="h-4.5 w-4.5 text-rose-500" />
                      Riwayat Detail Belanja Stok
                    </h2>
                    <p className="text-[10px] text-slate-400">Log mutasi pembelanjaan inventori dan penambahan stok master.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700/60 px-2.5 py-1 rounded-full">
                      {transactions.filter(t => t.type === "purchase").length} Pembelian Total
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Filters Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 border border-slate-200/60 p-4 rounded-xl">
                    {/* Search bar */}
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cari Aroma / Memo</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Cari kata kunci..."
                          value={purchaseSearchTerm}
                          onChange={(e) => setPurchaseSearchTerm(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                        />
                        <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      </div>
                    </div>

                    {/* Category Filter */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kategori Barang</label>
                      <select
                        value={purchaseListCategoryFilter}
                        onChange={(e) => setPurchaseListCategoryFilter(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                      >
                        <option value="all">Semua Kategori</option>
                        <option value="bibit">Bibit Parfum</option>
                        <option value="botol">Botol Kosong</option>
                        <option value="alkohol">Absolut</option>
                        <option value="other">Lain-lain</option>
                      </select>
                    </div>

                    {/* Start Date */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dari Tanggal</label>
                      <input
                        type="date"
                        value={purchaseFilterStartDate}
                        onChange={(e) => setPurchaseFilterStartDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                      />
                    </div>

                    {/* End Date */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sampai Tanggal</label>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={purchaseFilterEndDate}
                          onChange={(e) => setPurchaseFilterEndDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                        />
                        {(purchaseSearchTerm || purchaseListCategoryFilter !== "all" || purchaseFilterStartDate || purchaseFilterEndDate) && (
                          <button
                            type="button"
                            onClick={() => {
                              setPurchaseSearchTerm("");
                              setPurchaseListCategoryFilter("all");
                              setPurchaseFilterStartDate("");
                              setPurchaseFilterEndDate("");
                            }}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 p-1.5 rounded-lg border border-rose-200 text-[11px] font-bold transition-all cursor-pointer"
                            title="Reset Filter"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Filter Summaries / Cost Aggregate */}
                  {(() => {
                    const filtered = transactions
                      .filter(t => t.type === "purchase")
                      .filter(t => {
                        if (purchaseListCategoryFilter && purchaseListCategoryFilter !== "all" && t.category !== purchaseListCategoryFilter) return false;
                        if (purchaseSearchTerm) {
                          const term = purchaseSearchTerm.toLowerCase();
                          const scent = t.scentName ? t.scentName.toLowerCase() : "";
                          const desc = t.description ? t.description.toLowerCase() : "";
                          const idStr = t.id.toLowerCase();
                          const op = t.operatorEmail.toLowerCase();
                          if (!scent.includes(term) && !desc.includes(term) && !idStr.includes(term) && !op.includes(term)) return false;
                        }
                        const itemDateOnly = t.date.substring(0, 10);
                        if (purchaseFilterStartDate && itemDateOnly < purchaseFilterStartDate) return false;
                        if (purchaseFilterEndDate && itemDateOnly > purchaseFilterEndDate) return false;
                        return true;
                      })
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    const totalCost = filtered.reduce((sum, t) => sum + t.totalPrice, 0);
                    const totalBibitVol = filtered.filter(t => t.category === "bibit").reduce((sum, t) => sum + (t.volumeMl || 0), 0);
                    const totalBotolCount = filtered.filter(t => t.category === "botol").reduce((sum, t) => sum + (t.bottleCount || 0), 0);
                    const totalAlkoholVol = filtered.filter(t => t.category === "alkohol").reduce((sum, t) => sum + (t.volumeMl || 0), 0);

                    return (
                      <div className="space-y-4">
                        {/* Summary Widgets */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3">
                            <span className="block text-[9px] font-bold text-rose-800 uppercase tracking-wider">Total Biaya Belanja</span>
                            <div className="text-sm font-extrabold text-rose-950 font-mono mt-1">
                              {formatRupiah(totalCost)}
                            </div>
                            <span className="text-[9px] text-rose-600 mt-0.5 block">{filtered.length} transaksi terfilter</span>
                          </div>
                          
                          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3">
                            <span className="block text-[9px] font-bold text-emerald-800 uppercase tracking-wider">Volume Bibit Parfum</span>
                            <div className="text-sm font-extrabold text-emerald-950 font-mono mt-1">
                              {totalBibitVol.toLocaleString("id-ID")} ml
                            </div>
                            <span className="text-[9px] text-emerald-600 mt-0.5 block">Dari kategori bibit</span>
                          </div>

                          <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3">
                            <span className="block text-[9px] font-bold text-amber-800 uppercase tracking-wider">Jumlah Botol Masuk</span>
                            <div className="text-sm font-extrabold text-amber-950 font-mono mt-1">
                              {totalBotolCount.toLocaleString("id-ID")} unit
                            </div>
                            <span className="text-[9px] text-amber-600 mt-0.5 block">Dari kategori botol</span>
                          </div>

                          <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-3">
                            <span className="block text-[9px] font-bold text-teal-800 uppercase tracking-wider">Volume Absolut Masuk</span>
                            <div className="text-sm font-extrabold text-teal-950 font-mono mt-1">
                              {totalAlkoholVol.toLocaleString("id-ID")} ml
                            </div>
                            <span className="text-[9px] text-teal-600 mt-0.5 block">Dari kategori absolut</span>
                          </div>
                        </div>

                        {/* Purchases Table */}
                        <div className="overflow-x-auto border border-slate-100 rounded-xl">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[9px] font-extrabold">
                                <th className="py-2.5 px-3">Waktu</th>
                                <th className="py-2.5 px-3">Barang & Kategori</th>
                                <th className="py-2.5 px-3">Volume/Qty</th>
                                <th className="py-2.5 px-3 text-right">Biaya Belanja</th>
                                <th className="py-2.5 px-3">Operator / Memo</th>
                                <th className="py-2.5 px-3 text-center">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filtered.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-50/40 transition-colors">
                                  <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">
                                    {new Date(t.date).toLocaleString("id-ID", {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit"
                                    })}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                        t.category === "bibit" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                        t.category === "botol" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                        t.category === "alkohol" ? "bg-teal-50 text-teal-700 border border-teal-200" :
                                        "bg-slate-50 text-slate-700 border border-slate-200"
                                      }`}>
                                        {t.category === "alkohol" ? "absolut" : t.category}
                                      </span>
                                      <span className="font-bold text-slate-800">
                                        {t.category === "bibit" ? t.scentName :
                                         t.category === "botol" ? `Botol ${t.bottleSize}` :
                                         t.category === "alkohol" ? "Cairan Absolut" : "Operasional Lain"}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 font-semibold text-slate-600">
                                    {t.category === "bibit" || t.category === "alkohol" ? `${t.volumeMl} ml` :
                                     t.category === "botol" ? `${t.bottleCount} unit` : "-"}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                                    -{formatRupiah(t.totalPrice)}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="text-[10px] font-medium text-slate-500">{t.description}</div>
                                    <span className="text-[9px] text-slate-400 font-mono">Oleh: {t.operatorEmail}</span>
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTransaction(t.id, t.description)}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 font-bold rounded text-[10px] transition-all border border-rose-100 shadow-sm cursor-pointer"
                                      title="Batalkan & Kembalikan Kas/Stok"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Hapus
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {filtered.length === 0 && (
                                <tr>
                                  <td colSpan={6} className="py-8 text-center text-slate-400 italic text-slate-400">
                                    Tidak ada data belanja yang cocok dengan filter saat ini.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

            </div>
          )}

          {/* ==========================================
              6. AKUNTANSI & KAS BESAR (Admin Only)
              ========================================== */}
          {activeTab === "accounting" && userRole === "admin" && (
            <div className="space-y-6">
              
              {/* FILTER PERIODE & EXCEL EXPORT */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 bg-emerald-50 rounded-lg flex items-center justify-center">
                      <Filter className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Filter Laporan Kas Besar</h4>
                      <p className="text-[10px] text-slate-500">Sesuaikan rentang waktu arus kas masuk dan keluar</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 max-w-2xl">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tanggal Mulai</label>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tanggal Selesai</label>
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pilih Bulan & Tahun</label>
                      <input
                        type="month"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="flex sm:items-center gap-2">
                    <button
                      onClick={() => {
                        setFilterStartDate("");
                        setFilterEndDate("");
                        setFilterMonth("");
                        showToast("Filter berhasil dibersihkan.");
                      }}
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Reset Filter"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reset
                    </button>

                    <button
                      onClick={exportBukuKasToExcel}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-100" />
                      Export Excel
                    </button>
                  </div>
                </div>
              </div>

              {/* Accounting summary metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">Arus Kas Masuk (Debit)</span>
                  <p className="text-base sm:text-lg xl:text-xl font-bold font-mono text-emerald-600 mt-1 truncate" title={formatRupiah(totalSales)}>{formatRupiah(totalSales)}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">Belanja Stok (Kredit)</span>
                  <p className="text-base sm:text-lg xl:text-xl font-bold font-mono text-rose-600 mt-1 truncate" title={formatRupiah(totalPurchases)}>{formatRupiah(totalPurchases)}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">Beban Gaji (Kredit)</span>
                  <p className="text-base sm:text-lg xl:text-xl font-bold font-mono text-amber-600 mt-1 truncate" title={formatRupiah(totalSalaries)}>{formatRupiah(totalSalaries)}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">Sisa Saldo Kas Riil</span>
                  <p className="text-base sm:text-lg xl:text-xl font-bold font-mono text-slate-900 mt-1 truncate" title={formatRupiah(cashBalance)}>{formatRupiah(cashBalance)}</p>
                </div>
              </div>

              {/* Master Gaji & Modal Awal */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Column 1: Forms */}
                <div className="space-y-6 lg:col-span-1">
                  
                  {/* EDIT/INPUT MODAL AWAL */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
                      <Coins className="h-4.5 w-4.5 text-emerald-600" />
                      Atur Modal Awal Toko
                    </h3>
                    <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">
                      Edit saldo modal awal Kas Besar yang diinput saat inisialisasi toko. Perubahan akan menyesuaikan sisa saldo berjalan secara otomatis.
                    </p>
                    <form onSubmit={handleInitialCapitalSubmit} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nominal Modal Awal (Rp)</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                          <input
                            type="number"
                            placeholder="Contoh: 15000000"
                            value={inputInitialCapital || ""}
                            onChange={(e) => setInputInitialCapital(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-slate-950 hover:bg-slate-900 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Save className="h-3.5 w-3.5" />
                        SIMPAN PERUBAHAN MODAL AWAL
                      </button>
                    </form>
                  </div>

                  {/* Pay Salary form */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
                      <UserPlus className="h-4.5 w-4.5 text-emerald-600" />
                      Bayar Gaji Karyawan
                    </h3>

                    <form onSubmit={handleSalarySubmit} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Lengkap Karyawan</label>
                        <input
                          id="salary-employee-input"
                          type="text"
                          placeholder="Contoh: Budi Cahyono, Siti Aminah"
                          value={salEmployee}
                          onChange={(e) => setSalEmployee(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bulan Gaji</label>
                        <input
                          id="salary-month-input"
                          type="text"
                          placeholder="Contoh: Juli 2026, Agustus 2026"
                          value={salMonth}
                          onChange={(e) => setSalMonth(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nominal Gaji (Rp)</label>
                        <input
                          id="salary-amount-input"
                          type="number"
                          placeholder="Contoh: 1500000"
                          value={salAmount || ""}
                          onChange={(e) => setSalAmount(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Catatan Tambahan (Opsional)</label>
                        <input
                          id="salary-notes-input"
                          type="text"
                          placeholder="Gaji pokok + bonus kehadiran..."
                          value={salNotes}
                          onChange={(e) => setSalNotes(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>

                      <button
                        id="save-salary-btn"
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        Proses Pembayaran Gaji
                      </button>
                    </form>
                  </div>
                </div>

                {/* Salaries Paid Master Table */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
                  <h3 className="font-bold text-sm text-slate-900 mb-1">Master Riwayat Gaji Terbayar</h3>
                  <p className="text-[11px] text-slate-500 mb-4">Daftar beban gaji karyawan yang otomatis mengurangi perhitungan laba bersih toko.</p>

                  <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                          <th className="py-3 px-4">Nama Karyawan</th>
                          <th className="py-3 px-4">Bulan Periode</th>
                          <th className="py-3 px-4 text-right">Nominal Gaji</th>
                          <th className="py-3 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredSalaries.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-800">{s.employeeName}</td>
                            <td className="py-3 px-4 text-slate-500">{s.month}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatRupiah(s.amount)}</td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleDeleteSalary(s.id, s.employeeName, s.amount)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                                title="Batalkan Gaji"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredSalaries.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                              Tidak ada catatan pembayaran gaji karyawan pada periode filter ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Rincian Kas Besar Ledger Mutation */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="font-bold text-sm text-slate-900 mb-1">Mutasi Buku Kas Besar</h3>
                <p className="text-[11px] text-slate-500 mb-4">Rincian mutasi uang masuk dan keluar secara kronologis untuk audit keuangan profesional.</p>

                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                        <th className="py-3 px-4">Tanggal Mutasi</th>
                        <th className="py-3 px-4">Deskripsi Mutasi</th>
                        <th className="py-3 px-4">Tipe</th>
                        <th className="py-3 px-4 text-right">Nominal</th>
                        <th className="py-3 px-4 text-right">Saldo Kas Akhir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCashLedger.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 text-slate-500 font-mono">
                            {new Date(m.date).toLocaleString("id-ID")}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">{m.description}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              m.type === "in" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}>
                              {m.type === "in" ? "DEBIT" : "KREDIT"}
                            </span>
                          </td>
                          <td className={`py-3 px-4 text-right font-mono font-bold ${
                            m.type === "in" ? "text-emerald-700" : "text-rose-700"
                          }`}>
                            {m.type === "in" ? "+" : "-"}{formatRupiah(m.amount)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatRupiah(m.balanceAfter)}</td>
                        </tr>
                      ))}
                      {filteredCashLedger.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                            Tidak ada mutasi buku kas besar pada periode filter ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ==========================================
              7. USER MANAGEMENT (Admin Only)
              ========================================== */}
          {activeTab === "users" && userRole === "admin" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Whitelist user form */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-fit">
                  <h3 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
                    <UserPlus className="h-4.5 w-4.5 text-emerald-600" />
                    Tambah & Kelola Hak Akses Toko
                  </h3>

                  <form onSubmit={handleAddClient} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tingkat Hak Akses</label>
                      <select
                        id="client-role-select"
                        value={newClientRole}
                        onChange={(e) => {
                          setNewClientRole(e.target.value as UserRole);
                          setNewClientEmail(""); // Reset input when swapping role
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
                      >
                        <option value="client">Client (Username - Hanya Input Kasir & Lihat Stok)</option>
                        <option value="reseller">Reseller Bundling (Email / Username - Dashboard Penjualan)</option>
                        <option value="admin">Admin (Email Gmail - Akses Penuh Seluruh Sistem)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        {newClientRole === "client" ? "Nama Pengguna / Username (Client)" : newClientRole === "reseller" ? "Username / Email (Reseller)" : "Alamat Email Gmail (Admin)"}
                      </label>
                      <input
                        id="client-email-input"
                        type={(newClientRole === "client" || newClientRole === "reseller") ? "text" : "email"}
                        placeholder={newClientRole === "client" ? "Contoh: budi, tika, kasir1 (tanpa spasi/@)" : newClientRole === "reseller" ? "Contoh: reseller1 atau budireseller@gmail.com" : "Contoh: adminbaru@gmail.com"}
                        value={newClientEmail}
                        onChange={(e) => setNewClientEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
                        required
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        {newClientRole === "client" 
                          ? "Penting: Masukkan username unik tanpa spasi dan tanda '@'."
                          : newClientRole === "reseller"
                          ? "Penting: Masukkan username atau email Google / Gmail untuk login reseller."
                          : "Penting: Masukkan alamat email Google / Gmail yang valid."}
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kata Sandi Akun (Min. 6 Karakter)</label>
                      <input
                        id="client-password-input"
                        type="text"
                        placeholder="Masukkan password untuk login"
                        value={newClientPassword}
                        onChange={(e) => setNewClientPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
                        required
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        {newClientRole === "client"
                          ? "Gunakan kata sandi ini agar karyawan client dapat langsung masuk menggunakan Username."
                          : "Gunakan kata sandi ini agar admin dapat login manual menggunakan email Gmail."}
                      </p>
                    </div>

                    <button
                      id="save-client-btn"
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      Daftarkan Karyawan
                    </button>
                  </form>
                </div>

                {/* Whitelist List Table */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
                  <h3 className="font-bold text-sm text-slate-900 mb-1">Daftar Whitelist Hak Akses Toko</h3>
                  <p className="text-[11px] text-slate-500 mb-4">
                    Karyawan (Client) masuk menggunakan Username, sedangkan Admin masuk menggunakan alamat email Gmail.
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                          <th className="py-3 px-4">Username / Email</th>
                          <th className="py-3 px-4">Hak Akses</th>
                          <th className="py-3 px-4">Kata Sandi</th>
                          <th className="py-3 px-4">Ditambahkan Pada</th>
                          <th className="py-3 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {userWhitelist.map((u) => (
                          <tr key={u.email} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-800">
                              {u.username ? (
                                <div className="flex flex-col">
                                  <span className="text-emerald-700">@{u.username}</span>
                                  <span className="text-[9px] text-slate-400 font-normal">Sistem: {u.email}</span>
                                </div>
                              ) : (
                                u.email
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                u.role === "admin" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-700 font-mono text-xs">
                              {u.password ? u.password : <span className="text-[10px] text-slate-400 italic">Login Google Only</span>}
                            </td>
                            <td className="py-3 px-4 text-slate-500 font-mono">
                              {new Date(u.addedAt).toLocaleDateString("id-ID")}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {u.email !== "bastikacorp@gmail.com" ? (
                                <button
                                  onClick={() => handleDeleteClient(u.email)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                                  title="Hapus Hak Akses"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-semibold italic">Owner Utama</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              8. RIWAYAT TRANSAKSI VIEW (All Whitelisted)
              ========================================== */}
          {activeTab === "history" && userRole === "admin" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Histori Kronologis Transaksi Toko</h3>
                  <p className="text-[11px] text-slate-500">Mencatat seluruh mutasi penjualan kasir dan pembelian stok yang dilakukan.</p>
                </div>
                <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-full font-semibold text-slate-600">{transactions.length} baris data</span>
              </div>

              {/* Date, Month, Year Filter Bar */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl mb-6 text-xs">
                {/* Dari Tanggal */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dari Tanggal</label>
                  <input
                    type="date"
                    value={historyFilterStartDate}
                    onChange={(e) => setHistoryFilterStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                  />
                </div>
                {/* Sampai Tanggal */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={historyFilterEndDate}
                    onChange={(e) => setHistoryFilterEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                  />
                </div>
                {/* Pilih Bulan */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bulan</label>
                  <select
                    value={historyFilterMonth}
                    onChange={(e) => setHistoryFilterMonth(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-medium cursor-pointer"
                  >
                    <option value="">Semua Bulan</option>
                    <option value="01">Januari</option>
                    <option value="02">Februari</option>
                    <option value="03">Maret</option>
                    <option value="04">April</option>
                    <option value="05">Mei</option>
                    <option value="06">Juni</option>
                    <option value="07">Juli</option>
                    <option value="08">Agustus</option>
                    <option value="09">September</option>
                    <option value="10">Oktober</option>
                    <option value="11">November</option>
                    <option value="12">Desember</option>
                  </select>
                </div>
                {/* Pilih Tahun */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tahun</label>
                  <div className="flex gap-2">
                    <select
                      value={historyFilterYear}
                      onChange={(e) => setHistoryFilterYear(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-medium cursor-pointer"
                    >
                      <option value="">Semua Tahun</option>
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                      <option value="2028">2028</option>
                    </select>
                    {(historyFilterStartDate || historyFilterEndDate || historyFilterMonth || historyFilterYear) && (
                      <button
                        type="button"
                        onClick={() => {
                          setHistoryFilterStartDate("");
                          setHistoryFilterEndDate("");
                          setHistoryFilterMonth("");
                          setHistoryFilterYear("");
                        }}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 p-1.5 rounded-lg border border-rose-200 text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center shrink-0"
                        title="Reset Filter Tanggal"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                      <th className="py-3 px-4">Tanggal & Jam</th>
                      <th className="py-3 px-4">Tipe Transaksi</th>
                      <th className="py-3 px-4">Nama Pelanggan</th>
                      <th className="py-3 px-4">Detail Mutasi Barang</th>
                      <th className="py-3 px-4">Operator Kasir</th>
                      <th className="py-3 px-4 text-right">Total Transaksi</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.filter(t => {
                      // 1. Text Search Filter
                      if (searchTerm) {
                        const term = searchCaseSensitive ? searchTerm : searchTerm.toLowerCase();
                        const txId = searchCaseSensitive ? t.id : t.id.toLowerCase();
                        const scent = t.scentName ? (searchCaseSensitive ? t.scentName : t.scentName.toLowerCase()) : "";
                        const desc = t.description ? (searchCaseSensitive ? t.description : t.description.toLowerCase()) : "";
                        const op = searchCaseSensitive ? t.operatorEmail : t.operatorEmail.toLowerCase();
                        const cust = t.customerName ? (searchCaseSensitive ? t.customerName : t.customerName.toLowerCase()) : "pelanggan umum";

                        let matchesText = false;
                        if (searchColumn === "all") {
                          matchesText = txId.includes(term) || scent.includes(term) || desc.includes(term) || op.includes(term) || cust.includes(term);
                        } else if (searchColumn === "id") {
                          matchesText = txId.includes(term);
                        } else if (searchColumn === "scentName") {
                          matchesText = scent.includes(term);
                        } else if (searchColumn === "description") {
                          matchesText = desc.includes(term);
                        } else if (searchColumn === "operatorEmail") {
                          matchesText = op.includes(term);
                        } else if (searchColumn === "customerName") {
                          matchesText = cust.includes(term);
                        }
                        if (!matchesText) return false;
                      }

                      // 2. Date filters
                      const txDate = new Date(t.date);
                      const txDateStr = t.date.substring(0, 10); // "YYYY-MM-DD"
                      
                      if (historyFilterStartDate && txDateStr < historyFilterStartDate) {
                        return false;
                      }
                      if (historyFilterEndDate && txDateStr > historyFilterEndDate) {
                        return false;
                      }

                      // Month Filter (01 - 12)
                      if (historyFilterMonth) {
                        const txMonth = (txDate.getMonth() + 1).toString().padStart(2, "0"); // "01" - "12"
                        if (txMonth !== historyFilterMonth) {
                          return false;
                        }
                      }

                      // Year Filter (YYYY)
                      if (historyFilterYear) {
                        const txYear = txDate.getFullYear().toString(); // "2026" etc
                        if (txYear !== historyFilterYear) {
                          return false;
                        }
                      }

                      return true;
                    }).map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          {new Date(t.date).toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            t.type === "sale" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}>
                            {t.type === "sale" ? "PENJUALAN" : "BELANJA STOK"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800">{t.customerName || "-"}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{t.description}</div>
                          <span className="text-[10px] text-slate-400">
                            ID: {t.id} {t.items && t.items.length > 0 ? `| Multi-item (${t.items.length} macam)` : `${t.volumeMl ? `| Volume: ${t.volumeMl}ml` : ""} ${t.bottleSize && t.bottleSize !== "None" ? `| Botol: ${t.bottleSize} (${t.bottleCount}x)` : ""}`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">{t.operatorEmail}</td>
                        <td className={`py-3 px-4 text-right font-mono font-bold text-sm ${
                          t.type === "sale" ? "text-emerald-700" : "text-slate-800"
                        }`}>
                          {t.type === "sale" ? "+" : "-"}{formatRupiah(t.totalPrice)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {t.type === "sale" && (
                              <button
                                onClick={() => setPrintTx(t)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 font-extrabold rounded-lg text-[10px] transition-all border border-emerald-100 shadow-sm cursor-pointer"
                                title="Print Invoice Penjualan"
                              >
                                <Printer className="h-3 w-3" />
                                Invoice
                              </button>
                            )}
                            {userRole === "admin" && (
                              <button
                                onClick={() => handleDeleteTransaction(t.id, t.description)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 font-extrabold rounded-lg text-[10px] transition-all border border-rose-100 shadow-sm cursor-pointer"
                                title="Hapus Transaksi (Kembalikan Kas & Stok)"
                              >
                                <Trash2 className="h-3 w-3" />
                                Hapus
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                          Belum ada histori transaksi terekam.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==========================================
              9. CONFIG TEMPLATE INVOICE (Admin Only)
              ========================================== */}
          {activeTab === "invoice_settings" && userRole === "admin" && tempSettings && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900 font-display">Desain Format & Kop Invoice</h3>
                  <p className="text-xs text-slate-500">Edit data kop logo toko BASTIKA PARFUM untuk print out thermal printer.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[11px] font-semibold text-slate-600">Sinkronisasi Cloud Real-time</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Form Input (Left Column) */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-7 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Edit3 className="h-4.5 w-4.5 text-emerald-600" />
                    <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Formulir Isian Kop & Nota</h4>
                  </div>

                  <form onSubmit={handleSaveInvoiceSettings} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Toko / Brand</label>
                        <input
                          id="inv-store-name"
                          type="text"
                          value={tempSettings.storeName}
                          onChange={(e) => handleSettingChange("storeName", e.target.value)}
                          onBlur={handleSettingBlur}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
                          placeholder="BASTIKA PARFUM"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Slogan / Tagline</label>
                        <input
                          id="inv-slogan"
                          type="text"
                          value={tempSettings.slogan}
                          onChange={(e) => handleSettingChange("slogan", e.target.value)}
                          onBlur={handleSettingBlur}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
                          placeholder="THE PREMIUM SCENTS"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Alamat Lengkap Toko</label>
                      <textarea
                        id="inv-address"
                        rows={2}
                        value={tempSettings.address}
                        onChange={(e) => handleSettingChange("address", e.target.value)}
                        onBlur={handleSettingBlur}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
                        placeholder="Jl. Merdeka No. 123, Bandung"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">No. Kontak / WhatsApp</label>
                        <input
                          id="inv-phone"
                          type="text"
                          value={tempSettings.phone}
                          onChange={(e) => handleSettingChange("phone", e.target.value)}
                          onBlur={handleSettingBlur}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
                          placeholder="0812-3456-7890"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pesan Header Nota</label>
                        <input
                          id="inv-header"
                          type="text"
                          value={tempSettings.headerMessage}
                          onChange={(e) => handleSettingChange("headerMessage", e.target.value)}
                          onBlur={handleSettingBlur}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
                          placeholder="BUKTI PENJUALAN RESMI"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pesan Penutup Baris 1 (Greeting)</label>
                      <input
                        id="inv-footer1"
                        type="text"
                        value={tempSettings.footerMessage1}
                        onChange={(e) => handleSettingChange("footerMessage1", e.target.value)}
                        onBlur={handleSettingBlur}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
                        placeholder="Terima Kasih Atas Kunjungan Anda"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pesan Penutup Baris 2 (Ketentuan)</label>
                      <input
                        id="inv-footer2"
                        type="text"
                        value={tempSettings.footerMessage2}
                        onChange={(e) => handleSettingChange("footerMessage2", e.target.value)}
                        onBlur={handleSettingBlur}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
                        placeholder="Barang yang sudah dibeli tidak dapat ditukar."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Lebar Kertas Cetak</label>
                        <select
                          id="inv-width"
                          value={tempSettings.paperWidth}
                          onChange={(e) => handleSettingChange("paperWidth", e.target.value as "58mm" | "80mm")}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
                        >
                          <option value="58mm">Thermal 58mm (Standard Mini)</option>
                          <option value="80mm">Thermal 80mm (Standard Desktop)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-3 pt-4">
                        <input
                          id="inv-show-logo"
                          type="checkbox"
                          checked={tempSettings.showLogo}
                          onChange={(e) => handleSettingChange("showLogo", e.target.checked)}
                          className="h-4 w-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                        <label htmlFor="inv-show-logo" className="text-xs font-bold text-slate-600 select-none cursor-pointer">
                          Tampilkan Kop Gambar Logo pada Nota Invoice
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                      {/* INVOICE LOGO UPLOADER */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Upload Gambar Logo Nota (Real-time)</label>
                        <div className="flex items-center gap-3">
                          <label className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-2 text-center cursor-pointer bg-slate-50 hover:bg-emerald-50/10 transition-all">
                            <div className="flex flex-col items-center gap-0.5">
                              <Upload className="h-4 w-4 text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-600">Pilih Logo Nota</span>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 300 * 1024) {
                                  showToast("Ukuran logo maksimal 300KB agar sinkronisasi cloud lancar!", "error");
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                  const dataUrl = reader.result as string;
                                  handleSettingChange("logoUrl", dataUrl);
                                  // REAL-TIME SAVE to Firestore instantly
                                  try {
                                    const updated = { ...tempSettings, logoUrl: dataUrl };
                                    await updateInvoiceSettings(updated);
                                    showToast("Logo nota berhasil diupload & disimpan otomatis ke cloud!", "success");
                                  } catch (err: any) {
                                    showToast("Gagal simpan logo real-time: " + err.message, "error");
                                  }
                                };
                                reader.readAsDataURL(file);
                              }}
                              className="hidden"
                            />
                          </label>
                          {tempSettings.logoUrl && (
                            <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl p-1 flex items-center justify-center relative shrink-0">
                              <img
                                src={tempSettings.logoUrl}
                                alt="Logo Preview"
                                className="max-w-full max-h-full object-contain rounded-md"
                                referrerPolicy="no-referrer"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  handleSettingChange("logoUrl", "/icon.jpg");
                                  try {
                                    const updated = { ...tempSettings, logoUrl: "/icon.jpg" };
                                    await updateInvoiceSettings(updated);
                                    showToast("Logo dikembalikan ke default & disimpan secara real-time!", "success");
                                  } catch (err: any) {
                                    showToast("Gagal reset logo: " + err.message, "error");
                                  }
                                }}
                                className="absolute -top-1 -right-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-0.5 shadow transition-all cursor-pointer"
                                title="Reset logo default"
                              >
                                <X className="h-2 w-2" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* SYSTEM/APP ICON LOGO UPLOADER */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Upload Logo Aplikasi & Sistem (Real-time)</label>
                        <div className="flex items-center gap-3">
                          <label className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-2 text-center cursor-pointer bg-slate-50 hover:bg-emerald-50/10 transition-all">
                            <div className="flex flex-col items-center gap-0.5">
                              <Upload className="h-4 w-4 text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-600">Pilih Logo Aplikasi</span>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 300 * 1024) {
                                  showToast("Ukuran logo maksimal 300KB agar sinkronisasi cloud lancar!", "error");
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                  const dataUrl = reader.result as string;
                                  handleSettingChange("appIconUrl", dataUrl);
                                  // REAL-TIME SAVE to Firestore instantly
                                  try {
                                    const updated = { ...tempSettings, appIconUrl: dataUrl };
                                    await updateInvoiceSettings(updated);
                                    showToast("Logo Icon Aplikasi berhasil diupload & disimpan otomatis ke cloud!", "success");
                                  } catch (err: any) {
                                    showToast("Gagal simpan logo real-time: " + err.message, "error");
                                  }
                                };
                                reader.readAsDataURL(file);
                              }}
                              className="hidden"
                            />
                          </label>
                          {tempSettings.appIconUrl && (
                            <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl p-1 flex items-center justify-center relative shrink-0">
                              <img
                                src={tempSettings.appIconUrl}
                                alt="App Icon Preview"
                                className="max-w-full max-h-full object-contain rounded-md"
                                referrerPolicy="no-referrer"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  handleSettingChange("appIconUrl", "/icon.jpg");
                                  try {
                                    const updated = { ...tempSettings, appIconUrl: "/icon.jpg" };
                                    await updateInvoiceSettings(updated);
                                    showToast("Logo aplikasi dikembalikan ke default & disimpan secara real-time!", "success");
                                  } catch (err: any) {
                                    showToast("Gagal reset logo: " + err.message, "error");
                                  }
                                }}
                                className="absolute -top-1 -right-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-0.5 shadow transition-all cursor-pointer"
                                title="Reset logo default"
                              >
                                <X className="h-2 w-2" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                      <button
                        id="save-invoice-btn"
                        type="submit"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-2.5 px-6 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Save className="h-4 w-4" />
                        Simpan Format Kop
                      </button>
                    </div>
                  </form>
                </div>

                {/* Real-time Preview (Right Column) */}
                <div className="lg:col-span-5 flex flex-col items-center animate-in fade-in slide-in-from-right-2 duration-300">
                  <div className="w-full max-w-sm mb-3 text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Printer className="h-3 w-3" />
                      Live Preview Kertas Thermal ({tempSettings.paperWidth})
                    </span>
                  </div>

                  {/* Simulated Thermal Ticket Roll */}
                  <div className="bg-slate-100 p-6 rounded-3xl border border-slate-300/60 shadow-inner w-full flex justify-center bg-radial from-white via-slate-100 to-slate-200">
                    <div 
                      className={`bg-white text-black p-4 shadow-2xl font-mono text-[10px] leading-relaxed relative ${
                        tempSettings.paperWidth === "58mm" ? "w-[240px]" : "w-[320px]"
                      }`}
                      style={{ borderBottom: "5px dashed #ccc" }}
                    >
                      {/* Ticket top ripple effect */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-repeat-x bg-[linear-gradient(45deg,transparent_33.3%,#ccc_33.3%,#ccc_66.6%,transparent_66.6%)] bg-[length:6px_4px]"></div>

                      <div className="text-center space-y-1.5 pt-4">
                        {tempSettings.showLogo && tempSettings.logoUrl && (
                          <div className="flex justify-center mb-1.5">
                            <img 
                              src={tempSettings.logoUrl} 
                              alt="Logo" 
                              className="h-20 w-20 object-contain rounded-full border-2 border-slate-200 shadow-sm" 
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = "/icon.jpg";
                              }}
                            />
                          </div>
                        )}
                        <h5 className="font-extrabold text-xs uppercase tracking-wide">{tempSettings.storeName}</h5>
                        <p className="text-[9px] text-slate-600 font-semibold italic">{tempSettings.slogan}</p>
                        <p className="text-[8px] leading-tight text-slate-600 px-2 whitespace-pre-line">{tempSettings.address}</p>
                        <p className="text-[8px] text-slate-600 font-bold">Telp/WA: {tempSettings.phone}</p>
                        
                        <div className="py-1">
                          <p className="text-[8px] font-extrabold tracking-widest bg-slate-100 py-0.5 rounded text-slate-700 uppercase border border-slate-200">
                            {tempSettings.headerMessage || "BUKTI PENJUALAN"}
                          </p>
                        </div>
                      </div>

                      <div className="text-[8px] text-slate-700 space-y-0.5 pt-3 border-t border-dashed border-slate-300">
                        <div className="flex justify-between">
                          <span>TANGGAL : {new Date().toLocaleString("id-ID")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>INVOICE : TX-MOCK-2026</span>
                        </div>
                        <div className="flex justify-between">
                          <span>KASIR   : {currentUser?.email || "admin@bastika.com"}</span>
                        </div>
                      </div>

                      <div className="border-t border-dashed border-slate-300 my-2 pt-1.5">
                        <div className="text-[8px] font-bold text-slate-800 pb-1 flex justify-between">
                          <span>AROMA & KEMASAN</span>
                          <span>JUMLAH</span>
                        </div>
                        
                        {/* Mock Scent Row */}
                        <div className="text-[8px] text-slate-800 space-y-0.5">
                          <div className="flex justify-between">
                            <span className="font-bold">Bibit Baccarat (30ml)</span>
                            <span>Rp 105.000</span>
                          </div>
                          <div className="flex justify-between text-[7px] text-slate-500 pl-2">
                            <span>30 ml x Rp 3.500 /ml</span>
                          </div>
                        </div>

                        {/* Mock Bottle Row */}
                        <div className="text-[8px] text-slate-800 pt-1 flex justify-between">
                          <span>Botol 30ml (1 pcs)</span>
                          <span>Rp 15.000</span>
                        </div>
                      </div>

                      <div className="border-t border-dashed border-slate-300 my-2 pt-2 space-y-1">
                        <div className="flex justify-between text-[8px]">
                          <span>SUBTOTAL</span>
                          <span>Rp 120.000</span>
                        </div>
                        <div className="flex justify-between text-[8px] font-bold text-emerald-700">
                          <span>DISKON PROMO</span>
                          <span>-Rp 15.000</span>
                        </div>
                        <div className="flex justify-between text-[9px] font-black border-t border-dotted border-slate-400 pt-1">
                          <span>TOTAL BAYAR</span>
                          <span>Rp 105.000</span>
                        </div>
                      </div>

                      <div className="text-center text-[7px] text-slate-500 space-y-1 pt-4 border-t border-dashed border-slate-300">
                        <p className="font-bold uppercase text-slate-700">{tempSettings.footerMessage1}</p>
                        <p className="italic leading-snug">{tempSettings.footerMessage2}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              11. DATABASE PELANGGAN (CUSTOMERS) VIEW
              ========================================== */}
          {activeTab === "customers" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 font-display">Sistem Database & Loyalitas Pelanggan</h3>
                  <p className="text-[11px] text-slate-500">Mencatat akumulasi nominal transaksi untuk sistem diskon promo otomatis.</p>
                </div>
                
                {/* Admin Only threshold settings form */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:w-[480px]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">Pengaturan Promo Diskon Global</span>
                  {userRole === "admin" ? (
                    <form onSubmit={handleUpdatePromoSettings} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 block mb-1">Batas Belanja Minimal (Klaim)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                            <input
                              type="number"
                              value={adminThresholdInput}
                              onChange={(e) => setAdminThresholdInput(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-semibold"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 block mb-1">Nominal Potongan Diskon</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                            <input
                              type="number"
                              value={adminDiscountInput}
                              onChange={(e) => setAdminDiscountInput(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-semibold"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
                        >
                          Simpan Pengaturan
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-extrabold">Batas Minimal</span>
                        Rp {promoThreshold.toLocaleString("id-ID")}
                      </div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded font-extrabold">Diskon Promo</span>
                        Rp {promoDiscount.toLocaleString("id-ID")}
                      </div>
                      <span className="text-[9px] text-slate-400 font-normal block mt-1">(Hanya Admin yang dapat mengubah pengaturan ini)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Filtering / Search */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama pelanggan..."
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800"
                  />
                </div>
                {customerSearchTerm && (
                  <button
                    onClick={() => setCustomerSearchTerm("")}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Customer List */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                      <th className="py-3 px-4">Nama Pelanggan</th>
                      <th className="py-3 px-4 text-right">Akumulasi Belanja</th>
                      <th className="py-3 px-4 text-center">Sudah Klaim</th>
                      <th className="py-3 px-4">Terakhir Update</th>
                      <th className="py-3 px-4 text-center">Status Promo</th>
                      <th className="py-3 px-4 text-center">Aksi Klaim</th>
                      {userRole === "admin" && (
                        <th className="py-3 px-4 text-center">Aksi Admin</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers.filter(c => {
                      if (!customerSearchTerm) return true;
                      return c.name.toLowerCase().includes(customerSearchTerm.toLowerCase());
                    }).map((c) => {
                      const availableClaims = Math.floor(c.totalPurchase / promoThreshold);
                      const isEligible = availableClaims > 0;
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-800">{c.name}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-slate-700">
                            {formatRupiah(c.totalPurchase)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="bg-slate-100 text-slate-700 font-semibold text-[10px] px-2 py-0.5 rounded-full">
                              {c.claimedPromos || 0} Kali
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-mono">
                            {c.updatedAt ? new Date(c.updatedAt).toLocaleString("id-ID") : "-"}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isEligible ? (
                              <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[9px] px-2.5 py-0.5 rounded-full animate-pulse border border-emerald-200">
                                BISA KLAIM ({availableClaims}x)
                              </span>
                            ) : (
                              <div className="text-[10px] text-slate-400">
                                Kurang <span className="font-bold text-slate-500 font-mono">{formatRupiah(promoThreshold - (c.totalPurchase % promoThreshold))}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              disabled={!isEligible}
                              onClick={() => handleClaimPromo(c.id, c.name)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold shadow-sm transition-all cursor-pointer ${
                                isEligible
                                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                              }`}
                            >
                              Klaim Promo
                            </button>
                          </td>
                          {userRole === "admin" && (
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEditCustomerClick(c)}
                                  className="p-1.5 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg text-slate-500 transition-colors cursor-pointer"
                                  title="Edit Nama Pelanggan"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCustomer(c.id, c.name)}
                                  className="p-1.5 bg-slate-100 hover:bg-rose-100 hover:text-rose-700 rounded-lg text-slate-500 transition-colors cursor-pointer"
                                  title="Hapus Pelanggan"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {customers.length === 0 && (
                      <tr>
                        <td colSpan={userRole === "admin" ? 7 : 6} className="py-8 text-center text-slate-400 italic">
                          Belum ada data pelanggan tercatat. Transaksi kasir dengan mengisi nama pelanggan akan otomatis tercatat di sini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==========================================
              EDIT CUSTOMER MODAL OVERLAY (Admin Only)
              ========================================== */}
          {editingCustomer && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm font-display">Edit Nama Pelanggan</h3>
                    <p className="text-[10px] text-slate-400">Sesuaikan nama pelanggan. Semua riwayat transaksi akan otomatis disinkronkan.</p>
                  </div>
                  <button 
                    onClick={() => setEditingCustomer(null)}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nama Pelanggan Aktif</label>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600">
                      {editingCustomer.name}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nama Pelanggan Baru</label>
                    <input
                      type="text"
                      value={editingCustomerName}
                      onChange={(e) => setEditingCustomerName(e.target.value)}
                      placeholder="Masukkan nama baru..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800 font-bold"
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] text-amber-800 leading-relaxed font-semibold">
                    ⚠️ INFO SINKRONISASI: Mengubah nama di sini akan secara otomatis memperbarui nama pelanggan di semua transaksi penjualan lama yang terkait agar data laporan tetap akurat dan sinkron.
                  </div>
                </div>

                <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
                  <button
                    onClick={() => setEditingCustomer(null)}
                    className="border border-slate-200 text-slate-600 font-bold text-xs px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSaveEditedCustomer}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              RETUR / BATAL KIRIM PAKET BUNDLING RESELLER MODAL (Admin Only)
              ========================================== */}
          {showReturnPackageModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm font-display flex items-center gap-1.5">
                      <RotateCcw className="h-4 w-4 text-rose-400" />
                      Retur / Batal Kirim Paket
                    </h3>
                    <p className="text-[10px] text-slate-400">Kembalikan stok komponen paket ke persediaan gudang utama.</p>
                  </div>
                  <button 
                    onClick={() => setShowReturnPackageModal(false)}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <form onSubmit={handleReturnPackageSubmit}>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Reseller</span>
                        <span className="font-bold text-slate-800 block truncate">{returnPackageForm.resellerEmail}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Nama Paket</span>
                        <span className="font-bold text-slate-800 block truncate">{returnPackageForm.packageName}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs border-t border-slate-100 pt-3">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Aroma & Botol</span>
                        <span className="font-semibold text-slate-600 block">{returnPackageForm.scentName} ({returnPackageForm.bottleSize})</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Stok di Reseller</span>
                        <span className="font-extrabold text-emerald-600 block">{returnPackageForm.availableQty} pcs</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 border-t border-slate-100 pt-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Jumlah Paket yang Diretur / Dibatalkan</label>
                      <input
                        type="number"
                        min="1"
                        max={returnPackageForm.availableQty}
                        value={returnPackageForm.quantityToReturn}
                        onChange={(e) => setReturnPackageForm(prev => ({ ...prev, quantityToReturn: Math.min(prev.availableQty, Math.max(1, parseInt(e.target.value) || 1)) }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800 font-extrabold"
                        required
                      />
                      <p className="text-[10px] text-slate-400 italic">
                        * Mengembalikan paket ini akan otomatis menambahkan kembali stok bibit, pelarut, dan botol ke Persediaan Master sesuai resep formula paket.
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowReturnPackageModal(false)}
                      className="border border-slate-200 text-slate-600 font-bold text-xs px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs px-5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      Proses Retur / Batal
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ==========================================
              11B. CONSIGNMENT & BUNDLING VIEW (Admin Only)
              ========================================== */}
          {activeTab === "consignment" && userRole === "admin" && (
            <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
              {renderConsignmentAdminView()}
            </div>
          )}

          {/* ==========================================
              12. DATABASE MANAGEMENT VIEW (Admin Only)
              ========================================== */}
          {activeTab === "db_management" && userRole === "admin" && (
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 font-display">Pengaturan & Backup Database Bastika Parfum</h3>
                  <p className="text-[11px] text-slate-500">Ekspor (backup) cadangan data, impor (restore) dari file eksternal, atau kosongkan database jika kapasitas penuh.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  {/* Backup Card */}
                  <div className="border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-emerald-500 transition-colors bg-slate-50/40">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                        <Database className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-800">Ekspor Database (Backup)</h4>
                        <p className="text-[10px] text-slate-400">Amankan dan simpan seluruh data ke file JSON.</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">Ekspor mencakup semua koleksi: akun pengguna, harga aroma, rak parfum, mutasi inventori, riwayat transaksi, buku kas besar, dan riwayat gaji.</p>
                    <button
                      onClick={handleExportBackup}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2 rounded-xl transition-all shadow cursor-pointer flex items-center justify-center gap-2"
                    >
                      Ekspor Database (.json)
                    </button>
                  </div>

                  {/* Restore Card */}
                  <div className="border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-emerald-500 transition-colors bg-slate-50/40">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                        <Upload className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-800">Impor Database (Restore)</h4>
                        <p className="text-[10px] text-slate-400">Pulihkan atau pindahkan database Anda.</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pilih File Backup JSON</label>
                      <input
                        type="file"
                        accept=".json"
                        id="db-import-file"
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-extrabold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          const modeChoice = confirm("Metode Pemulihan:\n\nKlik OK untuk 'TULIS ULANG' (Menghapus seluruh database aktif dan memulihkan data persis seperti backup).\n\nKlik CANCEL untuk 'GABUNGKAN' (Menggabungkan data backup dengan database aktif tanpa duplikasi id).");
                          
                          handleImportBackup(file, modeChoice ? "clean" : "merge");
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-rose-500 leading-snug font-semibold bg-rose-50 border border-rose-100 rounded-lg p-2.5">
                      ⚠️ PERHATIAN: Memulihkan database dengan mode 'Tulis Ulang' akan menghapus seluruh data aktif Anda. Pastikan format file backup sesuai!
                    </p>
                  </div>
                </div>

                {/* Destructive Zone */}
                <div className="border-t border-slate-100 pt-6 mt-4">
                  <div className="border border-rose-200 rounded-2xl p-5 space-y-3 bg-rose-50/10">
                    <h4 className="font-bold text-xs text-rose-700 flex items-center gap-1.5 uppercase tracking-wider">
                      <AlertCircle className="h-4 w-4" />
                      Zona Bahaya (Destructive Zone)
                    </h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">Fitur ini digunakan jika kapasitas penyimpanan penuh atau untuk pembersihan berkala. Data yang dihapus tidak dapat dipulihkan kembali kecuali Anda memiliki cadangan (backup) ekspor sebelumnya.</p>
                    
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleClearDatabase}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs py-2.5 px-5 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="h-4 w-4" />
                        Kosongkan Seluruh Database
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              10. BLUETOOTH THERMAL PRINT MODAL OVERLAY
              ========================================== */}
          {printTx && (
            <div className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
              
              {/* Invisible custom print wrapper used strictly by browser window.print() */}
              <div id="print-receipt-area" className="hidden print:block bg-white text-black font-mono text-[10px] leading-relaxed p-2 w-[280px] mx-auto">
                <div className="text-center space-y-1">
                  {invoiceSettings.showLogo && invoiceSettings.logoUrl && (
                    <div className="flex justify-center mb-2">
                      <img 
                        src={invoiceSettings.logoUrl} 
                        alt="Kop Logo BASTIKA" 
                        className="h-20 w-20 object-contain rounded-full border-2 border-slate-200 shadow-sm" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/icon.jpg";
                        }}
                      />
                    </div>
                  )}
                  <h3 className="font-extrabold text-xs uppercase tracking-wide">{invoiceSettings.storeName}</h3>
                  <p className="text-[8px] font-semibold italic">{invoiceSettings.slogan}</p>
                  <p className="text-[8px] whitespace-pre-line leading-tight px-1">{invoiceSettings.address}</p>
                  <p className="text-[8px] font-bold">Telp/WA: {invoiceSettings.phone}</p>
                  
                  <div className="py-1">
                    <p className="text-[8px] font-extrabold bg-slate-100 py-0.5 rounded border border-slate-200">
                      {invoiceSettings.headerMessage || "NOTA PENJUALAN"}
                    </p>
                  </div>
                </div>

                <div className="text-[8px] space-y-0.5 pt-2 border-t border-dashed border-slate-300">
                  <div>TANGGAL   : {new Date(printTx.date).toLocaleString("id-ID")}</div>
                  <div>INVOICE   : {printTx.id}</div>
                  <div>KASIR     : {printTx.operatorEmail}</div>
                  <div>PELANGGAN : {printTx.customerName || "Pelanggan Umum"}</div>
                </div>

                <div className="border-t border-dashed border-slate-300 my-2 pt-1.5">
                  <div className="text-[8px] font-bold pb-1 flex justify-between">
                    <span>AROMA & KEMASAN</span>
                    <span>JUMLAH</span>
                  </div>
                  
                  {printTx.scentName === "Klaim Promo Potongan" ? (
                    <div className="text-[8px] space-y-0.5">
                      <div className="flex justify-between font-bold">
                        <span>Klaim Promo Diskon Pelanggan</span>
                        <span>Rp {printTx.discountNominal.toLocaleString("id-ID")}</span>
                      </div>
                      <div className="flex justify-between text-[7px] text-slate-500 pl-2">
                        <span>Penukaran Akumulasi Loyalitas</span>
                      </div>
                    </div>
                  ) : printTx.items && printTx.items.length > 0 ? (
                    <div className="space-y-2">
                      {printTx.items.map((item, index) => {
                        const isHB = item.scentName === "Hanya Botol";
                        const mPrice = prices.find(p => p.scentName === item.scentName);
                        const pPerMl = mPrice ? mPrice.pricePerMl : 0;
                        const scentCost = isHB ? 0 : ((item.volumeMl || 0) * pPerMl * (item.bottleCount || 1));
                        
                        let bPrice = 0;
                        if (item.bottleSize !== "None") {
                          const mBot = bottleSizes.find(b => b.size === item.bottleSize);
                          if (mBot) {
                            bPrice = item.bottleType === "Plastik"
                              ? (mBot.pricePlastik ?? Math.round((mBot.price ?? 10000) / 2))
                              : (mBot.priceKaca ?? mBot.price ?? 10000);
                          }
                        }
                        if (item.noBottleStockDeduct || printTx.discountType === "free_bottle") {
                          bPrice = 0;
                        }
                        const bottleCost = bPrice * (item.bottleCount || 1);

                        return (
                          <div key={item.id || index} className="border-b border-dotted border-slate-200/50 pb-1.5 last:border-b-0 last:pb-0">
                            {/* Scent Row */}
                            {!isHB && (item.volumeMl || 0) > 0 && (
                              <div className="text-[8px] space-y-0.5">
                                <div className="flex justify-between font-bold">
                                  <span>{item.scentName} ({item.volumeMl}ml)</span>
                                  <span>Rp {scentCost.toLocaleString("id-ID")}</span>
                                </div>
                                <div className="flex justify-between text-[7px] text-slate-500 pl-2">
                                  <span>{item.volumeMl}ml x Rp {pPerMl.toLocaleString("id-ID")}/ml x {item.bottleCount}x</span>
                                </div>
                              </div>
                            )}

                            {/* Bottle Row */}
                            {item.bottleSize && item.bottleSize !== "None" && (
                              <div className="text-[8px] pt-0.5 flex justify-between">
                                <span className="text-slate-600">
                                  {item.noBottleStockDeduct 
                                    ? `Botol ${item.bottleSize} (${item.bottleCount} pcs) - Bawa Sendiri`
                                    : `Botol ${item.bottleType || "Kaca"} ${item.bottleSize} (${item.bottleCount} pcs)`
                                  }
                                </span>
                                <span>
                                  Rp {bottleCost.toLocaleString("id-ID")}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : printTx.packageName ? (
                    <div className="text-[8px] space-y-0.5">
                      <div className="flex justify-between font-bold">
                        <span>{printTx.packageName} ({printTx.bottleCount} unit)</span>
                        <span>Rp {printTx.totalPrice.toLocaleString("id-ID")}</span>
                      </div>
                      <div className="flex justify-between text-[7px] text-slate-500 pl-2">
                        <span>Paket Bundling Titipan</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Scent Row */}
                      <div className="text-[8px] space-y-0.5">
                        <div className="flex justify-between font-bold">
                          <span>Bibit {printTx.scentName} ({printTx.volumeMl}ml)</span>
                          <span>
                            Rp {((printTx.volumeMl || 0) * (prices.find(p => p.scentName === printTx.scentName)?.pricePerMl || 3500) * (printTx.bottleCount || 1)).toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="flex justify-between text-[7px] text-slate-500 pl-2">
                          <span>{printTx.volumeMl} ml x Rp {(prices.find(p => p.scentName === printTx.scentName)?.pricePerMl || 3500).toLocaleString("id-ID")} /ml</span>
                        </div>
                      </div>

                      {/* Bottle Row if any */}
                      {printTx.bottleSize && printTx.bottleSize !== "None" && (
                        <div className="text-[8px] pt-1 flex justify-between">
                          <span>
                            {printTx.noBottleStockDeduct 
                              ? `Botol ${printTx.bottleSize} (${printTx.bottleCount} pcs) - Bawa Sendiri`
                              : `Botol ${printTx.bottleType || "Kaca"} ${printTx.bottleSize} (${printTx.bottleCount} pcs)`
                            }
                          </span>
                          <span>
                            {printTx.noBottleStockDeduct
                              ? "Rp 0"
                              : (() => {
                                  const mBot = bottleSizes.find(b => b.size === printTx.bottleSize);
                                  const bPrice = mBot ? (printTx.bottleType === "Plastik" ? (mBot.pricePlastik ?? Math.round((mBot.price ?? 10000) / 2)) : (mBot.priceKaca ?? mBot.price ?? 10000)) : 0;
                                  return `Rp ${(bPrice * (printTx.bottleCount || 1)).toLocaleString("id-ID")}`;
                                })()
                            }
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="border-t border-dashed border-slate-300 my-2 pt-1.5 space-y-0.5">
                  <div className="flex justify-between text-[8px]">
                    <span>SUBTOTAL</span>
                    <span>
                      Rp {(printTx.scentName === "Klaim Promo Potongan"
                        ? printTx.discountNominal
                        : printTx.packageName
                        ? printTx.totalPrice
                        : printTx.items && printTx.items.length > 0
                        ? printTx.items.reduce((acc, item) => {
                            const isHB = item.scentName === "Hanya Botol";
                            const mPrice = prices.find(p => p.scentName === item.scentName);
                            const pPerMl = mPrice ? mPrice.pricePerMl : 0;
                            const scentCost = isHB ? 0 : ((item.volumeMl || 0) * pPerMl);
                            
                            let bPrice = 0;
                            if (item.bottleSize !== "None") {
                              const mBot = bottleSizes.find(b => b.size === item.bottleSize);
                              if (mBot) bPrice = mBot.price;
                            }
                            if (item.noBottleStockDeduct || printTx.discountType === "free_bottle") {
                              bPrice = 0;
                            }
                            return acc + ((scentCost + bPrice) * (item.bottleCount || 1));
                          }, 0)
                        : (((printTx.volumeMl || 0) * (prices.find(p => p.scentName === printTx.scentName)?.pricePerMl || 3500) * (printTx.bottleCount || 1)) +
                           ((printTx.bottleSize && printTx.bottleSize !== "None" && !printTx.noBottleStockDeduct ? (bottleSizes.find(b => b.size === printTx.bottleSize)?.price || 0) : 0) * (printTx.bottleCount || 1)))
                      ).toLocaleString("id-ID")}
                    </span>
                  </div>
                  {printTx.discountNominal ? (
                    <>
                      <div className="flex justify-between text-[8px] font-bold text-emerald-700">
                        <span>{printTx.claimPromoOnThisTx ? "POTONGAN PROMO LOYALITAS" : "DISKON PROMO"}</span>
                        <span>-Rp {printTx.discountNominal.toLocaleString("id-ID")}</span>
                      </div>
                      {printTx.claimPromoOnThisTx && (
                        <div className="text-[6.5px] text-slate-500 italic text-right leading-none">
                          * Penukaran Akumulasi Loyalitas Belanja
                        </div>
                      )}
                    </>
                  ) : null}
                  <div className="flex justify-between text-[9px] font-black border-t border-dotted border-slate-400 pt-1">
                    <span>TOTAL BAYAR</span>
                    <span>Rp {(printTx.scentName === "Klaim Promo Potongan" ? 0 : printTx.totalPrice).toLocaleString("id-ID")}</span>
                  </div>
                </div>

                <div className="text-center text-[7px] space-y-0.5 pt-3 border-t border-dashed border-slate-300">
                  <p className="font-bold text-slate-800 uppercase">{invoiceSettings.footerMessage1}</p>
                  <p className="italic">{invoiceSettings.footerMessage2}</p>
                </div>
              </div>

              {/* On-screen visual preview box */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col h-fit max-h-[90vh]">
                <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-emerald-600/25 border border-emerald-500/30 flex items-center justify-center">
                      <Printer className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">Cetak Invoice Mini Bluetooth</h4>
                      <p className="text-[10px] text-slate-400">Portrait, Lebar Kertas {invoiceSettings.paperWidth}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setPrintTx(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-slate-950/20 space-y-6 flex flex-col items-center">
                  
                  {/* Explanatory badge */}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-left w-full text-[11px] text-emerald-400 leading-normal flex gap-2.5 items-start">
                    <Info className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                    <span>
                      Nota siap dicetak! Hubungkan browser ke printer thermal bluetooth mini Anda lewat system printer driver (pilih ukuran kertas yang sesuai pada browser).
                    </span>
                  </div>

                  {/* Aesthetic On-Screen Thermal Paper */}
                  <div className="bg-white text-black p-5 shadow-2xl font-mono text-[9px] leading-relaxed relative border border-slate-200 select-none rounded-sm w-[250px] md:w-[280px]">
                    {/* Top edge jagged lines */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-repeat-x bg-[linear-gradient(45deg,transparent_33.3%,#ddd_33.3%,#ddd_66.6%,transparent_66.6%)] bg-[length:6px_4px]"></div>

                    <div className="text-center space-y-1 pt-3">
                      {invoiceSettings.showLogo && invoiceSettings.logoUrl && (
                        <div className="flex justify-center mb-1.5">
                          <img 
                            src={invoiceSettings.logoUrl} 
                            alt="Logo Toko" 
                            className="h-20 w-20 object-contain rounded-full border-2 border-slate-200 shadow-sm" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = "/icon.jpg";
                            }}
                          />
                        </div>
                      )}
                      <h5 className="font-extrabold text-xs uppercase tracking-wide leading-none">{invoiceSettings.storeName}</h5>
                      <p className="text-[7px] text-slate-600 font-semibold italic">{invoiceSettings.slogan}</p>
                      <p className="text-[7px] text-slate-600 whitespace-pre-line leading-tight px-1">{invoiceSettings.address}</p>
                      <p className="text-[7px] text-slate-600 font-bold">Telp/WA: {invoiceSettings.phone}</p>
                      
                      <div className="py-1">
                        <p className="text-[7px] font-extrabold bg-slate-100 py-0.5 rounded border border-slate-200 text-slate-700">
                          {invoiceSettings.headerMessage || "BUKTI PENJUALAN"}
                        </p>
                      </div>
                    </div>

                    <div className="text-[7px] text-slate-700 space-y-0.5 pt-2 border-t border-dashed border-slate-300">
                      <div className="flex justify-between">
                        <span>TANGGAL   : {new Date(printTx.date).toLocaleString("id-ID")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>INVOICE   : {printTx.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>KASIR     : {printTx.operatorEmail}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>PELANGGAN : {printTx.customerName || "Pelanggan Umum"}</span>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-slate-300 my-2 pt-1 flex flex-col gap-1">
                      <div className="text-[7px] font-bold text-slate-800 pb-0.5 flex justify-between">
                        <span>AROMA & KEMASAN</span>
                        <span>JUMLAH</span>
                      </div>
                      
                      {printTx.scentName === "Klaim Promo Potongan" ? (
                        <div className="text-[7px] text-slate-800 space-y-0.5">
                          <div className="flex justify-between font-semibold">
                            <span>Klaim Promo Diskon Pelanggan</span>
                            <span>Rp {printTx.discountNominal.toLocaleString("id-ID")}</span>
                          </div>
                          <div className="flex justify-between text-[6px] text-slate-500 pl-1">
                            <span>Penukaran Akumulasi Loyalitas</span>
                          </div>
                        </div>
                      ) : printTx.items && printTx.items.length > 0 ? (
                        <div className="space-y-1.5">
                          {printTx.items.map((item, index) => {
                            const isHB = item.scentName === "Hanya Botol";
                            const mPrice = prices.find(p => p.scentName === item.scentName);
                            const pPerMl = mPrice ? mPrice.pricePerMl : 0;
                            const scentCost = isHB ? 0 : ((item.volumeMl || 0) * pPerMl * (item.bottleCount || 1));
                            
                            let bPrice = 0;
                            if (item.bottleSize !== "None") {
                              const mBot = bottleSizes.find(b => b.size === item.bottleSize);
                              if (mBot) {
                                bPrice = item.bottleType === "Plastik"
                                  ? (mBot.pricePlastik ?? Math.round((mBot.price ?? 10000) / 2))
                                  : (mBot.priceKaca ?? mBot.price ?? 10000);
                              }
                            }
                            if (item.noBottleStockDeduct || printTx.discountType === "free_bottle") {
                              bPrice = 0;
                            }
                            const bottleCost = bPrice * (item.bottleCount || 1);

                            return (
                              <div key={item.id || index} className="border-b border-dotted border-slate-200/50 pb-1 last:border-b-0 last:pb-0">
                                {/* Scent Row */}
                                {!isHB && (item.volumeMl || 0) > 0 && (
                                  <div className="text-[7px] text-slate-800 space-y-0.5">
                                    <div className="flex justify-between font-semibold">
                                      <span>{item.scentName} ({item.volumeMl}ml)</span>
                                      <span>Rp {scentCost.toLocaleString("id-ID")}</span>
                                    </div>
                                    <div className="flex justify-between text-[6px] text-slate-500 pl-1">
                                      <span>{item.volumeMl}ml x Rp {pPerMl.toLocaleString("id-ID")}/ml x {item.bottleCount}x</span>
                                    </div>
                                  </div>
                                )}

                                {/* Bottle Row */}
                                {item.bottleSize && item.bottleSize !== "None" && (
                                  <div className="text-[7px] pt-0.5 flex justify-between text-slate-800">
                                    <span className="text-slate-600">
                                      {item.noBottleStockDeduct 
                                        ? `Botol ${item.bottleSize} (${item.bottleCount} pcs) - Bawa Sendiri`
                                        : `Botol ${item.bottleType || "Kaca"} ${item.bottleSize} (${item.bottleCount} pcs)`
                                      }
                                    </span>
                                    <span>
                                      Rp {bottleCost.toLocaleString("id-ID")}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : printTx.packageName ? (
                        <div className="text-[7px] text-slate-800 space-y-0.5">
                          <div className="flex justify-between font-semibold">
                            <span>{printTx.packageName} ({printTx.bottleCount} unit)</span>
                            <span>Rp {printTx.totalPrice.toLocaleString("id-ID")}</span>
                          </div>
                          <div className="flex justify-between text-[6px] text-slate-500 pl-1">
                            <span>Paket Bundling Titipan</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="text-[7px] text-slate-800 space-y-0.5">
                            <div className="flex justify-between font-semibold">
                              <span>Bibit {printTx.scentName} ({printTx.volumeMl}ml)</span>
                              <span>
                                Rp {((printTx.volumeMl || 0) * (prices.find(p => p.scentName === printTx.scentName)?.pricePerMl || 3500) * (printTx.bottleCount || 1)).toLocaleString("id-ID")}
                              </span>
                            </div>
                            <div className="flex justify-between text-[6px] text-slate-500 pl-1">
                              <span>{printTx.volumeMl} ml x Rp {(prices.find(p => p.scentName === printTx.scentName)?.pricePerMl || 3500).toLocaleString("id-ID")} /ml</span>
                            </div>
                          </div>

                          {printTx.bottleSize && printTx.bottleSize !== "None" && (
                            <div className="text-[7px] pt-1 flex justify-between text-slate-800">
                              <span>
                                {printTx.noBottleStockDeduct 
                                  ? `Botol ${printTx.bottleSize} (${printTx.bottleCount} pcs) - Bawa Sendiri`
                                  : `Botol ${printTx.bottleType || "Kaca"} ${printTx.bottleSize} (${printTx.bottleCount} pcs)`
                                }
                              </span>
                              <span>
                                {printTx.noBottleStockDeduct
                                  ? "Rp 0"
                                  : (() => {
                                      const mBot = bottleSizes.find(b => b.size === printTx.bottleSize);
                                      const bPrice = mBot ? (printTx.bottleType === "Plastik" ? (mBot.pricePlastik ?? Math.round((mBot.price ?? 10000) / 2)) : (mBot.priceKaca ?? mBot.price ?? 10000)) : 0;
                                      return `Rp ${(bPrice * (printTx.bottleCount || 1)).toLocaleString("id-ID")}`;
                                    })()
                                }
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="border-t border-dashed border-slate-300 my-2 pt-1.5 space-y-0.5">
                      <div className="flex justify-between text-[7px] text-slate-700">
                        <span>SUBTOTAL</span>
                        <span>
                          Rp {(printTx.scentName === "Klaim Promo Potongan"
                            ? printTx.discountNominal
                            : printTx.packageName
                            ? printTx.totalPrice
                            : printTx.items && printTx.items.length > 0
                            ? printTx.items.reduce((acc, item) => {
                                const isHB = item.scentName === "Hanya Botol";
                                const mPrice = prices.find(p => p.scentName === item.scentName);
                                const pPerMl = mPrice ? mPrice.pricePerMl : 0;
                                const scentCost = isHB ? 0 : ((item.volumeMl || 0) * mPrice!.pricePerMl);
                                
                                let bPrice = 0;
                                if (item.bottleSize !== "None") {
                                  const mBot = bottleSizes.find(b => b.size === item.bottleSize);
                                  if (mBot) bPrice = mBot.price;
                                }
                                if (item.noBottleStockDeduct || printTx.discountType === "free_bottle") {
                                  bPrice = 0;
                                }
                                return acc + ((scentCost + bPrice) * (item.bottleCount || 1));
                              }, 0)
                            : (((printTx.volumeMl || 0) * (prices.find(p => p.scentName === printTx.scentName)?.pricePerMl || 3500) * (printTx.bottleCount || 1)) +
                               ((printTx.bottleSize && printTx.bottleSize !== "None" && !printTx.noBottleStockDeduct ? (bottleSizes.find(b => b.size === printTx.bottleSize)?.price || 0) : 0) * (printTx.bottleCount || 1)))
                          ).toLocaleString("id-ID")}
                        </span>
                      </div>
                      {printTx.discountNominal ? (
                        <>
                          <div className="flex justify-between text-[7px] font-bold text-emerald-700">
                            <span>{printTx.claimPromoOnThisTx ? "POTONGAN PROMO LOYALITAS" : "DISKON PROMO"}</span>
                            <span>-Rp {printTx.discountNominal.toLocaleString("id-ID")}</span>
                          </div>
                          {printTx.claimPromoOnThisTx && (
                            <div className="text-[5.5px] text-slate-500 italic text-right leading-none">
                              * Penukaran Akumulasi Loyalitas Belanja
                            </div>
                          )}
                        </>
                      ) : null}
                      <div className="flex justify-between text-[8px] font-black border-t border-dotted border-slate-400 pt-1">
                        <span>TOTAL BAYAR</span>
                        <span>Rp {(printTx.scentName === "Klaim Promo Potongan" ? 0 : printTx.totalPrice).toLocaleString("id-ID")}</span>
                      </div>
                    </div>

                    <div className="text-center text-[6px] text-slate-500 space-y-0.5 pt-3 border-t border-dashed border-slate-300">
                      <p className="font-bold text-slate-700 uppercase">{invoiceSettings.footerMessage1}</p>
                      <p className="italic leading-snug">{invoiceSettings.footerMessage2}</p>
                    </div>

                    {/* Bottom edge jagged lines */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-repeat-x bg-[linear-gradient(225deg,transparent_33.3%,#ddd_33.3%,#ddd_66.6%,transparent_66.6%)] bg-[length:6px_4px]"></div>
                  </div>

                </div>

                <div className="p-5 border-t border-slate-800 bg-slate-950/50 flex gap-3">
                  <button
                    onClick={() => setPrintTx(null)}
                    className="flex-1 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-600 font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer text-center"
                  >
                    Tutup
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-3 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Printer className="h-4.5 w-4.5" />
                    Cetak Sekarang
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ==========================================
              11. STYLE BLOCK FOR PORTRAIT PRINT LAYOUT
              ========================================== */}
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #print-receipt-area, #print-receipt-area * {
                visibility: visible !important;
              }
              #print-receipt-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 280px !important; /* Forces narrow thermal printer dimension on paper */
                margin: 0 !important;
                padding: 10px !important;
                background: white !important;
                color: black !important;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}</style>

        </div>
      </main>
    </div>
  );
}
