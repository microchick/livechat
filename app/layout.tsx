import type { Metadata } from "next";

import { GlobalChatWidget } from "@/components/chat/global-chat-widget";
import { AppProviders } from "@/components/providers/app-providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "在线客服系统",
  description: "网站右下角聊天挂件与客服工作台一体化在线客服系统",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <AppProviders>
          {children}
          <GlobalChatWidget />
        </AppProviders>
      </body>
    </html>
  );
}

