import { useState, useEffect, useCallback, useMemo } from "react";
import { UtensilsCrossed, Package, ShoppingCart, Trash2, Plus } from "lucide-react";
import CustomerSelect from "@/components/CustomerSelect";
import ModuleShell from "@/components/ModuleShell";
import {
  getFoodInventory, addFoodInventoryItem, updateFoodInventoryItem, deleteFoodInventoryItem,
  addFoodSale, FoodInventoryItem,
} from "@/lib/db";
import { formatPeso } from "@/lib/format";
import { toast } from "sonner";

type Tab = "pos" | "inventory";

export default function FoodPOSModule() {
  const [tab, setTab] = useState<Tab>("pos");
  const [inventory, setInventory] = useState<FoodInventoryItem[]>([]);
  const reload = useCallback(() => { getFoodInventory().then(setInventory); }, []);
  useEffect(() => { reload(); }, [reload]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => setTab("pos")} className={`toggle-btn flex-1 flex items-center justify-center gap-2 ${tab === "pos" ? "toggle-btn-active" : ""}`}>
          <ShoppingCart size={16} /> POS Sale
        </button>
        <button onClick={() => setTab("inventory")} className={`toggle-btn flex-1 flex items-center justify-center gap-2 ${tab === "inventory" ? "toggle-btn-active" : ""}`}>
          <Package size={16} /> Inventory
        </button>
      </div>
      {tab === "pos" ? <POSScreen inventory={inventory} onSold={reload} /> : <InventoryScreen inventory={inventory} reload={reload} />}
    </div>
  );
}

