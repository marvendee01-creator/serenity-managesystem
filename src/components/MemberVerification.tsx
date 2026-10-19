import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { Camera, CheckCircle, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { verifyMember } from "@/lib/loyalty-db";
import { memberEligible } from "@/lib/loyalty";
import type { SerenityMember } from "@/lib/db";

export default function MemberVerification({ member, onChange }: { member: SerenityMember | null; onChange: (m: SerenityMember | null) => void }) {
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  const verify = async (value: string) => {
    setBusy(true); setError(""); changeRef.current(null);
    try {
      const found = await verifyMember(value);
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
      if (!memberEligible(found, today)) throw new Error(`Membership is ${found.status !== "Active" ? found.status.toLowerCase() : "outside its validity dates"}`);
      setIdentifier(found.member_id); changeRef.current(found); setScanning(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to verify membership"); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (!scanning || !videoRef.current) return;
    let received = false;
    const scanner = new QrScanner(videoRef.current, result => {
      if (received) return;
      received = true; scanner.stop(); void verify(result.data);
    }, { preferredCamera: "environment", returnDetailedScanResult: true });
    scanner.start().catch(() => { setError("Camera unavailable. Enter Membership ID or choose a QR image."); setScanning(false); });
    return () => scanner.destroy();
  }, [scanning]);

  return <section className="space-y-2 border-y border-border py-3" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); if (!busy) void verify(identifier); } }}>
    <Label htmlFor="membership-identifier">Serenity Circle Membership ID / QR</Label>
    <div className="flex flex-wrap gap-2">
      <input id="membership-identifier" className="pos-input min-w-0 flex-1" value={identifier} onChange={e => { setIdentifier(e.target.value); onChange(null); setError(""); }} placeholder="Membership ID or scanned QR token" />
      <Button type="button" variant="secondary" onClick={() => verify(identifier)} disabled={busy || !identifier.trim()}><CheckCircle />{busy ? "Verifying…" : "Verify"}</Button>
      <Button type="button" size="icon" variant="outline" title="Scan membership QR with camera" aria-label="Scan membership QR with camera" onClick={() => setScanning(v => !v)}>{scanning ? <X /> : <Camera />}</Button>
      <Button type="button" size="icon" variant="outline" title="Read membership QR image" aria-label="Read membership QR image" onClick={() => fileRef.current?.click()}><ImagePlus /></Button>
    </div>
    <input ref={fileRef} className="hidden" type="file" accept="image/*" onChange={async e => {
      const file = e.target.files?.[0]; if (!file) return;
      try { const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true }); await verify(result.data); }
      catch { onChange(null); setError("No readable membership QR found in this image"); }
      e.target.value = "";
    }} />
    {scanning && <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted object-cover" muted playsInline />}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {member && <p className="text-sm text-success">{member.customer_name} · {member.member_id} · Active through {member.expiry_date}</p>}
  </section>;
}