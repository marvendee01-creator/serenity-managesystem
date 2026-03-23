import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), 2500);
    const t2 = setTimeout(onDone, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-sidebar ${exiting ? "splash-exit" : "splash-enter"}`}
    >
      <img src={logo} alt="Serenity Inland Resort" className="w-48 h-48 rounded-full shadow-2xl mb-6" />
      <h1 className="text-2xl font-bold text-sidebar-foreground tracking-tight" style={{ lineHeight: "1.1" }}>
        Serenity Inland Resort
      </h1>
      <p className="text-sidebar-foreground/60 text-sm mt-2">Management System</p>
    </div>
  );
}
