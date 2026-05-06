// Cloud-synced database layer using Supabase
import { supabase } from "@/integrations/supabase/client";

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
  check_in?: string;
  check_out?: string;
  tour_type?: string;
  corkage_fee?: number;
  function_hall_fee?: number;
  deposit_amount?: number;
  balance?: number;
  payment_status?: string;
  comments?: string;
  entry_time?: string;
  checkout_time?: string;
  pax?: number;
  extension_fee?: number;
  kids_8_above?: number;
  kids_5_7?: number;
  kids_4_below?: number;
  date_settled?: string;
  start_time?: string;
  end_time?: string;
  default_hours?: number;
  extend_hours?: number;
  extend_amount?: number;
  status?: string;
  rate?: number;
  with_function_hall?: boolean;
  function_hall_days?: number;
  function_hall_rate?: number;
  function_hall_total?: number;
  additional_adult_fee?: number;
  maintenance_fee?: number;
  drinks_corkage_fee?: number;
  liquor_corkage_fee?: number;
}

export interface BookingCashierEntry {
  id?: number;
  date: string;
  customer_name: string;
  amount: number;
  amount_on_hand: number;
  expenses: number;
  comments: string;
}

export interface Settings {
  id: string;
  adult_rate_day: number;
  child_rate_day: number;
  adult_rate_night: number;
  child_rate_night: number;
  kids_8_above_rate_day?: number;
  kids_5_7_rate_day?: number;
  kids_8_above_rate_night?: number;
  kids_5_7_rate_night?: number;
  exclusive_fee: number;
  barkada_room_rate: number;
  kubo_room_rate: number;
  table_rent_rate: number;
  billiard_rate?: number;
  videoke_rate?: number;
  dart_rate?: number;
  volleyball_rate?: number;
  tent_rate?: number;
  day_tour_rate?: number;
  overnight_rate?: number;
  function_hall_rate_per_day?: number;
  company_name?: string;
  company_address?: string;
  contact_number?: string;
  tin_number?: string;
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
  kids_8_above_rate_day: 50,
  kids_5_7_rate_day: 30,
  kids_8_above_rate_night: 75,
  kids_5_7_rate_night: 50,
  exclusive_fee: 5000,
  barkada_room_rate: 1500,
  kubo_room_rate: 1000,
  table_rent_rate: 200,
  billiard_rate: 100,
  videoke_rate: 200,
  dart_rate: 100,
  volleyball_rate: 200,
  tent_rate: 300,
  day_tour_rate: 250,
  overnight_rate: 350,
  function_hall_rate_per_day: 1500,
  company_name: "SERENITY INLAND RESORT",
  company_address: "",
  contact_number: "",
  tin_number: "",
};

// ─── Settings ───

export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("id", "default")
    .single();
  if (error || !data) return DEFAULT_SETTINGS;
  return {
    id: data.id,
    adult_rate_day: Number(data.adult_rate_day),
    child_rate_day: Number(data.child_rate_day),
    adult_rate_night: Number(data.adult_rate_night),
    child_rate_night: Number(data.child_rate_night),
    kids_8_above_rate_day: data.kids_8_above_rate_day != null ? Number(data.kids_8_above_rate_day) : undefined,
    kids_5_7_rate_day: data.kids_5_7_rate_day != null ? Number(data.kids_5_7_rate_day) : undefined,
    kids_8_above_rate_night: data.kids_8_above_rate_night != null ? Number(data.kids_8_above_rate_night) : undefined,
    kids_5_7_rate_night: data.kids_5_7_rate_night != null ? Number(data.kids_5_7_rate_night) : undefined,
    exclusive_fee: Number(data.exclusive_fee),
    barkada_room_rate: Number(data.barkada_room_rate),
    kubo_room_rate: Number(data.kubo_room_rate),
    table_rent_rate: Number(data.table_rent_rate),
    billiard_rate: data.billiard_rate != null ? Number(data.billiard_rate) : 100,
    videoke_rate: data.videoke_rate != null ? Number(data.videoke_rate) : 200,
    dart_rate: (data as any).dart_rate != null ? Number((data as any).dart_rate) : 100,
    volleyball_rate: (data as any).volleyball_rate != null ? Number((data as any).volleyball_rate) : 200,
    tent_rate: (data as any).tent_rate != null ? Number((data as any).tent_rate) : 300,
    day_tour_rate: (data as any).day_tour_rate != null ? Number((data as any).day_tour_rate) : 250,
    overnight_rate: (data as any).overnight_rate != null ? Number((data as any).overnight_rate) : 350,
    function_hall_rate_per_day: (data as any).function_hall_rate_per_day != null ? Number((data as any).function_hall_rate_per_day) : 1500,
    company_name: data.company_name ?? "",
    company_address: data.company_address ?? "",
    contact_number: data.contact_number ?? "",
    tin_number: data.tin_number ?? "",
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  const { error } = await supabase
    .from("settings")
    .upsert({
      id: "default",
      adult_rate_day: settings.adult_rate_day,
      child_rate_day: settings.child_rate_day,
      adult_rate_night: settings.adult_rate_night,
      child_rate_night: settings.child_rate_night,
      kids_8_above_rate_day: settings.kids_8_above_rate_day ?? null,
      kids_5_7_rate_day: settings.kids_5_7_rate_day ?? null,
      kids_8_above_rate_night: settings.kids_8_above_rate_night ?? null,
      kids_5_7_rate_night: settings.kids_5_7_rate_night ?? null,
      exclusive_fee: settings.exclusive_fee,
      barkada_room_rate: settings.barkada_room_rate,
      kubo_room_rate: settings.kubo_room_rate,
      table_rent_rate: settings.table_rent_rate,
      billiard_rate: settings.billiard_rate ?? null,
      videoke_rate: settings.videoke_rate ?? null,
      dart_rate: settings.dart_rate ?? null,
      volleyball_rate: settings.volleyball_rate ?? null,
      tent_rate: settings.tent_rate ?? null,
      day_tour_rate: settings.day_tour_rate ?? null,
      overnight_rate: settings.overnight_rate ?? null,
      function_hall_rate_per_day: settings.function_hall_rate_per_day ?? 1500,
      company_name: settings.company_name ?? null,
      company_address: settings.company_address ?? null,
      contact_number: settings.contact_number ?? null,
      tin_number: settings.tin_number ?? null,
    } as any);
  if (error) throw error;
}

