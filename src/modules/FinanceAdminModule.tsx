import React, { useState, useEffect, useMemo } from "react";
import {
  Lock, Upload, Plus, Pencil, Trash2, ShieldCheck, KeyRound, Printer, Download, RefreshCw
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ChartOfAccount, JournalEntry,
  getChartOfAccounts, addChartOfAccount, updateChartOfAccount, deleteChartOfAccount,
  getJournalEntries, addJournalEntry, updateJournalEntry, deleteJournalEntry,
  getSystemConfig, setSystemConfig,
  getTransactions, getFoodSales, getCashierReports, getBookingCashierReports,
} from "@/lib/db";

const formatPeso = (amount: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);

const formatDate = (d: string) => {
  if (!d) return "";
  try { return format(new Date(d), "MMM dd, yyyy"); } catch { return d; }
};

type Tab = "coa" | "journal" | "pl" | "gl" | "tb";

// All accepted account types (QuickBooks-style extended list)
const INCOME_TYPES = ["Income", "Other Income"];
const EXPENSE_TYPES = ["Expense", "Other Expense"];
const COGS_TYPES = ["Cost of Goods Sold"];
const ASSET_TYPES = ["Asset", "Bank", "Accounts Receivable", "Other Current Asset"];
const LIABILITY_TYPES = ["Liability", "Accounts Payable", "Other Current Liability"];
const EQUITY_TYPES = ["Equity"];
const ALL_ACCOUNT_TYPES = [...ASSET_TYPES, ...LIABILITY_TYPES, ...EQUITY_TYPES, ...INCOME_TYPES, ...COGS_TYPES, ...EXPENSE_TYPES];

const TYPE_COLORS: Record<string, string> = {
  Asset: "bg-blue-500/10 text-blue-600",
  Liability: "bg-red-500/10 text-red-600",
  Bank: "bg-blue-500/10 text-blue-600",
  "Accounts Receivable": "bg-cyan-500/10 text-cyan-600",
  "Other Current Asset": "bg-sky-500/10 text-sky-600",
  "Fixed Asset": "bg-indigo-500/10 text-indigo-600",
  "Other Asset": "bg-blue-400/10 text-blue-500",
  "Accounts Payable": "bg-red-500/10 text-red-600",
  "Credit Card": "bg-rose-500/10 text-rose-600",
  "Other Current Liability": "bg-red-400/10 text-red-500",
  "Long Term Liability": "bg-pink-500/10 text-pink-600",
  Equity: "bg-purple-500/10 text-purple-600",
  Income: "bg-green-500/10 text-green-600",
  "Other Income": "bg-emerald-500/10 text-emerald-600",
  "Cost of Goods Sold": "bg-yellow-500/10 text-yellow-700",
  Expense: "bg-orange-500/10 text-orange-600",
  "Other Expense": "bg-amber-500/10 text-amber-600",
};

