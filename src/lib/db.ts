import bcrypt from "bcryptjs";
import { MongoClient, type Collection, type Db } from "mongodb";
import { excerptOf } from "./editor/text";
import { env } from "./env";
import type { DocumentRecord, RevisionRecord, UserRecord } from "./types";

export const SEED_PASSWORD = "ajaia-demo";
export const SEED_USERS = [
  { email: "alice@ajaia.dev", name: "Alice Chen" },
  { email: "bob@ajaia.dev", name: "Bob Martin" },
  { email: "carol@ajaia.dev", name: "Carol Diaz" },
];

// Survives hot reload in dev and is reused across warm serverless invocations.
const g = globalThis as unknown as { __ajaiaDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  g.__ajaiaDb ??= connect().catch((err) => {
    g.__ajaiaDb = undefined;
    throw err;
  });
  return g.__ajaiaDb;
}

async function connect() {
  const { MONGODB_URI, MONGODB_DB } = env();
  const client = new MongoClient(MONGODB_URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const db = client.db(MONGODB_DB);
  await prepare(db);
  return db;
}

async function prepare(db: Db) {
  const users = db.collection<UserRecord>("users");
  const docs = db.collection<DocumentRecord>("documents");
  await Promise.all([
    users.createIndex({ email: 1 }, { unique: true }),
    docs.createIndex({ ownerId: 1, updatedAt: -1 }),
    docs.createIndex({ "shares.userId": 1, updatedAt: -1 }),
    db.collection<RevisionRecord>("revisions").createIndex({ docId: 1, updatedAt: -1 }),
  ]);

  await backfillExcerpts(docs);

  const existing = await users.countDocuments({ email: { $in: SEED_USERS.map((u) => u.email) } });
  if (existing === SEED_USERS.length) return;
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  await users.bulkWrite(
    SEED_USERS.map((u) => ({
      updateOne: {
        filter: { email: u.email },
        update: { $setOnInsert: { ...u, passwordHash, createdAt: new Date() } },
        upsert: true,
      },
    })),
  );
  if (existing === 0) await seedWelcomeDoc(users, docs);
}

// One shared sample so reviewers can see sharing immediately.
async function seedWelcomeDoc(users: Collection<UserRecord>, docs: Collection<DocumentRecord>) {
  const [alice, bob, carol] = await Promise.all(SEED_USERS.map((u) => users.findOne({ email: u.email })));
  if (!alice || !bob || !carol) return;
  const text = (t: string, marks?: { type: string }[]) => ({ type: "text", text: t, ...(marks && { marks }) });
  const para = (...content: object[]) => ({ type: "paragraph", content });
  const item = (t: string) => ({ type: "listItem", content: [para(text(t))] });
  const now = new Date();
  const doc = {
    ownerId: alice._id,
    title: "Welcome to Ajaia Docs",
    version: 1,
    createdAt: now,
    updatedAt: now,
    shares: [
      { userId: bob._id, role: "editor", addedAt: now },
      { userId: carol._id, role: "viewer", addedAt: now },
    ],
    content: {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [text("Welcome to Ajaia Docs")] },
        para(
          text("This document is owned by "),
          text("Alice", [{ type: "bold" }]),
          text(", editable by Bob and "),
          text("view-only", [{ type: "italic" }]),
          text(" for Carol."),
        ),
        { type: "heading", attrs: { level: 2 }, content: [text("Try it")] },
        {
          type: "orderedList",
          attrs: { start: 1 },
          content: [
            item("Sign in as Bob and edit this text."),
            item("Sign in as Carol and notice the editor is read-only."),
            item("Import a .txt, .md or .docx file from the dashboard."),
          ],
        },
      ],
    },
  } as DocumentRecord;
  doc.excerpt = excerptOf(doc.content);
  const { insertedId } = await docs.insertOne(doc);
  await docs.db.collection<RevisionRecord>("revisions").insertOne({
    docId: insertedId,
    authorId: alice._id,
    version: 1,
    title: doc.title,
    content: doc.content,
    createdAt: now,
    updatedAt: now,
  } as RevisionRecord);
}

export async function collections(): Promise<{
  users: Collection<UserRecord>;
  documents: Collection<DocumentRecord>;
  revisions: Collection<RevisionRecord>;
}> {
  const db = await getDb();
  return {
    users: db.collection<UserRecord>("users"),
    documents: db.collection<DocumentRecord>("documents"),
    revisions: db.collection<RevisionRecord>("revisions"),
  };
}

// Documents created before excerpts existed.
async function backfillExcerpts(docs: Collection<DocumentRecord>) {
  const missing = await docs.find({ excerpt: { $exists: false } }, { projection: { content: 1 } }).limit(500).toArray();
  if (missing.length === 0) return;
  await docs.bulkWrite(
    missing.map((d) => ({ updateOne: { filter: { _id: d._id }, update: { $set: { excerpt: excerptOf(d.content) } } } })),
  );
}
