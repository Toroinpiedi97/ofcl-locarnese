import { fetchSocialDraftsAction } from "./actions";
import { SocialWorkbenchClient } from "./SocialWorkbenchClient";

export const dynamic = "force-dynamic";

export default async function AdminSocialPage() {
  const { drafts, source } = await fetchSocialDraftsAction();

  return (
    <SocialWorkbenchClient initialDrafts={drafts} initialSource={source} />
  );
}
