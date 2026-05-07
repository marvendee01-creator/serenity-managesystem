import { useState, useEffect } from "react";
import { getTransactions } from "@/lib/db";

interface CustomerSelectProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
}

export default function CustomerSelect({ value, onChange, className = "", placeholder = "Enter customer name" }: CustomerSelectProps) {
  const [activeCustomers, setActiveCustomers] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    getTransactions().then(txns => {
      if (!mounted) return;
      // Filter only transactions that are not fully paid and not cancelled
      const active = txns.filter(t => t.status !== "Cancelled" && t.payment_status !== "Fully Paid" && t.customer_name);
      
      // Extract unique names
      const uniqueNames = Array.from(new Set(active.map(t => t.customer_name!.trim()))).filter(Boolean);
      setActiveCustomers(uniqueNames);
    });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="relative">
      <input
        type="text"
        list="active-customers-list"
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      <datalist id="active-customers-list">
        {activeCustomers.map(name => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );
}
