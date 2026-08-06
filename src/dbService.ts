import { DocumentSnapshot } from "firebase/firestore";
import { 
  db, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  runTransaction,
  writeBatch,
  increment 
} from "./firebase";
import { 
  Shelf, 
  ScentPrice, 
  StockItem, 
  Transaction, 
  Salary, 
  CashMutation, 
  UserProfile,
  BottleSize,
  InvoiceSettings,
  Customer,
  ResellerStock,
  ResellerPackageStock,
  BundlingPackage,
  MasterProduct,
  FormulaIngredient
} from "./types";

// Helper for unique ID generation if Firestore auto-id isn't used
const generateId = () => Math.random().toString(36).substring(2, 15);

// ==========================================
// SEED INITIAL DATA IF EMPTY
// ==========================================
export async function seedInitialDataIfEmpty() {
  try {
    // 1. Separate Solvents Migration/Creation Check (runs whether config is seeded or not)
    const oldAlcoholRef = doc(db, "stocks", "alcohol_main");
    const oldAlcoholSnap = await getDoc(oldAlcoholRef);
    const newAlcoholCairRef = doc(db, "stocks", "alcohol_cair");
    const newAlcoholCairSnap = await getDoc(newAlcoholCairRef);
    const configRef = doc(db, "config", "status");
    const configSnap = await getDoc(configRef);

    if (oldAlcoholSnap.exists() && !newAlcoholCairSnap.exists()) {
      const oldQty = oldAlcoholSnap.data().quantity || 0;
      await setDoc(newAlcoholCairRef, {
        id: "alcohol_cair",
        type: "alcohol",
        scentName: "Absolut Cair",
        quantity: oldQty
      });
      await setDoc(doc(db, "stocks", "alcohol_gel"), {
        id: "alcohol_gel",
        type: "alcohol",
        scentName: "Absolut Gel",
        quantity: 5000
      });
      await deleteDoc(oldAlcoholRef);
    } else if (!newAlcoholCairSnap.exists() && configSnap.exists()) {
      await setDoc(newAlcoholCairRef, {
        id: "alcohol_cair",
        type: "alcohol",
        scentName: "Absolut Cair",
        quantity: 5000
      });
      await setDoc(doc(db, "stocks", "alcohol_gel"), {
        id: "alcohol_gel",
        type: "alcohol",
        scentName: "Absolut Gel",
        quantity: 5000
      });
    }

    if (configSnap.exists()) {
      return; // Already seeded
    }

    console.log("Seeding initial data for BASTIKA PARFUM...");

    // 1. Initial Client Whitelist
    const initialClients: UserProfile[] = [
      { email: "bastikacorp@gmail.com", role: "admin", addedAt: new Date().toISOString() },
      { email: "budi@bastikaparfum.local", role: "client", addedAt: new Date().toISOString(), username: "budi" },
      { email: "siti@bastikaparfum.local", role: "client", addedAt: new Date().toISOString(), username: "siti" },
    ];
    for (const client of initialClients) {
      await setDoc(doc(db, "users", client.email), client);
    }

    // 2. Initial Scent Prices (Harga Master)
    const initialPrices: ScentPrice[] = [
      { scentName: "Avicenna", pricePerMl: 3500, updatedAt: new Date().toISOString() },
      { scentName: "Bacarat Rouge", pricePerMl: 5000, updatedAt: new Date().toISOString() },
      { scentName: "Black Opium", pricePerMl: 4000, updatedAt: new Date().toISOString() },
      { scentName: "Blue de Chanel", pricePerMl: 4500, updatedAt: new Date().toISOString() },
      { scentName: "Bombshell", pricePerMl: 3000, updatedAt: new Date().toISOString() },
      { scentName: "Savage Sauvage", pricePerMl: 4500, updatedAt: new Date().toISOString() },
    ];
    for (const price of initialPrices) {
      await setDoc(doc(db, "prices", price.scentName), price);
    }

    // 3. Initial Shelves (Sistem Rak)
    const initialShelves: Shelf[] = [
      { id: "shelf_1", rackNumber: "Rak A-01", scentName: "Avicenna", pricePerMl: 3500 },
      { id: "shelf_2", rackNumber: "Rak A-02", scentName: "Bacarat Rouge", pricePerMl: 5000 },
      { id: "shelf_3", rackNumber: "Rak B-01", scentName: "Black Opium", pricePerMl: 4000 },
      { id: "shelf_4", rackNumber: "Rak B-02", scentName: "Blue de Chanel", pricePerMl: 4500 },
      { id: "shelf_5", rackNumber: "Rak C-01", scentName: "Bombshell", pricePerMl: 3000 },
      { id: "shelf_6", rackNumber: "Rak C-02", scentName: "Savage Sauvage", pricePerMl: 4500 },
    ];
    for (const shelf of initialShelves) {
      await setDoc(doc(db, "shelves", shelf.id), shelf);
    }

    // 4. Initial Stocks (Stok Master)
    // Essence stocks
    for (const p of initialPrices) {
      const id = `essence_${p.scentName.replace(/\s+/g, "_").toLowerCase()}`;
      await setDoc(doc(db, "stocks", id), {
        id,
        type: "essence",
        scentName: p.scentName,
        quantity: 500, // starting with 500ml each
      });
    }
    // Alcohol stock
    await setDoc(doc(db, "stocks", "alcohol_cair"), {
      id: "alcohol_cair",
      type: "alcohol",
      scentName: "Absolut Cair",
      quantity: 5000, // 5000ml alcohol
    });
    await setDoc(doc(db, "stocks", "alcohol_gel"), {
      id: "alcohol_gel",
      type: "alcohol",
      scentName: "Absolut Gel",
      quantity: 5000, // 5000ml alcohol
    });
    // Bottle stocks
    const bottleSizes = ["30ml", "50ml", "100ml"];
    for (const size of bottleSizes) {
      const id = `bottle_${size}`;
      await setDoc(doc(db, "stocks", id), {
        id,
        type: "bottle",
        size,
        quantity: 50, // 50 bottles of each size
      });
    }

    // 5. Initial Cash Balance (Saldo Kas Besar)
    await setDoc(doc(db, "config", "cash"), { balance: 15000000 }); // Starting with Rp 15,000,000

    // 6. Initial Cash Ledger Mutation
    const initialMutation: CashMutation = {
      id: "mut_init",
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      type: "in",
      amount: 15000000,
      balanceBefore: 0,
      balanceAfter: 15000000,
      description: "Modal awal usaha BASTIKA PARFUM",
      referenceId: "modal_awal"
    };
    await setDoc(doc(db, "cash_ledger", initialMutation.id), initialMutation);

    // Mark as seeded
    await setDoc(configRef, { seeded: true, timestamp: new Date().toISOString() });
    console.log("Seeding completed successfully.");
  } catch (error) {
    console.error("Error seeding initial data: ", error);
  }
}

// ==========================================
// CONFIGS & CASH
// ==========================================
export function subscribeToCashBalance(callback: (balance: number) => void) {
  return onSnapshot(doc(db, "config", "cash"), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data().balance);
    } else {
      callback(0);
    }
  });
}

// ==========================================
// SHELVES (RAK) SERVICES
// ==========================================
export function subscribeToShelves(callback: (shelves: Shelf[]) => void) {
  return onSnapshot(collection(db, "shelves"), (snapshot) => {
    const list: Shelf[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Shelf);
    });
    // Sort by rack number
    list.sort((a, b) => a.rackNumber.localeCompare(b.rackNumber, undefined, { numeric: true }));
    callback(list);
  });
}

export async function addShelf(shelf: Omit<Shelf, "id">) {
  const id = "shelf_" + generateId();
  await setDoc(doc(db, "shelves", id), { ...shelf, id });
  return id;
}

export async function updateShelf(id: string, updates: Partial<Omit<Shelf, "id">>) {
  await updateDoc(doc(db, "shelves", id), updates);
}

export async function deleteShelf(id: string) {
  await deleteDoc(doc(db, "shelves", id));
}

// ==========================================
// SCENT PRICES SERVICES
// ==========================================
export function subscribeToPrices(callback: (prices: ScentPrice[]) => void) {
  return onSnapshot(collection(db, "prices"), (snapshot) => {
    const list: ScentPrice[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as ScentPrice);
    });
    list.sort((a, b) => a.scentName.localeCompare(b.scentName));
    callback(list);
  });
}

// Update Master Price and cascade update to Shelves & Essence Stock names
export async function updateScentPrice(scentName: string, newPrice: number) {
  // Query shelves before the transaction to respect reads-before-writes
  const shelvesQuery = query(collection(db, "shelves"), where("scentName", "==", scentName));
  const shelvesSnap = await getDocs(shelvesQuery);

  await runTransaction(db, async (transaction) => {
    // 1. Update prices doc
    const priceRef = doc(db, "prices", scentName);
    transaction.update(priceRef, { 
      pricePerMl: newPrice, 
      updatedAt: new Date().toISOString() 
    });

    // 2. Update their pricePerMl
    shelvesSnap.forEach((shelfDoc) => {
      transaction.update(doc(db, "shelves", shelfDoc.id), { pricePerMl: newPrice });
    });
  });
}

// ==========================================
// STOCKS SERVICES
// ==========================================
export function getNormalizedBottleStockId(size: string | undefined, bottleType: "Kaca" | "Plastik" | string | undefined): string {
  const cleanSize = (size || "30ml").trim().toLowerCase().replace(/\s+/g, "");
  const cleanType = (bottleType || "Kaca").trim().toLowerCase();
  return `bottle_${cleanSize}_${cleanType}`;
}

export function getNormalizedEssenceStockId(scentName: string | undefined): string {
  const cleanScent = (scentName || "").trim().replace(/\s+/g, "_").toLowerCase();
  return `essence_${cleanScent}`;
}
export function subscribeToStocks(callback: (stocks: StockItem[]) => void) {
  return onSnapshot(collection(db, "stocks"), (snapshot) => {
    const list: StockItem[] = [];
    const legacyToMigrate: { size: string; quantity: number; docId: string }[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as StockItem;
      list.push(data);

      // If we find a legacy bottle document like bottle_30ml with quantity > 0
      if (data.type === "bottle" && !data.bottleType && data.id === `bottle_${data.size}`) {
        if (data.quantity > 0) {
          legacyToMigrate.push({
            size: data.size || "30ml",
            quantity: data.quantity,
            docId: data.id
          });
        }
      }
    });

    if (legacyToMigrate.length > 0) {
      // Run async migration in background
      (async () => {
        for (const item of legacyToMigrate) {
          const targetKacaId = getNormalizedBottleStockId(item.size, "Kaca");
          const targetRef = doc(db, "stocks", targetKacaId);
          try {
            await runTransaction(db, async (transaction) => {
              const legacyRef = doc(db, "stocks", item.docId);
              const legacySnap = await transaction.get(legacyRef);
              const targetSnap = await transaction.get(targetRef);

              if (legacySnap.exists() && (legacySnap.data().quantity || 0) > 0) {
                const legacyQty = legacySnap.data().quantity || 0;
                const currentKacaQty = targetSnap.exists() ? (targetSnap.data().quantity || 0) : 0;

                // Migrate legacy quantity to glass bottle stock
                transaction.set(targetRef, {
                  id: targetKacaId,
                  type: "bottle",
                  size: item.size,
                  bottleType: "Kaca",
                  quantity: currentKacaQty + legacyQty
                }, { merge: true });

                // Reset legacy quantity to 0 so we don't migrate again
                transaction.update(legacyRef, { quantity: 0 });
                console.log(`Migrated legacy bottle stock ${item.docId} (${legacyQty} unit) to ${targetKacaId}`);
              }
            });
          } catch (e) {
            console.error("Failed migrating legacy bottle stock:", e);
          }
        }
      })();
    }

    callback(list);
  });
}

// Set manual adjustments
export async function updateStockManual(
  id: string, 
  newQuantity: number, 
  scentName?: string, 
  type: "essence" | "bottle" | "alcohol" = "essence",
  bottleType?: "Kaca" | "Plastik",
  size?: string
) {
  try {
    const stockRef = doc(db, "stocks", id);
    await setDoc(stockRef, {
      id,
      quantity: newQuantity,
      type,
      ...(scentName ? { scentName } : {}),
      ...(bottleType ? { bottleType } : {}),
      ...(size ? { size } : {}),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.error("Gagal updateStockManual:", err);
    throw err;
  }
}

// ==========================================
// TRANSACTIONS & CASHFLOW ACCOUNTING
// ==========================================
export function subscribeToTransactions(callback: (transactions: Transaction[]) => void) {
  return onSnapshot(
    query(collection(db, "transactions"), orderBy("date", "desc")),
    (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Transaction);
      });
      callback(list);
    }
  );
}

