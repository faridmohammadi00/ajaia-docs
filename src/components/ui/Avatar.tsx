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

export function AvatarStack({ people, max = 4 }: { people: { id: string; name: string; email: string }[]; max?: number }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((p) => (
        <Avatar key={p.id} id={p.email} name={p.name} ring />
      ))}
      {rest > 0 && (
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600 ring-2 ring-white">
          +{rest}
        </span>
      )}
    </div>
  );
}
