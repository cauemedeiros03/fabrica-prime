import { createFileRoute } from "@tanstack/react-router";
import { processCaktoWebhook } from "@/lib/cakto-webhook-handler";

export const Route = createFileRoute("/api/webhook-cakto")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return processCaktoWebhook(request);
      },
    },
  },
});