// ─── Transactions ───

export async function addTransaction(t: Omit<Transaction, "id">): Promise<number> {
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      transaction_no: t.transaction_no,
      date_time: t.date_time,
      module: t.module,
      game_type: t.game_type ?? null,
      room_type: t.room_type ?? null,
      booking_type: t.booking_type ?? null,
      adults: t.adults,
      children: t.children,
      total_headcount: t.total_headcount,
      amount_paid: t.amount_paid,
      payment_method: t.payment_method,
      customer_name: t.customer_name ?? null,
      number_of_tables: t.number_of_tables ?? null,
      check_in: t.check_in ?? null,
      check_out: t.check_out ?? null,
      tour_type: t.tour_type ?? null,
      corkage_fee: t.corkage_fee ?? 0,
      function_hall_fee: t.function_hall_fee ?? 0,
      deposit_amount: t.deposit_amount ?? 0,
      balance: t.balance ?? 0,
      payment_status: t.payment_status ?? null,
      comments: t.comments ?? null,
      entry_time: t.entry_time ?? null,
      checkout_time: t.checkout_time ?? null,
      pax: t.pax ?? null,
      extension_fee: t.extension_fee ?? 0,
      kids_8_above: t.kids_8_above ?? 0,
      kids_5_7: t.kids_5_7 ?? 0,
      kids_4_below: t.kids_4_below ?? 0,
      start_time: t.start_time ?? null,
      end_time: t.end_time ?? null,
      default_hours: t.default_hours ?? 2,
      extend_hours: t.extend_hours ?? 0,
      extend_amount: t.extend_amount ?? 0,
      status: t.status ?? null,
      rate: t.rate ?? 0,
      with_function_hall: t.with_function_hall ?? false,
      function_hall_days: t.function_hall_days ?? 0,
      function_hall_rate: t.function_hall_rate ?? 0,
      function_hall_total: t.function_hall_total ?? 0,
      additional_adult_fee: t.additional_adult_fee ?? 0,
      maintenance_fee: t.maintenance_fee ?? 0,
      drinks_corkage_fee: t.drinks_corkage_fee ?? 0,
      liquor_corkage_fee: t.liquor_corkage_fee ?? 0,
    } as any)
    .select("id")
    .single();
  if (error) throw error;
  return data!.id;
}

