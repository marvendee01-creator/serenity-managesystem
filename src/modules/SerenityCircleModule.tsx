import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import StaffAccessPanel from "@/components/StaffAccessPanel";
import SerenityRewardsPanel from "@/modules/SerenityRewardsPanel";
import { Users, UserPlus, IdCard, Printer, ArrowLeft, RefreshCw, Ban, PauseCircle, PlayCircle } from "lucide-react";
import {
  getSerenityMembers,
  addSerenityMember,
  updateSerenityMember,
  regenerateMemberQrToken,
  getTransactions,
  getSettings,
  SerenityMember,
  MembershipCardName,
  MembershipStatus,
} from "@/lib/db";

const CARD_NAMES: MembershipCardName[] = ["Serenity Privé", "Serenity Prestige", "Serenity Privilege"];
const STATUSES: MembershipStatus[] = ["Active", "Expired", "Suspended", "Cancelled"];

type View = "list" | "register" | "details" | "card" | "staff" | "rewards";

function fmtDate(d: string) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

function statusColor(s: MembershipStatus) {
  switch (s) {
    case "Active": return "bg-green-500/15 text-green-600";
    case "Expired": return "bg-muted text-muted-foreground";
    case "Suspended": return "bg-amber-500/15 text-amber-600";
    case "Cancelled": return "bg-red-500/15 text-red-600";
  }
}

export default function SerenityCircleModule() {
  const [view, setView] = useState<View>("list");
  const [members, setMembers] = useState<SerenityMember[]>([]);
  const [selected, setSelected] = useState<SerenityMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState({ name: "SERENITY INLAND RESORT", address: "", contact: "" });

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await getSerenityMembers();
      // Auto-mark expired
      const today = new Date().toISOString().slice(0, 10);
      for (const m of list) {
        if (m.status === "Active" && m.expiry_date < today) {
          await updateSerenityMember(m.id!, { status: "Expired" });
          m.status = "Expired";
        }
      }
      setMembers(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    getSettings().then(s => setCompany({
      name: s.company_name || "SERENITY INLAND RESORT",
      address: s.company_address || "",
      contact: s.contact_number || "",
    }));
  }, []);

  const openDetails = (m: SerenityMember) => { setSelected(m); setView("details"); };
  const openCard = (m: SerenityMember) => { setSelected(m); setView("card"); };

  return (
    <div className="reveal-up max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <IdCard size={22} />
        </div>
        <h2 className="text-xl font-bold text-foreground" style={{ lineHeight: "1.2" }}>Serenity Circle</h2>
        {view === "list" && (
          <button onClick={() => setView("staff")} className="ml-auto rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted">Staff Access</button>
        )}
      </div>
      {view === "staff" && <StaffAccessPanel />}
      {view === "rewards" && <SerenityRewardsPanel members={members} />}

      {view !== "list" && (
        <button
          onClick={() => setView("list")}
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} /> Back to Member List
        </button>
      )}

      {view === "list" && (
        <>
          <MemberList members={members} loading={loading} onRegister={() => setView("register")} onDetails={openDetails} onCard={openCard} />
          <div className="mt-4 border-t border-border pt-4"><button onClick={() => setView("rewards")} className="w-full rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">Referrals & Reward Credits</button></div>
        </>
      )}
      {view === "register" && (
        <RegisterMember
          members={members}
          onDone={async () => { await refresh(); setView("list"); }}
        />
      )}
      {view === "details" && selected && (
        <MemberDetails
          member={selected}
          onUpdated={async () => { await refresh(); setView("list"); }}
          onCard={() => setView("card")}
        />
      )}
      {view === "card" && selected && (
        <MembershipCard member={selected} company={company} />
      )}
    </div>
  );
}

/* ================= Member List ================= */

