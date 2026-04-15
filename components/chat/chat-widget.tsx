"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ExternalLink, ImagePlus, Loader2, MessageCircleMore, RefreshCcw, SendHorizonal, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { MessageBubble } from "@/components/chat/message-bubble";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useStickyChatScroll } from "@/hooks/use-sticky-chat-scroll";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ImageUploadPrepareResponse, Message, MessagePage, UploadImageResponse, VisitorSessionResponse, WidgetSettings } from "@/types";

const visitorSessionStorageKey = "chat_visitor_session";
const teaserDismissStorageKey = "chat_widget_teaser_dismissed_signature";
const defaultBrandName = "Support assistant";
const defaultWelcomeMessage = "Hello! Thank you for reaching out to us. How can I assist you today?";

const fallbackSettings: WidgetSettings = {
  enabled: true,
  brand_name: defaultBrandName,
  avatar_url: "",
  welcome_message: defaultWelcomeMessage,
};

type VisitorSession = {
  accessToken: string;
  expiresAt: number;
  conversationId: string;
  customerName: string;
  customerEmail: string;
  customerAvatarUrl?: string;
};

type PendingImage = {
  file: File;
  previewUrl: string;
};

type ChatWidgetProps = {
  embedded?: boolean;
  initialOpen?: boolean;
};

function readStoredSession(): VisitorSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(visitorSessionStorageKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as VisitorSession;
    if (!parsed.accessToken || !parsed.conversationId || parsed.expiresAt < Date.now()) {
      localStorage.removeItem(visitorSessionStorageKey);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(visitorSessionStorageKey);
    return null;
  }
}

function persistSession(session: VisitorSession | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    localStorage.removeItem(visitorSessionStorageKey);
    return;
  }

  localStorage.setItem(visitorSessionStorageKey, JSON.stringify(session));
}

function readDismissedTeaserSignature() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem(teaserDismissStorageKey) || "";
}

function persistDismissedTeaserSignature(signature: string) {
  if (typeof window === "undefined") {
    return;
  }

  if (!signature) {
    localStorage.removeItem(teaserDismissStorageKey);
    return;
  }

  localStorage.setItem(teaserDismissStorageKey, signature);
}

function appendMessagePage(previous: MessagePage | undefined, message: Message): MessagePage {
  const items = previous?.items ?? [];
  const deduped = new Map(items.map((item) => [item.id, item]));
  deduped.set(message.id, message);

  return {
    items: Array.from(deduped.values()).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    next_cursor: previous?.next_cursor,
  };
}

function shortenText(content: string, maxLength = 72) {
  const cleaned = content.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return `${cleaned.slice(0, maxLength - 1)}…`;
}

