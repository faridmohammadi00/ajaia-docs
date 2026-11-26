const PALETTE = [
  "bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-sky-500",
  "bg-violet-500", "bg-fuchsia-500", "bg-teal-500", "bg-indigo-500",
];

function colorFor(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

const SIZES = { sm: "size-6 text-[10px]", md: "size-8 text-xs" };

export function Avatar({ name, id, size = "md", ring }: { name: string; id: string; size?: "sm" | "md"; ring?: boolean }) {
  return (
    <span
      title={name}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ${SIZES[size]} ${colorFor(id)} ${ring ? "ring-2 ring-white" : ""}`}
    >
      {initials(name)}
    </span>
  );
}