// Recording transactions with atomic stock adjustments & Cash Ledger Integration
export async function addTransaction(rawTx: Omit<Transaction, "id">) {
  const cleanObj = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(cleanObj);
    } else if (obj !== null && typeof obj === "object") {
      const newObj: any = {};
      for (const key of Object.keys(obj)) {
        if (obj[key] !== undefined) {
          newObj[key] = cleanObj(obj[key]);
        }
      }
      return newObj;
    }
    return obj;
  };
  const tx = cleanObj(rawTx) as Omit<Transaction, "id">;
  const id = "tx_" + generateId();
  const dateStr = tx.date || new Date().toISOString();

  if (tx.scentName) {
    tx.scentName = tx.scentName.trim();
  }

  await runTransaction(db, async (transaction) => {
    // ==========================================
    // 1. PERFORM ALL READS FIRST (MANDATORY IN FIRESTORE TRANSACTIONS)
    // ==========================================

    // A. Cash Balance Ref & Read
    const cashRef = doc(db, "config", "cash");
    const cashSnap = await transaction.get(cashRef);

    // B. Essence Stock Ref & Read
    let essenceRef = null;
    let essenceSnap = null;
    if (tx.type === "sale") {
      if (tx.scentName && (tx.volumeMl || 0) > 0) {
        const essenceId = `essence_${tx.scentName.replace(/\s+/g, "_").toLowerCase()}`;
        essenceRef = doc(db, "stocks", essenceId);
        essenceSnap = await transaction.get(essenceRef);
      }
    } else if (tx.type === "purchase") {
      if (tx.category === "bibit" && tx.scentName && (tx.volumeMl || 0) > 0) {
        const essenceId = `essence_${tx.scentName.replace(/\s+/g, "_").toLowerCase()}`;
        essenceRef = doc(db, "stocks", essenceId);
        essenceSnap = await transaction.get(essenceRef);
      }
    }

    // C. Scent Price & Master Product Ref & Read (for purchase of a new bibit)
    let priceRef = null;
    let priceSnap = null;
    let masterProdRef = null;
    let masterProdSnap = null;
    if (tx.type === "purchase" && tx.category === "bibit" && tx.scentName) {
      priceRef = doc(db, "prices", tx.scentName);
      priceSnap = await transaction.get(priceRef);

      const cleanMasterId = "prod_essence_" + tx.scentName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      masterProdRef = doc(db, "master_products", cleanMasterId);
      masterProdSnap = await transaction.get(masterProdRef);
    }

    // D. Alcohol Stock Refs & Reads
    const alcoholCairRef = doc(db, "stocks", "alcohol_cair");
    const alcoholCairSnap = await transaction.get(alcoholCairRef);

    const alcoholGelRef = doc(db, "stocks", "alcohol_gel");
    const alcoholGelSnap = await transaction.get(alcoholGelRef);

    // E. Bottle Stock Ref & Read
    let bottleRef = null;
    let bottleSnap = null;
    const bottleSize = tx.bottleSize || "None";
    const bottleCount = tx.bottleCount || 0;
    if (tx.type === "sale" && bottleSize !== "None" && bottleCount > 0) {
      const bottleId = getNormalizedBottleStockId(bottleSize, tx.bottleType);
      bottleRef = doc(db, "stocks", bottleId);
      bottleSnap = await transaction.get(bottleRef);
    } else if (tx.type === "purchase" && tx.category === "botol" && bottleSize !== "None" && bottleCount > 0) {
      const bottleId = getNormalizedBottleStockId(bottleSize, tx.bottleType);
      bottleRef = doc(db, "stocks", bottleId);
      bottleSnap = await transaction.get(bottleRef);
    }

    // F. Customer Document Ref & Read
    let customerRef = null;
    let customerSnap = null;
    const hasValidCustomer = tx.type === "sale" && tx.customerName && tx.customerName.trim().toLowerCase() !== "pelanggan umum";
    if (hasValidCustomer && tx.customerName) {
      const custId = "cust_" + tx.customerName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
      customerRef = doc(db, "customers", custId);
      customerSnap = await transaction.get(customerRef);
    }

    // G. Promo Config Ref & Read
    const promoRef = doc(db, "config", "promo");
    const promoSnap = await transaction.get(promoRef);

    // H. Multi-item Refs & Reads (Sales)
    const essenceRefsMap: any = {};
    const essenceSnapsMap: any = {};
    const bottleRefsMap: any = {};
    const bottleSnapsMap: any = {};

    if (tx.type === "sale" && tx.items && tx.items.length > 0) {
      for (const item of tx.items) {
        if (item.isBundling && item.formula && item.formula.length > 0) {
          for (const ing of item.formula) {
            if (ing.type === "essence" && ing.scentName && (ing.quantity || 0) > 0) {
              const essenceId = getNormalizedEssenceStockId(ing.scentName);
              if (!essenceRefsMap[essenceId]) {
                const ref = doc(db, "stocks", essenceId);
                essenceRefsMap[essenceId] = ref;
                essenceSnapsMap[essenceId] = await transaction.get(ref);
              }
            } else if (ing.type === "bottle" && ing.size && ing.size !== "None" && (ing.quantity || 0) > 0) {
              const bottleId = getNormalizedBottleStockId(ing.size, ing.bottleType);
              if (!bottleRefsMap[bottleId]) {
                const ref = doc(db, "stocks", bottleId);
                bottleRefsMap[bottleId] = ref;
                bottleSnapsMap[bottleId] = await transaction.get(ref);
              }
            }
          }
        } else {
          if (item.scentName && (item.volumeMl || 0) > 0) {
            const essenceId = getNormalizedEssenceStockId(item.scentName);
            if (!essenceRefsMap[essenceId]) {
              const ref = doc(db, "stocks", essenceId);
              essenceRefsMap[essenceId] = ref;
              essenceSnapsMap[essenceId] = await transaction.get(ref);
            }
          }
          if (!item.bringOwnBottle && item.bottleSize && item.bottleSize !== "None" && (item.bottleCount || 0) > 0) {
            const bottleId = getNormalizedBottleStockId(item.bottleSize, item.bottleType);
            if (!bottleRefsMap[bottleId]) {
              const ref = doc(db, "stocks", bottleId);
              bottleRefsMap[bottleId] = ref;
              bottleSnapsMap[bottleId] = await transaction.get(ref);
            }
          }
        }
      }
    }

    // ==========================================
    // 2. NOW PERFORM ALL WRITE OPERATIONS (SETS/UPDATES)
    // ==========================================

    let currentBalance = 15000000; // default initial if config/cash doesn't exist yet
    if (cashSnap.exists()) {
      currentBalance = cashSnap.data().balance;
    }

    if (tx.type === "sale") {
      let mutationDescription = "";

      if (tx.items && tx.items.length > 0) {
        // Multi-item sales stock deduction
        const localEssenceStock: Record<string, number> = {};
        const localBottleStock: Record<string, number> = {};

        // Initialize local stocks from snapshot reads
        Object.keys(essenceSnapsMap).forEach((essId) => {
          const snap = essenceSnapsMap[essId];
          localEssenceStock[essId] = snap.exists() ? snap.data().quantity : 0;
        });

        Object.keys(bottleSnapsMap).forEach((botId) => {
          const snap = bottleSnapsMap[botId];
          localBottleStock[botId] = snap.exists() ? snap.data().quantity : 0;
        });

        let totalAlcoholDeduct = 0;

        for (const item of tx.items) {
          if (item.isBundling && item.formula && item.formula.length > 0) {
            const bundleQty = item.bottleCount || 1;
            for (const ing of item.formula) {
              if (ing.type === "essence" && ing.scentName && (ing.quantity || 0) > 0) {
                const essenceId = getNormalizedEssenceStockId(ing.scentName);
                const volumeToDeduct = (ing.quantity || 0) * bundleQty;
                const currentQty = localEssenceStock[essenceId] ?? 0;
                if (currentQty < volumeToDeduct) {
                  throw new Error(`Stok bibit ${ing.scentName} untuk paket tidak mencukupi! Tersisa: ${currentQty} ml.`);
                }
                const updatedQty = currentQty - volumeToDeduct;
                localEssenceStock[essenceId] = updatedQty;
                const ref = essenceRefsMap[essenceId];
                if (ref) {
                  transaction.update(ref, { quantity: updatedQty });
                }
              } else if (ing.type === "bottle" && ing.size && ing.size !== "None" && (ing.quantity || 0) > 0) {
                const bottleId = getNormalizedBottleStockId(ing.size, ing.bottleType);
                const bottleCountToDeduct = (ing.quantity || 0) * bundleQty;
                const currentQty = localBottleStock[bottleId] ?? 0;
                if (currentQty < bottleCountToDeduct) {
                  throw new Error(`Stok botol ${ing.bottleType || "Kaca"} ${ing.size} untuk paket tidak mencukupi! Tersisa: ${currentQty} unit.`);
                }
                const updatedQty = currentQty - bottleCountToDeduct;
                localBottleStock[bottleId] = updatedQty;
                const ref = bottleRefsMap[bottleId];
                if (ref) {
                  transaction.update(ref, { quantity: updatedQty });
                }
              } else if (ing.type === "alcohol" && (ing.quantity || 0) > 0) {
                totalAlcoholDeduct += (ing.quantity || 0) * bundleQty;
              }
            }
          } else {
            const essenceId = getNormalizedEssenceStockId(item.scentName);
            const volumeToDeduct = item.volumeMl || 0;
            const bottleCountToDeduct = item.bottleCount || 0;
            const bSize = item.bottleSize || "None";

            // A. Essence Stock Deduction
            if (item.scentName && volumeToDeduct > 0) {
              const currentQty = localEssenceStock[essenceId] ?? 0;
              if (currentQty < volumeToDeduct) {
                throw new Error(`Stok bibit ${item.scentName} tidak mencukupi! Tersisa: ${currentQty} ml.`);
              }
              const updatedQty = currentQty - volumeToDeduct;
              localEssenceStock[essenceId] = updatedQty;
              const ref = essenceRefsMap[essenceId];
              if (ref) {
                transaction.update(ref, { quantity: updatedQty });
              }
            }

            // B. Alcohol Stock Calculation
            if (bSize !== "None") {
              const bottleCapacity = parseInt(bSize);
              if (!isNaN(bottleCapacity)) {
                const diff = bottleCapacity - volumeToDeduct;
                if (diff > 0) {
                  totalAlcoholDeduct += diff * bottleCountToDeduct;
                }
              }
            }

            // C. Bottle Stock Deduction
            if (!item.bringOwnBottle && bSize !== "None" && bottleCountToDeduct > 0) {
              const bottleId = getNormalizedBottleStockId(bSize, item.bottleType);
              const currentQty = localBottleStock[bottleId] ?? 0;
              if (currentQty < bottleCountToDeduct) {
                throw new Error(`Stok botol ${item.bottleType || "Kaca"} ukuran ${bSize} tidak mencukupi! Tersisa: ${currentQty} unit.`);
              }
              const updatedQty = currentQty - bottleCountToDeduct;
              localBottleStock[bottleId] = updatedQty;
              const ref = bottleRefsMap[bottleId];
              if (ref) {
                transaction.update(ref, { quantity: updatedQty });
              }
            }
          }
        }

        // D. Final Alcohol Deduction
        if (totalAlcoholDeduct > 0 && alcoholCairSnap.exists()) {
          const alcoholQty = alcoholCairSnap.data().quantity || 0;
          transaction.update(alcoholCairRef, { quantity: Math.max(0, alcoholQty - totalAlcoholDeduct) });
        }

        // Construct mutation description
        mutationDescription = "Penjualan (Multi-item): " + tx.items.map(item => {
          const bSizeStr = item.bottleSize !== "None" ? ` + Botol ${item.bottleSize} x ${item.bottleCount}` : " (Hanya Bibit)";
          return `${item.scentName} (${item.volumeMl}ml)${bSizeStr}`;
        }).join(", ");
        if (mutationDescription.length > 250) {
          mutationDescription = mutationDescription.substring(0, 247) + "...";
        }
      } else {
        // Fallback to original single-item stock deduction
        const volumeToDeduct = tx.volumeMl || 0;
        const bottleCountToDeduct = tx.bottleCount || 0;

        // Deduct essence stock
        if (tx.scentName && volumeToDeduct > 0 && essenceRef && essenceSnap) {
          if (essenceSnap.exists()) {
            const currentQty = essenceSnap.data().quantity;
            if (currentQty < volumeToDeduct) {
              throw new Error(`Stok bibit ${tx.scentName} tidak mencukupi! Tersisa: ${currentQty} ml.`);
            }
            transaction.update(essenceRef, { quantity: currentQty - volumeToDeduct });
          } else {
            throw new Error(`Stok master bibit ${tx.scentName} tidak ditemukan!`);
          }

          // Deduct alcohol stock dynamically: bottle size capacity minus essence volume, no deduction if 'Hanya Refill' (None)
          let alcoholDeduct = 0;
          if (bottleSize !== "None") {
            const bottleCapacity = parseInt(bottleSize);
            if (!isNaN(bottleCapacity)) {
              const diff = bottleCapacity - volumeToDeduct;
              if (diff > 0) {
                alcoholDeduct = diff * bottleCountToDeduct;
              }
            }
          }

          if (alcoholDeduct > 0 && alcoholCairSnap.exists()) {
            const alcoholQty = alcoholCairSnap.data().quantity || 0;
            transaction.update(alcoholCairRef, { quantity: Math.max(0, alcoholQty - alcoholDeduct) });
          }
        }

        // Deduct bottle stock
        if (!tx.bringOwnBottle && bottleSize !== "None" && bottleCountToDeduct > 0 && bottleRef && bottleSnap) {
          if (bottleSnap.exists()) {
            const currentQty = bottleSnap.data().quantity;
            if (currentQty < bottleCountToDeduct) {
              throw new Error(`Stok botol ${tx.bottleType || "Kaca"} ukuran ${bottleSize} tidak mencukupi! Tersisa: ${currentQty} unit.`);
            }
            transaction.update(bottleRef, { quantity: currentQty - bottleCountToDeduct });
          } else {
            throw new Error(`Stok master botol ${tx.bottleType || "Kaca"} ${bottleSize} tidak ditemukan!`);
          }
        }

        mutationDescription = `Penjualan: ${tx.scentName || "Parfum"} (${tx.volumeMl}ml) + Botol ${tx.bottleSize} x ${tx.bottleCount}`;
      }

      // Update Cash Balance (Uang Masuk)
      const newBalance = currentBalance + tx.totalPrice;
      if (cashSnap.exists()) {
        transaction.update(cashRef, { balance: newBalance });
      } else {
        transaction.set(cashRef, { balance: newBalance });
      }

      // Record Cash Ledger Mutation
      const mutId = "mut_" + generateId();
      const mutationRef = doc(db, "cash_ledger", mutId);
      transaction.set(mutationRef, {
        id: mutId,
        date: dateStr,
        type: "in",
        amount: tx.totalPrice,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        description: mutationDescription,
        referenceId: id
      });

      // Update Customer Accumulation
      if (hasValidCustomer && customerRef && tx.customerName) {
        if (customerSnap && customerSnap.exists()) {
          const currentTotal = customerSnap.data().totalPurchase || 0;
          const currentClaims = customerSnap.data().claimedPromos || 0;
          if (tx.claimPromoOnThisTx) {
            const threshold = promoSnap.exists() ? (promoSnap.data().threshold ?? 500000) : 500000;
            if (currentTotal < threshold) {
              throw new Error("Akumulasi pembelian tidak mencukupi untuk klaim diskon promo!");
            }
            const newTotal = currentTotal - threshold + tx.totalPrice;
            transaction.update(customerRef, {
              totalPurchase: newTotal,
              claimedPromos: currentClaims + 1,
              updatedAt: dateStr
            });
          } else {
            transaction.update(customerRef, {
              totalPurchase: currentTotal + tx.totalPrice,
              updatedAt: dateStr
            });
          }
        } else {
          if (tx.claimPromoOnThisTx) {
            throw new Error("Pelanggan baru belum memiliki akumulasi pembelian untuk klaim promo!");
          }
          transaction.set(customerRef, {
            id: "cust_" + tx.customerName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_"),
            name: tx.customerName.trim(),
            totalPurchase: tx.totalPrice,
            claimedPromos: 0,
            updatedAt: dateStr
          });
        }
      }

    } else if (tx.type === "purchase") {
      // PEMBELIAN: menambah stok bibit/alkohol/botol, mengurangi kas
      const volumeToAdd = tx.volumeMl || 0;
      const bottleCountToAdd = tx.bottleCount || 0;

      if (currentBalance < tx.totalPrice) {
        throw new Error(`Saldo kas tidak mencukupi untuk pembelian ini! Tersisa: Rp ${currentBalance.toLocaleString("id-ID")}`);
      }

      // Update essence stock
      if (tx.category === "bibit" && tx.scentName && volumeToAdd > 0 && essenceRef && essenceSnap) {
        if (essenceSnap.exists()) {
          transaction.update(essenceRef, { quantity: essenceSnap.data().quantity + volumeToAdd });
        } else {
          // Create new essence stock item
          const essenceId = `essence_${tx.scentName.replace(/\s+/g, "_").toLowerCase()}`;
          transaction.set(essenceRef, {
            id: essenceId,
            type: "essence",
            scentName: tx.scentName,
            quantity: volumeToAdd
          });
        }

        // Check and create in price list and master products if not exists
        if (priceRef && (!priceSnap || !priceSnap.exists())) {
          transaction.set(priceRef, {
            scentName: tx.scentName,
            pricePerMl: 2000, // starting default price if new
            updatedAt: new Date().toISOString()
          });
        }
        if (masterProdRef && (!masterProdSnap || !masterProdSnap.exists())) {
          transaction.set(masterProdRef, {
            id: "prod_essence_" + tx.scentName.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
            name: tx.scentName,
            price: 2000,
            category: "essence",
            referenceKey: tx.scentName,
            updatedAt: new Date().toISOString()
          });
        }
      }

      // Update alcohol stock
      if (tx.category === "alkohol" && volumeToAdd > 0) {
        const isGel = tx.scentName === "Absolut Gel";
        const targetRef = isGel ? alcoholGelRef : alcoholCairRef;
        const targetSnap = isGel ? alcoholGelSnap : alcoholCairSnap;
        const targetId = isGel ? "alcohol_gel" : "alcohol_cair";
        const targetName = isGel ? "Absolut Gel" : "Absolut Cair";

        if (targetSnap && targetSnap.exists()) {
          transaction.update(targetRef, { quantity: targetSnap.data().quantity + volumeToAdd });
        } else {
          transaction.set(targetRef, {
            id: targetId,
            type: "alcohol",
            scentName: targetName,
            quantity: volumeToAdd
          });
        }
      }

      // Update bottle stock
      if (tx.category === "botol" && bottleSize !== "None" && bottleCountToAdd > 0 && bottleRef && bottleSnap) {
        if (bottleSnap.exists()) {
          transaction.update(bottleRef, { quantity: bottleSnap.data().quantity + bottleCountToAdd });
        } else {
          transaction.set(bottleRef, {
            id: `bottle_${bottleSize}_${tx.bottleType === "Plastik" ? "plastik" : "kaca"}`,
            type: "bottle",
            size: bottleSize,
            bottleType: tx.bottleType || "Kaca",
            quantity: bottleCountToAdd
          });
        }
      }

      // Update Cash Balance (Uang Keluar)
      const newBalance = currentBalance - tx.totalPrice;
      if (cashSnap.exists()) {
        transaction.update(cashRef, { balance: newBalance });
      } else {
        transaction.set(cashRef, { balance: newBalance });
      }

      // Record Cash Ledger Mutation
      const mutId = "mut_" + generateId();
      const mutationRef = doc(db, "cash_ledger", mutId);
      transaction.set(mutationRef, {
        id: mutId,
        date: dateStr,
        type: "out",
        amount: tx.totalPrice,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        description: `Pembelian stok: ${tx.category === "bibit" ? `Bibit ${tx.scentName}` : tx.category === "botol" ? `Botol ${tx.bottleSize}` : "Absolut"}`,
        referenceId: id
      });
    }

    // Save transaction document
    const txRef = doc(db, "transactions", id);
    transaction.set(txRef, { ...tx, id, date: dateStr });
  });

  return id;
}

