import { useState, useEffect, useCallback } from "react";
import { Settings } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import { getSettings, saveSettings, type Settings as SettingsType } from "@/lib/db";
import { toast } from "sonner";

const COMPANY_FIELDS: { key: keyof SettingsType; label: string; placeholder: string }[] = [
  { key: "company_name", label: "Company Name", placeholder: "e.g. SERENITY INLAND RESORT" },
  { key: "company_address", label: "Address", placeholder: "e.g. Brgy. Somewhere, City" },
  { key: "contact_number", label: "Contact Number", placeholder: "e.g. 09XX-XXX-XXXX" },
  { key: "tin_number", label: "TIN Number", placeholder: "e.g. 000-000-000-000" },
];

const FIELDS: { key: keyof Omit<SettingsType, "id">; label: string; group: string }[] = [
  { key: "adult_rate_day", label: "Adult Rate (Day)", group: "Entrance — Day Tour" },
  { key: "kids_8_above_rate_day", label: "Kids 8 & Above (Day)", group: "Entrance — Day Tour" },
  { key: "kids_5_7_rate_day", label: "Kids 5-7 yrs (Day)", group: "Entrance — Day Tour" },
  { key: "adult_rate_night", label: "Adult Rate (Overnight)", group: "Entrance — Overnight" },
  { key: "kids_8_above_rate_night", label: "Kids 8 & Above (Overnight)", group: "Entrance — Overnight" },
  { key: "kids_5_7_rate_night", label: "Kids 5-7 yrs (Overnight)", group: "Entrance — Overnight" },
  { key: "exclusive_fee", label: "Exclusive Fee", group: "Booking Settings" },
  { key: "barkada_room_rate", label: "Barkada Room Rate", group: "Room Settings" },
  { key: "kubo_room_rate", label: "Kubo Room Rate", group: "Room Settings" },
  { key: "table_rent_rate", label: "Table Rent Rate", group: "Table Rent Settings" },
  { key: "billiard_rate", label: "Billiard Rate", group: "Games Settings" },
  { key: "videoke_rate", label: "Videoke Rate", group: "Games Settings" },
  { key: "dart_rate", label: "Dart Rate", group: "Games Settings" },
  { key: "volleyball_rate", label: "Volleyball Rate", group: "Games Settings" },
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
      {/* Company Profile */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Company Profile</h3>
        {COMPANY_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1">
            <label className="text-sm font-medium">{f.label}</label>
            <input
              type="text"
              className="pos-input w-full"
              value={(settings[f.key] as string) ?? ""}
              onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
              placeholder={f.placeholder}
            />
          </div>
        ))}
      </div>

      {groups.map((group) => (
        <div key={group} className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{group}</h3>
          {FIELDS.filter((f) => f.group === group).map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-4">
              <label className="text-sm font-medium">{f.label}</label>
              <input
                type="number"
                className="pos-input w-32 text-right"
                value={settings[f.key] ?? 0}
                onChange={(e) => setSettings({ ...settings, [f.key]: parseFloat(e.target.value) || 0 })}
              />
            </div>
          ))}
        </div>
      ))}
      <p className="text-xs text-muted-foreground italic">Note: Kids 4 & below are always FREE.</p>
    </ModuleShell>
  );
}
