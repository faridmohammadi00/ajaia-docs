import { notFound, redirect } from "next/navigation";
import { DocumentWorkspace } from "@/components/DocumentWorkspace";
import { getDocument, listShareCandidates } from "@/lib/documents";
import { HttpError } from "@/lib/errors";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const doc = await getDocument(user, id).catch((err) => {
    if (err instanceof HttpError && err.status === 404) notFound();
    throw err;
  });
  const candidates = doc.role === "owner" ? await listShareCandidates(user) : [];

  return (
    <DocumentWorkspace doc={doc} candidates={candidates} me={{ id: user.id, name: user.name, email: user.email }} />
  );
}