export async function deleteTransaction(id: string) {
  await runTransaction(db, async (transaction) => {
    // 1. Fetch the transaction first
    const txRef = doc(db, "transactions", id);
    const txSnap = await transaction.get(txRef);
    if (!txSnap.exists()) {
      throw new Error("Transaksi tidak ditemukan!");
    }
    const tx = txSnap.data() as Transaction;

    // 2. Fetch cash balance
    const cashRef = doc(db, "config", "cash");
    const cashSnap = await transaction.get(cashRef);
    let currentBalance = 15000000;
    if (cashSnap.exists()) {
      currentBalance = cashSnap.data().balance;
    }

    // 3. Fetch essence / stocks ref if needed
    let essenceRef = null;
    let essenceSnap = null;
    if (tx.scentName && (tx.volumeMl || 0) > 0) {
      const essenceId = getNormalizedEssenceStockId(tx.scentName);
      essenceRef = doc(db, "stocks", essenceId);
      essenceSnap = await transaction.get(essenceRef);
    }

    const alcoholCairRef = doc(db, "stocks", "alcohol_cair");
    const alcoholCairSnap = await transaction.get(alcoholCairRef);

    const alcoholGelRef = doc(db, "stocks", "alcohol_gel");
    const alcoholGelSnap = await transaction.get(alcoholGelRef);

    let bottleRef = null;
    let bottleSnap = null;
    const bottleSize = tx.bottleSize || "None";
    const bottleCount = tx.bottleCount || 0;
    if (bottleSize !== "None" && bottleCount > 0) {
      const bottleId = getNormalizedBottleStockId(bottleSize, tx.bottleType);
      bottleRef = doc(db, "stocks", bottleId);
      bottleSnap = await transaction.get(bottleRef);
    }

    // Customer Ref & Read
    let customerRef = null;
    let customerSnap = null;
    const hasValidCustomer = tx.type === "sale" && tx.customerName && tx.customerName.trim().toLowerCase() !== "pelanggan umum";
    if (hasValidCustomer && tx.customerName) {
      const custId = "cust_" + tx.customerName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
      customerRef = doc(db, "customers", custId);
      customerSnap = await transaction.get(customerRef);
    }

    // 4. Perform the inverse stock / cash operations
    let newBalance = currentBalance;
    const dateStr = new Date().toISOString();

    if (tx.type === "sale") {
      // Revert SALE (penjualan)
      if (tx.items && tx.items.length > 0) {
        // Multi-item revert
        let totalAlcoholRestore = 0;
        for (const item of tx.items) {
          if (item.scentName && (item.volumeMl || 0) > 0) {
            const essenceId = getNormalizedEssenceStockId(item.scentName);
            const essRef = doc(db, "stocks", essenceId);
            const essSnap = await transaction.get(essRef);
            if (essSnap.exists()) {
              transaction.update(essRef, { quantity: essSnap.data().quantity + (item.volumeMl || 0) });
            }
          }
          if (item.bottleSize && item.bottleSize !== "None" && (item.bottleCount || 0) > 0) {
            // Restore bottle
            if (!item.bringOwnBottle) {
              const botId = getNormalizedBottleStockId(item.bottleSize, item.bottleType);
              const botRef = doc(db, "stocks", botId);
              const botSnap = await transaction.get(botRef);
              if (botSnap.exists()) {
                transaction.update(botRef, { quantity: botSnap.data().quantity + item.bottleCount });
              }
            }
            // Calculate alcohol to restore
            const bottleCapacity = parseInt(item.bottleSize);
            if (!isNaN(bottleCapacity)) {
              const diff = bottleCapacity - (item.volumeMl || 0);
              if (diff > 0) {
                totalAlcoholRestore += diff * (item.bottleCount || 0);
              }
            }
          }
        }
        if (totalAlcoholRestore > 0 && alcoholCairSnap.exists()) {
          transaction.update(alcoholCairRef, { quantity: alcoholCairSnap.data().quantity + totalAlcoholRestore });
        }
      } else {
        // Single-item fallback revert
        // Add back essence stock
        if (tx.scentName && (tx.volumeMl || 0) > 0 && essenceRef && essenceSnap) {
          if (essenceSnap.exists()) {
            const currentQty = essenceSnap.data().quantity;
            transaction.update(essenceRef, { quantity: currentQty + (tx.volumeMl || 0) });
          }
        }

        // Add back alcohol stock
        if (alcoholCairSnap.exists() && tx.volumeMl && tx.volumeMl > 0) {
          const alcoholQty = alcoholCairSnap.data().quantity;
          let alcoholDeduct = 0;
          if (bottleSize !== "None") {
            const bottleCapacity = parseInt(bottleSize);
            if (!isNaN(bottleCapacity)) {
              const diff = bottleCapacity - (tx.volumeMl || 0);
              if (diff > 0) {
                alcoholDeduct = diff * (tx.bottleCount || 1);
              }
            }
          }
          if (alcoholDeduct === 0) {
            alcoholDeduct = Math.round(tx.volumeMl * 0.5);
          }
          transaction.update(alcoholCairRef, { quantity: alcoholQty + alcoholDeduct });
        }

        // Add back bottle stock
        if (!tx.bringOwnBottle && bottleSize !== "None" && bottleCount > 0 && bottleRef && bottleSnap) {
          if (bottleSnap.exists()) {
            const currentQty = bottleSnap.data().quantity;
            transaction.update(bottleRef, { quantity: currentQty + bottleCount });
          }
        }
      }

      // Deduct cash balance (since we refund/cancel sale)
      newBalance = currentBalance - tx.totalPrice;
      if (cashSnap.exists()) {
        transaction.update(cashRef, { balance: newBalance });
      } else {
        transaction.set(cashRef, { balance: newBalance });
      }

      // Record reverse Cash Ledger Mutation
      const mutId = "mut_" + generateId();
      const mutationRef = doc(db, "cash_ledger", mutId);
      transaction.set(mutationRef, {
        id: mutId,
        date: dateStr,
        type: "out",
        amount: tx.totalPrice,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        description: `Pembatalan Penjualan: ${tx.scentName || "Parfum"} (${tx.volumeMl}ml) + Botol ${tx.bottleSize} x ${tx.bottleCount}`,
        referenceId: id
      });

      // Revert customer accumulation
      if (hasValidCustomer && customerRef && customerSnap && customerSnap.exists()) {
        const currentTotal = customerSnap.data().totalPurchase || 0;
        const newTotal = Math.max(0, currentTotal - tx.totalPrice);
        transaction.update(customerRef, {
          totalPurchase: newTotal,
          updatedAt: dateStr
        });
      }

    } else if (tx.type === "purchase") {
      // Revert PURCHASE (pembelian)
      // Deduct essence stock
      if (tx.category === "bibit" && tx.scentName && (tx.volumeMl || 0) > 0 && essenceRef && essenceSnap) {
        if (essenceSnap.exists()) {
          const currentQty = essenceSnap.data().quantity;
          const targetQty = Math.max(0, currentQty - (tx.volumeMl || 0));
          transaction.update(essenceRef, { quantity: targetQty });
        }
      }

      // Deduct alcohol stock
      if (tx.category === "alkohol" && (tx.volumeMl || 0) > 0) {
        const isGel = tx.scentName === "Absolut Gel";
        const targetSnap = isGel ? alcoholGelSnap : alcoholCairSnap;
        const targetRef = isGel ? alcoholGelRef : alcoholCairRef;
        if (targetSnap && targetSnap.exists()) {
          const alcoholQty = targetSnap.data().quantity;
          const targetQty = Math.max(0, alcoholQty - (tx.volumeMl || 0));
          transaction.update(targetRef, { quantity: targetQty });
        }
      }

      // Deduct bottle stock
      if (tx.category === "botol" && bottleSize !== "None" && bottleCount > 0 && bottleRef && bottleSnap) {
        if (bottleSnap.exists()) {
          const currentQty = bottleSnap.data().quantity;
          const targetQty = Math.max(0, currentQty - bottleCount);
          transaction.update(bottleRef, { quantity: targetQty });
        }
      }

      // Add back cash balance (since we cancel purchase)
      newBalance = currentBalance + tx.totalPrice;
      if (cashSnap.exists()) {
        transaction.update(cashRef, { balance: newBalance });
      } else {
        transaction.set(cashRef, { balance: newBalance });
      }

      // Record reverse Cash Ledger Mutation
      const mutId = "mut_" + generateId();
      const mutationRef = doc(db, "cash_ledger", mutId);
      transaction.set(mutationRef, {
        id: mutId,
        date: dateStr,
        type: "in",
        amount: tx.totalPrice,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        description: `Pembatalan Pembelian: ${tx.category === "bibit" ? `Bibit ${tx.scentName}` : tx.category === "botol" ? `Botol ${tx.bottleSize}` : "Absolut"}`,
        referenceId: id
      });
    }

    // Finally delete the transaction document
    transaction.delete(txRef);
  });
}

