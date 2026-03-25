import { useState, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";
import entranceIcon from "@/assets/icons/entrance.png";
import roomIcon from "@/assets/icons/room.png";
import bookingIcon from "@/assets/icons/booking.png";
import gamesIcon from "@/assets/icons/games.png";
import tablesIcon from "@/assets/icons/tables.png";
import reportsIcon from "@/assets/icons/reports.png";
import cashierIcon from "@/assets/icons/cashier.png";
import settingsIcon from "@/assets/icons/settings.png";
import maintenanceIcon from "@/assets/icons/maintenance.png";
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
  { id: "entrance", label: "Entrance", icon: entranceIcon },
  { id: "room", label: "Room", icon: roomIcon },
  { id: "booking", label: "Booking", icon: bookingIcon },
  { id: "games", label: "Games", icon: gamesIcon },
  { id: "tables", label: "Tables", icon: tablesIcon },
  { id: "reports", label: "Reports", icon: reportsIcon },
  { id: "cashier", label: "Cashier", icon: cashierIcon },
  { id: "settings", label: "Settings", icon: settingsIcon },
  { id: "maintenance", label: "Maintenance", icon: maintenanceIcon },
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
};

export default function Index() {
  const [splash, setSplash] = useState(true);
  const [active, setActive] = useState<ModuleId | null>(null);

  const handleSplashDone = useCallback(() => setSplash(false), []);

  if (splash) return <SplashScreen onDone={handleSplashDone} />;

  if (active) {
    const ActiveModule = MODULE_COMPONENTS[active];
    const activeLabel = MODULES.find((m) => m.id === active)?.label;
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="bg-sidebar px-4 py-3 flex items-center gap-3 shadow-md">
          <button
            onClick={() => setActive(null)}
            className="w-9 h-9 rounded-lg bg-sidebar-foreground/10 flex items-center justify-center text-sidebar-foreground hover:bg-sidebar-foreground/20 active:scale-95 transition-all"
            aria-label="Back to home"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-sm font-bold text-sidebar-foreground leading-tight">{activeLabel}</h1>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <ActiveModule key={active} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-sidebar px-4 py-5 flex items-center gap-3 shadow-md">
        <img src={logo} alt="Logo" className="w-10 h-10 rounded-full" />
        <div>
          <h1 className="text-sm font-bold text-sidebar-foreground leading-tight">Serenity Inland Resort</h1>
          <p className="text-[10px] text-sidebar-foreground/50">Management System</p>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="grid grid-cols-3 gap-4 max-w-md w-full">
          {MODULES.map((m) => (
            <button
              key={m.id}
              onClick={() => setActive(m.id)}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-card border border-border
                         hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 hover:scale-105
                         active:scale-95 transition-all duration-200 ease-out
                         focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                         aspect-square"
            >
              <img src={m.icon} alt={m.label} className="w-14 h-14 object-contain drop-shadow-md" loading="lazy" width={56} height={56} />
              <span className="text-xs font-semibold text-foreground text-center leading-tight">{m.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
