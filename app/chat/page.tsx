import { Suspense } from "react";

import ChatClient from "./ChatClient";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-slate-950 px-4 py-6 text-white">
          <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-4xl items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-10">
            Loading live chat...
          </div>
        </div>
      }
    >
      <ChatClient />
    </Suspense>
  );
}
