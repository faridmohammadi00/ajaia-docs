import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { Dashboard } from "@/components/Dashboard";
import { listDocuments } from "@/lib/documents";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { owned, shared } = await listDocuments(user);
  const me = { id: user.id, name: user.name, email: user.email };

  return (
    <>
      <AppHeader user={me} />
      <Dashboard user={me} owned={owned} shared={shared} />
    </>
  );
}
