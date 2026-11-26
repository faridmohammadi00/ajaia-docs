import { getSchema, type JSONContent } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";
import { HttpError } from "../errors";
import { baseExtensions } from "./extensions";

export const MAX_CONTENT_BYTES = 1_000_000;

let schema: ReturnType<typeof getSchema> | undefined;

// Rejects payloads that the editor schema cannot represent.
export function assertValidDoc(content: unknown): JSONContent {
  if (!content || typeof content !== "object" || (content as JSONContent).type !== "doc") {
    throw new HttpError(400, "content must be a document");
  }
  if (Buffer.byteLength(JSON.stringify(content)) > MAX_CONTENT_BYTES) {
    throw new HttpError(413, "Document is too large (max 1 MB)");
  }
  try {
    schema ??= getSchema(baseExtensions);
    Node.fromJSON(schema, content).check();
  } catch {
    throw new HttpError(400, "content does not match the document schema");
  }
  return content as JSONContent;
}
