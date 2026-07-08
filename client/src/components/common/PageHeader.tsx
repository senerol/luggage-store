export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-ink-100 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-ink-900">{title}</h1>
        {subtitle && <p className="mt-2 text-ink-500">{subtitle}</p>}
      </div>
    </div>
  );
}