function MemberList({ members, loading, onRegister, onDetails, onCard }: {
  members: SerenityMember[];
  loading: boolean;
  onRegister: () => void;
  onDetails: (m: SerenityMember) => void;
  onCard: (m: SerenityMember) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const filtered = useMemo(() => members.filter(m => {
    if (statusFilter !== "All" && m.status !== statusFilter) return false;
    if (search && !m.customer_name.toLowerCase().includes(search.toLowerCase()) && !m.member_id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [members, search, statusFilter]);

  return (
    <div className="space-y-4">
      <button
        onClick={onRegister}
        className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-base hover:bg-accent active:scale-[0.97] transition-all flex items-center justify-center gap-2"
      >
        <UserPlus size={18} /> Register New Member
      </button>

      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name or Member ID..."
          className="flex-1 h-10 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-10 rounded-lg border border-border bg-card px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option>All</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading members...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No members found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => (
            <div key={m.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{m.customer_name}</p>
                <p className="text-xs text-muted-foreground">{m.member_id} · {m.card_name}</p>
                <p className="text-xs text-muted-foreground">Expires: {fmtDate(m.expiry_date)}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor(m.status)}`}>{m.status}</span>
                <div className="flex gap-1">
                  <button onClick={() => onDetails(m)} className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">Details</button>
                  <button onClick={() => onCard(m)} className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors">Card</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= Register Member ================= */

function RegisterMember({ members, onDone }: { members: SerenityMember[]; onDone: () => void }) {
  const [customerName, setCustomerName] = useState("");
  const [cardName, setCardName] = useState<MembershipCardName>("Serenity Privilege");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date(); d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<string[]>([]);

  useEffect(() => {
    getTransactions().then(txns => {
      const names = Array.from(new Set(txns.map(t => t.customer_name?.trim()).filter(Boolean) as string[]));
      setCustomers(names.sort());
    });
  }, []);

  // Default expiry = 1 year from issue date
  useEffect(() => {
    const d = new Date(issueDate + "T00:00:00");
    if (!isNaN(d.getTime())) {
      d.setFullYear(d.getFullYear() + 1);
      setExpiryDate(d.toISOString().slice(0, 10));
    }
  }, [issueDate]);

  const handleSave = async () => {
    setError("");
    const name = customerName.trim();
    if (!name) { setError("Customer name is required."); return; }
    const dupe = members.find(m => m.customer_name.trim().toLowerCase() === name.toLowerCase() && m.status !== "Cancelled");
    if (dupe) { setError(`"${name}" is already a registered member (${dupe.member_id}).`); return; }
    if (!issueDate || !expiryDate) { setError("Issue and expiry dates are required."); return; }

    setSaving(true);
    try {
      const memberId = "SC-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
      await addSerenityMember({
        member_id: memberId,
        customer_name: name,
        card_name: cardName,
        issue_date: issueDate,
        expiry_date: expiryDate,
        status: "Active",
      });
      onDone();
    } catch (e: any) {
      setError(e?.message || "Failed to register member.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">Register New Member</h3>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Customer Name *</label>
        <input
          type="text"
          list="serenity-customers"
          value={customerName}
          onChange={e => setCustomerName(e.target.value)}
          placeholder="Enter customer name"
          autoComplete="off"
          className="mt-1 w-full h-10 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <datalist id="serenity-customers">
          {customers.map(c => <option key={c} value={c} />)}
        </datalist>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Membership Card</label>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {CARD_NAMES.map(cn => (
            <button
              key={cn}
              onClick={() => setCardName(cn)}
              className={`h-10 rounded-lg border text-xs font-semibold transition-all ${
                cardName === cn
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              {cn}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Issue Date *</label>
          <input
            type="date"
            value={issueDate}
            onChange={e => setIssueDate(e.target.value)}
            className="mt-1 w-full h-10 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Expiry Date *</label>
          <input
            type="date"
            value={expiryDate}
            onChange={e => setExpiryDate(e.target.value)}
            className="mt-1 w-full h-10 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">Membership is valid for one year from the issue date by default.</p>

      {error && <p className="text-sm text-destructive font-medium">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-base hover:bg-accent active:scale-[0.97] transition-all disabled:opacity-50"
      >
        {saving ? "Registering..." : "Register Member"}
      </button>
    </div>
  );
}

/* ================= Member Details ================= */

function MemberDetails({ member, onUpdated, onCard }: {
  member: SerenityMember;
  onUpdated: () => void;
  onCard: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"suspend" | "revoke" | "reactivate" | "regen" | null>(null);

  const doAction = async () => {
    if (!confirmAction) return;
    setBusy(true);
    try {
      if (confirmAction === "suspend") await updateSerenityMember(member.id!, { status: "Suspended" });
      else if (confirmAction === "revoke") await updateSerenityMember(member.id!, { status: "Cancelled" });
      else if (confirmAction === "reactivate") await updateSerenityMember(member.id!, { status: "Active" });
      else if (confirmAction === "regen") await regenerateMemberQrToken(member.id!);
      onUpdated();
    } finally {
      setBusy(false);
      setConfirmAction(null);
    }
  };

  const rows: [string, string][] = [
    ["Member ID", member.member_id],
    ["Cardholder", member.customer_name],
    ["Card", member.card_name],
    ["Issue Date", fmtDate(member.issue_date)],
    ["Expiry Date", fmtDate(member.expiry_date)],
    ["Status", member.status],
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">Member Details</h3>
      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-medium text-foreground">{v}</span>
          </div>
        ))}
      </div>

      <button onClick={onCard} className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-accent active:scale-[0.97] transition-all flex items-center justify-center gap-2">
        <IdCard size={16} /> View Membership Card
      </button>

      <div className="grid grid-cols-2 gap-2">
        {member.status === "Active" && (
          <button onClick={() => setConfirmAction("suspend")} className="h-10 rounded-lg bg-amber-500/15 text-amber-600 text-sm font-medium hover:bg-amber-500/25 transition-colors flex items-center justify-center gap-1.5">
            <PauseCircle size={15} /> Suspend
          </button>
        )}
        {(member.status === "Suspended" || member.status === "Expired") && (
          <button onClick={() => setConfirmAction("reactivate")} className="h-10 rounded-lg bg-green-500/15 text-green-600 text-sm font-medium hover:bg-green-500/25 transition-colors flex items-center justify-center gap-1.5">
            <PlayCircle size={15} /> Reactivate
          </button>
        )}
        {member.status !== "Cancelled" && (
          <button onClick={() => setConfirmAction("revoke")} className="h-10 rounded-lg bg-red-500/15 text-red-600 text-sm font-medium hover:bg-red-500/25 transition-colors flex items-center justify-center gap-1.5">
            <Ban size={15} /> Revoke
          </button>
        )}
        <button onClick={() => setConfirmAction("regen")} className="h-10 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors flex items-center justify-center gap-1.5">
          <RefreshCw size={15} /> Regenerate QR
        </button>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setConfirmAction(null)}>
          <div className="bg-card rounded-2xl shadow-2xl max-w-xs w-full p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-foreground">
              {confirmAction === "suspend" && "Suspend this membership?"}
              {confirmAction === "revoke" && "Revoke (cancel) this membership? This cannot be undone."}
              {confirmAction === "reactivate" && "Reactivate this membership?"}
              {confirmAction === "regen" && "Regenerate the QR code? The previous QR code will stop working immediately."}
            </p>
            <div className="flex gap-2">
              <button onClick={doAction} disabled={busy} className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                {busy ? "Working..." : "Confirm"}
              </button>
              <button onClick={() => setConfirmAction(null)} className="flex-1 h-10 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= Membership Card ================= */

function MembershipCard({ member, company }: {
  member: SerenityMember;
  company: { name: string; address: string; contact: string };
}) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    QRCode.toDataURL(member.qr_token, { width: 220, margin: 1 }).then(setQrDataUrl);
  }, [member.qr_token]);

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=500,height=400");
    if (!w || !printRef.current) return;
    w.document.write(`<html><head><title>Membership Card - ${member.member_id}</title>
      <style>
        body { font-family: Arial, sans-serif; display: flex; justify-content: center; padding: 20px; }
        .card { width: 3.375in; border: 2px solid #0e7490; border-radius: 12px; padding: 14px; }
        .brand { text-align: center; font-weight: bold; font-size: 13px; color: #0e7490; letter-spacing: 1px; }
        .sub { text-align: center; font-size: 9px; color: #555; margin-top: 2px; }
        .cardname { text-align: center; font-size: 12px; font-weight: bold; margin: 8px 0; color: #164e63; text-transform: uppercase; letter-spacing: 2px; }
        .row { display: flex; gap: 10px; align-items: center; margin-top: 8px; }
        .info { font-size: 10px; line-height: 1.6; }
        .info b { font-size: 11px; }
        img { width: 90px; height: 90px; }
        .status { text-align: center; margin-top: 8px; font-size: 10px; font-weight: bold; }
      </style></head><body>
      <div class="card">
        <div class="brand">${company.name}</div>
        ${company.address ? `<div class="sub">${company.address}</div>` : ""}
        <div class="cardname">${member.card_name}</div>
        <div class="row">
          <img src="${qrDataUrl}" />
          <div class="info">
            <b>${member.customer_name}</b><br/>
            Member ID: ${member.member_id}<br/>
            Issued: ${fmtDate(member.issue_date)}<br/>
            Expires: ${fmtDate(member.expiry_date)}
          </div>
        </div>
        <div class="status">Status: ${member.status}</div>
      </div>
      <script>window.print();</script>
      </body></html>`);
    w.document.close();
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">Membership Card</h3>

      <div ref={printRef} className="mx-auto w-full max-w-sm rounded-2xl border-2 border-primary bg-card p-4 shadow-lg">
        <p className="text-center font-bold text-sm text-primary tracking-wide">{company.name}</p>
        {company.address && <p className="text-center text-[10px] text-muted-foreground">{company.address}</p>}
        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-foreground my-3">{member.card_name}</p>
        <div className="flex items-center gap-3">
          {qrDataUrl && <img src={qrDataUrl} alt="Member QR" className="w-24 h-24 rounded-md" />}
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm text-foreground">{member.customer_name}</p>
            <p className="text-muted-foreground">Member ID: <span className="font-medium text-foreground">{member.member_id}</span></p>
            <p className="text-muted-foreground">Issued: {fmtDate(member.issue_date)}</p>
            <p className="text-muted-foreground">Expires: {fmtDate(member.expiry_date)}</p>
          </div>
        </div>
        <p className={`text-center mt-3 text-xs font-bold px-2 py-1 rounded-full w-fit mx-auto ${statusColor(member.status)}`}>{member.status}</p>
      </div>

      <button onClick={handlePrint} className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-accent active:scale-[0.97] transition-all flex items-center justify-center gap-2">
        <Printer size={16} /> Print Card
      </button>
    </div>
  );
}