export async function updateTransaction(id: number, updates: Partial<Transaction>): Promise<void> {
  const updateData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (key === "id") continue;
    updateData[key] = value ?? null;
  }
  const { error } = await supabase
    .from("transactions")
    .update(updateData as any)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTransaction(id: number): Promise<void> {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

export async function getTransactions(filter?: {
  module?: string;
  dateFrom?: string;
  dateTo?: string;
  game_type?: string;
}): Promise<Transaction[]> {
  let query = supabase.from("transactions").select("*").order("date_time", { ascending: false });
  if (filter?.module) query = query.eq("module", filter.module);
  if (filter?.game_type) query = query.eq("game_type", filter.game_type);
  if (filter?.dateFrom) query = query.gte("date_time", filter.dateFrom);
  if (filter?.dateTo) query = query.lte("date_time", filter.dateTo + "T23:59:59");

  const { data, error } = await query;
  if (error) return [];
  return (data || []).map(row => ({
    id: row.id,
    transaction_no: row.transaction_no,
    date_time: row.date_time,
    module: row.module,
    game_type: row.game_type ?? undefined,
    room_type: row.room_type ?? undefined,
    booking_type: row.booking_type ?? undefined,
    adults: row.adults,
    children: row.children,
    total_headcount: row.total_headcount,
    amount_paid: Number(row.amount_paid),
    payment_method: row.payment_method as "Cash" | "GCash",
    customer_name: row.customer_name ?? undefined,
    number_of_tables: row.number_of_tables ?? undefined,
    check_in: row.check_in ?? undefined,
    check_out: row.check_out ?? undefined,
    tour_type: row.tour_type ?? undefined,
    corkage_fee: row.corkage_fee != null ? Number(row.corkage_fee) : undefined,
    function_hall_fee: row.function_hall_fee != null ? Number(row.function_hall_fee) : undefined,
    deposit_amount: row.deposit_amount != null ? Number(row.deposit_amount) : undefined,
    balance: row.balance != null ? Number(row.balance) : undefined,
    payment_status: row.payment_status ?? undefined,
    comments: row.comments ?? undefined,
    entry_time: row.entry_time ?? undefined,
    checkout_time: row.checkout_time ?? undefined,
    pax: row.pax ?? undefined,
    extension_fee: row.extension_fee != null ? Number(row.extension_fee) : undefined,
    kids_8_above: row.kids_8_above ?? undefined,
    kids_5_7: row.kids_5_7 ?? undefined,
    kids_4_below: row.kids_4_below ?? undefined,
    start_time: row.start_time ?? undefined,
    end_time: row.end_time ?? undefined,
    default_hours: row.default_hours != null ? Number(row.default_hours) : undefined,
    extend_hours: row.extend_hours != null ? Number(row.extend_hours) : undefined,
    extend_amount: row.extend_amount != null ? Number(row.extend_amount) : undefined,
    status: row.status ?? undefined,
    rate: row.rate != null ? Number(row.rate) : undefined,
    with_function_hall: (row as any).with_function_hall ?? undefined,
    function_hall_days: (row as any).function_hall_days != null ? Number((row as any).function_hall_days) : undefined,
    function_hall_rate: (row as any).function_hall_rate != null ? Number((row as any).function_hall_rate) : undefined,
    function_hall_total: (row as any).function_hall_total != null ? Number((row as any).function_hall_total) : undefined,
    additional_adult_fee: (row as any).additional_adult_fee != null ? Number((row as any).additional_adult_fee) : undefined,
    maintenance_fee: (row as any).maintenance_fee != null ? Number((row as any).maintenance_fee) : undefined,
    drinks_corkage_fee: (row as any).drinks_corkage_fee != null ? Number((row as any).drinks_corkage_fee) : undefined,
    liquor_corkage_fee: (row as any).liquor_corkage_fee != null ? Number((row as any).liquor_corkage_fee) : undefined,
  }));
}

// ─── Cashier Reports ───

export async function saveCashierReport(report: Omit<CashierReport, "id">): Promise<void> {
  const { error } = await supabase
    .from("cashier_reports")
    .insert({
      date: report.date,
      beginning_cash: report.beginning_cash,
      sales: report.sales,
      petty_cash: report.petty_cash,
      expected_ending_cash: report.expected_ending_cash,
      actual_cash: report.actual_cash,
      cash_over_short: report.cash_over_short,
      petty_items: report.petty_items as unknown as null,
      denoms: report.denoms as unknown as null,
    });
  if (error) throw error;
}

export async function getCashierReports(): Promise<CashierReport[]> {
  const { data, error } = await supabase
    .from("cashier_reports")
    .select("*")
    .order("date", { ascending: false });
  if (error) return [];
  return (data || []).map(row => ({
    id: row.id,
    date: row.date,
    beginning_cash: Number(row.beginning_cash),
    sales: Number(row.sales),
    petty_cash: Number(row.petty_cash),
    expected_ending_cash: Number(row.expected_ending_cash),
    actual_cash: Number(row.actual_cash),
    cash_over_short: Number(row.cash_over_short),
    petty_items: (row.petty_items as unknown as CashierReportPettyItem[]) || [],
    denoms: (row.denoms as unknown as CashierReportDenom[]) || [],
  }));
}

export async function deleteCashierReport(id: number): Promise<void> {
  const { error } = await supabase
    .from("cashier_reports")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ─── Booking Cashier Reports (cloud) ───

export interface BookingCashierReportDB {
  id?: number;
  report_date: string;
  beginning_cash: number;
  entrance_sales: number;
  petty_items: { date: string; particulars: string; receipt_no: string; amount: number }[];
  denoms: { label: string; value: number; quantity: number }[];
  actual_cash: number;
}

export async function saveBookingCashierReport(report: BookingCashierReportDB): Promise<void> {
  if (report.id) {
    const { error } = await supabase
      .from("booking_cashier_reports")
      .update({
        report_date: report.report_date,
        beginning_cash: report.beginning_cash,
        entrance_sales: report.entrance_sales,
        petty_items: report.petty_items as unknown as null,
        denoms: report.denoms as unknown as null,
        actual_cash: report.actual_cash,
      })
      .eq("id", report.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("booking_cashier_reports")
      .insert({
        report_date: report.report_date,
        beginning_cash: report.beginning_cash,
        entrance_sales: report.entrance_sales,
        petty_items: report.petty_items as unknown as null,
        denoms: report.denoms as unknown as null,
        actual_cash: report.actual_cash,
      });
    if (error) throw error;
  }
}

export async function deleteBookingCashierReport(id: number): Promise<void> {
  const { error } = await supabase
    .from("booking_cashier_reports")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function getBookingCashierReports(): Promise<BookingCashierReportDB[]> {
  const { data, error } = await supabase
    .from("booking_cashier_reports")
    .select("*")
    .order("report_date", { ascending: false });
  if (error) return [];
  return (data || []).map(row => ({
    id: row.id,
    report_date: row.report_date,
    beginning_cash: Number(row.beginning_cash),
    entrance_sales: Number(row.entrance_sales),
    petty_items: (row.petty_items as BookingCashierReportDB["petty_items"]) || [],
    denoms: (row.denoms as BookingCashierReportDB["denoms"]) || [],
    actual_cash: Number(row.actual_cash),
  }));
}

// ─── System Config (cloud key-value) ───

export async function getSystemConfig(key: string): Promise<string | null> {
  const { data } = await supabase
    .from("system_config")
    .select("value")
    .eq("key", key)
    .single();
  return data?.value ?? null;
}

export async function setSystemConfig(key: string, value: string): Promise<void> {
  const { error } = await supabase
    .from("system_config")
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ─── Export / Import / Reset ───

export async function exportAllData(): Promise<string> {
  const [txns, settings, cashier, bookingCashier] = await Promise.all([
    supabase.from("transactions").select("*"),
    supabase.from("settings").select("*"),
    supabase.from("cashier_reports").select("*"),
    supabase.from("booking_cashier_reports").select("*"),
  ]);
  return JSON.stringify({
    transactions: txns.data || [],
    settings: settings.data || [],
    cashier_reports: cashier.data || [],
    booking_cashier_reports: bookingCashier.data || [],
  }, null, 2);
}

export async function importData(jsonString: string): Promise<void> {
  const data = JSON.parse(jsonString);

  // Clear existing data
  await supabase.from("transactions").delete().neq("id", 0);
  await supabase.from("cashier_reports").delete().neq("id", 0);
  await supabase.from("booking_cashier_reports").delete().neq("id", 0);

  // Import transactions
  if (data.transactions?.length) {
    const txns = data.transactions.map((t: Record<string, unknown>) => {
      const { id: _id, created_at: _ca, ...rest } = t;
      return rest;
    });
    for (let i = 0; i < txns.length; i += 100) {
      await supabase.from("transactions").insert(txns.slice(i, i + 100));
    }
  }

  // Import settings
  if (data.settings?.length) {
    for (const s of data.settings) {
      await supabase.from("settings").upsert(s);
    }
  }

  // Import cashier reports
  if (data.cashier_reports?.length) {
    const reports = data.cashier_reports.map((r: Record<string, unknown>) => {
      const { id: _id, created_at: _ca, ...rest } = r;
      return rest;
    });
    for (let i = 0; i < reports.length; i += 100) {
      await supabase.from("cashier_reports").insert(reports.slice(i, i + 100));
    }
  }

  // Import booking cashier reports
  if (data.booking_cashier_reports?.length) {
    const reports = data.booking_cashier_reports.map((r: Record<string, unknown>) => {
      const { id: _id, created_at: _ca, ...rest } = r;
      return rest;
    });
    for (let i = 0; i < reports.length; i += 100) {
      await supabase.from("booking_cashier_reports").insert(reports.slice(i, i + 100));
    }
  }
}

export async function resetAllData(): Promise<void> {
  await Promise.all([
    supabase.from("transactions").delete().neq("id", 0),
    supabase.from("cashier_reports").delete().neq("id", 0),
    supabase.from("booking_cashier_reports").delete().neq("id", 0),
    supabase.from("settings").delete().neq("id", ""),
  ]);
  // Re-insert default settings
  await supabase.from("settings").insert({ id: "default" });
}

// ─── Food POS Inventory ───

export interface FoodInventoryItem {
  id?: number;
  item_name: string;
  item_description?: string;
  unit_cost: number;
  selling_price: number;
  stock_qty: number;
}

export async function getFoodInventory(): Promise<FoodInventoryItem[]> {
  const { data, error } = await supabase
    .from("food_inventory" as any)
    .select("*")
    .order("item_name", { ascending: true });
  if (error) return [];
  return (data || []).map((r: any) => ({
    id: r.id,
    item_name: r.item_name,
    item_description: r.item_description ?? undefined,
    unit_cost: Number(r.unit_cost),
    selling_price: Number(r.selling_price),
    stock_qty: Number(r.stock_qty),
  }));
}

export async function addFoodInventoryItem(item: Omit<FoodInventoryItem, "id">): Promise<number> {
  const { data, error } = await supabase
    .from("food_inventory" as any)
    .insert({
      item_name: item.item_name,
      item_description: item.item_description ?? null,
      unit_cost: item.unit_cost,
      selling_price: item.selling_price,
      stock_qty: item.stock_qty,
    } as any)
    .select("id")
    .single();
  if (error) throw error;
  return (data as any).id;
}

export async function updateFoodInventoryItem(id: number, updates: Partial<FoodInventoryItem>): Promise<void> {
  const data: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(updates)) {
    if (k === "id") continue;
    data[k] = v ?? null;
  }
  const { error } = await supabase.from("food_inventory" as any).update(data as any).eq("id", id);
  if (error) throw error;
}

export async function deleteFoodInventoryItem(id: number): Promise<void> {
  const { error } = await supabase.from("food_inventory" as any).delete().eq("id", id);
  if (error) throw error;
}

// ─── Food Sales ───

export interface FoodSale {
  id?: number;
  sale_date: string;
  date_time: string;
  customer_name?: string;
  item_id?: number;
  item_name: string;
  qty: number;
  unit_price: number;
  discount: number;
  total_sales: number;
  cash_received: number;
  change_amount: number;
  capital: number;
  profit: number;
  commission_share: number;
}

export async function addFoodSale(sale: Omit<FoodSale, "id">): Promise<number> {
  const { data, error } = await supabase
    .from("food_sales" as any)
    .insert({
      sale_date: sale.sale_date,
      date_time: sale.date_time,
      customer_name: sale.customer_name ?? null,
      item_id: sale.item_id ?? null,
      item_name: sale.item_name,
      qty: sale.qty,
      unit_price: sale.unit_price,
      discount: sale.discount,
      total_sales: sale.total_sales,
      cash_received: sale.cash_received,
      change_amount: sale.change_amount,
      capital: sale.capital,
      profit: sale.profit,
      commission_share: sale.commission_share,
    } as any)
    .select("id")
    .single();
  if (error) throw error;
  return (data as any).id;
}

export async function getFoodSales(filter?: { dateFrom?: string; dateTo?: string }): Promise<FoodSale[]> {
  let q: any = supabase.from("food_sales" as any).select("*").order("date_time", { ascending: false });
  if (filter?.dateFrom) q = q.gte("sale_date", filter.dateFrom);
  if (filter?.dateTo) q = q.lte("sale_date", filter.dateTo);
  const { data, error } = await q;
  if (error) return [];
  return (data || []).map((r: any) => ({
    id: r.id,
    sale_date: r.sale_date,
    date_time: r.date_time,
    customer_name: r.customer_name ?? undefined,
    item_id: r.item_id ?? undefined,
    item_name: r.item_name,
    qty: Number(r.qty),
    unit_price: Number(r.unit_price),
    discount: Number(r.discount),
    total_sales: Number(r.total_sales),
    cash_received: Number(r.cash_received),
    change_amount: Number(r.change_amount),
    capital: Number(r.capital),
    profit: Number(r.profit),
    commission_share: Number(r.commission_share),
  }));
}

export async function deleteFoodSale(id: number): Promise<void> {
  const { error } = await supabase.from("food_sales" as any).delete().eq("id", id);
  if (error) throw error;
}
