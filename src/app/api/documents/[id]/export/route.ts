import { getDocument } from "@/lib/documents";
import { docToMarkdown } from "@/lib/editor/markdown";
import { route } from "@/lib/errors";
import { requireUser } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const doc = await getDocument(user, (await params).id);
  const filename = (doc.title.replace(/[^\w\- ]+/g, "").trim() || "document") + ".md";
  return new Response(`# ${doc.title}\n\n${docToMarkdown(doc.content)}`, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