// ==========================================
// MASTER SALARIES (GAJI KARYAWAN)
// ==========================================
export function subscribeToSalaries(callback: (salaries: Salary[]) => void) {
  return onSnapshot(collection(db, "salaries"), (snapshot) => {
    const list: Salary[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Salary);
    });
    list.sort((a, b) => b.datePaid.localeCompare(a.datePaid));
    callback(list);
  });
}

export async function addSalary(salary: Omit<Salary, "id">) {
  const id = "salary_" + generateId();
  const dateStr = salary.datePaid || new Date().toISOString();

  await runTransaction(db, async (transaction) => {
    // 1. Fetch current cash balance
    const cashRef = doc(db, "config", "cash");
    const cashSnap = await transaction.get(cashRef);
    let currentBalance = 15000000;
    if (cashSnap.exists()) {
      currentBalance = cashSnap.data().balance;
    }

    if (currentBalance < salary.amount) {
      throw new Error(`Saldo kas tidak mencukupi untuk bayar gaji! Tersisa: Rp ${currentBalance.toLocaleString("id-ID")}`);
    }

    // 2. Deduct Cash
    const newBalance = currentBalance - salary.amount;
    if (cashSnap.exists()) {
      transaction.update(cashRef, { balance: newBalance });
    } else {
      transaction.set(cashRef, { balance: newBalance });
    }

    // 3. Record Cash Mutation
    const mutId = "mut_" + generateId();
    const mutationRef = doc(db, "cash_ledger", mutId);
    transaction.set(mutationRef, {
      id: mutId,
      date: dateStr,
      type: "out",
      amount: salary.amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      description: `Gaji karyawan: ${salary.employeeName} (${salary.month})`,
      referenceId: id
    });

    // 4. Save Salary record
    const salaryRef = doc(db, "salaries", id);
    transaction.set(salaryRef, { ...salary, id, datePaid: dateStr });
  });

  return id;
}

export async function deleteSalary(id: string, amount: number) {
  // If a salary is deleted, let's reverse the cash balance
  await runTransaction(db, async (transaction) => {
    const cashRef = doc(db, "config", "cash");
    const cashSnap = await transaction.get(cashRef);
    if (cashSnap.exists()) {
      const currentBalance = cashSnap.data().balance;
      const newBalance = currentBalance + amount;
      transaction.update(cashRef, { balance: newBalance });

      // Create counter-mutation
      const mutId = "mut_" + generateId();
      transaction.set(doc(db, "cash_ledger", mutId), {
        id: mutId,
        date: new Date().toISOString(),
        type: "in",
        amount: amount,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        description: `Batal Gaji Karyawan Ref ID: ${id}`,
        referenceId: id
      });
    }

    transaction.delete(doc(db, "salaries", id));
  });
}

// ==========================================
// CASH LEDGER (KAS BESAR MUTASI)
// ==========================================
export function subscribeToCashLedger(callback: (mutations: CashMutation[]) => void) {
  return onSnapshot(
    query(collection(db, "cash_ledger"), orderBy("date", "desc")),
    (snapshot) => {
      const list: CashMutation[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as CashMutation);
      });
      callback(list);
    }
  );
}

// Adding custom manual cash entry (e.g. inject capital or manual expense)
export async function addManualCashMutation(type: "in" | "out", amount: number, description: string) {
  const id = "mut_manual_" + generateId();
  const dateStr = new Date().toISOString();

  await runTransaction(db, async (transaction) => {
    const cashRef = doc(db, "config", "cash");
    const cashSnap = await transaction.get(cashRef);
    let currentBalance = 0;
    if (cashSnap.exists()) {
      currentBalance = cashSnap.data().balance;
    }

    if (type === "out" && currentBalance < amount) {
      throw new Error(`Saldo kas tidak mencukupi! Tersisa: Rp ${currentBalance.toLocaleString("id-ID")}`);
    }

    const newBalance = type === "in" ? currentBalance + amount : currentBalance - amount;
    if (cashSnap.exists()) {
      transaction.update(cashRef, { balance: newBalance });
    } else {
      transaction.set(cashRef, { balance: newBalance });
    }

    transaction.set(doc(db, "cash_ledger", id), {
      id,
      date: dateStr,
      type,
      amount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      description: `Manual: ${description}`,
      referenceId: "manual"
    });
  });
}

// ==========================================
// CLIENTS MANAGEMENT (WHITELIST ACCESS)
// ==========================================
export function subscribeToClients(
  callback: (users: UserProfile[]) => void,
  errorCallback?: (error: any) => void
) {
  return onSnapshot(
    collection(db, "users"),
    (snapshot) => {
      const userMap = new Map<string, UserProfile>();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as UserProfile;
        if (data.email) {
          const key = data.email.trim().toLowerCase();
          if (!userMap.has(key) || data.password) {
            userMap.set(key, data);
          }
        }
      });
      const list = Array.from(userMap.values());
      list.sort((a, b) => (a.email || "").localeCompare(b.email || ""));
      callback(list);
    },
    (error) => {
      if (errorCallback) {
        errorCallback(error);
      } else {
        console.error("Error in subscribeToClients:", error);
      }
    }
  );
}

export async function addClientUser(email: string, role: "admin" | "client" | "reseller" = "client", password?: string, username?: string) {
  const emailClean = email.trim().toLowerCase();
  const data: any = {
    email: emailClean,
    role,
    addedAt: new Date().toISOString()
  };
  if (password) {
    data.password = password;
  }
  if (username) {
    data.username = username.trim().toLowerCase();
  }
  await setDoc(doc(db, "users", emailClean), data);

  if (username) {
    const unameClean = username.trim().toLowerCase();
    if (unameClean && unameClean !== emailClean) {
      await setDoc(doc(db, "users", unameClean), data);
    }
  }
}

export async function deleteClientUser(email: string, username?: string) {
  const emailClean = email.trim().toLowerCase();
  if (emailClean === "bastikacorp@gmail.com") {
    throw new Error("Admin utama 'bastikacorp@gmail.com' tidak bisa dihapus!");
  }
  await deleteDoc(doc(db, "users", emailClean));
  const uname = username || emailClean.split("@")[0];
  if (uname && uname !== emailClean) {
    await deleteDoc(doc(db, "users", uname));
  }
}

// ==========================================
// CUSTOM BOTTLE SIZES SERVICE
// ==========================================
export function subscribeToBottleSizes(callback: (sizes: BottleSize[]) => void, errorCallback?: (error: any) => void) {
  return onSnapshot(
    query(collection(db, "bottle_sizes"), orderBy("addedAt", "asc")),
    async (snapshot) => {
      const list: BottleSize[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as BottleSize);
      });
      
      if (list.length === 0) {
        // Auto-seed default bottle sizes if empty
        const defaults: BottleSize[] = [
          { id: "30ml", size: "30ml", price: 10000, addedAt: new Date().toISOString() },
          { id: "50ml", size: "50ml", price: 15000, addedAt: new Date().toISOString() },
          { id: "100ml", size: "100ml", price: 25000, addedAt: new Date().toISOString() }
        ];
        try {
          for (const item of defaults) {
            await setDoc(doc(db, "bottle_sizes", item.id), item);
          }
        } catch (err) {
          console.error("Gagal auto-seed bottle_sizes:", err);
        }
        return;
      }
      
      callback(list);
    },
    (error) => {
      if (errorCallback) {
        errorCallback(error);
      } else {
        console.error("Error in subscribeToBottleSizes:", error);
      }
    }
  );
}

export async function addBottleSize(
  size: string,
  priceKaca: number,
  pricePlastik: number,
  purchasePriceKaca: number,
  purchasePricePlastik: number
) {
  const cleanSize = size.trim();
  const id = cleanSize.toLowerCase().replace(/\s+/g, "");
  
  // 1. Add to bottle_sizes
  await setDoc(doc(db, "bottle_sizes", id), {
    id,
    size: cleanSize,
    price: priceKaca, // legacy/fallback
    priceKaca,
    pricePlastik,
    purchasePriceKaca,
    purchasePricePlastik,
    addedAt: new Date().toISOString()
  });

  // 2. Ensure stock document exists for Glass size
  const stockKacaId = `bottle_${cleanSize}_kaca`;
  const stockKacaRef = doc(db, "stocks", stockKacaId);
  const stockKacaSnap = await getDoc(stockKacaRef);
  if (!stockKacaSnap.exists()) {
    await setDoc(stockKacaRef, {
      id: stockKacaId,
      type: "bottle",
      size: cleanSize,
      bottleType: "Kaca",
      quantity: 0
    });
  }

  // 3. Ensure stock document exists for Plastic size
  const stockPlastikId = `bottle_${cleanSize}_plastik`;
  const stockPlastikRef = doc(db, "stocks", stockPlastikId);
  const stockPlastikSnap = await getDoc(stockPlastikRef);
  if (!stockPlastikSnap.exists()) {
    await setDoc(stockPlastikRef, {
      id: stockPlastikId,
      type: "bottle",
      size: cleanSize,
      bottleType: "Plastik",
      quantity: 0
    });
  }

  // 4. Ensure master products exist for this bottle size
  const prodKacaId = "prod_bottle_kaca_" + id;
  const prodKacaRef = doc(db, "master_products", prodKacaId);
  const prodKacaSnap = await getDoc(prodKacaRef);
  if (!prodKacaSnap.exists()) {
    await setDoc(prodKacaRef, {
      id: prodKacaId,
      name: `Botol Kaca ${cleanSize}`,
      price: priceKaca,
      category: "bottle_kaca",
      referenceKey: cleanSize,
      updatedAt: new Date().toISOString()
    });
  }

  const prodPlastikId = "prod_bottle_plastik_" + id;
  const prodPlastikRef = doc(db, "master_products", prodPlastikId);
  const prodPlastikSnap = await getDoc(prodPlastikRef);
  if (!prodPlastikSnap.exists()) {
    await setDoc(prodPlastikRef, {
      id: prodPlastikId,
      name: `Botol Plastik ${cleanSize}`,
      price: pricePlastik,
      category: "bottle_plastik",
      referenceKey: cleanSize,
      updatedAt: new Date().toISOString()
    });
  }
}

