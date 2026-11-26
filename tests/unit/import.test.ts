import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { HttpError } from "@/lib/errors";
import { importFile, titleFromFilename } from "@/lib/import";

const types = (doc: { content?: { type?: string }[] }) => doc.content?.map((n) => n.type);

async function makeDocx(bodyXml: string) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyXml}</w:body></w:document>`,
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("importFile", () => {
  it("turns plain text paragraphs into editor paragraphs", async () => {
    const { title, content } = await importFile("meeting_notes.txt", Buffer.from("First line\nsame para\n\nSecond <b>para</b>"));
    expect(title).toBe("meeting notes");
    expect(types(content)).toEqual(["paragraph", "paragraph"]);
    expect(JSON.stringify(content)).toContain("hardBreak");
    expect(JSON.stringify(content)).toContain("Second <b>para</b>");
  });

  it("preserves markdown structure and strips scripts", async () => {
    const md = "# Plan\n\nSome **bold** and _italic_\n\n1. one\n2. two\n\n<script>alert(1)</script>";
    const { content } = await importFile("plan.md", Buffer.from(md));
    expect(types(content)).toEqual(["heading", "paragraph", "orderedList"]);
    const json = JSON.stringify(content);
    expect(json).toContain('"bold"');
    expect(json).toContain('"italic"');
    expect(json).not.toContain("alert");
  });

  it("converts .docx headings, bold text and lists", async () => {
    const buf = await makeDocx(
      `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Report</w:t></w:r></w:p>` +
        `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Important</w:t></w:r></w:p>`,
    );
    const { content } = await importFile("report.docx", buf);
    expect(types(content)).toEqual(["heading", "paragraph"]);
    expect(JSON.stringify(content)).toContain('"bold"');
  });

  it("rejects unsupported, empty, binary and oversized files", async () => {
    const reject = (name: string, buf: Buffer) =>
      importFile(name, buf).then(
        () => null,
        (e: HttpError) => e.status,
      );
    expect(await reject("x.pdf", Buffer.from("%PDF"))).toBe(415);
    expect(await reject("x.txt", Buffer.alloc(0))).toBe(400);
    expect(await reject("x.txt", Buffer.from([0x68, 0x00, 0x69]))).toBe(400);
    expect(await reject("x.docx", Buffer.from("not a zip"))).toBe(400);
    expect(await reject("x.txt", Buffer.alloc(3 * 1024 * 1024, 97))).toBe(413);
  });

  it("derives a safe title", () => {
    expect(titleFromFilename(".txt")).toBe("Imported document");
    expect(titleFromFilename("Q3-roadmap_v2.md")).toBe("Q3 roadmap v2");
  });
});