export default function FinanceAdminModule() {
  // Auth
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [dbPin, setDbPin] = useState("11111");
  const [showChangePin, setShowChangePin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");

  // Navigation
  const [activeTab, setActiveTab] = useState<Tab>("coa");

  // Data
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // COA State
  const [editingCOA, setEditingCOA] = useState<ChartOfAccount | null>(null);
  const [coaForm, setCoaForm] = useState<Partial<ChartOfAccount>>({ account_type: "Asset", beginning_balance: 0 });
  const [coaSearch, setCoaSearch] = useState("");
  const [coaTypeFilter, setCoaTypeFilter] = useState("All");
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);

  // Excel Import State
  const [showImportZone, setShowImportZone] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState<number | null>(null);

  // Smart Import Engine State
  const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);
  const [smartImportMode, setSmartImportMode] = useState<"file" | "paste" | "manual">("file");
  const [pasteText, setPasteText] = useState("");
  interface SmartImportRow {
    id: string;
    account_name: string;
    account_type: string;
    beginning_balance: number;
    as_of_date: string;
    isValid: boolean;
    error?: string;
  }
  const [previewRows, setPreviewRows] = useState<SmartImportRow[]>([]);

  // Journal State
  const [editingJE, setEditingJE] = useState<{ id?: number; entry_date: string; memo: string; lines: Partial<JournalEntry>[] } | null>(null);
  
  // P&L State
  const [plData, setPlData] = useState<any>({
    income: 0, expense: 0, net: 0, incomeDetails: [], expenseDetails: [],
  });
  const [plDateFrom, setPlDateFrom] = useState("");
  const [plDateTo, setPlDateTo] = useState("");
  const [plFilterApplied, setPlFilterApplied] = useState(false);

  useEffect(() => {
    getSystemConfig("finance_pin").then(val => { if (val) setDbPin(val); });
  }, []);

  const loadData = async (dateFrom?: string, dateTo?: string) => {
    setLoading(true);
    try {
      const [accs, jnls] = await Promise.all([getChartOfAccounts(), getJournalEntries()]);
      setAccounts(accs);
      setJournals(jnls);
      await recomputePL(accs, jnls, dateFrom, dateTo);
    } finally {
      setLoading(false);
    }
  };

  const recomputePL = async (
    _accounts: ChartOfAccount[],
    _journals: JournalEntry[],
    dateFrom?: string,
    dateTo?: string
  ) => {
    const [txns, foods, cashierStore, cashierBooking] = await Promise.all([
      getTransactions(),
      getFoodSales(),
      getCashierReports(),
      getBookingCashierReports(),
    ]);

    // Strict date filter: only apply if both from and to are provided
    const filterDate = (dateStr: string) => {
      if (!dateFrom && !dateTo) return true;
      const d = dateStr.slice(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    };

    const filteredTxns = txns.filter(t => filterDate(t.date_time));
    const filteredFoods = foods.filter(f => filterDate(f.date));
    const filteredStore = cashierStore.filter(r => filterDate(r.date));
    const filteredBooking = cashierBooking.filter(r => filterDate(r.report_date));
    const filteredJournals = _journals.filter(j => filterDate(j.entry_date));

    const storeSales = filteredStore.reduce((s, r) => s + r.sales, 0);
    const bookingSales = filteredBooking.reduce((s, r) => s + r.entrance_sales, 0);
    const foodSales = filteredFoods.reduce((s, f) => s + f.total_sales, 0);
    const maintSales = filteredTxns.reduce((s, t) => s + (t.maintenance_fee || 0), 0);
    const drinksSales = filteredTxns.reduce((s, t) => s + (t.drinks_corkage_fee || 0), 0);
    const liquorSales = filteredTxns.reduce((s, t) => s + (t.liquor_corkage_fee || 0), 0);

    // Sum manual journal entries — support extended Income, COGS, and Expense types
    const jeIncomeMap: Record<string, number> = {};
    const jeExpenseMap: Record<string, number> = {};
    const jeCogsMap: Record<string, number> = {};

    _accounts.forEach(a => {
      if (INCOME_TYPES.includes(a.account_type)) jeIncomeMap[a.account_name] = 0;
      if (EXPENSE_TYPES.includes(a.account_type)) jeExpenseMap[a.account_name] = 0;
      if (COGS_TYPES.includes(a.account_type)) jeCogsMap[a.account_name] = 0;
    });

    filteredJournals.forEach(j => {
      const acc = _accounts.find(a => a.account_name === j.account_title);
      if (acc && INCOME_TYPES.includes(acc.account_type)) {
        // Income normal balance is Credit. Credit increases, Debit decreases.
        jeIncomeMap[j.account_title] = (jeIncomeMap[j.account_title] || 0) + (j.credit - j.debit);
      } else if (acc && EXPENSE_TYPES.includes(acc.account_type)) {
        // Expense normal balance is Debit. Debit increases, Credit decreases.
        jeExpenseMap[j.account_title] = (jeExpenseMap[j.account_title] || 0) + (j.debit - j.credit);
      } else if (acc && COGS_TYPES.includes(acc.account_type)) {
        // COGS normal balance is Debit. Debit increases, Credit decreases.
        jeCogsMap[j.account_title] = (jeCogsMap[j.account_title] || 0) + (j.debit - j.credit);
      }
    });

    const jeIncomeTotal = Object.values(jeIncomeMap).reduce((s, v) => s + v, 0);
    const jeExpenseTotal = Object.values(jeExpenseMap).reduce((s, v) => s + v, 0);
    const jeCogsTotal = Object.values(jeCogsMap).reduce((s, v) => s + v, 0);

    const totalIncome = storeSales + bookingSales + foodSales + maintSales + drinksSales + liquorSales + jeIncomeTotal;

    const storePetty = filteredStore.reduce((s, r) => s + r.petty_cash, 0);
    const bookingPetty = filteredBooking.reduce((s, r) =>
      s + (r.petty_items || []).reduce((x, p) => x + (p.amount || 0), 0), 0);

    const totalExpense = storePetty + bookingPetty + jeExpenseTotal;
    const totalCogs = jeCogsTotal;

    const incomeDetails = [
      { name: "Cashier Store Sales", amount: storeSales },
      { name: "Cashier Booking / Entrance Sales", amount: bookingSales },
      { name: "Food Restaurant POS", amount: foodSales },
      { name: "Maintenance Fee", amount: maintSales },
      { name: "Drinks Corkage", amount: drinksSales },
      { name: "Liquor Corkage", amount: liquorSales },
      ...Object.entries(jeIncomeMap).filter(([, v]) => v !== 0).map(([k, v]) => ({ name: k, amount: v }))
    ];

    const cogsDetails = [
      ...Object.entries(jeCogsMap).filter(([, v]) => v !== 0).map(([k, v]) => ({ name: k, amount: v }))
    ];

    const expenseDetails = [
      { name: "Expenses Summary - Store (Petty Cash)", amount: storePetty },
      { name: "Expenses Summary - Entrance (Petty Cash)", amount: bookingPetty },
      ...Object.entries(jeExpenseMap).filter(([, v]) => v !== 0).map(([k, v]) => ({ name: k, amount: v }))
    ];

    setPlData({
      income: totalIncome,
      cogs: totalCogs,
      expense: totalExpense,
      grossProfit: totalIncome - totalCogs,
      net: totalIncome - totalCogs - totalExpense,
      incomeDetails,
      cogsDetails,
      expenseDetails,
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === dbPin) {
      setIsAuthenticated(true);
      loadData();
      if (dbPin === "11111") setShowChangePin(true);
    } else {
      toast.error("Invalid PIN. Access denied.");
      setPin("");
    }
  };

  const handleChangePin = async () => {
    if (newPin.length < 4) return toast.error("PIN must be at least 4 characters.");
    if (newPin !== confirmNewPin) return toast.error("PINs do not match.");
    await setSystemConfig("finance_pin", newPin);
    setDbPin(newPin);
    setShowChangePin(false);
    setNewPin("");
    setConfirmNewPin("");
    toast.success("Security PIN updated successfully.");
  };

  const handleParsedData = (data: any[][]) => {
    if (data.length < 2) {
      toast.error("No valid data found in file.");
      return;
    }
    
    // Normalize and detect headers
    const rawHeaders = data[0] || [];
    const normalizedHeaders = rawHeaders.map(h => String(h || "").trim().toLowerCase());
    
    // Auto-detect columns (A = Account, B = Type, case insensitive)
    const columnA = normalizedHeaders[0] || "";
    const columnB = normalizedHeaders[1] || "";
    const validHeaders = columnA.includes("account") && columnB.includes("type");
    
    // Skip row 1 if headers detected
    const startIndex = validHeaders ? 1 : 0;
    
    const existingNames = new Set(accounts.map(a => a.account_name.toLowerCase()));
    const batchNames = new Set<string>();
    
    const newRows: SmartImportRow[] = [];
    
    for (let i = startIndex; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      let account_name = String(row[0] || "").trim().replace(/\s+/g, ' ');
      let account_type = String(row[1] || "").trim().replace(/\s+/g, ' ');
      let begBal = Number(row[2] || 0);
      if (isNaN(begBal)) begBal = 0;
      const asOf = row[3] ? String(row[3]).trim() : "";
      
      if (!account_name && !account_type) continue; // skip blank rows
      
      // Row-level validation
      let isValid = true;
      let error = "";
      
      if (!account_name) {
        isValid = false;
        error = "Account Name is empty.";
      } else if (existingNames.has(account_name.toLowerCase())) {
        isValid = false;
        error = "Duplicate of existing account.";
      } else if (batchNames.has(account_name.toLowerCase())) {
        isValid = false;
        error = "Duplicate in batch.";
      } else {
        batchNames.add(account_name.toLowerCase());
      }
      
      const matchedType = ALL_ACCOUNT_TYPES.find(t => t.toLowerCase() === account_type.toLowerCase());
      if (isValid && !matchedType) {
        isValid = false;
        error = `Invalid type. Supported: ${ALL_ACCOUNT_TYPES.join(", ")}`;
      }
      
      newRows.push({
        id: Math.random().toString(36).substr(2, 9),
        account_name,
        account_type: matchedType || account_type || "Expense",
        beginning_balance: begBal,
        as_of_date: asOf,
        isValid,
        error
      });
    }
    
    setPreviewRows(prev => [...prev, ...newRows]);
    toast.success(`Loaded ${newRows.length} rows to preview.`);
  };

  const parsePastedText = () => {
    if (!pasteText.trim()) {
      toast.error("Please paste some data first.");
      return;
    }
    const lines = pasteText.split(/\r?\n/);
    const rows = lines.map(line => {
      if (line.includes("\t")) {
        return line.split("\t");
      }
      return line.split(",");
    });
    handleParsedData(rows);
    setPasteText("");
  };

  const processImportFile = async (file: File) => {
    setSelectedFile(file);
    setImportProgress(0);
    
    // Validate file extension
    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".csv")) {
      toast.error("Invalid File Type. Supported formats: .xlsx, .xls, .csv");
      setImportProgress(null);
      setSelectedFile(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) throw new Error("Could not read file contents.");
        
        // Safe file reading using Array Buffer
        const wb = XLSX.read(data, { type: "array" });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        
        const sheetData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        handleParsedData(sheetData);
      } catch (err) {
        console.error(err);
        toast.error("Failed to parse file: " + (err instanceof Error ? err.message : String(err)));
      } finally {
        setImportProgress(null);
        setSelectedFile(null);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const updatePreviewRow = (id: string, field: keyof SmartImportRow, value: any) => {
    setPreviewRows(prev => {
      return prev.map(row => {
        if (row.id !== id) return row;
        const newRow = { ...row, [field]: value };
        
        const existingNames = new Set(accounts.map(a => a.account_name.toLowerCase()));
        const otherBatchNames = new Set(
          prev.filter(r => r.id !== id && r.isValid).map(r => r.account_name.toLowerCase())
        );
        
        let isValid = true;
        let error = "";
        
        let name = String(newRow.account_name || "").trim().replace(/\s+/g, ' ');
        if (!name) {
          isValid = false;
          error = "Account Name is empty.";
        } else if (existingNames.has(name.toLowerCase())) {
          isValid = false;
          error = "Duplicate of existing account.";
        } else if (otherBatchNames.has(name.toLowerCase())) {
          isValid = false;
          error = "Duplicate in batch.";
        }
        
        const type = String(newRow.account_type || "").trim().replace(/\s+/g, ' ');
        const matchedType = ALL_ACCOUNT_TYPES.find(t => t.toLowerCase() === type.toLowerCase());
        if (isValid && !matchedType) {
          isValid = false;
          error = `Invalid type. Supported: ${ALL_ACCOUNT_TYPES.join(", ")}`;
        }
        
        return {
          ...newRow,
          account_name: name,
          account_type: matchedType || newRow.account_type,
          isValid,
          error
        };
      });
    });
  };

  const executeSmartImport = async () => {
    const validRows = previewRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast.error("No valid rows to import.");
      return;
    }
    
    let count = 0;
    const errors: string[] = [];
    
    setLoading(true);
    try {
      // Bulk insert safe mode: insert valid rows only, skipping failures automatically
      for (const row of validRows) {
        try {
          await addChartOfAccount({
            account_name: row.account_name,
            account_type: row.account_type as any,
            beginning_balance: Number(row.beginning_balance || 0),
            as_of_date: row.as_of_date || undefined
          });
          count++;
        } catch (err) {
          console.error(err);
          const pgErr = err as any;
          const msg = pgErr?.message || pgErr?.details || (err instanceof Error ? err.message : String(err));
          errors.push(`${row.account_name}: ${msg}`);
        }
      }
      
      await loadData();
      
      if (count === 0) {
        toast.error("Failed to import accounts. " + (errors.length > 0 ? errors[0] : "Check console for details."));
      } else if (errors.length > 0) {
        toast.warning(`Imported ${count} accounts with ${errors.length} errors.`);
        setIsSmartImportOpen(false);
        setPreviewRows([]);
      } else {
        toast.success(`Import successful: ${count} accounts added.`);
        setIsSmartImportOpen(false);
        setPreviewRows([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImportFile(file);
    }
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImportFile(file);
    }
  };

  const saveCOA = async () => {
    if (!coaForm.account_name?.trim()) return toast.error("Account name is required.");
    try {
      if (editingCOA?.id) {
        await updateChartOfAccount(editingCOA.id, coaForm);
        toast.success("Account updated.");
      } else {
        if (accounts.some(a => a.account_name.toLowerCase() === coaForm.account_name?.toLowerCase())) {
          return toast.error("Duplicate account name.");
        }
        await addChartOfAccount(coaForm as any);
        toast.success("Account added.");
      }
      setEditingCOA(null);
      setCoaForm({ account_type: "Asset", beginning_balance: 0 });
      loadData();
    } catch { toast.error("Failed to save account."); }
  };

  const saveJE = async () => {
    if (!editingJE) return;
    if (!editingJE.entry_date) return toast.error("Date is required.");
    
    let totalDebit = 0;
    let totalCredit = 0;
    for (const line of editingJE.lines) {
      if (!line.account_title) return toast.error("Account Title is required for all lines.");
      totalDebit += Number(line.debit) || 0;
      totalCredit += Number(line.credit) || 0;
    }

    if (totalDebit !== totalCredit) {
      return toast.error("Journal Entry is not balanced. Total Debits must equal Total Credits.");
    }

    try {
      if (editingJE.id) {
        // If editing a single line JE (legacy support or if we only allowed editing single lines)
        await updateJournalEntry(editingJE.id, { 
          entry_date: editingJE.entry_date,
          memo: editingJE.memo,
          account_title: editingJE.lines[0].account_title!,
          debit: editingJE.lines[0].debit || 0,
          credit: editingJE.lines[0].credit || 0,
        });
        toast.success("Journal entry updated.");
      } else {
        // Save each line
        for (const line of editingJE.lines) {
          if (line.debit === 0 && line.credit === 0) continue;
          await addJournalEntry({
            entry_date: editingJE.entry_date,
            memo: editingJE.memo,
            account_title: line.account_title!,
            debit: line.debit || 0,
            credit: line.credit || 0
          });
        }
        toast.success("Balanced Journal Entry saved.");
      }
      setEditingJE(null);
      loadData();
    } catch { toast.error("Failed to save journal entry."); }
  };

  const generalLedger = useMemo(() => {
    const gl: Record<string, { entries: JournalEntry[]; beginBal: number }> = {};
    accounts.forEach(a => { gl[a.account_name] = { entries: [], beginBal: a.beginning_balance }; });
    const sorted = [...journals].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
    sorted.forEach(j => {
      if (!gl[j.account_title]) gl[j.account_title] = { entries: [], beginBal: 0 };
      gl[j.account_title].entries.push(j);
    });
    return gl;
  }, [accounts, journals]);

  const trialBalance = useMemo(() => {
    const lines: { account: string; debit: number; credit: number }[] = [];
    let totalD = 0, totalC = 0;
    Object.entries(generalLedger).forEach(([acc, { entries, beginBal }]) => {
      const netJE = entries.reduce((s, e) => s + e.debit - e.credit, 0);
      const bal = beginBal + netJE;
      if (bal > 0) { lines.push({ account: acc, debit: bal, credit: 0 }); totalD += bal; }
      else if (bal < 0) { lines.push({ account: acc, debit: 0, credit: Math.abs(bal) }); totalC += Math.abs(bal); }
    });
    return { lines, totalD, totalC };
  }, [generalLedger]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter(a => {
      const matchSearch = a.account_name.toLowerCase().includes(coaSearch.toLowerCase());
      const matchType = coaTypeFilter === "All" || a.account_type === coaTypeFilter;
      return matchSearch && matchType;
    });
  }, [accounts, coaSearch, coaTypeFilter]);

  const exportPL = () => {
    const rows = [
      ["SERENITY INLAND RESORT – PROFIT AND LOSS"],
      [plDateFrom || "All dates", "to", plDateTo || "present"],
      [],
      ["INCOME"],
      ...plData.incomeDetails.map((i: any) => [i.name, i.amount]),
      ["Total Income", plData.income],
      [],
      ["COST OF GOODS SOLD (COGS)"],
      ...plData.cogsDetails.map((c: any) => [c.name, c.amount]),
      ["Total Cost of Goods Sold", plData.cogs],
      [],
      ["GROSS PROFIT", plData.grossProfit],
      [],
      ["EXPENSES"],
      ...plData.expenseDetails.map((e: any) => [e.name, e.amount]),
      ["Total Expenses", plData.expense],
      [],
      ["NET INCOME", plData.net],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "P&L");
    XLSX.writeFile(wb, `profit_loss_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success("P&L exported to Excel.");
  };

  const printPL = () => {
    const incRows = plData.incomeDetails.map((i: any) => `<tr><td>${i.name}</td><td class="right">₱${i.amount.toLocaleString()}</td></tr>`).join("");
    const cogsRows = plData.cogsDetails.map((c: any) => `<tr><td>${c.name}</td><td class="right">₱${c.amount.toLocaleString()}</td></tr>`).join("");
    const expRows = plData.expenseDetails.map((e: any) => `<tr><td>${e.name}</td><td class="right">₱${e.amount.toLocaleString()}</td></tr>`).join("");
    const html = `
      <style>body{font-family:Arial;font-size:12px;margin:20px}h2{text-align:center}table{width:100%;border-collapse:collapse;margin-bottom:12px}td,th{border:1px solid #ccc;padding:4px 8px}.right{text-align:right}.total{font-weight:bold}.net{font-size:14px;font-weight:bold}.gross{font-weight:bold;background-color:#f9f9f9}</style>
      <h2>SERENITY INLAND RESORT</h2><h2>PROFIT AND LOSS STATEMENT</h2>
      <p style="text-align:center">${plDateFrom || "All"} – ${plDateTo || "Present"}</p>
      <h3>INCOME</h3><table>${incRows}<tr class="total"><td>Total Income</td><td class="right">₱${plData.income.toLocaleString()}</td></tr></table>
      <h3>COST OF GOODS SOLD</h3><table>${cogsRows}<tr class="total"><td>Total Cost of Goods Sold</td><td class="right">₱${plData.cogs.toLocaleString()}</td></tr></table>
      <table><tr class="gross"><td>GROSS PROFIT</td><td class="right">₱${plData.grossProfit.toLocaleString()}</td></tr></table>
      <h3>EXPENSES</h3><table>${expRows}<tr class="total"><td>Total Expenses</td><td class="right">₱${plData.expense.toLocaleString()}</td></tr></table>
      <table><tr class="net"><td>NET INCOME</td><td class="right">₱${plData.net.toLocaleString()}</td></tr></table>
    `;
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    w.document.write(`<html><head><title>P&L</title></head><body>${html}<script>window.print();</script></body></html>`);
    w.document.close();
  };

  // ─── LOGIN SCREEN ───
  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16">
        <div className="pos-card max-w-sm w-full p-8 text-center space-y-6 shadow-2xl">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
            <Lock size={36} />
          </div>
          <div>
            <h2 className="text-2xl font-black">Finance & Admin</h2>
            <p className="text-sm text-muted-foreground mt-1">Enter your secure PIN to continue.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="● ● ● ● ●"
              className="pos-input w-full text-center tracking-[0.5em] text-xl font-bold"
              value={pin}
              onChange={e => setPin(e.target.value)}
              autoFocus
            />
            <button type="submit" className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 active:scale-95 transition-all">
              Unlock Module
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── MAIN MODULE ───
  return (
    <div className="reveal-up max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black">Finance & Admin</h2>
            <p className="text-xs text-muted-foreground">Secure Financial Management</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="flex items-center gap-2 px-3 h-9 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent active:scale-95 transition-all"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={() => setShowChangePin(true)}
            className="flex items-center gap-2 px-3 h-9 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent active:scale-95 transition-all"
          >
            <KeyRound size={14} /> Change PIN
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex flex-wrap gap-1 mb-6 border-b border-border">
        {(["coa", "journal", "pl", "gl", "tb"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-5 py-2.5 rounded-t-lg font-bold text-sm transition-all border-b-2 -mb-[2px] ${
              activeTab === t
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            {t === "coa" ? "Chart of Accounts"
              : t === "journal" ? "Journal Entries"
              : t === "pl" ? "Profit & Loss"
              : t === "gl" ? "General Ledger"
              : "Trial Balance"}
          </button>
        ))}
      </div>

      {/* ── CHART OF ACCOUNTS ── */}
      {activeTab === "coa" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-wrap justify-between items-center gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
            <div>
              <h3 className="font-bold">Chart of Accounts</h3>
              <p className="text-xs text-muted-foreground">{accounts.length} accounts registered</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                placeholder="Search accounts..."
                className="pos-input h-9 text-sm w-48"
                value={coaSearch}
                onChange={e => setCoaSearch(e.target.value)}
              />
              <select className="pos-input h-9 text-sm" value={coaTypeFilter} onChange={e => setCoaTypeFilter(e.target.value)}>
                <option value="All">All Types</option>
                <optgroup label="Assets">
                  {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </optgroup>
                <optgroup label="Liabilities">
                  {LIABILITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </optgroup>
                <optgroup label="Equity">
                  {EQUITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </optgroup>
                <optgroup label="Income">
                  {INCOME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </optgroup>
                <optgroup label="Cost of Goods Sold">
                  {COGS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </optgroup>
                <optgroup label="Expenses">
                  {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </optgroup>
              </select>
              <button
                onClick={() => {
                  setIsSmartImportOpen(true);
                  setPreviewRows([]);
                  setSmartImportMode("file");
                }}
                className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent active:scale-95 transition-all border border-border"
              >
                <Upload size={14} /> Import Chart of Accounts (Smart Import)
              </button>
              <button
                onClick={() =>
                  { setEditingCOA({} as any); setCoaForm({ account_type: "Asset", beginning_balance: 0 }); }}
                className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all"
              >
                <Plus size={14} /> Add Account
              </button>
              {accounts.length > 0 && (
                <button
                  onClick={async () => {
                    if (!deleteAllConfirm) {
                      setDeleteAllConfirm(true);
                      return;
                    }
                    setDeleteAllLoading(true);
                    try {
                      // Delete all accounts one by one
                      await Promise.all(accounts.map(a => deleteChartOfAccount(a.id!)));
                      await loadData();
                      toast.success(`All ${accounts.length} accounts deleted successfully.`);
                    } catch (e: any) {
                      toast.error("Failed to delete all accounts: " + (e?.message || String(e)));
                    }
                    setDeleteAllLoading(false);
                    setDeleteAllConfirm(false);
                  }}
                  onBlur={() => setTimeout(() => setDeleteAllConfirm(false), 3000)}
                  disabled={deleteAllLoading}
                  className={`flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium active:scale-95 transition-all disabled:opacity-60 ${
                    deleteAllConfirm
                      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 animate-pulse"
                      : "bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20"
                  }`}
                  title="Permanently delete ALL Chart of Accounts entries"
                >
                  {deleteAllLoading ? (
                    <><RefreshCw size={14} className="animate-spin" /> Deleting...</>
                  ) : deleteAllConfirm ? (
                    <><Trash2 size={14} /> Confirm Delete All ({accounts.length})</>
                  ) : (
                    <><Trash2 size={14} /> Delete All Accounts</>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Smart Table Import Engine Modal */}
          {isSmartImportOpen && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-card text-card-foreground border border-border w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden reveal-up">
                
                {/* Modal Header */}
                <div className="p-6 border-b border-border flex justify-between items-center bg-muted/40">
                  <div>
                    <h3 className="text-lg font-bold tracking-tight">Smart Chart of Accounts Import</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Parse file data, paste tabular rows, or construct manually with real-time validation.</p>
                  </div>
                  <button
                    onClick={() => setIsSmartImportOpen(false)}
                    className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                  {/* Mode Selectors */}
                  <div className="flex gap-2 p-1 bg-muted rounded-xl w-fit">
                    {(["file", "paste", "manual"] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setSmartImportMode(mode)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
                          smartImportMode === mode
                            ? "bg-card text-card-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {mode === "file" ? "📁 Upload File" : mode === "paste" ? "📋 Paste Text" : "✍️ Manual Grid"}
                      </button>
                    ))}
                  </div>

                  {/* Mode Content */}
                  {smartImportMode === "file" && (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`p-10 rounded-xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-4 ${
                        dragOver
                          ? "border-primary bg-primary/5 scale-[0.99]"
                          : "border-border bg-muted/20"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
                        <Upload size={24} />
                      </div>
                      <div className="text-center space-y-1">
                        <h4 className="font-bold text-sm">Drag & Drop Excel or CSV File Here</h4>
                        <p className="text-xs text-muted-foreground">Supports .xlsx, .xls, and .csv formats</p>
                      </div>
                      
                      <label className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 active:scale-95 transition-all cursor-pointer">
                        Browse Files
                        <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleExcelImport} />
                      </label>
                    </div>
                  )}

                  {smartImportMode === "paste" && (
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Paste Spreadsheet / Tabular Data</label>
                      <textarea
                        className="pos-input w-full min-h-[120px] font-mono text-xs p-3"
                        placeholder="AccountName&#9;AccountType&#9;BeginningBalance&#9;AsOfDate&#10;Cash in Hand&#9;Bank&#9;5000&#9;2026-05-28&#10;Pasted values can be tab-separated (from Excel) or comma-separated (CSV)..."
                        value={pasteText}
                        onChange={e => setPasteText(e.target.value)}
                      />
                      <button
                        onClick={parsePastedText}
                        className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 active:scale-95 transition-all"
                      >
                        Parse & Load Data
                      </button>
                    </div>
                  )}

                  {smartImportMode === "manual" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setPreviewRows(prev => [
                            ...prev,
                            {
                              id: Math.random().toString(36).substr(2, 9),
                              account_name: "",
                              account_type: "Expense",
                              beginning_balance: 0,
                              as_of_date: "",
                              isValid: false,
                              error: "Account Name is empty."
                            }
                          ]);
                        }}
                        className="flex items-center gap-1.5 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 active:scale-95 transition-all"
                      >
                        <Plus size={14} /> Add Blank Row
                      </button>
                    </div>
                  )}

                  {/* Interactive Preview Grid */}
                  {previewRows.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Interactive Grid Preview ({previewRows.length} total rows)</h4>
                        <span className="text-xs font-medium text-muted-foreground">
                          <strong className="text-green-600">{previewRows.filter(r => r.isValid).length}</strong> valid rows to import
                        </span>
                      </div>
                      
                      <div className="overflow-x-auto rounded-xl border border-border bg-card max-h-[300px]">
                        <table className="w-full text-xs">
                          <thead className="bg-muted sticky top-0 z-10">
                            <tr>
                              <th className="px-3 py-2 text-left w-12">Status</th>
                              <th className="px-3 py-2 text-left">Account Name</th>
                              <th className="px-3 py-2 text-left w-44">Account Type</th>
                              <th className="px-3 py-2 text-right w-36">Beginning Balance</th>
                              <th className="px-3 py-2 text-left w-36">As of Date</th>
                              <th className="px-3 py-2 text-center w-12">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {previewRows.map((row) => (
                              <tr key={row.id} className={`hover:bg-muted/30 transition-colors ${!row.isValid ? "bg-red-500/[0.02]" : ""}`}>
                                <td className="px-3 py-2 text-center">
                                  {row.isValid ? (
                                    <span className="text-green-600 font-bold text-base" title="Ready to import">✓</span>
                                  ) : (
                                    <span className="text-destructive font-bold text-base cursor-help" title={row.error}>⚠️</span>
                                  )}
                                </td>
                                <td className="px-2 py-1">
                                  <input
                                    type="text"
                                    className={`pos-input h-8 text-xs w-full ${!row.isValid && !row.account_name ? "border-destructive/60 bg-destructive/5" : ""}`}
                                    value={row.account_name}
                                    onChange={e => updatePreviewRow(row.id, "account_name", e.target.value)}
                                    placeholder="Account Name"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <select
                                    className="pos-input h-8 text-xs w-full"
                                    value={row.account_type}
                                    onChange={e => updatePreviewRow(row.id, "account_type", e.target.value)}
                                  >
                                    {ALL_ACCOUNT_TYPES.map(t => (
                                      <option key={t} value={t}>{t}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-2 py-1">
                                  <input
                                    type="number"
                                    className="pos-input h-8 text-xs w-full text-right"
                                    value={row.beginning_balance || ""}
                                    onChange={e => updatePreviewRow(row.id, "beginning_balance", parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <input
                                    type="date"
                                    className="pos-input h-8 text-xs w-full"
                                    value={row.as_of_date}
                                    onChange={e => updatePreviewRow(row.id, "as_of_date", e.target.value)}
                                  />
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    onClick={() => setPreviewRows(prev => prev.filter(r => r.id !== row.id))}
                                    className="w-6 h-6 rounded hover:bg-destructive/10 text-destructive/80 hover:text-destructive flex items-center justify-center transition-colors"
                                    title="Remove row"
                                  >
                                    🗑️
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {previewRows.some(r => !r.isValid) && (
                        <p className="text-[10px] text-destructive italic font-medium flex items-center gap-1">
                          ⚠️ Invalid rows (marked with ⚠️) will be automatically skipped instead of causing import failure. You can correct their details in the grid to import them.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-border flex justify-between items-center bg-muted/40">
                  <button
                    onClick={() => {
                      setPreviewRows([]);
                      setIsSmartImportOpen(false);
                    }}
                    className="px-4 h-10 rounded-lg bg-secondary text-secondary-foreground text-xs font-bold hover:bg-accent active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <div className="flex gap-2">
                    {previewRows.length > 0 && (
                      <button
                        onClick={() => setPreviewRows([])}
                        className="px-4 h-10 rounded-lg bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 active:scale-95 transition-all"
                      >
                        Clear All
                      </button>
                    )}
                    <button
                      onClick={executeSmartImport}
                      disabled={previewRows.filter(r => r.isValid).length === 0}
                      className="px-5 h-10 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save & Import ({previewRows.filter(r => r.isValid).length} Valid Accounts)
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          <div
            className="rounded-xl border border-border bg-card shadow-sm"
            style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 280px)" }}
          >
            <table
              className="w-full text-sm border-collapse"
              style={{ minWidth: "900px", tableLayout: "auto" }}
            >
              <thead className="bg-muted" style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <tr>
                  <th
                    className="text-left px-4 py-3 font-semibold border-b border-border"
                    style={{ minWidth: "300px", position: "sticky", top: 0, background: "inherit", zIndex: 10 }}
                  >Account Name</th>
                  <th
                    className="text-left px-4 py-3 font-semibold border-b border-border"
                    style={{ minWidth: "180px", position: "sticky", top: 0, background: "inherit", zIndex: 10 }}
                  >Type</th>
                  <th
                    className="text-right px-4 py-3 font-semibold border-b border-border"
                    style={{ minWidth: "160px", position: "sticky", top: 0, background: "inherit", zIndex: 10 }}
                  >Beginning Balance</th>
                  <th
                    className="text-center px-4 py-3 font-semibold border-b border-border"
                    style={{ width: "100px", position: "sticky", top: 0, background: "inherit", zIndex: 10 }}
                  >Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAccounts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-muted-foreground">
                      {accounts.length === 0
                        ? "No accounts yet. Import from Excel or add manually."
                        : "No accounts match your search."}
                    </td>
                  </tr>
                )}
                {filteredAccounts.map(a => (
                  <tr key={a.id} className="hover:bg-muted/40 transition-colors">
                    <td
                      className="px-4 py-3 font-medium"
                      style={{
                        maxWidth: "480px",
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        lineHeight: "1.4",
                      }}
                    >{a.account_name}</td>
                    <td className="px-4 py-3" style={{ whiteSpace: "nowrap" }}>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${TYPE_COLORS[a.account_type] || "bg-secondary"}`}>
                        {a.account_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium" style={{ whiteSpace: "nowrap" }}>{formatPeso(a.beginning_balance)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => { setEditingCOA(a); setCoaForm({ ...a }); }}
                          className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Delete "${a.account_name}"?`)) {
                              await deleteChartOfAccount(a.id!);
                              loadData();
                              toast.success("Account deleted.");
                            }
                          }}
                          className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── JOURNAL ENTRIES ── */}
      {activeTab === "journal" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
            <div>
              <h3 className="font-bold">Journal Entries</h3>
              <p className="text-xs text-muted-foreground">{journals.length} entries total</p>
            </div>
            <button
              onClick={() => { setEditingJE({ entry_date: new Date().toISOString().slice(0, 10), memo: "", lines: [{}, {}] }); }}
              className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all"
            >
              <Plus size={14} /> Add Entry
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Date</th>
                  <th className="text-left px-4 py-3 font-semibold">Account Title</th>
                  <th className="text-right px-4 py-3 font-semibold text-green-600">Debit</th>
                  <th className="text-right px-4 py-3 font-semibold text-red-600">Credit</th>
                  <th className="text-left px-4 py-3 font-semibold">Memo</th>
                  <th className="text-center px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {journals.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      No journal entries yet. Click "Add Entry" to begin.
                    </td>
                  </tr>
                )}
                {journals.map(j => (
                  <tr key={j.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 tabular-nums text-xs whitespace-nowrap">{formatDate(j.entry_date)}</td>
                    <td className="px-4 py-3 font-medium">{j.account_title}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-green-600 font-semibold">
                      {j.debit > 0 ? formatPeso(j.debit) : <span className="opacity-20">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-600 font-semibold">
                      {j.credit > 0 ? formatPeso(j.credit) : <span className="opacity-20">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{j.memo}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => { setEditingJE({ id: j.id, entry_date: j.entry_date, memo: j.memo || "", lines: [j] }); }}
                          className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm("Delete this journal entry?")) {
                              await deleteJournalEntry(j.id!);
                              loadData();
                              toast.success("Entry deleted.");
                            }
                          }}
                          className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {journals.length > 0 && (
                <tfoot className="bg-muted/30 font-black border-t-2 border-border">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-right uppercase tracking-wider text-xs">Totals</td>
                    <td className="px-4 py-3 text-right tabular-nums text-green-600">
                      {formatPeso(journals.reduce((s, j) => s + j.debit, 0))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-600">
                      {formatPeso(journals.reduce((s, j) => s + j.credit, 0))}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ── PROFIT & LOSS ── */}
      {activeTab === "pl" && (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-end gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Date From</label>
              <input type="date" className="pos-input h-9 text-sm" value={plDateFrom} onChange={e => setPlDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Date To</label>
              <input type="date" className="pos-input h-9 text-sm" value={plDateTo} onChange={e => setPlDateTo(e.target.value)} />
            </div>
            <button
              onClick={() => {
                setPlFilterApplied(true);
                loadData(plDateFrom || undefined, plDateTo || undefined);
              }}
              className="flex items-center gap-1.5 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 active:scale-95 transition-all"
            >
              <RefreshCw size={14} /> Apply Filter
            </button>
            {plFilterApplied && (
              <button
                onClick={() => {
                  setPlDateFrom("");
                  setPlDateTo("");
                  setPlFilterApplied(false);
                  loadData(undefined, undefined);
                }}
                className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 active:scale-95 transition-all"
              >
                ✕ Clear Filter
              </button>
            )}
            <div className="ml-auto flex gap-2">
              <button onClick={printPL} className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent active:scale-95 transition-all">
                <Printer size={14} /> Print Preview
              </button>
              <button onClick={exportPL} className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent active:scale-95 transition-all">
                <Download size={14} /> Export Excel
              </button>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-black uppercase tracking-wider">Profit & Loss Statement</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {plDateFrom || "All dates"}{plDateTo ? ` — ${plDateTo}` : ""}
            </p>
          </div>

          {/* Income */}
          <div className="pos-card overflow-hidden shadow-md">
            <div className="bg-green-500/10 px-6 py-3 border-b border-green-500/20">
              <h3 className="font-black text-green-700 dark:text-green-400 text-lg">INCOME</h3>
            </div>
            <div className="p-5 space-y-1">
              {plData.incomeDetails.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-sm py-2 px-2 hover:bg-muted/30 rounded-lg transition-colors">
                  <span className="text-foreground/80">{item.name}</span>
                  <span className="tabular-nums font-semibold">{formatPeso(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 border-t border-border font-black text-base text-green-600 px-2">
                <span>Total Income</span>
                <span>{formatPeso(plData.income)}</span>
              </div>
            </div>
          </div>

          {/* Cost of Goods Sold */}
          <div className="pos-card overflow-hidden shadow-md">
            <div className="bg-yellow-500/10 px-6 py-3 border-b border-yellow-500/20">
              <h3 className="font-black text-yellow-700 dark:text-yellow-500 text-lg">COST OF GOODS SOLD (COGS)</h3>
            </div>
            <div className="p-5 space-y-1">
              {plData.cogsDetails && plData.cogsDetails.length === 0 ? (
                <div className="text-sm py-2 px-2 text-muted-foreground italic text-center">
                  No COGS transactions recorded.
                </div>
              ) : (
                plData.cogsDetails?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-sm py-2 px-2 hover:bg-muted/30 rounded-lg transition-colors">
                    <span className="text-foreground/80">{item.name}</span>
                    <span className="tabular-nums font-semibold">{formatPeso(item.amount)}</span>
                  </div>
                ))
              )}
              <div className="flex justify-between items-center pt-3 border-t border-border font-black text-base text-yellow-600 px-2">
                <span>Total Cost of Goods Sold</span>
                <span>{formatPeso(plData.cogs)}</span>
              </div>
            </div>
          </div>

          {/* Gross Profit Summary Card */}
          <div className="pos-card p-5 flex justify-between items-center border border-border shadow-sm bg-muted/30">
            <div>
              <h4 className="font-bold text-sm">GROSS PROFIT</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Total Income minus Cost of Goods Sold</p>
            </div>
            <span className="text-lg font-black tabular-nums">{formatPeso(plData.grossProfit)}</span>
          </div>

          {/* Expenses */}
          <div className="pos-card overflow-hidden shadow-md">
            <div className="bg-red-500/10 px-6 py-3 border-b border-red-500/20">
              <h3 className="font-black text-red-700 dark:text-red-400 text-lg">EXPENSES</h3>
            </div>
            <div className="p-5 space-y-1">
              {plData.expenseDetails.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-sm py-2 px-2 hover:bg-muted/30 rounded-lg transition-colors">
                  <span className="text-foreground/80">{item.name}</span>
                  <span className="tabular-nums font-semibold">{formatPeso(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 border-t border-border font-black text-base text-red-600 px-2">
                <span>Total Expenses</span>
                <span>{formatPeso(plData.expense)}</span>
              </div>
            </div>
          </div>

          {/* Net Income */}
          <div className={`pos-card p-6 flex justify-between items-center border-2 shadow-xl ${plData.net >= 0 ? "bg-green-500/5 border-green-500/30" : "bg-red-500/5 border-red-500/30"}`}>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Net Profit</p>
              <h3 className="text-2xl font-black">{plData.net >= 0 ? "Profitable" : "Net Loss"}</h3>
            </div>
            <span className={`text-3xl font-black tabular-nums ${plData.net >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatPeso(plData.net)}
            </span>
          </div>
        </div>
      )}

      {/* ── GENERAL LEDGER ── */}
      {activeTab === "gl" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {Object.entries(generalLedger).filter(([, d]) => d.entries.length > 0 || d.beginBal !== 0).map(([acc, data]) => {
            let currBal = data.beginBal;
            return (
              <div key={acc} className="pos-card overflow-hidden shadow-sm">
                <div className="bg-primary/10 px-5 py-3 font-bold text-primary flex justify-between items-center">
                  <span>{acc}</span>
                  <span className="text-xs font-medium uppercase tracking-wider opacity-70">General Ledger</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium">Date</th>
                        <th className="text-left px-4 py-2 font-medium">Memo</th>
                        <th className="text-right px-4 py-2 font-medium text-green-600">Debit</th>
                        <th className="text-right px-4 py-2 font-medium text-red-600">Credit</th>
                        <th className="text-right px-4 py-2 font-medium text-primary">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr className="bg-muted/20 italic text-muted-foreground">
                        <td className="px-4 py-2 text-xs" colSpan={2}>Beginning Balance</td>
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2 text-right tabular-nums text-primary font-semibold">{formatPeso(currBal)}</td>
                      </tr>
                      {data.entries.map(e => {
                        currBal += e.debit - e.credit;
                        return (
                          <tr key={e.id} className="hover:bg-muted/30">
                            <td className="px-4 py-2 text-xs whitespace-nowrap">{formatDate(e.entry_date)}</td>
                            <td className="px-4 py-2 text-xs text-muted-foreground">{e.memo || "—"}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-green-600">{e.debit > 0 ? formatPeso(e.debit) : ""}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-red-600">{e.credit > 0 ? formatPeso(e.credit) : ""}</td>
                            <td className="px-4 py-2 text-right tabular-nums font-bold text-primary">{formatPeso(currBal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          {Object.values(generalLedger).every(d => d.entries.length === 0 && d.beginBal === 0) && (
            <div className="text-center py-16 text-muted-foreground">
              No ledger data yet. Add accounts and journal entries to see the general ledger.
            </div>
          )}
        </div>
      )}

      {/* ── TRIAL BALANCE ── */}
      {activeTab === "tb" && (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
          <div className="text-center pt-2">
            <h2 className="text-2xl font-black uppercase tracking-wider">Trial Balance</h2>
            <p className="text-xs text-muted-foreground mt-1">Derived from Journal Entries + Beginning Balances</p>
          </div>
          <div className="pos-card overflow-hidden shadow-md">
            <table className="w-full text-sm">
              <thead className="bg-primary text-primary-foreground">
                <tr>
                  <th className="text-left px-6 py-4 font-bold">Account</th>
                  <th className="text-right px-6 py-4 font-bold text-green-200">Debit</th>
                  <th className="text-right px-6 py-4 font-bold text-red-200">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trialBalance.lines.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-12 text-muted-foreground">
                      No trial balance data. Add accounts and journal entries first.
                    </td>
                  </tr>
                )}
                {trialBalance.lines.map((l, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3 font-medium">{l.account}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-green-600 font-semibold">
                      {l.debit > 0 ? formatPeso(l.debit) : ""}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-red-600 font-semibold">
                      {l.credit > 0 ? formatPeso(l.credit) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted font-black border-t-2 border-border">
                <tr>
                  <td className="px-6 py-4 text-right uppercase text-xs tracking-wider">TOTALS</td>
                  <td className="px-6 py-4 text-right tabular-nums text-green-600 text-base">{formatPeso(trialBalance.totalD)}</td>
                  <td className="px-6 py-4 text-right tabular-nums text-red-600 text-base">{formatPeso(trialBalance.totalC)}</td>
                </tr>
              </tfoot>
            </table>
            {trialBalance.totalD > 0 && trialBalance.totalD === trialBalance.totalC && (
              <div className="bg-green-500/10 text-green-700 dark:text-green-400 px-6 py-4 font-bold text-center flex items-center justify-center gap-2 border-t border-green-500/20">
                <ShieldCheck size={18} /> Trial Balance is balanced.
              </div>
            )}
            {trialBalance.totalD > 0 && trialBalance.totalD !== trialBalance.totalC && (
              <div className="bg-red-500/10 text-red-600 px-6 py-4 font-bold text-center border-t border-red-500/20">
                ⚠ Out of balance by {formatPeso(Math.abs(trialBalance.totalD - trialBalance.totalC))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── COA MODAL ── */}
      {editingCOA && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black mb-5">{editingCOA.id ? "Edit Account" : "New Account"}</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Account Name *</label>
                <input
                  className="pos-input w-full"
                  value={coaForm.account_name || ""}
                  onChange={e => setCoaForm({ ...coaForm, account_name: e.target.value })}
                  placeholder="e.g. Cash on Hand"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Account Type *</label>
                <select className="pos-input w-full" value={coaForm.account_type || "Bank"} onChange={e => setCoaForm({ ...coaForm, account_type: e.target.value as any })}>
                  <optgroup label="Assets">
                    {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </optgroup>
                  <optgroup label="Liabilities">
                    {LIABILITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </optgroup>
                  <optgroup label="Equity">
                    {EQUITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </optgroup>
                  <optgroup label="Income">
                    {INCOME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </optgroup>
                  <optgroup label="Cost of Goods Sold">
                    {COGS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </optgroup>
                  <optgroup label="Expenses">
                    {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Beginning Balance</label>
                <input
                  type="number"
                  step="0.01"
                  className="pos-input w-full"
                  value={coaForm.beginning_balance ?? 0}
                  onChange={e => setCoaForm({ ...coaForm, beginning_balance: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">As of Date</label>
                <input
                  type="date"
                  className="pos-input w-full"
                  value={coaForm.as_of_date || ""}
                  onChange={e => setCoaForm({ ...coaForm, as_of_date: e.target.value || undefined })}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditingCOA(null)} className="flex-1 h-12 rounded-xl bg-secondary text-secondary-foreground font-bold hover:bg-accent active:scale-95 transition-all">
                Cancel
              </button>
              <button onClick={saveCOA} className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 active:scale-95 transition-all">
                Save Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── JE MULTI-LINE MODAL ── */}
      {editingJE && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black mb-5">{editingJE.id ? "Edit Journal Entry" : "New Journal Entry"}</h3>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Entry Date *</label>
                  <input type="date" className="pos-input w-full" value={editingJE.entry_date || ""} onChange={e => setEditingJE({ ...editingJE, entry_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Memo / Description</label>
                  <input type="text" className="pos-input w-full" value={editingJE.memo || ""} onChange={e => setEditingJE({ ...editingJE, memo: e.target.value })} placeholder="Optional description..." />
                </div>
              </div>

              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">Account Title</th>
                      <th className="text-left px-3 py-2 font-semibold">Type</th>
                      <th className="text-right px-3 py-2 font-semibold text-green-600">Debit</th>
                      <th className="text-right px-3 py-2 font-semibold text-red-600">Credit</th>
                      <th className="px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {editingJE.lines.map((line, i) => {
                      const acc = accounts.find(a => a.account_name === line.account_title);
                      return (
                        <tr key={i} className="border-t border-border">
                          <td className="px-2 py-2">
                            <input
                              list="je-accounts-list"
                              className="pos-input w-full text-xs h-9"
                              placeholder="Account..."
                              value={line.account_title || ""}
                              onChange={e => {
                                const newLines = [...editingJE.lines];
                                newLines[i].account_title = e.target.value;
                                setEditingJE({ ...editingJE, lines: newLines });
                              }}
                            />
                            <datalist id="je-accounts-list">
                              {accounts.map(a => <option key={a.id} value={a.account_name} />)}
                            </datalist>
                          </td>
                          <td className="px-2 py-2">
                            <input type="text" className="pos-input w-24 text-xs h-9 bg-muted cursor-not-allowed opacity-70" value={acc?.account_type || ""} readOnly placeholder="Type" />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number" step="0.01" min="0"
                              className="pos-input w-24 text-xs h-9 text-right"
                              value={line.debit || ""}
                              onChange={e => {
                                const newLines = [...editingJE.lines];
                                newLines[i].debit = parseFloat(e.target.value) || 0;
                                setEditingJE({ ...editingJE, lines: newLines });
                              }}
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number" step="0.01" min="0"
                              className="pos-input w-24 text-xs h-9 text-right"
                              value={line.credit || ""}
                              onChange={e => {
                                const newLines = [...editingJE.lines];
                                newLines[i].credit = parseFloat(e.target.value) || 0;
                                setEditingJE({ ...editingJE, lines: newLines });
                              }}
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => {
                                const newLines = editingJE.lines.filter((_, idx) => idx !== i);
                                if (newLines.length === 0) newLines.push({});
                                setEditingJE({ ...editingJE, lines: newLines });
                              }}
                              className="w-7 h-7 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-muted/50 font-bold border-t border-border">
                    <tr>
                      <td colSpan={2} className="px-3 py-2 text-right">
                        <button
                          onClick={() => setEditingJE({ ...editingJE, lines: [...editingJE.lines, {}] })}
                          className="text-xs text-primary hover:underline flex items-center gap-1 ml-2"
                        >
                          <Plus size={12} /> Add Line
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right text-green-600">
                        {formatPeso(editingJE.lines.reduce((s, l) => s + (l.debit || 0), 0))}
                      </td>
                      <td className="px-3 py-2 text-right text-red-600">
                        {formatPeso(editingJE.lines.reduce((s, l) => s + (l.credit || 0), 0))}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingJE(null)} className="flex-1 h-12 rounded-xl bg-secondary text-secondary-foreground font-bold hover:bg-accent active:scale-95 transition-all">
                Cancel
              </button>
              <button onClick={saveJE} className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 active:scale-95 transition-all">
                Save Balanced Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CHANGE PIN MODAL ── */}
      {showChangePin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={28} />
            </div>
            <h3 className="text-xl font-black mb-1">Change Security PIN</h3>
            <p className="text-xs text-muted-foreground mb-6">Set a new PIN for the Finance & Admin module.</p>
            <div className="space-y-3 mb-6 text-left">
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">New PIN</label>
                <input type="password" placeholder="Min. 4 characters" className="pos-input w-full text-center tracking-widest" value={newPin} onChange={e => setNewPin(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">Confirm PIN</label>
                <input type="password" placeholder="Repeat PIN" className="pos-input w-full text-center tracking-widest" value={confirmNewPin} onChange={e => setConfirmNewPin(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowChangePin(false); setNewPin(""); setConfirmNewPin(""); }} className="flex-1 h-11 rounded-xl bg-secondary text-secondary-foreground font-bold hover:bg-accent active:scale-95 transition-all">
                Cancel
              </button>
              <button onClick={handleChangePin} className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 active:scale-95 transition-all">
                Save PIN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