export async function deleteBottleSize(id: string) {
  await deleteDoc(doc(db, "bottle_sizes", id));
}

// Update or set initial capital
export async function updateInitialCapital(amount: number) {
  await runTransaction(db, async (transaction) => {
    const cashRef = doc(db, "config", "cash");
    const cashSnap = await transaction.get(cashRef);
    let currentBalance = 0;
    if (cashSnap.exists()) {
      currentBalance = cashSnap.data().balance;
    }

    const initMutRef = doc(db, "cash_ledger", "mut_init");
    const initMutSnap = await transaction.get(initMutRef);
    let oldAmount = 0;
    if (initMutSnap.exists()) {
      oldAmount = initMutSnap.data().amount;
    }

    const difference = amount - oldAmount;
    const newBalance = currentBalance + difference;

    if (cashSnap.exists()) {
      transaction.update(cashRef, { balance: newBalance });
    } else {
      transaction.set(cashRef, { balance: newBalance });
    }

    transaction.set(initMutRef, {
      id: "mut_init",
      date: initMutSnap.exists() ? initMutSnap.data().date : new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      type: "in",
      amount: amount,
      balanceBefore: 0,
      balanceAfter: amount,
      description: "Modal awal usaha BASTIKA PARFUM",
      referenceId: "modal_awal"
    });
  });
}

// ==========================================
// INVOICE SETTINGS SERVICE
// ==========================================
export function subscribeToInvoiceSettings(callback: (settings: InvoiceSettings) => void) {
  const defaultSettings: InvoiceSettings = {
    storeName: "BASTIKA PARFUM",
    slogan: "THE PREMIUM SCENTS",
    address: "Komp. Ruko Bastika, Jl. Raya Wangi No. 5, Jakarta",
    phone: "0812-3456-7890",
    headerMessage: "BUKTI PENJUALAN RESMI",
    footerMessage1: "Terima Kasih Atas Kunjungan Anda",
    footerMessage2: "Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.",
    paperWidth: "58mm",
    logoUrl: "/icon.jpg",
    showLogo: true,
    fontSize: "md"
  };

  return onSnapshot(doc(db, "config", "invoice"), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback({
        ...defaultSettings,
        ...data,
        logoUrl: (data.logoUrl && typeof data.logoUrl === "string" && data.logoUrl.trim() !== "") ? data.logoUrl : "/icon.jpg",
        showLogo: data.showLogo !== false
      } as InvoiceSettings);
    } else {
      callback(defaultSettings);
    }
  });
}

export async function updateInvoiceSettings(settings: InvoiceSettings) {
  await setDoc(doc(db, "config", "invoice"), settings);
}

// ==========================================
// CUSTOMER & PROMO SERVICE
// ==========================================
export function subscribeToCustomers(callback: (customers: Customer[]) => void) {
  return onSnapshot(collection(db, "customers"), (snapshot) => {
    const list: Customer[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Customer);
    });
    callback(list);
  });
}

export interface PromoConfig {
  threshold: number;
  discountAmount: number;
}

export async function updatePromoConfig(threshold: number, discountAmount: number) {
  const promoRef = doc(db, "config", "promo");
  await setDoc(promoRef, { threshold, discountAmount, updatedAt: new Date().toISOString() });
}

export function subscribeToPromoConfig(callback: (config: PromoConfig) => void) {
  const promoRef = doc(db, "config", "promo");
  return onSnapshot(promoRef, (docSnap) => {
    const defaultData = { threshold: 500000, discountAmount: 50000 };
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback({
        threshold: data.threshold !== undefined ? data.threshold : defaultData.threshold,
        discountAmount: data.discountAmount !== undefined ? data.discountAmount : defaultData.discountAmount
      });
    } else {
      callback(defaultData);
    }
  });
}

export async function claimCustomerPromo(customerId: string, operatorEmail: string) {
  return await runTransaction(db, async (transaction) => {
    // 1. Fetch promo config (Read)
    const promoRef = doc(db, "config", "promo");
    const promoSnap = await transaction.get(promoRef);

    // 2. Fetch customer (Read)
    const customerRef = doc(db, "customers", customerId);
    const customerSnap = await transaction.get(customerRef);

    // 3. Fetch cash config (Read)
    const cashRef = doc(db, "config", "cash");
    const cashSnap = await transaction.get(cashRef);

    // ==========================================
    // VALIDATIONS AND COMPUTATIONS (No side-effects)
    // ==========================================
    const threshold = promoSnap.exists() ? (promoSnap.data().threshold ?? 500000) : 500000;
    const discountAmount = promoSnap.exists() ? (promoSnap.data().discountAmount ?? 50000) : 50000;

    if (!customerSnap.exists()) {
      throw new Error("Pelanggan tidak ditemukan!");
    }
    const currentTotal = customerSnap.data().totalPurchase;
    const customerName = customerSnap.data().name;
    if (currentTotal < threshold) {
      throw new Error(`Akumulasi pembelian tidak mencukupi untuk klaim promo! Minimal Rp ${threshold.toLocaleString("id-ID")}`);
    }

    const newTotal = currentTotal - threshold;
    const currentClaims = customerSnap.data().claimedPromos || 0;

    let currentBalance = 15000000;
    if (cashSnap.exists()) {
      currentBalance = cashSnap.data().balance;
    }
    const newBalance = currentBalance - discountAmount;

    // ==========================================
    // WRITE OPERATIONS (EXECUTE AFTER ALL READS)
    // ==========================================

    // A. Update customer total & claim count
    transaction.update(customerRef, {
      totalPurchase: newTotal,
      claimedPromos: currentClaims + 1,
      updatedAt: new Date().toISOString()
    });

    // B. Update cash balance
    transaction.update(cashRef, { balance: newBalance });

    // C. Record cash mutation (outflow)
    const mutId = "mut_" + generateId();
    const mutationRef = doc(db, "cash_ledger", mutId);
    transaction.set(mutationRef, {
      id: mutId,
      date: new Date().toISOString(),
      type: "out",
      amount: discountAmount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      description: `Klaim Promo Potongan Pelanggan: ${customerName} (Potongan Rp ${discountAmount.toLocaleString("id-ID")})`,
      referenceId: customerId
    });

    // D. Record Transaction document so we can view and print it as an invoice!
    const txId = "tx_" + generateId();
    const txRef = doc(db, "transactions", txId);
    const newTx = {
      id: txId,
      type: "sale" as const,
      category: "other" as const,
      date: new Date().toISOString(),
      scentName: "Klaim Promo Potongan",
      volumeMl: 0,
      bottleSize: "None",
      bottleCount: 0,
      totalPrice: -discountAmount, // Negative price since it's a discount
      discountType: "nominal" as const,
      discountNominal: discountAmount,
      description: `Klaim Diskon Promo secara Global oleh ${customerName}`,
      operatorEmail: operatorEmail,
      customerName: customerName
    };
    transaction.set(txRef, newTx);

    return newTx;
  });
}

export async function updateCustomerName(customerId: string, newName: string) {
  const customerRef = doc(db, "customers", customerId);
  const customerSnap = await getDoc(customerRef);
  if (!customerSnap.exists()) {
    throw new Error("Pelanggan tidak ditemukan!");
  }
  const oldName = customerSnap.data().name;
  const trimmedNewName = newName.trim();
  if (!trimmedNewName) {
    throw new Error("Nama baru tidak boleh kosong!");
  }

  // 1. Update customer document name
  await updateDoc(customerRef, {
    name: trimmedNewName,
    updatedAt: new Date().toISOString()
  });

  // 2. Query and update all transactions with the old name
  const txQuery = query(collection(db, "transactions"), where("customerName", "==", oldName));
  const txSnap = await getDocs(txQuery);
  const batch = writeBatch(db);
  txSnap.forEach((docSnap) => {
    batch.update(docSnap.ref, { customerName: trimmedNewName });
  });
  await batch.commit();
}

export async function deleteCustomer(customerId: string) {
  const customerRef = doc(db, "customers", customerId);
  const customerSnap = await getDoc(customerRef);
  if (!customerSnap.exists()) {
    throw new Error("Pelanggan tidak ditemukan!");
  }
  const oldName = customerSnap.data().name;

  // 1. Delete customer document
  await deleteDoc(customerRef);

  // 2. Query and update all transactions with the old name to "Pelanggan Umum"
  const txQuery = query(collection(db, "transactions"), where("customerName", "==", oldName));
  const txSnap = await getDocs(txQuery);
  const batch = writeBatch(db);
  txSnap.forEach((docSnap) => {
    batch.update(docSnap.ref, { customerName: "Pelanggan Umum" });
  });
  await batch.commit();
}

// ==========================================
// DATABASE BACKUP & RESTORE SERVICE (ADMIN ONLY)
// ==========================================
export async function exportDatabaseData() {
  const collections = [
    "users",
    "prices",
    "shelves",
    "stocks",
    "transactions",
    "salaries",
    "cash_ledger",
    "bottle_sizes",
    "customers",
    "config"
  ];
  const backupData: Record<string, any[]> = {};

  for (const colName of collections) {
    const colRef = collection(db, colName);
    const snap = await getDocs(colRef);
    const docsList: any[] = [];
    snap.forEach((d) => {
      docsList.push({ id: d.id, ...d.data() });
    });
    backupData[colName] = docsList;
  }

  return backupData;
}

export async function clearEntireDatabase() {
  const collections = [
    "users",
    "prices",
    "shelves",
    "stocks",
    "transactions",
    "salaries",
    "cash_ledger",
    "bottle_sizes",
    "customers",
    "config"
  ];

  for (const colName of collections) {
    const colRef = collection(db, colName);
    const snap = await getDocs(colRef);
    
    const deletePromises: Promise<any>[] = [];
    snap.forEach((docSnap) => {
      deletePromises.push(deleteDoc(docSnap.ref));
    });
    await Promise.all(deletePromises);
  }
}

export async function importDatabaseData(backupData: Record<string, any[]>, mode: "clean" | "merge") {
  const expectedCollections = [
    "users",
    "prices",
    "shelves",
    "stocks",
    "transactions",
    "salaries",
    "cash_ledger",
    "bottle_sizes",
    "customers",
    "config"
  ];
  
  let hasValidKeys = false;
  for (const col of expectedCollections) {
    if (Array.isArray(backupData[col])) {
      hasValidKeys = true;
    }
  }
  
  if (!hasValidKeys) {
    throw new Error("Format file backup tidak valid atau tidak memiliki data Bastika Parfum!");
  }

  if (mode === "clean") {
    await clearEntireDatabase();
  }

  for (const colName of expectedCollections) {
    const dataList = backupData[colName];
    if (!Array.isArray(dataList)) continue;

    for (const docData of dataList) {
      if (!docData.id) continue;
      const { id, ...fields } = docData;
      
      const docRef = doc(db, colName, id);
      
      if (mode === "merge") {
        await setDoc(docRef, fields, { merge: true });
      } else {
        await setDoc(docRef, fields);
      }
    }
  }
}

// ==========================================
// KONSINYASI & BUNDLING SERVICES
// ==========================================

export function subscribeToResellerStocks(callback: (stocks: ResellerStock[]) => void) {
  return onSnapshot(collection(db, "reseller_stocks"), (snapshot) => {
    const list: ResellerStock[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as ResellerStock);
    });
    callback(list);
  });
}

export function subscribeToResellerPackageStocks(callback: (stocks: ResellerPackageStock[]) => void) {
  return onSnapshot(collection(db, "reseller_package_stocks"), (snapshot) => {
    const list: ResellerPackageStock[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as ResellerPackageStock);
    });
    callback(list);
  });
}

