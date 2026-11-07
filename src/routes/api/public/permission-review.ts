import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/permission-review")({
  server: { handlers: { POST: async ({ request }) => {
    const { reviewPermissions } = await import("@/lib/permission-review.server");
    return reviewPermissions(request);
  } } },
});