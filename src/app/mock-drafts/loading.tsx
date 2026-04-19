export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
      <div className="mt-5 space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-gray-200 bg-white"
          />
        ))}
      </div>
      <div className="mt-8 h-5 w-48 animate-pulse rounded bg-gray-200" />
      <div className="mt-4 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl border border-gray-200 bg-white"
          />
        ))}
      </div>
    </div>
  );
}
