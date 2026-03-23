import { useState, useCallback } from "react";
import { DoorOpen, BedDouble, CalendarDays, Gamepad2, Table2, FileText, Banknote, Settings, Wrench } from "lucide-react";
import logo from "@/assets/logo.png";
import SplashScreen from "@/components/SplashScreen";
import EntranceModule from "@/modules/EntranceModule";
import RoomModule from "@/modules/RoomModule";
import BookingModule from "@/modules/BookingModule";
import GamesModule from "@/modules/GamesModule";
import TableRentModule from "@/modules/TableRentModule";
import ReportsModule from "@/modules/ReportsModule";
import CashierModule from "@/modules/CashierModule";
import SettingsModule from "@/modules/SettingsModule";
import MaintenanceModule from "@/modules/MaintenanceModule";

const MODULES = [
  { id: "entrance", label: "Entrance", icon: DoorOpen },
  { id: "room", label: "Room", icon: BedDouble },
  { id: "booking", label: "Booking", icon: CalendarDays },
  { id: "games", label: "Games", icon: Gamepad2 },
  { id: "tables", label: "Table Rent", icon: Table2 },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "cashier", label: "Cashier", icon: Banknote },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
] as const;

type ModuleId = (typeof MODULES)[number]["id"];

const MODULE_COMPONENTS: Record<ModuleId, React.FC> = {
  entrance: EntranceModule,
  room: RoomModule,
  booking: BookingModule,
  games: GamesModule,
  tables: TableRentModule,
  reports: ReportsModule,
  cashier: CashierModule,
  settings: SettingsModule,
  maintenance: MaintenanceModule,
};

export default function Index() {
  const [splash, setSplash] = useState(true);
  const [active, setActive] = useState<ModuleId>("entrance");

  const handleSplashDone = useCallback(() => setSplash(false), []);

  if (splash) return <SplashScreen onDone={handleSplashDone} />;

  const ActiveModule = MODULE_COMPONENTS[active];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-sidebar px-4 py-3 flex items-center gap-3 shadow-md">
        <img src={logo} alt="Logo" className="w-9 h-9 rounded-full" />
        <div>
          <h1 className="text-sm font-bold text-sidebar-foreground leading-tight">Serenity Inland Resort</h1>
          <p className="text-[10px] text-sidebar-foreground/50">Management System</p>
        </div>
      </header>

      {/* Module nav */}
      <nav className="bg-card border-b border-border px-2 py-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {MODULES.map((m) => {
            const Icon = m.icon;
            const isActive = active === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setActive(m.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap
                  ${isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  } active:scale-[0.96]`}
                tabIndex={0}
              >
                <Icon size={14} />
                {m.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <ActiveModule key={active} />
      </main>
    </div>
  );
}
