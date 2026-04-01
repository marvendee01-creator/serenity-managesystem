import { useEffect, useState } from "react";
import logo from "@/assets/logo-new.png";

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), 2500);
    const t2 = setTimeout(onDone, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden ${exiting ? "splash-exit" : "splash-enter"}`}
      style={{ background: "linear-gradient(180deg, #e0f7fa 0%, #b2ebf2 100%)" }}
    >
      {/* Water wave layers */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="splash-wave splash-wave-1" />
        <div className="splash-wave splash-wave-2" />
        <div className="splash-wave splash-wave-3" />
      </div>

      {/* Logo with rotate + pulse */}
      <div className="splash-logo-container relative z-10">
        <img
          src={logo}
          alt="The Serenity Inland Resort"
          className="w-44 h-44 rounded-full shadow-2xl splash-logo"
        />
      </div>

      <h1 className="text-2xl font-bold text-[#1a3a2a] tracking-tight mt-6 relative z-10" style={{ lineHeight: "1.1" }}>
        The Serenity Inland Resort
      </h1>
      <p className="text-[#1a3a2a]/60 text-sm mt-2 relative z-10">by Antonio and Nancy</p>
      <p className="text-[#1a3a2a]/40 text-xs mt-1 relative z-10">Management System</p>
    </div>
  );
}
