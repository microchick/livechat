import { ChatWidget } from "@/components/chat/chat-widget";

export const dynamic = "force-dynamic";

export default function WidgetPage() {
  return (
    <>
      <style>{`
        html, body {
          background: transparent !important;
          background-image: none !important;
        }
      `}</style>
      <main className="h-[100dvh] w-full overflow-hidden bg-transparent">
        <ChatWidget embedded />
      </main>
    </>
  );
}
