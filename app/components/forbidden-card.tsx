export default function ForbiddenCard({
  title = "Access denied",
  message = "You don’t have permission to access this page. Contact your admin.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="rounded-2xl border border-black/10 bg-white p-6">
        <div className="text-xl font-bold text-gray-900">{title}</div>
        <div className="text-sm text-gray-600 mt-1">{message}</div>
      </div>
    </div>
  );
}