export function ChatWidget({ embedded = false, initialOpen = false }: ChatWidgetProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const knownConversationIdRef = useRef<string | null>(null);

  const [open, setOpen] = useState(initialOpen);
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<VisitorSession | null>(null);
  const [name, setName] = useState("Website Visitor");
  const [email, setEmail] = useState("");
  const [composer, setComposer] = useState("");
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [teaserDismissed, setTeaserDismissed] = useState(false);

  useEffect(() => {
    const stored = readStoredSession();
    if (stored) {
      setSession(stored);
      setName(stored.customerName || "Website Visitor");
      setEmail(stored.customerEmail || "");
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    return () => {
      if (pendingImage) {
        URL.revokeObjectURL(pendingImage.previewUrl);
      }
    };
  }, [pendingImage]);

  useEffect(() => {
    if (!embedded || typeof window === "undefined" || window.parent === window) {
      return;
    }

    window.parent.postMessage(
      {
        type: "chat-widget:toggle",
        open,
      },
      "*",
    );
  }, [embedded, open]);

  const settingsQuery = useQuery({
    queryKey: ["public-widget-settings"],
    queryFn: () => api.get<WidgetSettings>("/api/public/widget-settings", { skipAuth: true }),
    retry: false,
    staleTime: 60_000,
  });


  const widgetSettings = settingsQuery.data ?? fallbackSettings;
  const brandName = widgetSettings.brand_name || defaultBrandName;
  const avatarUrl = widgetSettings.avatar_url || "";

  const previewMessage = useMemo<Message>(
    () => ({
      id: "widget-preview-welcome",
      conversation_id: "widget-preview",
      sender_name: brandName,
      sender_type: "bot",
      message_type: "text",
      content: widgetSettings.welcome_message || defaultWelcomeMessage,
      created_at: new Date().toISOString(),
    }),
    [brandName, widgetSettings.welcome_message],
  );

  const messagesQuery = useQuery({
    enabled: Boolean(session?.conversationId),
    queryKey: ["public-messages", session?.conversationId],
    queryFn: async () => {
      if (!session) {
        throw new Error("Visitor session not found");
      }

      return api.get<MessagePage>(`/api/public/messages?conversation_id=${session.conversationId}&limit=50`, {
        authToken: session.accessToken,
      });
    },
    refetchInterval: session ? (open ? 3000 : 5000) : false,
    retry: false,
  });

  useEffect(() => {
    if (!messagesQuery.error) {
      return;
    }

    const errorMessage = messagesQuery.error instanceof Error ? messagesQuery.error.message : "Visitor session expired";
    toast.error(errorMessage);
    persistSession(null);
    setSession(null);
    setUnreadCount(0);
    knownMessageIdsRef.current.clear();
    knownConversationIdRef.current = null;
  }, [messagesQuery.error]);

  const messages = useMemo(() => {
    if (!session) {
      return [previewMessage];
    }
    return messagesQuery.data?.items ?? [];
  }, [messagesQuery.data, previewMessage, session]);

  useEffect(() => {
    if (!session?.conversationId) {
      knownMessageIdsRef.current.clear();
      knownConversationIdRef.current = null;
      setUnreadCount(0);
      return;
    }

    if (knownConversationIdRef.current !== session.conversationId) {
      knownConversationIdRef.current = session.conversationId;
      knownMessageIdsRef.current = new Set(messages.map((message) => message.id));
      setUnreadCount(0);
      return;
    }

    if (knownMessageIdsRef.current.size === 0 && messages.length > 0) {
      knownMessageIdsRef.current = new Set(messages.map((message) => message.id));
      setUnreadCount(0);
      return;
    }

    const newMessages = messages.filter((message) => !knownMessageIdsRef.current.has(message.id));
    if (newMessages.length === 0) {
      return;
    }

    newMessages.forEach((message) => knownMessageIdsRef.current.add(message.id));

    const incomingCount = newMessages.filter((message) => message.sender_type !== "user").length;
    if (incomingCount === 0) {
      return;
    }

    if (open) {
      setUnreadCount(0);
      return;
    }

    persistDismissedTeaserSignature("");
    setTeaserDismissed(false);
    setUnreadCount((current) => Math.min(99, current + incomingCount));
  }, [messages, open, session?.conversationId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setUnreadCount(0);
  }, [open]);

  const latestSupportMessage = useMemo(() => {
    return [...messages].reverse().find((message) => message.sender_type !== "user") ?? previewMessage;
  }, [messages, previewMessage]);

  const teaserText = useMemo(() => {
    if (session) {
      return shortenText(latestSupportMessage.content || widgetSettings.welcome_message || defaultWelcomeMessage, 64);
    }
    return shortenText(widgetSettings.welcome_message || defaultWelcomeMessage, 64);
  }, [latestSupportMessage.content, session, widgetSettings.welcome_message]);

  const teaserSignature = useMemo(
    () => `${session?.conversationId ?? "preview"}:${latestSupportMessage.id}:${brandName}:${teaserText}`,
    [brandName, latestSupportMessage.id, session?.conversationId, teaserText],
  );

  useEffect(() => {
    if (!hydrated || embedded) {
      return;
    }
    setTeaserDismissed(readDismissedTeaserSignature() === teaserSignature);
  }, [embedded, hydrated, teaserSignature]);

  const { containerRef, handleScroll, scrollToBottom } = useStickyChatScroll({
    enabled: open,
    itemCount: messages.length,
    resetKey: session?.conversationId ?? "widget-preview",
  });

  const createSessionMutation = useMutation({
    mutationFn: (payload: { initialMessage: string }) =>
      api.post<VisitorSessionResponse>(
        "/api/public/session",
        {
          name: name.trim() || "Website Visitor",
          email: email.trim(),
          initial_message: payload.initialMessage.trim(),
          source: "widget",
        },
        { skipAuth: true },
      ),
    onSuccess: (result) => {
      const nextSession: VisitorSession = {
        accessToken: result.access_token,
        expiresAt: Date.now() + result.expires_in * 1000,
        conversationId: result.conversation.id,
        customerName: result.conversation.customer.name,
        customerEmail: result.conversation.customer.email,
      };

      persistSession(nextSession);
      setSession(nextSession);
      setName(nextSession.customerName || "Website Visitor");
      setEmail(nextSession.customerEmail || "");
      setComposer("");
      setOpen(true);
      setUnreadCount(0);
      setTeaserDismissed(true);
      persistDismissedTeaserSignature(teaserSignature);

      const seededMessages = [result.initial_message, result.welcome_message].filter(Boolean) as Message[];
      knownConversationIdRef.current = result.conversation.id;
      knownMessageIdsRef.current = new Set(seededMessages.map((message) => message.id));

      queryClient.setQueryData<MessagePage>(["public-messages", result.conversation.id], {
        items: seededMessages,
        next_cursor: "",
      });
      window.requestAnimationFrame(() => scrollToBottom("auto"));
      toast.success("Conversation started. Our team can continue the reply flow now.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to start the conversation");
    },
  });

  async function createOutgoingMessage(payload: { content?: string; message_type: "text" | "image"; media_url?: string; media_key?: string }) {
    if (!session) {
      throw new Error("Visitor session not found");
    }

    return api.post<Message>(
      "/api/public/messages",
      {
        conversation_id: session.conversationId,
        content: payload.content ?? "",
        message_type: payload.message_type,
        media_url: payload.media_url ?? "",
        media_key: payload.media_key ?? "",
      },
      { authToken: session.accessToken },
    );
  }

  async function uploadPendingImageFile(file: File): Promise<UploadImageResponse> {
    if (!session) {
      throw new Error("Please start a conversation first");
    }

    const prepare = await api.post<ImageUploadPrepareResponse>(
      "/api/public/upload/image/prepare",
      {
        filename: file.name,
        mime_type: file.type,
        size: file.size,
      },
      { authToken: session.accessToken },
    );

    if (prepare.driver === "qiniu") {
      if (!prepare.upload_url || !prepare.upload_token || !prepare.key || !prepare.url) {
        throw new Error("七牛上传配置不完整");
      }

      const formData = new FormData();
      formData.append("token", prepare.upload_token);
      formData.append("key", prepare.key);
      formData.append("file", file);

      const response = await fetch(prepare.upload_url, {
        method: "POST",
        body: formData,
        cache: "no-store",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "图片上传失败");
      }

      return {
        key: prepare.key,
        url: prepare.url,
      };
    }

    const formData = new FormData();
    formData.append("file", file);
    return api.postForm<UploadImageResponse>("/api/public/upload/image", formData, {
      authToken: session.accessToken,
    });
  }

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!session) {
        throw new Error("Please start a conversation first");
      }

      if (pendingImage) {
        const upload = await uploadPendingImageFile(pendingImage.file);
        return createOutgoingMessage({
          content: composer.trim(),
          message_type: "image",
          media_url: upload.url,
          media_key: upload.key,
        });
      }

      return createOutgoingMessage({
        content: composer.trim(),
        message_type: "text",
      });
    },
    onSuccess: (message) => {
      setComposer("");
      if (pendingImage) {
        URL.revokeObjectURL(pendingImage.previewUrl);
        setPendingImage(null);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      queryClient.setQueryData<MessagePage>(["public-messages", session?.conversationId], (previous: MessagePage | undefined) => appendMessagePage(previous, message));
      knownMessageIdsRef.current.add(message.id);
      window.requestAnimationFrame(() => scrollToBottom("auto"));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    },
  });

  function clearPendingImage() {
    if (pendingImage) {
      URL.revokeObjectURL(pendingImage.previewUrl);
      setPendingImage(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handlePickImage(file?: File | null) {
    if (!file) {
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("请选择 10 MB 以内的图片。");
      return;
    }

    if (pendingImage) {
      URL.revokeObjectURL(pendingImage.previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingImage({ file, previewUrl });
  }

  function resetSession() {
    persistSession(null);
    setSession(null);
    setComposer("");
    setName("Website Visitor");
    setEmail("");
    setUnreadCount(0);
    clearPendingImage();
    knownMessageIdsRef.current.clear();
    knownConversationIdRef.current = null;
    persistDismissedTeaserSignature("");
    setTeaserDismissed(false);
    void queryClient.invalidateQueries({ queryKey: ["public-messages"] });
  }

  function handleSend() {
    if (createSessionMutation.isPending || sendMessageMutation.isPending) {
      return;
    }

    if (!session) {
      if (!composer.trim()) {
        return;
      }
      createSessionMutation.mutate({ initialMessage: composer.trim() });
      return;
    }

    if (!composer.trim() && !pendingImage) {
      return;
    }

    sendMessageMutation.mutate();
  }

  function toggleWidget() {
    setOpen((current) => !current);
  }

  function dismissTeaser(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setTeaserDismissed(true);
    persistDismissedTeaserSignature(teaserSignature);
  }

  const busy = createSessionMutation.isPending || sendMessageMutation.isPending;
  const canSendText = composer.trim().length > 0;
  const canSendImage = Boolean(pendingImage);
  const showTeaser = !embedded && !open && hydrated && !teaserDismissed;

  if (!widgetSettings.enabled) {
    return null;
  }

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] right-3 z-40 flex flex-col items-end gap-3 sm:bottom-5 sm:right-5">
      <div
        className={cn(
          "w-[min(24rem,calc(100vw-1rem))] origin-bottom-right transition-all duration-300 ease-out sm:w-[24rem]",
          open ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-4 scale-95 opacity-0",
        )}
      >
        <Card className="flex h-[min(42rem,calc(100dvh-6.75rem))] w-full flex-col overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.22)] sm:h-[min(42rem,calc(100dvh-7.5rem))]">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#38bdf8_100%)] px-4 py-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {avatarUrl ? (
                  <img alt={brandName} className="mt-0.5 h-11 w-11 rounded-2xl object-cover ring-1 ring-white/20" src={avatarUrl} />
                ) : (
                  <div className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/12 shadow-inner shadow-white/10 backdrop-blur">
                    <MessageCircleMore className="h-5 w-5 text-white" />
                    <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#0f172a] bg-emerald-400" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100/90">Live support</p>
                  <h2 className="mt-1.5 text-lg font-semibold">{brandName}</h2>
                  <p className="mt-1 text-sm text-blue-50/85">{session ? "Your conversation is active." : "Send a message to start the conversation."}</p>
                </div>
              </div>
              {session ? (
                <button
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-slate-100 transition hover:bg-white/15"
                  onClick={resetSession}
                  type="button"
                >
                  <RefreshCcw className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-blue-50/80">
              <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1">{session ? "Connected" : "Online now"}</span>
              <Link className="inline-flex items-center gap-1 font-medium text-white transition hover:text-cyan-100" href="/chat" target="_blank">
                Open full chat
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {!session ? (
            <div className="grid gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
              <Input placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} />
              <Input placeholder="Email (optional)" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
          ) : (
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              <span className="font-medium text-slate-700">{session.customerName}</span>
              {session.customerEmail ? <span className="ml-2">· {session.customerEmail}</span> : null}
            </div>
          )}

          <div ref={containerRef} className="min-h-0 flex-1 overflow-y-auto bg-slate-50/80 px-4 py-4" onScroll={handleScroll}>
            {!hydrated ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Restoring conversation...
              </div>
            ) : session && messagesQuery.isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading messages...
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    self={message.sender_type === "user"}
                    timestamp={format(new Date(message.created_at), "HH:mm")}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 bg-white p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <input
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
              onChange={(event) => handlePickImage(event.target.files?.[0])}
              ref={fileInputRef}
              type="file"
            />

            {pendingImage ? (
              <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start gap-3">
                  <img alt="Selected image" className="h-14 w-14 rounded-2xl object-cover" src={pendingImage.previewUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">Selected image</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{pendingImage.file.name}</p>
                  </div>
                  <button className="text-slate-400 transition hover:text-slate-700" onClick={clearPendingImage} type="button">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}

            <textarea
              className={cn(
                "min-h-[92px] w-full resize-none rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 sm:min-h-[104px]",
                busy ? "opacity-80" : "",
              )}
              disabled={busy}
              placeholder={session ? "Type your message here..." : "Send your first message to begin..."}
              value={composer}
              onChange={(event) => setComposer(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                disabled={!session || busy}
                onClick={() => fileInputRef.current?.click()}
                size="sm"
                type="button"
                variant="outline"
              >
                <ImagePlus className="mr-1.5 h-4 w-4" />
                Photo
              </Button>
              <p className="text-[11px] text-slate-400">{session ? "Replies refresh automatically every 3 seconds." : "We will open the conversation when you send the first message."}</p>
              <Button className="sm:ml-auto" disabled={busy || (!canSendText && !canSendImage)} onClick={handleSend} size="sm" type="button">
                {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <SendHorizonal className="mr-1.5 h-4 w-4" />}
                Send
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {showTeaser ? (
        <div className="relative max-w-[18rem] rounded-[1.4rem] border border-slate-200 bg-white px-4 py-3 pr-11 text-left shadow-[0_18px_45px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(15,23,42,0.18)]">
          <button className="absolute right-2 top-2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" onClick={dismissTeaser} type="button">
            <X className="h-4 w-4" />
          </button>
          <button className="w-full text-left" onClick={toggleWidget} type="button">
            <div className="flex items-start gap-3">
              {avatarUrl ? (
                <img alt={brandName} className="mt-0.5 h-9 w-9 rounded-2xl object-cover" src={avatarUrl} />
              ) : (
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <MessageCircleMore className="h-4.5 w-4.5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{brandName}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{teaserText}</p>
              </div>
            </div>
          </button>
        </div>
      ) : null}

      <button
        aria-expanded={open}
        aria-label={open ? "Hide chat widget" : "Open chat widget"}
        className={cn(
          "group relative flex h-16 w-16 items-center justify-center rounded-full border border-white/50 bg-[linear-gradient(135deg,#2563eb_0%,#0ea5e9_55%,#22c55e_100%)] text-white shadow-[0_20px_45px_rgba(37,99,235,0.4)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(37,99,235,0.48)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2",
          open ? "scale-[0.98]" : "scale-100",
        )}
        onClick={toggleWidget}
        type="button"
      >
        <span className="absolute inset-[3px] rounded-full bg-white/12" />
        <span className="absolute inset-0 rounded-full bg-white/0 transition group-hover:bg-white/5" />
        <span className="absolute inset-0 animate-pulse rounded-full bg-blue-400/20 blur-xl" />
        <span className="absolute right-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-white/80 bg-emerald-400" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white shadow-lg shadow-rose-500/30">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
        {open ? <X className="relative h-6 w-6" /> : <MessageCircleMore className="relative h-7 w-7" />}
      </button>
    </div>
  );
}
