import { redirect } from "next/navigation";
import { getCuratorSession } from "@/lib/admin-auth";
import { fetchSocialDraftsAction } from "./actions";
import { SocialWorkbenchClient } from "./SocialWorkbenchClient";

export const dynamic = "force-dynamic";

export default async function AdminSocialPage() {
  const session = await getCuratorSession();
  if (!session.authenticated) {
    redirect("/admin/login");
  }

  const { drafts, source, dbError } = await fetchSocialDraftsAction();

  return (
    <SocialWorkbenchClient
      initialDrafts={drafts}
      initialSource={source}
      initialDbError={dbError}
    />
  );
}
