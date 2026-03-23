import { useState, useRef } from "react";
import { Wrench, Download, Upload, AlertTriangle } from "lucide-react";
import { exportAllData, importData, resetAllData } from "@/lib/db";
import { toast } from "sonner";

export default function MaintenanceModule() {
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleBackup = async () => {
    try {
      const json = await exportAllData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `serenity_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded!");
    } catch { toast.error("Backup failed"); }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importData(text);
      toast.success("Data restored!");
    } catch { toast.error("Restore failed — invalid file"); }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleReset = async () => {
    if (!confirmReset) { setConfirmReset(true); return; }
    try {
      await resetAllData();
      toast.success("All data reset!");
      setConfirmReset(false);
    } catch { toast.error("Reset failed"); }
  };

  return (
    <div className="reveal-up max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Wrench size={20} />
        </div>
        <h2 className="text-xl font-bold" style={{ lineHeight: "1.2" }}>Maintenance</h2>
      </div>
      <div className="space-y-3">
        <button onClick={handleBackup} className="w-full h-14 rounded-xl bg-card border border-border flex items-center gap-3 px-4 font-medium hover:border-primary/40 active:scale-[0.97] transition-all">
          <Download size={20} className="text-primary" /> Backup to File
        </button>
        <button onClick={() => fileRef.current?.click()} className="w-full h-14 rounded-xl bg-card border border-border flex items-center gap-3 px-4 font-medium hover:border-primary/40 active:scale-[0.97] transition-all">
          <Upload size={20} className="text-info" /> Restore from File
        </button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleRestore} />
        <button onClick={handleReset} className={`w-full h-14 rounded-xl border flex items-center gap-3 px-4 font-medium active:scale-[0.97] transition-all ${confirmReset ? "bg-destructive text-destructive-foreground border-destructive" : "bg-card border-border hover:border-destructive/40"}`}>
          <AlertTriangle size={20} /> {confirmReset ? "Confirm Reset — All Data Will Be Deleted" : "Reset System"}
        </button>
        {confirmReset && (
          <button onClick={() => setConfirmReset(false)} className="w-full h-10 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