function getPackageIngredients(pkg: BundlingPackage): FormulaIngredient[] {
  if (pkg.ingredients && pkg.ingredients.length > 0) {
    return pkg.ingredients;
  }
  const list: FormulaIngredient[] = [];
  if (pkg.scentName) {
    list.push({
      type: "essence",
      scentName: pkg.scentName,
      quantity: pkg.essenceMl
    });
  }
  list.push({
    type: "bottle",
    size: pkg.bottleSize,
    bottleType: "Kaca",
    quantity: 1
  });
  list.push({
    type: "alcohol",
    solventType: pkg.solventType || "Absolut Cair",
    quantity: pkg.alcoholMl
  });
  return list;
}

function getStockDocId(ing: FormulaIngredient): string {
  if (ing.type === "essence") {
    return getNormalizedEssenceStockId(ing.scentName);
  } else if (ing.type === "bottle") {
    return getNormalizedBottleStockId(ing.size, ing.bottleType);
  } else {
    return (ing.solventType === "Absolut Gel" || ing.scentName === "Absolut Gel") ? "alcohol_gel" : "alcohol_cair";
  }
}

export async function sendBundlingPackageToReseller(
  resellerEmail: string,
  packageId: string,
  quantity: number,
  operatorEmail: string
) {
  const safeEmail = resellerEmail.trim().toLowerCase().replace(/[^a-z0-9@.]+/g, "_");
  const resellerPkgStockId = `${safeEmail}_${packageId}`;

  await runTransaction(db, async (transaction) => {
    // 1. Get bundling package details (Read 1)
    const pkgRef = doc(db, "bundling_packages", packageId);
    const pkgSnap = await transaction.get(pkgRef);
    if (!pkgSnap.exists()) {
      throw new Error("Formula paket bundling tidak ditemukan!");
    }
    const pkg = pkgSnap.data() as BundlingPackage;

    const ingredients = getPackageIngredients(pkg);
    
    // Create stock refs
    const ingredientRefs = ingredients.map(ing => {
      const stockId = getStockDocId(ing);
      return {
        ref: doc(db, "stocks", stockId),
        ing,
        stockId
      };
    });

    // Fetch all stock snapshots inside transaction (READS first!)
    const snaps: { [stockId: string]: DocumentSnapshot } = {};
    for (const item of ingredientRefs) {
      if (!snaps[item.stockId]) {
        snaps[item.stockId] = await transaction.get(item.ref);
      }
    }

    const resellerPkgStockRef = doc(db, "reseller_package_stocks", resellerPkgStockId);
    const resellerPkgStockSnap = await transaction.get(resellerPkgStockRef);

    // Verify availability in master stocks
    for (const item of ingredientRefs) {
      const snap = snaps[item.stockId];
      const needed = item.ing.quantity * quantity;
      const available = snap.exists() ? (snap.data().quantity || 0) : 0;
      if (available < needed) {
        let displayName = "";
        if (item.ing.type === "essence") {
          displayName = `bibit aroma ${item.ing.scentName}`;
        } else if (item.ing.type === "bottle") {
          displayName = `botol ${item.ing.size} (${item.ing.bottleType})`;
        } else {
          displayName = `cairan pelarut (${item.ing.solventType})`;
        }
        throw new Error(`Stok utama ${displayName} tidak mencukupi! Tersedia: ${available} unit, Butuh: ${needed} unit`);
      }
    }

    // === ALL READS COMPLETED. NOW DO ALL WRITES ===

    // Perform master stock deductions
    for (const item of ingredientRefs) {
      const snap = snaps[item.stockId];
      const needed = item.ing.quantity * quantity;
      const current = snap.exists() ? (snap.data().quantity || 0) : 0;
      transaction.update(item.ref, { quantity: current - needed });
    }

    // Increment Reseller Package Stock
    if (resellerPkgStockSnap.exists()) {
      const currentQty = resellerPkgStockSnap.data().quantity || 0;
      transaction.update(resellerPkgStockRef, { quantity: currentQty + quantity });
    } else {
      transaction.set(resellerPkgStockRef, {
        id: resellerPkgStockId,
        resellerEmail: resellerEmail.trim().toLowerCase(),
        packageId,
        packageName: pkg.packageName,
        scentName: pkg.scentName || (ingredients.find(i => i.type === "essence")?.scentName || "Multi Scent"),
        bottleSize: pkg.bottleSize || (ingredients.find(i => i.type === "bottle")?.size || "Custom"),
        quantity: quantity
      });
    }

    // Log the transfer transaction
    const txId = "tx_transfer_" + generateId();
    const txRef = doc(db, "transactions", txId);
    transaction.set(txRef, {
      id: txId,
      type: "transfer",
      date: new Date().toISOString(),
      category: "bundling",
      scentName: pkg.scentName || (ingredients.find(i => i.type === "essence")?.scentName || "Multi Scent"),
      bottleSize: pkg.bottleSize || (ingredients.find(i => i.type === "bottle")?.size || "Custom"),
      bottleCount: quantity,
      volumeMl: (pkg.essenceMl || (ingredients.find(i => i.type === "essence")?.quantity || 0)) * quantity,
      totalPrice: 0,
      description: `Kirim Paket Bundling ${pkg.packageName} sebanyak ${quantity} unit ke ${resellerEmail}`,
      operatorEmail,
      resellerEmail: resellerEmail.trim().toLowerCase(),
      isConsignment: true,
      packageName: pkg.packageName
    });
  });
}

export async function deleteResellerPackageStock(
  stockId: string,
  resellerEmail?: string,
  packageName?: string,
  operatorEmail?: string
) {
  const stockRef = doc(db, "reseller_package_stocks", stockId);
  await deleteDoc(stockRef);

  if (resellerEmail && packageName) {
    const txId = "tx_transfer_" + generateId();
    await setDoc(doc(db, "transactions", txId), {
      id: txId,
      type: "transfer",
      date: new Date().toISOString(),
      category: "bundling",
      scentName: "Custom",
      bottleSize: "Custom",
      bottleCount: 0,
      volumeMl: 0,
      totalPrice: 0,
      description: `Hapus Langsung Paket Titipan ${packageName} dari reseller ${resellerEmail}`,
      operatorEmail: operatorEmail || "admin",
      resellerEmail: resellerEmail.trim().toLowerCase(),
      isConsignment: true,
      packageName
    });
  }
}

export async function returBundlingPackageFromReseller(
  resellerEmail: string,
  packageId: string,
  quantityToReturn: number,
  operatorEmail: string,
  stockDocId?: string
) {
  const safeEmail = resellerEmail.trim().toLowerCase().replace(/[^a-z0-9@.]+/g, "_");
  const defaultStockId = `${safeEmail}_${packageId}`;
  const targetDocId = stockDocId || defaultStockId;

  await runTransaction(db, async (transaction) => {
    // 1. Get reseller package stock doc first!
    const resellerPkgStockRef = doc(db, "reseller_package_stocks", targetDocId);
    let resellerPkgStockSnap = await transaction.get(resellerPkgStockRef);

    // Fallback: if not found by targetDocId, try defaultStockId
    if (!resellerPkgStockSnap.exists() && targetDocId !== defaultStockId) {
      const fallbackRef = doc(db, "reseller_package_stocks", defaultStockId);
      const fallbackSnap = await transaction.get(fallbackRef);
      if (fallbackSnap.exists()) {
        resellerPkgStockSnap = fallbackSnap;
      }
    }

    if (!resellerPkgStockSnap.exists()) {
      throw new Error("Stok paket reseller tidak ditemukan!");
    }

    const resellerStockData = resellerPkgStockSnap.data() as ResellerPackageStock;
    const currentResellerQty = resellerStockData.quantity || 0;
    if (currentResellerQty < quantityToReturn) {
      throw new Error(`Stok paket reseller tidak mencukupi untuk di-retur! Tersedia: ${currentResellerQty} pcs, Ingin di-retur: ${quantityToReturn} pcs`);
    }

    // 2. Try to get bundling package details (or fallback if deleted)
    const pkgRef = doc(db, "bundling_packages", packageId);
    const pkgSnap = await transaction.get(pkgRef);

    let ingredients: FormulaIngredient[] = [];
    let pkgName = resellerStockData.packageName || "Paket Bundling";
    let scentName = resellerStockData.scentName || "Multi Scent";
    let bottleSize = resellerStockData.bottleSize || "30ml";

    if (pkgSnap.exists()) {
      const pkg = pkgSnap.data() as BundlingPackage;
      pkgName = pkg.packageName || pkgName;
      scentName = pkg.scentName || scentName;
      bottleSize = pkg.bottleSize || bottleSize;
      ingredients = getPackageIngredients(pkg);
    } else {
      // Fallback: construct standard ingredients from resellerStockData if pkg formula was deleted
      const essenceMl = 10;
      const alcoholMl = 20;
      ingredients = [
        { type: "essence", scentName, quantity: essenceMl },
        { type: "bottle", size: bottleSize, bottleType: "Kaca", quantity: 1 },
        { type: "alcohol", solventType: "Absolut Cair", quantity: alcoholMl }
      ];
    }

    // Create stock refs for ingredients to return to master stock
    const ingredientRefs = ingredients.map(ing => {
      const stockId = getStockDocId(ing);
      return {
        ref: doc(db, "stocks", stockId),
        ing,
        stockId
      };
    });

    // Fetch snapshots inside transaction (READS first!)
    const snaps: { [stockId: string]: DocumentSnapshot } = {};
    for (const item of ingredientRefs) {
      if (!snaps[item.stockId]) {
        snaps[item.stockId] = await transaction.get(item.ref);
      }
    }

    // === ALL READS COMPLETED. NOW DO WRITES ===

    // Update Master Stocks (add back the ingredients)
    for (const item of ingredientRefs) {
      const snap = snaps[item.stockId];
      const returnedQty = item.ing.quantity * quantityToReturn;
      const current = (snap && snap.exists()) ? (snap.data().quantity || 0) : 0;

      if (snap && snap.exists()) {
        transaction.update(item.ref, { quantity: current + returnedQty });
      } else {
        // Create stock doc if it didn't exist
        if (item.ing.type === "essence") {
          transaction.set(item.ref, {
            id: item.stockId,
            type: "essence",
            scentName: item.ing.scentName,
            quantity: returnedQty
          });
        } else if (item.ing.type === "bottle") {
          transaction.set(item.ref, {
            id: item.stockId,
            type: "bottle",
            size: item.ing.size,
            bottleType: item.ing.bottleType || "Kaca",
            quantity: returnedQty
          });
        } else {
          transaction.set(item.ref, {
            id: item.stockId,
            type: "alcohol",
            scentName: item.ing.solventType || "Absolut Cair",
            quantity: returnedQty
          });
        }
      }
    }

    // Decrement or Delete Reseller Package Stock
    const actualResellerStockRef = doc(db, "reseller_package_stocks", resellerPkgStockSnap.id);
    const newResellerQty = currentResellerQty - quantityToReturn;
    if (newResellerQty <= 0) {
      transaction.delete(actualResellerStockRef);
    } else {
      transaction.update(actualResellerStockRef, { quantity: newResellerQty });
    }

    // Log the transaction
    const txId = "tx_transfer_" + generateId();
    const txRef = doc(db, "transactions", txId);
    transaction.set(txRef, {
      id: txId,
      type: "transfer",
      date: new Date().toISOString(),
      category: "bundling",
      scentName,
      bottleSize,
      bottleCount: -quantityToReturn,
      volumeMl: -(10 * quantityToReturn),
      totalPrice: 0,
      description: `Retur/Batal Kirim Paket Bundling ${pkgName} sebanyak ${quantityToReturn} unit dari ${resellerEmail}`,
      operatorEmail,
      resellerEmail: resellerEmail.trim().toLowerCase(),
      isConsignment: true,
      packageName: pkgName
    });
  });
}

export function subscribeToBundlingPackages(callback: (packages: BundlingPackage[]) => void) {
  return onSnapshot(query(collection(db, "bundling_packages"), orderBy("addedAt", "desc")), (snapshot) => {
    const list: BundlingPackage[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as BundlingPackage);
    });
    callback(list);
  });
}

export async function addBundlingPackage(pkg: Omit<BundlingPackage, "id" | "addedAt">) {
  const id = "pkg_" + generateId();
  await setDoc(doc(db, "bundling_packages", id), {
    ...pkg,
    id,
    addedAt: new Date().toISOString()
  });
  return id;
}

export async function deleteBundlingPackage(id: string) {
  await deleteDoc(doc(db, "bundling_packages", id));
}

export async function updateBundlingPackage(id: string, pkg: Partial<Omit<BundlingPackage, "id" | "addedAt">>) {
  await updateDoc(doc(db, "bundling_packages", id), pkg);
}

