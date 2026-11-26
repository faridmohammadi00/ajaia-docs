"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="mb-2 text-xl font-semibold">Something went wrong</h1>
      <p className="mb-6 text-sm text-slate-500">The server could not complete the request.</p>
      <button className="btn-primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
