import { getDistrictDataset } from "@/lib/data/mca2-dal";
import { DashboardDesktop } from "@/components/dashboard/DashboardDesktop";
import { DashboardMobile } from "@/components/dashboard/DashboardMobile";

export default async function HomePage() {
  const municipalities = await getDistrictDataset();

  return (
    <div className="w-full">
      {/* Pipeline Desktop: Layout Master-Detail a due colonne con Nivo + Drawer */}
      <div className="hidden lg:block">
        <DashboardDesktop municipalities={municipalities} />
      </div>

      {/* Pipeline Mobile: Layout verticale fluido con Bottom Sheet touch */}
      <div className="block lg:hidden p-4">
        <DashboardMobile municipalities={municipalities} />
      </div>
    </div>
  );
}
