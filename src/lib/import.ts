import type { JSONContent } from "@tiptap/core";
import { generateJSON } from "@tiptap/html/server";
import mammoth from "mammoth";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { HttpError } from "./errors";
import { baseExtensions } from "./editor/extensions";

export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const IMPORT_EXTENSIONS = [".txt", ".md", ".markdown", ".docx"] as const;

const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "h1", "h2", "h3", "strong", "b", "em", "i", "u", "s", "del",
    "ul", "ol", "li", "br", "a", "blockquote", "hr",
  ],
  allowedAttributes: { a: ["href"], ol: ["start"] },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: { h4: "h3", h5: "h3", h6: "h3", pre: "p", code: "span" },
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function extensionOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i === -1 ? "" : filename.slice(i).toLowerCase();
}

export function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return (base || "Imported document").slice(0, 200);
}

function decodeText(buf: Buffer): string {
  if (buf.includes(0)) throw new HttpError(400, "File does not look like plain text");
  return buf.toString("utf8").replace(/^﻿/, "");
}

export function textToHtml(text: string): string {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\r?\n/g, "<br>")}</p>`)
    .join("");
}

export async function fileToHtml(filename: string, buf: Buffer): Promise<string> {
  const ext = extensionOf(filename);
  switch (ext) {
    case ".txt":
      return textToHtml(decodeText(buf));
    case ".md":
    case ".markdown":
      return sanitizeHtml(await marked.parse(decodeText(buf), { gfm: true }), SANITIZE);
    case ".docx": {
      if (buf.subarray(0, 2).toString() !== "PK") throw new HttpError(400, "File is not a valid .docx");
      try {
        const { value } = await mammoth.convertToHtml({ buffer: buf });
        return sanitizeHtml(value, SANITIZE);
      } catch {
        throw new HttpError(400, "Could not read the .docx file");
      }
    }
    default:
      throw new HttpError(415, `Unsupported file type. Use ${IMPORT_EXTENSIONS.join(", ")}`);
  }
}

export function htmlToDoc(html: string): JSONContent {
  return generateJSON(html || "<p></p>", baseExtensions);
}

export async function importFile(filename: string, buf: Buffer) {
  if (buf.byteLength === 0) throw new HttpError(400, "File is empty");
  if (buf.byteLength > IMPORT_MAX_BYTES) throw new HttpError(413, "File is too large (max 2 MB)");
  return { title: titleFromFilename(filename), content: htmlToDoc(await fileToHtml(filename, buf)) };
}
