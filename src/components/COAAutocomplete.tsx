import React, { useState, useEffect, useRef } from "react";
import { type ChartOfAccount, addChartOfAccount, getChartOfAccounts } from "@/lib/db";
import { toast } from "sonner";

interface COAAutocompleteProps {
  value: string;
  onChange: (val: string, selectedAccount?: ChartOfAccount) => void;
  placeholder?: string;
  accounts: ChartOfAccount[];
  refreshAccounts: () => Promise<void>;
  isTextArea?: boolean;
  disabled?: boolean;
  className?: string;
  fieldName: "particulars" | "category";
}

export default function COAAutocomplete({
  value,
  onChange,
  placeholder = "Search or type...",
  accounts,
  refreshAccounts,
  isTextArea = false,
  disabled = false,
  className = "",
  fieldName,
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
    account_type: "Expense" as any,
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const elementRef = isTextArea ? textareaRef : inputRef;

  // Keep internal input text synchronized with value prop
  useEffect(() => {
    setSearchVal(value);
  }, [value]);

  // Debounce search query (150ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchVal);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchVal]);

  // Auto-expand textarea height
  useEffect(() => {
    if (isTextArea && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [searchVal, isTextArea]);

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
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        elementRef.current &&
        !elementRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [elementRef]);

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
        // Trigger New Account Detection popup
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
    // Small delay to allow clicking dropdown items before closing
    setTimeout(() => {
      if (
        document.activeElement !== elementRef.current &&
        (!dropdownRef.current || !dropdownRef.current.contains(document.activeElement))
      ) {
        setIsOpen(false);
        // If query is typed but doesn't exist, show new account prompt
        if (
          searchVal.trim() &&
          accounts.length > 0 &&
          !accounts.some((a) => a.account_name.toLowerCase() === searchVal.trim().toLowerCase()) &&
          filteredAccounts.length === 0
        ) {
          setNewAccountForm((prev) => ({
            ...prev,
            account_name: searchVal.trim(),
          }));
          setShowConfirmModal(true);
        }
      }
    }, 200);
  };

  // Helper to highlight matching characters
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
              className="bg-primary/20 text-primary font-bold px-0.5 rounded"
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
    // Prevent duplicate name check (case-insensitive)
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

      toast.success("Account added directly to Chart of Accounts!");
      await refreshAccounts();

      // Automatically select the new account
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
    <div className="relative w-full">
      {isTextArea ? (
        <textarea
          ref={textareaRef}
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
          className={`pos-input text-xs w-full min-h-[36px] overflow-hidden resize-none py-2 px-3 leading-normal block ${className}`}
          rows={1}
          autoComplete="off"
        />
      ) : (
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
          className={`pos-input text-xs w-full h-9 px-3 leading-none block ${className}`}
          autoComplete="off"
        />
      )}

      {/* Autocomplete Dropdown */}
      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 mt-1 max-h-[350px] overflow-y-auto bg-popover text-popover-foreground border border-border rounded-lg shadow-xl z-50"
        >
          {filteredAccounts.length > 0 ? (
            filteredAccounts.map((a, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={a.id || idx}
                  type="button"
                  onClick={() => handleSelect(a)}
                  className={`w-full text-left px-3 py-2 text-xs border-b border-border/50 last:border-0 transition-colors flex flex-col gap-0.5 ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                  style={{ whiteSpace: "normal", wordBreak: "break-word" }}
                >
                  <div className="flex justify-between items-center w-full gap-2">
                    <span className="font-bold flex-1">
                      {a.account_code && (
                        <span
                          className={`mr-1.5 font-mono ${
                            isSelected
                              ? "text-primary-foreground/90"
                              : "text-muted-foreground"
                          }`}
                        >
                          {a.account_code} -
                        </span>
                      )}
                      {highlightText(a.account_name, debouncedSearch)}
                    </span>
                    <span
                      className={`text-[9px] uppercase tracking-wider font-semibold px-1 py-0.5 rounded ${
                        isSelected
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {a.account_type}
                    </span>
                  </div>
                  {(a.category || a.subcategory) && (
                    <div
                      className={`text-[10px] ${
                        isSelected
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      }`}
                    >
                      {a.category && (
                        <span>
                          Category: {highlightText(a.category, debouncedSearch)}
                        </span>
                      )}
                      {a.subcategory && (
                        <span className="ml-2 border-l border-border/30 pl-2">
                          Sub: {highlightText(a.subcategory, debouncedSearch)}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })
          ) : (
            <div className="p-3 text-center">
              <p className="text-xs text-muted-foreground italic mb-2">
                No matching accounts
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
                className="text-xs font-bold text-primary hover:underline"
              >
                + Add "{searchVal}" to Chart of Accounts
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog Popup */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black mb-3">Account Not Found</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Do you want to add new Account in Chart of Accounts?
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
                    setNewAccountForm({
                      ...newAccountForm,
                      account_name: e.target.value,
                    })
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
                      setNewAccountForm({
                        ...newAccountForm,
                        account_code: e.target.value,
                      })
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
                        account_type: e.target.value as any,
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
                      setNewAccountForm({
                        ...newAccountForm,
                        category: e.target.value,
                      })
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
                      setNewAccountForm({
                        ...newAccountForm,
                        subcategory: e.target.value,
                      })
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
                  className="pos-input w-full min-h-[70px] py-2 px-3 resize-none"
                  value={newAccountForm.description}
                  onChange={(e) =>
                    setNewAccountForm({
                      ...newAccountForm,
                      description: e.target.value,
                    })
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
