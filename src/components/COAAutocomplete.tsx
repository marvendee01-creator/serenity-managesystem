import React, { useState, useEffect, useRef } from "react";
import { type ChartOfAccount, addChartOfAccount, getChartOfAccounts } from "@/lib/db";
import { toast } from "sonner";

interface COAAutocompleteProps {
  value: string;
  onChange: (val: string, selectedAccount?: ChartOfAccount) => void;
  placeholder?: string;
  accounts: ChartOfAccount[];
  refreshAccounts: () => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export default function COAAutocomplete({
  value,
  onChange,
  placeholder = "Search account name or code...",
  accounts,
  refreshAccounts,
  disabled = false,
  className = "",
}: COAAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchVal, setSearchVal] = useState(value);
  const [debouncedSearch, setDebouncedSearch] = useState(value);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showNewAccountModal, setShowNewAccountModal] = useState(false);

  // New Account Form State
  const [newAccountForm, setNewAccountForm] = useState({
    account_code: "",
    account_name: "",
    category: "",
    subcategory: "",
    description: "",
    account_type: "Expense" as ChartOfAccount["account_type"],
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Keep internal input text synchronised with value prop
  useEffect(() => {
    setSearchVal(value);
  }, [value]);

  // Debounce search query (120ms for instant feel)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchVal);
    }, 120);
    return () => clearTimeout(timer);
  }, [searchVal]);

  // Filter accounts based on debounced search
  const filteredAccounts = React.useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return accounts;

    const keywords = query.split(/\s+/).filter(Boolean);
    return accounts.filter((a) => {
      return keywords.every((kw) => {
        const nameMatch = (a.account_name || "").toLowerCase().includes(kw);
        const codeMatch = (a.account_code || "").toLowerCase().includes(kw);
        const catMatch = (a.category || "").toLowerCase().includes(kw);
        const subMatch = (a.subcategory || "").toLowerCase().includes(kw);
        return nameMatch || codeMatch || catMatch || subMatch;
      });
    });
  }, [debouncedSearch, accounts]);

  // Reset active index when filtered results change
  useEffect(() => {
    setActiveIndex(0);
  }, [filteredAccounts]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll active item into view inside dropdown
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const activeEl = dropdownRef.current.querySelector(
        `[data-idx="${activeIndex}"]`
      ) as HTMLElement | null;
      activeEl?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, isOpen]);

  const handleSelect = (account: ChartOfAccount) => {
    onChange(account.account_name, account);
    setSearchVal(account.account_name);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) =>
        filteredAccounts.length > 0 ? (prev + 1) % filteredAccounts.length : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) =>
        filteredAccounts.length > 0
          ? (prev - 1 + filteredAccounts.length) % filteredAccounts.length
          : 0
      );
    } else if (e.key === "Enter" && !e.shiftKey) {
      if (isOpen && filteredAccounts.length > 0) {
        e.preventDefault();
        handleSelect(filteredAccounts[activeIndex]);
      } else if (debouncedSearch.trim() && filteredAccounts.length === 0) {
        e.preventDefault();
        setNewAccountForm((prev) => ({
          ...prev,
          account_name: searchVal.trim(),
        }));
        setShowConfirmModal(true);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (
        document.activeElement !== inputRef.current &&
        (!dropdownRef.current ||
          !dropdownRef.current.contains(document.activeElement))
      ) {
        setIsOpen(false);
      }
    }, 200);
  };

  // Highlight matching keywords inside text
  const highlightText = (text: string, query: string) => {
    if (!text) return "";
    if (!query.trim()) return <span>{text}</span>;
    const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (keywords.length === 0) return <span>{text}</span>;

    const escKeywords = keywords.map((kw) =>
      kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")
    );
    const regex = new RegExp(`(${escKeywords.join("|")})`, "gi");
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark
              key={i}
              style={{
                background: "hsl(var(--primary) / 0.25)",
                color: "hsl(var(--primary))",
                fontWeight: 700,
                padding: "0 2px",
                borderRadius: "3px",
              }}
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const saveNewAccount = async () => {
    if (!newAccountForm.account_name.trim()) {
      return toast.error("Account Name is required.");
    }
    const exists = accounts.some(
      (a) =>
        a.account_name.toLowerCase() ===
        newAccountForm.account_name.trim().toLowerCase()
    );
    if (exists) {
      return toast.error("An account with this name already exists.");
    }

    try {
      await addChartOfAccount({
        account_name: newAccountForm.account_name.trim(),
        account_type: newAccountForm.account_type,
        beginning_balance: 0,
        account_code: newAccountForm.account_code.trim() || undefined,
        category: newAccountForm.category.trim() || undefined,
        subcategory: newAccountForm.subcategory.trim() || undefined,
        description: newAccountForm.description.trim() || undefined,
      });

      toast.success("Account added to Chart of Accounts!");
      await refreshAccounts();

      const newAcc: ChartOfAccount = {
        account_name: newAccountForm.account_name.trim(),
        account_type: newAccountForm.account_type,
        beginning_balance: 0,
        account_code: newAccountForm.account_code.trim() || undefined,
        category: newAccountForm.category.trim() || undefined,
        subcategory: newAccountForm.subcategory.trim() || undefined,
        description: newAccountForm.description.trim() || undefined,
      };

      onChange(newAcc.account_name, newAcc);
      setSearchVal(newAcc.account_name);
      setShowNewAccountModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save new account.");
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full" style={{ minWidth: 0 }}>
      <input
        ref={inputRef}
        type="text"
        value={searchVal}
        onChange={(e) => {
          setSearchVal(e.target.value);
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        className={`pos-input text-xs w-full h-9 px-3 leading-none block ${className}`}
        style={{ minWidth: 0 }}
      />

      {/* Autocomplete Dropdown */}
      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          style={{
            position: "absolute",
            left: 0,
            top: "calc(100% + 4px)",
            minWidth: "600px",
            maxWidth: "760px",
            maxHeight: "350px",
            overflowY: "auto",
            zIndex: 9999,
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "10px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
          }}
        >
          {/* Sticky header showing count */}
          <div
            style={{
              position: "sticky",
              top: 0,
              padding: "6px 12px",
              background: "hsl(var(--muted))",
              borderBottom: "1px solid hsl(var(--border))",
              fontSize: "10px",
              color: "hsl(var(--muted-foreground))",
              fontWeight: 600,
              letterSpacing: "0.05em",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>CHART OF ACCOUNTS</span>
            <span>{filteredAccounts.length} result{filteredAccounts.length !== 1 ? "s" : ""}</span>
          </div>

          {filteredAccounts.length > 0 ? (
            filteredAccounts.map((a, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={a.id || idx}
                  data-idx={idx}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => handleSelect(a)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 14px",
                    borderBottom: "1px solid hsl(var(--border) / 0.4)",
                    background: isSelected
                      ? "hsl(var(--primary))"
                      : "transparent",
                    color: isSelected
                      ? "hsl(var(--primary-foreground))"
                      : "hsl(var(--popover-foreground))",
                    cursor: "pointer",
                    transition: "background 0.1s",
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                  }}
                >
                  {/* Account code badge + full account name */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    {a.account_code && (
                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: "10px",
                          fontFamily: "monospace",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: "4px",
                          background: isSelected
                            ? "rgba(255,255,255,0.2)"
                            : "hsl(var(--muted))",
                          color: isSelected
                            ? "hsl(var(--primary-foreground))"
                            : "hsl(var(--muted-foreground))",
                          marginTop: "1px",
                        }}
                      >
                        {highlightText(a.account_code, debouncedSearch)}
                      </span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, lineHeight: 1.4 }}>
                        {highlightText(a.account_name, debouncedSearch)}
                      </div>
                      {(a.category || a.account_type) && (
                        <div
                          style={{
                            fontSize: "10px",
                            marginTop: "2px",
                            opacity: 0.75,
                            display: "flex",
                            gap: "8px",
                          }}
                        >
                          <span>{a.account_type}</span>
                          {a.category && (
                            <span>· {highlightText(a.category, debouncedSearch)}</span>
                          )}
                          {a.subcategory && (
                            <span>· {highlightText(a.subcategory, debouncedSearch)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div style={{ padding: "16px", textAlign: "center" }}>
              <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", fontStyle: "italic", marginBottom: "8px" }}>
                No matching accounts found
              </p>
              <button
                type="button"
                onClick={() => {
                  setNewAccountForm((prev) => ({
                    ...prev,
                    account_name: searchVal.trim(),
                  }));
                  setShowConfirmModal(true);
                  setIsOpen(false);
                }}
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "hsl(var(--primary))",
                  textDecoration: "underline",
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                }}
              >
                + Add "{searchVal}" to Chart of Accounts
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black mb-3">Account Not Found</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Do you want to add <strong>"{searchVal}"</strong> to Chart of Accounts?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 h-10 rounded-xl bg-secondary text-secondary-foreground font-bold hover:bg-accent active:scale-95 transition-all text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setShowNewAccountModal(true);
                }}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 active:scale-95 transition-all text-xs"
              >
                Add Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Account Creation Modal */}
      {showNewAccountModal && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black mb-5">Add New Account</h3>
            <div className="space-y-4 mb-6 text-left">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Account Name *
                </label>
                <input
                  type="text"
                  required
                  className="pos-input w-full h-10 px-3"
                  value={newAccountForm.account_name}
                  onChange={(e) =>
                    setNewAccountForm({ ...newAccountForm, account_name: e.target.value })
                  }
                  placeholder="Account Name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Account Code
                  </label>
                  <input
                    type="text"
                    className="pos-input w-full h-10 px-3"
                    value={newAccountForm.account_code}
                    onChange={(e) =>
                      setNewAccountForm({ ...newAccountForm, account_code: e.target.value })
                    }
                    placeholder="e.g. 5010"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Account Type
                  </label>
                  <select
                    className="pos-input w-full h-10 px-2"
                    value={newAccountForm.account_type}
                    onChange={(e) =>
                      setNewAccountForm({
                        ...newAccountForm,
                        account_type: e.target.value as ChartOfAccount["account_type"],
                      })
                    }
                  >
                    <option value="Expense">Expense</option>
                    <option value="Cost of Goods Sold">COGS</option>
                    <option value="Asset">Asset</option>
                    <option value="Liability">Liability</option>
                    <option value="Equity">Equity</option>
                    <option value="Income">Income</option>
                    <option value="Bank">Bank</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Category
                  </label>
                  <input
                    type="text"
                    className="pos-input w-full h-10 px-3"
                    value={newAccountForm.category}
                    onChange={(e) =>
                      setNewAccountForm({ ...newAccountForm, category: e.target.value })
                    }
                    placeholder="e.g. Operating Expenses"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Subcategory
                  </label>
                  <input
                    type="text"
                    className="pos-input w-full h-10 px-3"
                    value={newAccountForm.subcategory}
                    onChange={(e) =>
                      setNewAccountForm({ ...newAccountForm, subcategory: e.target.value })
                    }
                    placeholder="e.g. Office Supplies"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Description
                </label>
                <textarea
                  className="pos-input w-full min-h-[60px] py-2 px-3 resize-none"
                  value={newAccountForm.description}
                  onChange={(e) =>
                    setNewAccountForm({ ...newAccountForm, description: e.target.value })
                  }
                  placeholder="Describe the account..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowNewAccountModal(false)}
                className="flex-1 h-11 rounded-xl bg-secondary text-secondary-foreground font-bold hover:bg-accent active:scale-95 transition-all text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveNewAccount}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 active:scale-95 transition-all text-xs"
              >
                Save Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
