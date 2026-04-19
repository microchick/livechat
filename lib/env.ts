export const env = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080",
  pusherKey: process.env.NEXT_PUBLIC_PUSHER_KEY || "",
  pusherCluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap3",
  pusherForceTLS: process.env.NEXT_PUBLIC_PUSHER_FORCE_TLS !== "false",
  pusherHost: process.env.NEXT_PUBLIC_PUSHER_HOST || "",
  pusherPort: process.env.NEXT_PUBLIC_PUSHER_PORT || "",
  pusherWsPath: process.env.NEXT_PUBLIC_PUSHER_WS_PATH || "",
};
