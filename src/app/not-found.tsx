import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="mb-2 text-xl font-semibold">Page not found</h1>
      <Link href="/" className="btn-primary mt-4">
        Back to documents
      </Link>
    </main>
  );
}