// Transfer Stock to Reseller (Consignment)
export async function transferStockToReseller(
  resellerEmail: string,
  type: "essence" | "alcohol" | "bottle",
  scentName: string | undefined,
  size: string | undefined,
  quantity: number,
  operatorEmail: string
) {
  const dateStr = new Date().toISOString();
  const txId = "tx_transfer_" + generateId();

  await runTransaction(db, async (transaction) => {
    // 1. Get Master Stock Ref & Read
    let masterStockId = "";
    if (type === "essence") {
      masterStockId = getNormalizedEssenceStockId(scentName);
    } else if (type === "alcohol") {
      masterStockId = scentName === "Absolut Gel" ? "alcohol_gel" : "alcohol_cair";
    } else if (type === "bottle") {
      masterStockId = getNormalizedBottleStockId(size, "Kaca");
    }

    const masterStockRef = doc(db, "stocks", masterStockId);
    const masterStockSnap = await transaction.get(masterStockRef);

    if (!masterStockSnap.exists()) {
      throw new Error(`Stok utama untuk komponen tersebut tidak ditemukan!`);
    }

    const currentMasterQty = masterStockSnap.data().quantity || 0;
    if (currentMasterQty < quantity) {
      throw new Error(`Stok utama tidak mencukupi! Tersedia: ${currentMasterQty}, Meminta: ${quantity}`);
    }

    // 2. Get Reseller Stock Ref & Read
    const safeEmail = resellerEmail.trim().toLowerCase().replace(/[^a-z0-9@.]+/g, "_");
    const resellerStockId = `${safeEmail}_${type}_${type === "essence" ? scentName?.replace(/\s+/g, "_").toLowerCase() : type === "bottle" ? size : (scentName === "Absolut Gel" ? "alcohol_gel" : "alcohol_cair")}`;
    const resellerStockRef = doc(db, "reseller_stocks", resellerStockId);
    const resellerStockSnap = await transaction.get(resellerStockRef);

    // 3. Perform Writes
    // A. Deduct Master Stock
    transaction.update(masterStockRef, { quantity: currentMasterQty - quantity });

    // B. Increment Reseller Stock
    let currentResellerQty = 0;
    if (resellerStockSnap.exists()) {
      currentResellerQty = resellerStockSnap.data().quantity || 0;
      transaction.update(resellerStockRef, { quantity: currentResellerQty + quantity });
    } else {
      transaction.set(resellerStockRef, {
        id: resellerStockId,
        resellerEmail: resellerEmail.trim().toLowerCase(),
        type,
        scentName: scentName || "",
        size: size || "",
        quantity: quantity
      });
    }

    // C. Write Transfer Transaction (Logs)
    const txRef = doc(db, "transactions", txId);
    const description = `Transfer stok titipan ke ${resellerEmail}: ${type === "essence" ? `Bibit ${scentName}` : type === "bottle" ? `Botol ${size}` : (scentName || "Absolut")} sebanyak ${quantity}`;
    
    transaction.set(txRef, {
      id: txId,
      type: "transfer",
      date: dateStr,
      category: type === "essence" ? "bibit" : type === "bottle" ? "botol" : "alkohol",
      scentName: scentName || "",
      bottleSize: size || "None",
      bottleCount: type === "bottle" ? quantity : 0,
      volumeMl: type === "essence" || type === "alcohol" ? quantity : 0,
      totalPrice: 0,
      description,
      operatorEmail,
      resellerEmail: resellerEmail.trim().toLowerCase(),
      isConsignment: true
    });
  });
}

// Reseller Sale Transaction
export async function addResellerSaleTransaction(
  resellerEmail: string,
  packageId: string,
  packageName: string,
  scentName: string,
  bottleSize: string,
  essenceMl: number,
  alcoholMl: number,
  quantity: number,
  pricePerUnit: number,
  operatorEmail: string
) {
  const dateStr = new Date().toISOString();
  const txId = "tx_reseller_sale_" + generateId();
  const totalPrice = pricePerUnit * quantity;

  await runTransaction(db, async (transaction) => {
    const uname = resellerEmail.split("@")[0].trim().toLowerCase();
    const candidateEmails = Array.from(new Set([
      resellerEmail.trim().toLowerCase(),
      `${uname}@bastikaparfum.local`,
      `${uname}@gmail.com`,
      uname
    ]));

    let resellerPkgStockSnap: DocumentSnapshot | null = null;
    for (const candEmail of candidateEmails) {
      const candSafe = candEmail.replace(/[^a-z0-9@.]+/g, "_");
      const candId = `${candSafe}_${packageId}`;
      const ref = doc(db, "reseller_package_stocks", candId);
      const snap = await transaction.get(ref);
      if (snap.exists()) {
        resellerPkgStockSnap = snap;
        break;
      }
    }

    if (!resellerPkgStockSnap || !resellerPkgStockSnap.exists() || (resellerPkgStockSnap.data()?.quantity || 0) < quantity) {
      const currentQty = (resellerPkgStockSnap && resellerPkgStockSnap.exists()) ? resellerPkgStockSnap.data()?.quantity : 0;
      throw new Error(`Stok fisik paket bundling ${packageName} (${scentName}) di Reseller tidak mencukupi! Tersedia: ${currentQty} unit, Butuh: ${quantity} unit`);
    }

    const totalEssenceNeeded = essenceMl * quantity;

    // Deduct stock of physical bundling package from reseller
    const targetRef = doc(db, "reseller_package_stocks", resellerPkgStockSnap.id);
    transaction.update(targetRef, { quantity: resellerPkgStockSnap.data().quantity - quantity });

    // Save transaction in DB
    const txRef = doc(db, "transactions", txId);
    transaction.set(txRef, {
      id: txId,
      type: "sale",
      date: dateStr,
      timestamp: dateStr,
      category: "other", // represents bundling package sale
      scentName,
      bottleSize,
      bottleCount: quantity,
      volumeMl: totalEssenceNeeded,
      totalPrice,
      description: `Penjualan Bundling Reseller: ${packageName} (${scentName}) x ${quantity} pcs`,
      operatorEmail,
      resellerEmail: resellerEmail.trim().toLowerCase(),
      paymentStatus: "Belum Dibayar",
      isConsignment: true,
      packageName
    });
  });

  return txId;
}

// Settle Reseller Transaction
export async function settleResellerTransaction(txId: string, operatorEmail: string) {
  const dateStr = new Date().toISOString();
  await runTransaction(db, async (transaction) => {
    // 1. Read Transaction
    const txRef = doc(db, "transactions", txId);
    const txSnap = await transaction.get(txRef);
    if (!txSnap.exists()) {
      throw new Error("Transaksi tidak ditemukan!");
    }
    const txData = txSnap.data() as Transaction;
    if (txData.paymentStatus === "Lunas") {
      throw new Error("Transaksi sudah berstatus Lunas!");
    }

    // 2. Read Cash Balance
    const cashRef = doc(db, "config", "cash");
    const cashSnap = await transaction.get(cashRef);
    let currentBalance = 15000000;
    if (cashSnap.exists()) {
      currentBalance = cashSnap.data().balance;
    }

    // 3. Update Transaction paymentStatus to "Lunas"
    transaction.update(txRef, { paymentStatus: "Lunas" });

    // 4. Update Cash Balance
    const newBalance = currentBalance + txData.totalPrice;
    transaction.update(cashRef, { balance: newBalance });

    // 5. Write Cash Ledger Mutation
    const mutId = "mut_settle_" + generateId();
    const mutationRef = doc(db, "cash_ledger", mutId);
    transaction.set(mutationRef, {
      id: mutId,
      date: dateStr,
      type: "in",
      amount: txData.totalPrice,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      description: `Setoran Reseller (${txData.resellerEmail}): Pelunasan ${txData.description}`,
      referenceId: txId
    });
  });
}

// ==========================================
// MASTER PRODUK SERVICE (Single Source of Truth)
// ==========================================
export function subscribeToMasterProducts(
  callback: (products: MasterProduct[]) => void,
  errorCallback?: (error: any) => void
) {
  const colRef = collection(db, "master_products");
  return onSnapshot(
    query(colRef, orderBy("name", "asc")),
    async (snapshot) => {
      const list: MasterProduct[] = [];
      snapshot.forEach((docSnap) => {
        const item = docSnap.data() as MasterProduct;
        if ((item.category as string) !== "bundling") {
          list.push(item);
        }
      });
      callback(list);
    },
    (error) => {
      if (errorCallback) {
        errorCallback(error);
      } else {
        console.error("Error in subscribeToMasterProducts:", error);
      }
    }
  );
}

export async function addMasterProduct(product: Omit<MasterProduct, "updatedAt">) {
  const id = product.id.trim();
  const now = new Date().toISOString();
  await setDoc(doc(db, "master_products", id), {
    ...product,
    id,
    updatedAt: now
  });

  // Automatically sync to prices & stocks based on category
  if (product.category === "essence") {
    let scent = product.referenceKey && product.referenceKey.trim() && product.referenceKey.trim().toLowerCase() !== "scentname"
      ? product.referenceKey.trim()
      : product.name.replace(/^bibit\s+/i, "").trim();
    if (scent) {
      await setDoc(doc(db, "prices", scent), {
        scentName: scent,
        pricePerMl: product.price || 2000,
        updatedAt: now
      }, { merge: true });

      const stockId = getNormalizedEssenceStockId(scent);
      const stockRef = doc(db, "stocks", stockId);
      const stockSnap = await getDoc(stockRef);
      if (!stockSnap.exists()) {
        await setDoc(stockRef, {
          id: stockId,
          type: "essence",
          scentName: scent,
          quantity: 0
        });
      }
    }
  } else if (product.category === "bottle_kaca" || product.category === "bottle_plastik") {
    const bottleType: "Kaca" | "Plastik" = product.category === "bottle_kaca" ? "Kaca" : "Plastik";
    const size = (product.referenceKey && product.referenceKey.trim() && product.referenceKey.trim().toLowerCase() !== "size")
      ? product.referenceKey.trim()
      : product.name.replace(/botol\s+(kaca|plastik)\s*/i, "").trim();
    if (size) {
      const cleanSize = size.trim();
      const bSizeId = cleanSize.toLowerCase().replace(/\s+/g, "");
      const bSizeRef = doc(db, "bottle_sizes", bSizeId);
      const bSizeSnap = await getDoc(bSizeRef);
      if (!bSizeSnap.exists()) {
        await setDoc(bSizeRef, {
          id: bSizeId,
          size: cleanSize,
          price: product.price || 10000,
          priceKaca: bottleType === "Kaca" ? (product.price || 10000) : 10000,
          pricePlastik: bottleType === "Plastik" ? (product.price || 5000) : 5000,
          purchasePriceKaca: 5000,
          purchasePricePlastik: 3000,
          addedAt: now
        });
      } else {
        const updateData = bottleType === "Kaca" ? { priceKaca: product.price } : { pricePlastik: product.price };
        await setDoc(bSizeRef, updateData, { merge: true });
      }

      const stockId = getNormalizedBottleStockId(size, bottleType);
      const stockRef = doc(db, "stocks", stockId);
      const stockSnap = await getDoc(stockRef);
      if (!stockSnap.exists()) {
        await setDoc(stockRef, {
          id: stockId,
          type: "bottle",
          size: cleanSize,
          bottleType,
          quantity: 0
        });
      }
    }
  } else if (product.category === "other") {
    const name = product.name.trim();
    if (name) {
      let stockId = `alcohol_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
      if (name.toLowerCase() === "absolut cair") stockId = "alcohol_cair";
      if (name.toLowerCase() === "absolut gel") stockId = "alcohol_gel";

      const stockRef = doc(db, "stocks", stockId);
      const stockSnap = await getDoc(stockRef);
      if (!stockSnap.exists()) {
        await setDoc(stockRef, {
          id: stockId,
          type: "alcohol",
          scentName: name,
          quantity: 0
        });
      }
    }
  }
}

export async function updateMasterProduct(id: string, updates: Partial<Omit<MasterProduct, "id">>) {
  const now = new Date().toISOString();
  await updateDoc(doc(db, "master_products", id), {
    ...updates,
    updatedAt: now
  });

  const masterDoc = await getDoc(doc(db, "master_products", id));
  if (masterDoc.exists()) {
    const data = masterDoc.data() as MasterProduct;
    if (data.category === "essence") {
      let scent = data.referenceKey && data.referenceKey.trim() && data.referenceKey.trim().toLowerCase() !== "scentname"
        ? data.referenceKey.trim()
        : data.name.replace(/^bibit\s+/i, "").trim();
      if (scent && data.price !== undefined) {
        await setDoc(doc(db, "prices", scent), {
          scentName: scent,
          pricePerMl: data.price,
          updatedAt: now
        }, { merge: true });

        const stockId = getNormalizedEssenceStockId(scent);
        const stockRef = doc(db, "stocks", stockId);
        const stockSnap = await getDoc(stockRef);
        if (!stockSnap.exists()) {
          await setDoc(stockRef, {
            id: stockId,
            type: "essence",
            scentName: scent,
            quantity: 0
          });
        }
      }
    } else if (data.category === "bottle_kaca" || data.category === "bottle_plastik") {
      const bottleType: "Kaca" | "Plastik" = data.category === "bottle_kaca" ? "Kaca" : "Plastik";
      const size = (data.referenceKey && data.referenceKey.trim() && data.referenceKey.trim().toLowerCase() !== "size")
        ? data.referenceKey.trim()
        : data.name.replace(/botol\s+(kaca|plastik)\s*/i, "").trim();
      if (size) {
        const cleanSize = size.trim();
        const bSizeId = cleanSize.toLowerCase().replace(/\s+/g, "");
        const bSizeRef = doc(db, "bottle_sizes", bSizeId);
        const bSizeSnap = await getDoc(bSizeRef);
        if (!bSizeSnap.exists()) {
          await setDoc(bSizeRef, {
            id: bSizeId,
            size: cleanSize,
            price: data.price || 10000,
            priceKaca: bottleType === "Kaca" ? (data.price || 10000) : 10000,
            pricePlastik: bottleType === "Plastik" ? (data.price || 5000) : 5000,
            purchasePriceKaca: 5000,
            purchasePricePlastik: 3000,
            addedAt: now
          });
        } else {
          const updateData = bottleType === "Kaca" ? { priceKaca: data.price } : { pricePlastik: data.price };
          await setDoc(bSizeRef, updateData, { merge: true });
        }

        const stockId = getNormalizedBottleStockId(size, bottleType);
        const stockRef = doc(db, "stocks", stockId);
        const stockSnap = await getDoc(stockRef);
        if (!stockSnap.exists()) {
          await setDoc(stockRef, {
            id: stockId,
            type: "bottle",
            size: cleanSize,
            bottleType,
            quantity: 0
          });
        }
      }
    } else if (data.category === "other") {
      const name = data.name.trim();
      if (name) {
        let stockId = `alcohol_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
        if (name.toLowerCase() === "absolut cair") stockId = "alcohol_cair";
        if (name.toLowerCase() === "absolut gel") stockId = "alcohol_gel";

        const stockRef = doc(db, "stocks", stockId);
        const stockSnap = await getDoc(stockRef);
        if (!stockSnap.exists()) {
          await setDoc(stockRef, {
            id: stockId,
            type: "alcohol",
            scentName: name,
            quantity: 0
          });
        }
      }
    }
  }
}

