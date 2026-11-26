import StarterKit from "@tiptap/starter-kit";

// Shared by the browser editor and server-side validation/import so both agree on the schema.
export const baseExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    code: false,
    codeBlock: false,
    // Appends a paragraph on first interaction, which would trigger a phantom save.
    trailingNode: false,
    link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"] },
  }),
];

export const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };
