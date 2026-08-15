import { getRun, subscribeRun, type ForkEvent } from "@/lib/fork";

import { apiError, requireApiUser } from "../../../_lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 15_000;
type Context = { params: Promise<{ id: string }> };

function encodeEvent(encoder: TextEncoder, event: ForkEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function GET(request: Request, context: Context): Promise<Response> {
  const authError = await requireApiUser(request);
  if (authError) return authError;
  const { id } = await context.params;
  const run = await getRun(id);
  if (!run) return apiError("RUN_NOT_FOUND", "Run not found.", 404);

  const encoder = new TextEncoder();
  let cancelStream: (() => void) | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let unsubscribe: () => void = () => {};
      let heartbeat: NodeJS.Timeout | undefined;

      const cleanup = (closeController: boolean) => {
        if (closed) return;
        closed = true;
        unsubscribe();
        if (heartbeat) clearInterval(heartbeat);
        request.signal.removeEventListener("abort", onAbort);
        if (closeController) {
          try {
            controller.close();
          } catch {
            // The client may already have canceled the stream.
          }
        }
      };
      const send = (event: ForkEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encodeEvent(encoder, event));
        } catch {
          cleanup(false);
        }
      };
      const onAbort = () => cleanup(true);

      try {
        const pending: ForkEvent[] = [];
        let initialSent = false;
        unsubscribe = subscribeRun(id, (event) => {
          if (initialSent) send(event);
          else pending.push(event);
        });
        controller.enqueue(encoder.encode("retry: 2000\n\n"));
        send({ type: "run.updated", run });
        initialSent = true;
        for (const event of pending) send(event);
        if (closed) {
          unsubscribe();
          return;
        }
        heartbeat = setInterval(() => {
          send({ type: "heartbeat", runId: id, at: new Date().toISOString() });
        }, HEARTBEAT_MS);
        heartbeat.unref();
        request.signal.addEventListener("abort", onAbort, { once: true });
        cancelStream = () => cleanup(false);
        if (request.signal.aborted) onAbort();
      } catch {
        cleanup(true);
      }
    },
    cancel() {
      cancelStream?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
