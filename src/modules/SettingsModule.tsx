import { useState, useEffect, useCallback } from "react";
import { Settings } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import { getSettings, saveSettings, type Settings as SettingsType } from "@/lib/db";
import { toast } from "sonner";

const FIELDS: { key: keyof Omit<SettingsType, "id">; label: string; group: string }[] = [
  { key: "adult_rate_day", label: "Adult Rate (Day)", group: "Entrance Fee Settings" },
  { key: "child_rate_day", label: "Child Rate (Day)", group: "Entrance Fee Settings" },
  { key: "adult_rate_night", label: "Adult Rate (Night)", group: "Entrance Fee Settings" },
  { key: "child_rate_night", label: "Child Rate (Night)", group: "Entrance Fee Settings" },
  { key: "exclusive_fee", label: "Exclusive Fee", group: "Entrance Fee Settings" },
  { key: "barkada_room_rate", label: "Barkada Room Rate", group: "Room Settings" },
  { key: "kubo_room_rate", label: "Kubo Room Rate", group: "Room Settings" },
  { key: "table_rent_rate", label: "Table Rent Rate", group: "Table Rent Settings" },
];

export default function SettingsModule() {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getSettings().then(setSettings); }, []);

  const handleSave = useCallback(async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await saveSettings(settings);
      toast.success("Settings saved!");
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  }, [settings]);

  if (!settings) return null;

  const groups = [...new Set(FIELDS.map((f) => f.group))];

  return (
    <ModuleShell title="System Settings" icon={<Settings size={20} />} onSave={handleSave} saveLabel="Save Settings" saving={saving}>
      {groups.map((group) => (
        <div key={group} className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{group}</h3>
          {FIELDS.filter((f) => f.group === group).map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-4">
              <label className="text-sm font-medium">{f.label}</label>
              <input
                type="number"
                className="pos-input w-32 text-right"
                value={settings[f.key]}
                onChange={(e) => setSettings({ ...settings, [f.key]: parseFloat(e.target.value) || 0 })}
              />
            </div>
          ))}
        </div>
      ))}
    </ModuleShell>
  );
}
