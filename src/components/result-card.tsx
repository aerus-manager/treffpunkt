export function ResultCard({
  title,
  meta,
  lines,
  total,
}: {
  title: string;
  meta: string;
  lines: { label: string; value: string }[];
  total: string;
}) {
  return (
    <section className="result-card mt-6 rounded-card border border-line bg-surface p-4">
      <p className="text-xs font-medium tracking-wide text-brass uppercase">Resultatark</p>
      <h2 className="mt-1 font-score text-3xl leading-none">{title}</h2>
      <p className="mt-2 text-sm text-muted">{meta}</p>
      <ul className="mt-4 flex flex-col gap-1">
        {lines.map((line) => (
          <li key={line.label} className="flex items-baseline justify-between gap-3 text-sm">
            <span>{line.label}</span>
            <span className="tabular-nums">{line.value}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 font-score text-4xl leading-none text-brass tabular-nums">{total}</p>
      <button type="button" onClick={() => window.print()} className="mt-4 h-11 text-sm text-brass print:hidden">
        Skriv ut kort
      </button>
    </section>
  );
}
