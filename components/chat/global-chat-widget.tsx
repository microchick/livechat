"use client";

import { usePathname } from "next/navigation";

import { ChatWidget } from "@/components/chat/chat-widget";

const hiddenRoutePrefixes = ["/chat", "/login", "/inbox", "/customers", "/dashboard", "/library", "/settings", "/widget"];


function shouldHideWidget(pathname: string) {
  return hiddenRoutePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function GlobalChatWidget() {
  const pathname = usePathname();

  if (shouldHideWidget(pathname)) {
    return null;
  }

  return <ChatWidget />;
}
