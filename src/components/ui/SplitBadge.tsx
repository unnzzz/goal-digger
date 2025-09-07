"use client";
export function SplitBadge({ r }: { r: any }) {
  if (!r?.split) return null;
  const { part_number, total_parts, range } = r.split;
  const approx =
    r.duration_minutes && total_parts
      ? `≈ ${Math.round(r.duration_minutes / total_parts)} min`
      : null;
  return (
    <span className="badge">
      Today: Part {part_number}/{total_parts}{range ? ` — ${range}` : ""}{approx ? ` (${approx})` : ""}
    </span>
  );
}
