import Link from "next/link";

export default function DocumentNotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="mb-2 text-xl font-semibold">Document not found</h1>
      <p className="mb-6 text-sm text-slate-500">
        It may have been deleted, or it has not been shared with you.
      </p>
      <Link href="/" className="btn-primary">
        Back to documents
      </Link>
    </main>
  );
}
