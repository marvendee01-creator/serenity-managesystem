import { ReactNode } from "react";

interface ModuleShellProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  onSave?: () => void;
  saveLabel?: string;
  saving?: boolean;
}

export default function ModuleShell({ title, icon, children, onSave, saveLabel = "Save", saving }: ModuleShellProps) {
  return (
    <div className="reveal-up max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <h2 className="text-xl font-bold text-foreground" style={{ lineHeight: "1.2" }}>{title}</h2>
      </div>
      <div className="space-y-4">
        {children}
      </div>
      {onSave && (
        <button
          onClick={onSave}
          disabled={saving}
          className="mt-6 w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-base
                     hover:bg-accent active:scale-[0.97] transition-all duration-150 ease-out
                     focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                     disabled:opacity-50"
          tabIndex={0}
        >
          {saving ? "Saving..." : saveLabel}
        </button>
      )}
    </div>
  );
}
