import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { DashboardActions } from "@/components/DashboardActions";
import { DocumentList } from "@/components/DocumentList";
import { listDocuments } from "@/lib/documents";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { owned, shared } = await listDocuments(user);

  return (
    <>
      <AppHeader userName={user.name} />
      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Documents</h1>
            <p className="text-sm text-slate-500">Signed in as {user.email}</p>
          </div>
          <DashboardActions />
        </div>
        <DocumentList
          title="My documents"
          docs={owned}
          empty="You have no documents yet. Create one or import a file."
          testId="owned-docs"
        />
        <DocumentList
          title="Shared with me"
          docs={shared}
          empty="Nothing has been shared with you yet."
          testId="shared-docs"
        />
      </main>
    </>
  );
}
