import { formatPeso } from "@/lib/format";

export default function LoyaltyPreview({ eligible, discount, total }: { eligible: number; discount: number; total: number }) {
  return <dl className="space-y-1 text-sm border-y border-border py-3">
    <div className="flex justify-between gap-2"><dt>Original eligible amount</dt><dd className="tabular-nums">{formatPeso(eligible)}</dd></div>
    <div className="flex justify-between gap-2"><dt>Personal discount rate</dt><dd>5%</dd></div>
    <div className="flex justify-between gap-2 text-success"><dt>Personal discount</dt><dd className="tabular-nums">−{formatPeso(discount)}</dd></div>
    <div className="flex justify-between gap-2 font-bold"><dt>Final amount payable</dt><dd className="tabular-nums">{formatPeso(total)}</dd></div>
  </dl>;
}