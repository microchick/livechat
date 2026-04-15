import Pusher from "pusher-js";

import { env } from "@/lib/env";

let pusherClient: Pusher | null = null;

export function getPusherClient() {
  if (!env.pusherKey) {
    return null;
  }

  if (!pusherClient) {
    pusherClient = new Pusher(env.pusherKey, {
      cluster: env.pusherCluster,
      forceTLS: env.pusherForceTLS,
    });
  }

  return pusherClient;
}
