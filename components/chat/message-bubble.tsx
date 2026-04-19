import type { ReactNode } from "react";

import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

type MessageBubbleProps = {
  message: Message;
  self: boolean;
  timestamp: string;
  showSenderName?: boolean;
  showAvatar?: boolean;
  avatarUrl?: string;
  avatarLabel?: string;
  avatarFallback?: string;
  footerActions?: ReactNode;
  editedLabel?: string;
  recalledMessageLabel?: string;
};

function buildAvatarFallback(value: string) {
  const cleaned = value.trim();
  if (!cleaned) {
    return "?";
  }

  const segments = cleaned
    .split(/[\s@._-]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length >= 2) {
    return `${segments[0][0] ?? ""}${segments[1][0] ?? ""}`.toUpperCase();
  }

  const compact = cleaned.replace(/\s+/g, "");
  return compact.slice(0, 2).toUpperCase();
}

function MessageAvatar({ url, label, fallback, self }: { url?: string; label: string; fallback: string; self: boolean }) {
  if (url) {
    return <img alt={label} className="h-9 w-9 shrink-0 rounded-full border border-slate-200/80 object-cover shadow-sm" src={url} />;
  }

  return (
    <div
      aria-label={label}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold shadow-sm",
        self ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700",
      )}
      role="img"
    >
      {fallback}
    </div>
  );
}

export function MessageBubble({
  message,
  self,
  timestamp,
  showSenderName = true,
  showAvatar = false,
  avatarUrl,
  avatarLabel,
  avatarFallback,
  footerActions,
  editedLabel = "已编辑",
  recalledMessageLabel = "该消息已撤回",
}: MessageBubbleProps) {
  const type = message.message_type ?? (message.media_url ? "image" : "text");
  const senderLabel = message.sender_name || message.sender_type;
  const isRecalled = Boolean(message.recalled_at);
  const statusText = [timestamp, env.showEditedLabel && message.edited_at && !isRecalled ? editedLabel : ""].filter(Boolean).join(" · ");
  const metaText = showSenderName ? [senderLabel, statusText].filter(Boolean).join(" · ") : statusText;
  const resolvedAvatarLabel = avatarLabel || senderLabel;
  const resolvedAvatarFallback = buildAvatarFallback(avatarFallback || resolvedAvatarLabel);

  return (
    <div className={cn("flex items-end gap-3", self ? "justify-end" : "justify-start")}>
      {!self && showAvatar ? <MessageAvatar fallback={resolvedAvatarFallback} label={resolvedAvatarLabel} self={self} url={avatarUrl} /> : null}
      <div
        className={cn(
          "max-w-[85%] rounded-3xl px-4 py-3 text-sm shadow-sm sm:max-w-[80%]",
          self ? "bg-slate-900 text-white" : "bg-white text-slate-800",
          type === "image" && !isRecalled ? "overflow-hidden p-2" : "",
        )}
      >
        {isRecalled ? (
          <p className={cn("leading-6 italic", self ? "text-slate-200" : "text-slate-500")}>
            {env.showRecalledMessage ? recalledMessageLabel : ""}
          </p>
        ) : type === "image" && message.media_url ? (
          <div className="space-y-3">
            <a href={message.media_url} rel="noreferrer" target="_blank">
              <img alt={message.content || "chat image"} className="max-h-72 w-full rounded-2xl object-cover" src={message.media_url} />
            </a>
            {message.content ? <p className="px-2 text-sm leading-6">{message.content}</p> : null}
          </div>
        ) : type === "emoji" ? (
          <p className="text-4xl leading-none">{message.content}</p>
        ) : (
          <p className="leading-6">{message.content}</p>
        )}

        <div className="mt-2 flex items-center justify-between gap-3">
          <p className={cn("text-xs", self ? "text-slate-300" : "text-slate-400")}>{metaText}</p>
          {footerActions ? <div className="shrink-0">{footerActions}</div> : null}
        </div>
      </div>
      {self && showAvatar ? <MessageAvatar fallback={resolvedAvatarFallback} label={resolvedAvatarLabel} self={self} url={avatarUrl} /> : null}
    </div>
  );
}
