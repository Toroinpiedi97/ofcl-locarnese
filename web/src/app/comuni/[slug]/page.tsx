import { notFound } from "next/navigation";
import { MUNICIPALITIES } from "@/data/municipalities";
import { getMunicipalityProfile } from "@/lib/data/mca2-dal";
import { MunicipalityDetailView } from "@/components/dashboard/MunicipalityDetailView";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return MUNICIPALITIES.map((m) => ({
    slug: m.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const mun = await getMunicipalityProfile(slug);
  if (!mun) return { title: "Comune non trovato · OFCL" };

  return {
    title: `${mun.name} · Finanze Comunali MCA2 · OFCL`,
    description: `Bilanci MCA2, moltiplicatore fiscale ${mun.tax_multiplier_pf}%, 8 indicatori SEL e crediti d'opera per il Comune di ${mun.name} (UST ${mun.ust_code}).`,
  };
}

export default async function MunicipalityDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const mun = await getMunicipalityProfile(slug);

  if (!mun) {
    notFound();
  }

  return (
    <div className="p-4 sm:p-5 lg:p-7 pb-12 max-w-full overflow-x-hidden">
      <MunicipalityDetailView municipality={mun} />
    </div>
  );
}
