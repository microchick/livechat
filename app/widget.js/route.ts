import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const script = `(() => {
  if (typeof window === "undefined") return;
  if (window.__supportChatWidgetLoaded) return;
  window.__supportChatWidgetLoaded = true;

  const currentScript = document.currentScript;
  const scriptUrl = currentScript && currentScript.src ? new URL(currentScript.src, window.location.href) : null;
  const data = (currentScript && currentScript.dataset) || {};
  const config = window.ChatWidgetConfig || {};

  const widgetOrigin = config.origin || data.origin || (scriptUrl ? scriptUrl.origin : window.location.origin);
  const widgetPath = config.path || data.path || "/widget";
  const rootId = config.rootId || data.rootId || "support-chat-widget-root";
  const zIndex = String(config.zIndex || data.zIndex || 99999);
  const right = config.right || data.right || "16px";
  const bottom = config.bottom || data.bottom || "16px";
  const collapsedWidth = Number(config.collapsedWidth || data.collapsedWidth || 96);
  const collapsedHeight = Number(config.collapsedHeight || data.collapsedHeight || 96);

  const expandedWidth = Number(config.expandedWidth || data.expandedWidth || 432);
  const expandedHeight = Number(config.expandedHeight || data.expandedHeight || 784);


  const mount = () => {
    if (document.getElementById("support-chat-widget-iframe")) return;

    let root = document.getElementById(rootId);
    if (!root) {
      root = document.createElement("div");
      root.id = rootId;
      document.body.appendChild(root);
    }

    const iframe = document.createElement("iframe");
    iframe.id = "support-chat-widget-iframe";
    iframe.src = widgetOrigin + widgetPath;
    iframe.title = "Support chat widget";
    iframe.allow = "clipboard-write";
    iframe.style.position = "fixed";
    iframe.style.right = right;
    iframe.style.bottom = bottom;
    iframe.style.width = collapsedWidth + "px";
    iframe.style.height = collapsedHeight + "px";
    iframe.style.border = "0";
    iframe.style.background = "transparent";
    iframe.style.zIndex = zIndex;
    iframe.style.overflow = "hidden";
    iframe.style.transition = "width .2s ease, height .2s ease";
    iframe.style.maxWidth = "calc(100vw - 16px)";
    iframe.style.maxHeight = "calc(100dvh - 16px)";

    root.appendChild(iframe);

    window.addEventListener("message", (event) => {
      if (event.origin !== widgetOrigin) return;
      if (!event.data || event.data.type !== "chat-widget:toggle") return;

      const nextWidth = event.data.open ? expandedWidth : collapsedWidth;
      const nextHeight = event.data.open ? expandedHeight : collapsedHeight;
      iframe.style.width = nextWidth + "px";
      iframe.style.height = nextHeight + "px";
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();`;

export async function GET() {
  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
