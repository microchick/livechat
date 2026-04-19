import Pusher from "pusher-js";

import { env } from "@/lib/env";

let pusherClient: Pusher | null = null;

export function getPusherClient() {
  if (typeof window === "undefined" || !env.pusherKey) {
    return null;
  }

  if (!pusherClient) {
    const parsedPort = Number(env.pusherPort);
    const hasCustomPort = Number.isFinite(parsedPort) && parsedPort > 0;

    pusherClient = new Pusher(env.pusherKey, {
      cluster: env.pusherCluster,
      forceTLS: env.pusherForceTLS,
      wsHost: env.pusherHost || undefined,
      httpHost: env.pusherHost || undefined,
      wsPort: hasCustomPort ? parsedPort : undefined,
      wssPort: hasCustomPort ? parsedPort : undefined,
      wsPath: env.pusherWsPath || undefined,
      enabledTransports: ["ws", "wss"],
    });
  }

  return pusherClient;
}
