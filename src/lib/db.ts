// IndexedDB wrapper for offline-first resort management

const DB_NAME = "serenity_resort_db";
const DB_VERSION = 1;

export interface Transaction {
  id?: number;
  transaction_no: string;
  date_time: string;
  module: string;
  game_type?: string;
  room_type?: string;
  booking_type?: string;
  adults: number;
  children: number;
  total_headcount: number;
  amount_paid: number;
  payment_method: "Cash" | "GCash";
  customer_name?: string;
  number_of_tables?: number;
}

export interface Settings {
  id: string;
  adult_rate_day: number;
  child_rate_day: number;
  adult_rate_night: number;
  child_rate_night: number;
  exclusive_fee: number;
  barkada_room_rate: number;
  kubo_room_rate: number;
  table_rent_rate: number;
}

export interface CashierReportPettyItem {
  date: string;
  particulars: string;
  receipt_no: string;
  amount: number;
}

export interface CashierReportDenom {
  label: string;
  value: number;
  quantity: number;
}

export interface CashierReport {
  id?: number;
  date: string;
  beginning_cash: number;
  sales: number;
  petty_cash: number;
  expected_ending_cash: number;
  actual_cash: number;
  cash_over_short: number;
  petty_items?: CashierReportPettyItem[];
  denoms?: CashierReportDenom[];
}

const DEFAULT_SETTINGS: Settings = {
  id: "default",
  adult_rate_day: 100,
  child_rate_day: 50,
  adult_rate_night: 150,
  child_rate_night: 75,
  exclusive_fee: 5000,
  barkada_room_rate: 1500,
  kubo_room_rate: 1000,
  table_rent_rate: 200,
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("transactions")) {
        const txStore = db.createObjectStore("transactions", { keyPath: "id", autoIncrement: true });
        txStore.createIndex("module", "module");
        txStore.createIndex("date_time", "date_time");
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("cashier_reports")) {
        db.createObjectStore("cashier_reports", { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getSettings(): Promise<Settings> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction("settings", "readonly");
    const store = tx.objectStore("settings");
    const req = store.get("default");
    req.onsuccess = () => resolve(req.result || DEFAULT_SETTINGS);
    req.onerror = () => resolve(DEFAULT_SETTINGS);
  });
}

export async function saveSettings(settings: Settings): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("settings", "readwrite");
    const store = tx.objectStore("settings");
    store.put({ ...settings, id: "default" });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function addTransaction(t: Omit<Transaction, "id">): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("transactions", "readwrite");
    const store = tx.objectStore("transactions");
    const req = store.add(t);
    req.onsuccess = () => resolve(req.result as number);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getTransactions(filter?: {
  module?: string;
  dateFrom?: string;
  dateTo?: string;
  game_type?: string;
}): Promise<Transaction[]> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction("transactions", "readonly");
    const store = tx.objectStore("transactions");
    const req = store.getAll();
    req.onsuccess = () => {
      let results: Transaction[] = req.result || [];
      if (filter?.module) results = results.filter((t) => t.module === filter.module);
      if (filter?.game_type) results = results.filter((t) => t.game_type === filter.game_type);
      if (filter?.dateFrom) results = results.filter((t) => t.date_time >= filter.dateFrom!);
      if (filter?.dateTo) results = results.filter((t) => t.date_time <= filter.dateTo! + "T23:59:59");
      resolve(results);
    };
    req.onerror = () => resolve([]);
  });
}

export async function saveCashierReport(report: Omit<CashierReport, "id">): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cashier_reports", "readwrite");
    const store = tx.objectStore("cashier_reports");
    store.add(report);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCashierReports(): Promise<CashierReport[]> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction("cashier_reports", "readonly");
    const store = tx.objectStore("cashier_reports");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

export async function exportAllData(): Promise<string> {
  const db = await openDB();
  const data: Record<string, unknown[]> = {};
  const storeNames = ["transactions", "settings", "cashier_reports"];
  for (const name of storeNames) {
    data[name] = await new Promise((resolve) => {
      const tx = db.transaction(name, "readonly");
      const req = tx.objectStore(name).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }
  return JSON.stringify(data, null, 2);
}

export async function importData(jsonString: string): Promise<void> {
  const data = JSON.parse(jsonString);
  const db = await openDB();
  const storeNames = ["transactions", "settings", "cashier_reports"];
  for (const name of storeNames) {
    if (data[name]) {
      const tx = db.transaction(name, "readwrite");
      const store = tx.objectStore(name);
      store.clear();
      for (const item of data[name]) {
        store.add(item);
      }
      await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); });
    }
  }
}

export async function resetAllData(): Promise<void> {
  const db = await openDB();
  const storeNames = ["transactions", "settings", "cashier_reports"];
  for (const name of storeNames) {
    const tx = db.transaction(name, "readwrite");
    tx.objectStore(name).clear();
    await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); });
  }
}