function POSScreen({ inventory, onSold }: { inventory: FoodInventoryItem[]; onSold: () => void }) {
  const [customerName, setCustomerName] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<FoodInventoryItem | null>(null);
  const [qty, setQty] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Charge to Booking">("Cash");
  const [saving, setSaving] = useState(false);

  const matches = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    return inventory.filter((i) => i.item_name.toLowerCase().includes(q)).slice(0, 6);
  }, [search, inventory]);

  const q = Math.max(0, parseFloat(qty) || 0);
  const up = Math.max(0, parseFloat(unitPrice) || 0);
  const d = Math.max(0, parseFloat(discount) || 0);
  const total = Math.max(0, q * up - d);
  const isCharge = paymentMethod === "Charge to Booking";
  const cash = isCharge ? 0 : parseFloat(cashReceived) || 0;
  const change = isCharge ? 0 : cash - total;
  const capital = total / 1.6;
  const profit = total - capital;
  const commission = profit / 2;

  const pick = (it: FoodInventoryItem) => {
    setSelected(it);
    setSearch(it.item_name);
    setUnitPrice(it.selling_price.toString());
  };

  const handleSave = useCallback(async () => {
    if (!selected) { toast.error("Pick an item from inventory"); return; }
    if (q <= 0 || up <= 0) { toast.error("Enter qty and price"); return; }
    if (isCharge && !customerName.trim()) { toast.error("Customer Name is required to Charge to Booking"); return; }
    if (!isCharge && cash < total) { toast.error("Insufficient cash"); return; }
    if (selected.stock_qty < q) { toast.error("Not enough stock"); return; }
    setSaving(true);
    const now = new Date();
    try {
      await addFoodSale({
        sale_date: now.toISOString().slice(0, 10),
        date_time: now.toISOString(),
        customer_name: customerName || undefined,
        item_id: selected.id,
        item_name: selected.item_name,
        qty: q,
        unit_price: up,
        discount: d,
        total_sales: total,
        cash_received: cash,
        change_amount: change,
        capital, profit, commission_share: commission,
        payment_status: isCharge ? "Unpaid" : "Fully Paid",
      });
      // Deduct stock
      if (selected.id) {
        await updateFoodInventoryItem(selected.id, { stock_qty: selected.stock_qty - q });
      }
      toast.success(isCharge ? "Charged to booking successfully" : `Sale recorded — Change ${formatPeso(change)}`);
      setCustomerName(""); setSearch(""); setSelected(null);
      setQty("1"); setUnitPrice(""); setDiscount(""); setCashReceived("");
      setPaymentMethod("Cash");
      onSold();
    } catch { toast.error("Failed to save sale"); }
    setSaving(false);
  }, [selected, q, up, d, total, cash, change, capital, profit, commission, customerName, onSold]);

  return (
    <ModuleShell title="Food POS" icon={<UtensilsCrossed size={20} />} onSave={handleSave} saveLabel="Record Sale" saving={saving}>
      <div>
        <label className="text-sm font-medium block mb-1">Customer Name (Optional for Cash)</label>
        <CustomerSelect className="pos-input w-full" value={customerName} onChange={setCustomerName} placeholder="Walk-in / Enter name to charge" />
      </div>
      <div className="relative">
        <label className="text-sm font-medium block mb-1">Item</label>
        <input type="text" className="pos-input w-full" value={search} onChange={(e) => { setSearch(e.target.value); setSelected(null); }} placeholder="Type to search inventory…" />
        {matches.length > 0 && !selected && (
          <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
            {matches.map((it) => (
              <button key={it.id} type="button" onClick={() => pick(it)}
                className="w-full text-left px-3 py-2 hover:bg-muted flex justify-between text-sm">
                <span>{it.item_name}</span>
                <span className="text-muted-foreground">{formatPeso(it.selling_price)} · stock {it.stock_qty}</span>
              </button>
            ))}
          </div>
        )}
        {selected && <p className="text-xs text-muted-foreground mt-1">In stock: {selected.stock_qty}</p>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs font-medium block mb-1">Qty</label>
          <input type="number" min="0" step="1" className="pos-input w-full" value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Unit Price</label>
          <input type="number" min="0" step="0.01" className="pos-input w-full" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium block mb-1">Discount</label>
          <input type="number" min="0" step="0.01" className="pos-input w-full" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0.00" />
        </div>
      </div>
      <div className="pos-card border-primary/30">
        <p className="text-sm text-muted-foreground">Total Sales</p>
        <p className="text-2xl font-bold text-primary tabular-nums">{formatPeso(total)}</p>
        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
          <p>Capital (÷1.6): {formatPeso(capital)}</p>
          <p>Profit: {formatPeso(profit)}</p>
          <p>Commission Share (½ profit): {formatPeso(commission)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium block mb-1">Payment Method</label>
          <select className="pos-input w-full" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}>
            <option value="Cash">Cash</option>
            <option value="Charge to Booking">Charge to Booking</option>
          </select>
        </div>
        {!isCharge && (
          <div>
            <label className="text-sm font-medium block mb-1">Cash Received</label>
            <input type="number" min="0" step="0.01" className="pos-input w-full text-lg font-bold" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} placeholder="0.00" />
          </div>
        )}
      </div>
      {!isCharge && cash > 0 && (
        <div className={`pos-card ${cash >= total ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
          <p className="text-sm text-muted-foreground mb-1">Change</p>
          <p className={`text-2xl font-bold tabular-nums ${cash >= total ? "text-success" : "text-destructive"}`}>{formatPeso(change)}</p>
        </div>
      )}
    </ModuleShell>
  );
}

function InventoryScreen({ inventory, reload }: { inventory: FoodInventoryItem[]; reload: () => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [stockQty, setStockQty] = useState("");

  const add = async () => {
    if (!name.trim()) { toast.error("Item name required"); return; }
    try {
      await addFoodInventoryItem({
        item_name: name.trim(),
        item_description: desc || undefined,
        unit_cost: parseFloat(unitCost) || 0,
        selling_price: parseFloat(sellPrice) || 0,
        stock_qty: parseFloat(stockQty) || 0,
      });
      setName(""); setDesc(""); setUnitCost(""); setSellPrice(""); setStockQty("");
      toast.success("Item added");
      reload();
    } catch { toast.error("Failed"); }
  };

  const updateStock = async (id: number, delta: number, current: number) => {
    const next = Math.max(0, current + delta);
    await updateFoodInventoryItem(id, { stock_qty: next });
    reload();
  };

  const remove = async (id: number) => {
    if (!confirm("Delete item?")) return;
    await deleteFoodInventoryItem(id);
    reload();
  };

  return (
    <div className="space-y-3">
      <div className="pos-card space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Plus size={16} /> Add Inventory Item</h3>
        <input type="text" className="pos-input w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name *" />
        <input type="text" className="pos-input w-full" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" />
        <div className="grid grid-cols-3 gap-2">
          <input type="number" min="0" step="0.01" className="pos-input" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="Unit cost" />
          <input type="number" min="0" step="0.01" className="pos-input" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder="Selling price" />
          <input type="number" min="0" step="1" className="pos-input" value={stockQty} onChange={(e) => setStockQty(e.target.value)} placeholder="Stock qty" />
        </div>
        <button onClick={add} className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold">Add Item</button>
      </div>

      <div className="pos-card">
        <h3 className="text-sm font-semibold mb-2">Inventory ({inventory.length})</h3>
        {inventory.length === 0 ? (
          <p className="text-xs text-muted-foreground">No items yet.</p>
        ) : (
          <div className="space-y-2">
            {inventory.map((it) => (
              <div key={it.id} className="border border-border rounded-lg p-2 flex items-center gap-2 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{it.item_name}</p>
                  <p className="text-xs text-muted-foreground">Cost {formatPeso(it.unit_cost)} · Sell {formatPeso(it.selling_price)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => it.id && updateStock(it.id, -1, it.stock_qty)} className="w-7 h-7 rounded bg-secondary text-secondary-foreground">−</button>
                  <span className="w-10 text-center font-bold tabular-nums">{it.stock_qty}</span>
                  <button onClick={() => it.id && updateStock(it.id, 1, it.stock_qty)} className="w-7 h-7 rounded bg-secondary text-secondary-foreground">+</button>
                </div>
                <button onClick={() => it.id && remove(it.id)} className="w-7 h-7 rounded bg-destructive/10 text-destructive flex items-center justify-center">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