export async function deleteMasterProduct(id: string) {
  const masterDoc = await getDoc(doc(db, "master_products", id));
  if (masterDoc.exists()) {
    const data = masterDoc.data() as MasterProduct;
    if (data.category === "essence") {
      let scent = data.referenceKey && data.referenceKey.trim() && data.referenceKey.trim().toLowerCase() !== "scentname"
        ? data.referenceKey.trim()
        : data.name.replace(/^bibit\s+/i, "").trim();
      if (scent) {
        await deleteDoc(doc(db, "prices", scent)).catch(() => {});
        const stockId = getNormalizedEssenceStockId(scent);
        await deleteDoc(doc(db, "stocks", stockId)).catch(() => {});
      }
    } else if (data.category === "bottle_kaca" || data.category === "bottle_plastik") {
      const bottleType = data.category === "bottle_kaca" ? "Kaca" : "Plastik";
      const size = (data.referenceKey && data.referenceKey.trim() && data.referenceKey.trim().toLowerCase() !== "size")
        ? data.referenceKey.trim()
        : data.name.replace(/botol\s+(kaca|plastik)\s*/i, "").trim();
      if (size) {
        const stockId = getNormalizedBottleStockId(size, bottleType);
        await deleteDoc(doc(db, "stocks", stockId)).catch(() => {});
      }
    } else if (data.category === "other") {
      const name = data.name.trim();
      if (name) {
        let stockId = `alcohol_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
        if (name.toLowerCase() === "absolut cair") stockId = "alcohol_cair";
        if (name.toLowerCase() === "absolut gel") stockId = "alcohol_gel";
        await deleteDoc(doc(db, "stocks", stockId)).catch(() => {});
      }
    }
  }
  await deleteDoc(doc(db, "master_products", id));
}

export async function seedMasterProductsIfEmpty() {
  const masterRef = collection(db, "master_products");
  const masterSnap = await getDocs(masterRef);
  
  if (masterSnap.empty) {
    console.log("Seeding master products from existing data...");
    
    // 1. Seed Essences (Scent Prices)
    const pricesSnap = await getDocs(collection(db, "prices"));
    for (const docSnap of pricesSnap.docs) {
      const data = docSnap.data();
      const scentName = data.scentName;
      const pricePerMl = data.pricePerMl;
      const id = "prod_essence_" + scentName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      await setDoc(doc(db, "master_products", id), {
        id,
        name: `Bibit ${scentName}`,
        price: pricePerMl,
        category: "essence",
        referenceKey: scentName,
        updatedAt: new Date().toISOString()
      });
    }
    
    // 2. Seed Bottle Sizes
    const bottlesSnap = await getDocs(collection(db, "bottle_sizes"));
    for (const docSnap of bottlesSnap.docs) {
      const data = docSnap.data();
      const size = data.size;
      const priceKaca = data.priceKaca ?? data.price ?? 10000;
      const pricePlastik = data.pricePlastik ?? Math.round((data.price ?? 10000) / 2);
      
      const idKaca = "prod_bottle_kaca_" + size.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      await setDoc(doc(db, "master_products", idKaca), {
        id: idKaca,
        name: `Botol Kaca ${size}`,
        price: priceKaca,
        category: "bottle_kaca",
        referenceKey: size,
        updatedAt: new Date().toISOString()
      });
      
      const idPlastik = "prod_bottle_plastik_" + size.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      await setDoc(doc(db, "master_products", idPlastik), {
        id: idPlastik,
        name: `Botol Plastik ${size}`,
        price: pricePlastik,
        category: "bottle_plastik",
        referenceKey: size,
        updatedAt: new Date().toISOString()
      });
    }
    
    // Clean up any old bundling items from master_products if present
    const masterBundlingSnap = await getDocs(query(collection(db, "master_products"), where("category", "==", "bundling")));
    for (const docSnap of masterBundlingSnap.docs) {
      await deleteDoc(docSnap.ref);
    }

    // 3. Seed Default Absolut (Other)
    await setDoc(doc(db, "master_products", "prod_other_absolut_cair"), {
      id: "prod_other_absolut_cair",
      name: "Absolut Cair",
      price: 50,
      category: "other",
      referenceKey: "Absolut Cair",
      updatedAt: new Date().toISOString()
    });
    await setDoc(doc(db, "master_products", "prod_other_absolut_gel"), {
      id: "prod_other_absolut_gel",
      name: "Absolut Gel",
      price: 60,
      category: "other",
      referenceKey: "Absolut Gel",
      updatedAt: new Date().toISOString()
    });
  }

  // Ensure default bottles and alcohol exist in master_products if missing
  const updatedMasterSnap = await getDocs(masterRef);
  const existingCategories = new Set(updatedMasterSnap.docs.map(d => (d.data() as MasterProduct).category));
  
  if (!existingCategories.has("bottle_kaca") && !existingCategories.has("bottle_plastik")) {
    const defaultSizes = ["30ml", "50ml", "100ml"];
    for (const size of defaultSizes) {
      const idKaca = "prod_bottle_kaca_" + size.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      await setDoc(doc(db, "master_products", idKaca), {
        id: idKaca,
        name: `Botol Kaca ${size}`,
        price: size === "30ml" ? 10000 : size === "50ml" ? 12000 : 15000,
        category: "bottle_kaca",
        referenceKey: size,
        updatedAt: new Date().toISOString()
      });
      const idPlastik = "prod_bottle_plastik_" + size.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      await setDoc(doc(db, "master_products", idPlastik), {
        id: idPlastik,
        name: `Botol Plastik ${size}`,
        price: size === "30ml" ? 5000 : size === "50ml" ? 6000 : 7500,
        category: "bottle_plastik",
        referenceKey: size,
        updatedAt: new Date().toISOString()
      });
    }
  }

  if (!existingCategories.has("other")) {
    await setDoc(doc(db, "master_products", "prod_other_absolut_cair"), {
      id: "prod_other_absolut_cair",
      name: "Absolut Cair",
      price: 50,
      category: "other",
      referenceKey: "Absolut Cair",
      updatedAt: new Date().toISOString()
    });
    await setDoc(doc(db, "master_products", "prod_other_absolut_gel"), {
      id: "prod_other_absolut_gel",
      name: "Absolut Gel",
      price: 60,
      category: "other",
      referenceKey: "Absolut Gel",
      updatedAt: new Date().toISOString()
    });
  }

  // Bidirectional sync: sync existing master_products to prices & stocks and clean up orphans
  const latestMasterSnap = await getDocs(masterRef);
  const validEssenceScents = new Set<string>();
  const validStockIds = new Set<string>();

  for (const docSnap of latestMasterSnap.docs) {
    const data = docSnap.data() as MasterProduct;
    if (data.category === "essence") {
      let scent = data.referenceKey && data.referenceKey.trim() && data.referenceKey.trim().toLowerCase() !== "scentname"
        ? data.referenceKey.trim()
        : data.name.replace(/^bibit\s+/i, "").trim();
      if (scent) {
        validEssenceScents.add(scent.toLowerCase());

        await setDoc(doc(db, "prices", scent), {
          scentName: scent,
          pricePerMl: data.price || 2000,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        const stockId = getNormalizedEssenceStockId(scent);
        validStockIds.add(stockId);
        const stockRef = doc(db, "stocks", stockId);
        const stockSnap = await getDoc(stockRef);
        if (!stockSnap.exists()) {
          await setDoc(stockRef, {
            id: stockId,
            type: "essence",
            scentName: scent,
            quantity: 0
          });
        }
      }
    } else if (data.category === "bottle_kaca" || data.category === "bottle_plastik") {
      const bottleType: "Kaca" | "Plastik" = data.category === "bottle_kaca" ? "Kaca" : "Plastik";
      const size = (data.referenceKey && data.referenceKey.trim() && data.referenceKey.trim().toLowerCase() !== "size")
        ? data.referenceKey.trim()
        : data.name.replace(/botol\s+(kaca|plastik)\s*/i, "").trim();
      if (size) {
        const stockId = getNormalizedBottleStockId(size, bottleType);
        validStockIds.add(stockId);
        const stockRef = doc(db, "stocks", stockId);
        const stockSnap = await getDoc(stockRef);
        if (!stockSnap.exists()) {
          await setDoc(stockRef, {
            id: stockId,
            type: "bottle",
            size,
            bottleType,
            quantity: size === "100ml" || size === "30ml" || size === "50ml" ? 50 : 0
          });
        }
      }
    } else if (data.category === "other") {
      const name = data.name.trim();
      if (name) {
        let stockId = `alcohol_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
        if (name.toLowerCase() === "absolut cair") stockId = "alcohol_cair";
        if (name.toLowerCase() === "absolut gel") stockId = "alcohol_gel";

        validStockIds.add(stockId);
        const stockRef = doc(db, "stocks", stockId);
        const stockSnap = await getDoc(stockRef);
        if (!stockSnap.exists()) {
          await setDoc(stockRef, {
            id: stockId,
            type: "alcohol",
            scentName: name,
            quantity: name.toLowerCase() === "absolut cair" ? 300 : name.toLowerCase() === "absolut gel" ? 5000 : 0
          });
        }
      }
    }
  }

  // Clean up orphaned essence items in prices
  if (validEssenceScents.size > 0) {
    const pricesSnap = await getDocs(collection(db, "prices"));
    for (const docSnap of pricesSnap.docs) {
      const pData = docSnap.data();
      const scentName = pData.scentName || docSnap.id;
      if (scentName && !validEssenceScents.has(scentName.toLowerCase())) {
        await deleteDoc(doc(db, "prices", docSnap.id)).catch(() => {});
      }
    }
  }

  // Clean up orphaned stocks items that are no longer in master_products
  if (validStockIds.size > 0) {
    const stocksSnap = await getDocs(collection(db, "stocks"));
    for (const docSnap of stocksSnap.docs) {
      const sData = docSnap.data();
      // Only delete if it's not in validStockIds and is one of the synchronized stock types
      if (!validStockIds.has(docSnap.id)) {
        await deleteDoc(doc(db, "stocks", docSnap.id)).catch(() => {});
      }
    }
  }
}




