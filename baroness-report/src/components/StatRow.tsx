export default function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-2 border-b border-gray-100 last:border-0 text-sm">
      <span className="text-gray-500 shrink-0 whitespace-nowrap">{label}</span>
      <span className="text-gray-900 font-medium text-right max-w-[45%]">{value}</span>
    </div>
  );
}
