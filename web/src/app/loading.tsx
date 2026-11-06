import { ChartFrostSkeleton } from "@/components/ui/ChartFrostSkeleton";

export default function GlobalLoading() {
  return (
    <div className="p-5 lg:p-6 space-y-4 animate-in fade-in-0 duration-150">
      <div className="flex items-center justify-between gap-4">
        <div className="h-7 w-64 rounded-xl ofl-skeleton" />
        <div className="h-7 w-48 rounded-full ofl-skeleton hidden sm:block" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="ofl-card rounded-2xl p-4 h-24 ofl-skeleton" />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-5 space-y-4">
          <ChartFrostSkeleton height={200} label="Caricamento serie..." />
          <ChartFrostSkeleton height={200} label="Caricamento spesa per settori..." />
        </div>
        <div className="xl:col-span-7 ofl-card rounded-2xl p-5 h-[420px] ofl-skeleton" />
      </div>
    </div>
  );
}
