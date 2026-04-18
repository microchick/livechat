"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ImagePlus, Languages, Loader2, MessageSquare, RefreshCcw, SendHorizonal, SmilePlus, X } from "lucide-react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { MessageBubble } from "@/components/chat/message-bubble";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useStickyChatScroll } from "@/hooks/use-sticky-chat-scroll";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ImageUploadPrepareResponse, Message, MessagePage, UploadImageResponse, VisitorSessionResponse, WidgetSettings } from "@/types";

const visitorSessionStorageKey = "chat_visitor_session";
const quickEmojis = ["😀", "🥳", "😍", "👍", "🙏", "❤️", "🎉", "😄"];

type Locale = "en" | "zh";

type VisitorSession = {
  accessToken: string;
  expiresAt: number;
  conversationId: string;
  customerName: string;
  customerEmail: string;
  customerAvatarUrl?: string;
  externalUserId?: string;
};

type PendingImage = {
  file: File;
  previewUrl: string;
};

type SendAction =
  | { kind: "text" }
  | { kind: "emoji"; emoji: string };

const formDefaults = {
  en: {
    name: "Website Visitor",
    email: "visitor@example.com",
    initialMessage: "",
  },
  zh: {
    name: "网站访客",
    email: "visitor@example.com",
    initialMessage: "",
  },
} as const;

const copy = {
  en: {
    eyebrow: "Live Chat",
    title: "Contact support in real time",
    description: "Start a conversation with the support team and continue the reply flow from the agent console.",
    languageLabel: "Language",
    introTitle: "How it works",
    introBody: "Send your first message here, then open the agent console to continue the conversation from the support side.",
    consoleEntryTitle: "Agent console",
    consoleEntryBody: "Use the console to manage the visitor conversation in real time.",
    openConsole: "Open console",
    urlHint: "Language can also be switched via URL: append `?lang=zh` to view Chinese.",
    nameLabel: "Name",
    emailLabel: "Email",
    firstMessageLabel: "First message",
    firstMessagePlaceholder: "Ask about pricing, shipping, returns, inventory, or after-sales support...",
    createSession: "Start chat",
    boundIdentityTitle: "Store member linked",
    boundIdentityBody: "This chat was opened from your store. We already know which member is contacting support, so you only need to describe the issue.",
    externalUserIdLabel: "User ID",
    sessionReadyTitle: "You are connected",

    visitorLabel: "Visitor",
    sessionIdLabel: "Conversation ID",
    noEmail: "Not provided",
    startNewSession: "Start a new conversation",
    chatTitle: "Messages",
    pollingDescription: "New messages refresh automatically every 3 seconds when realtime is not configured.",
    waitingDescription: "Create a session first and the full conversation will appear here.",
    connected: "Connected",
    idle: "Waiting for session",
    restoring: "Restoring session",
    restoringSession: "Restoring your chat...",
    emptyTitle: "No messages yet",
    emptyBody: "Fill in your details and send the first message. The conversation timeline will appear here.",
    loadingMessages: "Loading conversation...",
    composerPlaceholder: "Type your message or add a caption",
    composerLockedPlaceholder: "Create a chat session first",
    composerHint: "Press Enter to send, Shift + Enter for a new line.",
    sendMessage: "Send",
    chooseImage: "Photo",
    emojiLabel: "Emoji",
    selectedImage: "Selected photo",
    removeImage: "Remove",
    sessionMissing: "Visitor session not found",
    sessionExpired: "Visitor session expired",
    sessionCreatedToast: "Chat session created. You can now continue from the agent console.",
    createSessionFailed: "Failed to create chat session",
    sendFailed: "Failed to send message",
    createSessionRequired: "Please create a chat session first",
    imageTooLarge: "Please choose an image smaller than 10 MB.",
    imageSelectedToast: "Photo selected. Tap send to upload and send it.",
  },
  zh: {
    eyebrow: "Live Chat",
    title: "在线联系客服",
    description: "先在这里发起咨询，再去客服工作台继续处理这条会话。",
    languageLabel: "语言",
    introTitle: "使用方式",
    introBody: "先在这里发送第一条消息，再到客服端工作台继续跟进这条会话。",
    consoleEntryTitle: "客服工作台",
    consoleEntryBody: "客服侧可以实时接收并处理当前访客会话。",
    openConsole: "打开工作台",
    urlHint: "也支持通过 URL 切换语言：加上 `?lang=zh` 即可切到中文。",
    nameLabel: "昵称",
    emailLabel: "邮箱",
    firstMessageLabel: "第一条消息",
    firstMessagePlaceholder: "输入你想咨询的问题，比如价格、物流、售后、库存...",
    createSession: "开始咨询",
    boundIdentityTitle: "已绑定商城会员",
    boundIdentityBody: "当前聊天从商城页面发起，系统已识别会员身份，你只需要填写咨询详情即可开始会话。",
    externalUserIdLabel: "会员 ID",
    sessionReadyTitle: "当前会话已连接",

    visitorLabel: "访客",
    sessionIdLabel: "会话 ID",
    noEmail: "未填写",
    startNewSession: "重新开始新会话",
    chatTitle: "聊天消息",
    pollingDescription: "未配置实时服务时，页面会每 3 秒自动刷新一次新消息。",
    waitingDescription: "先创建会话，这里就会显示完整聊天记录。",
    connected: "已连接",
    idle: "等待创建会话",
    restoring: "恢复中",
    restoringSession: "正在恢复你的聊天记录...",
    emptyTitle: "还没有消息",
    emptyBody: "填写信息并发送第一条消息后，这里会展示完整会话记录。",
    loadingMessages: "正在拉取聊天记录...",
    composerPlaceholder: "输入消息，或给图片加一句说明",
    composerLockedPlaceholder: "请先创建会话",
    composerHint: "回车发送，Shift + Enter 换行。",
    sendMessage: "发送",
    chooseImage: "照片",
    emojiLabel: "表情",
    selectedImage: "已选图片",
    removeImage: "移除",
    sessionMissing: "访客会话不存在",
    sessionExpired: "访客会话已失效",
    sessionCreatedToast: "会话创建成功，现在可以继续聊天了。",
    createSessionFailed: "创建会话失败",
    sendFailed: "消息发送失败",
    createSessionRequired: "请先创建会话",
    imageTooLarge: "请选择 10 MB 以内的图片。",
    imageSelectedToast: "图片已选择，点击发送即可上传并发出。",
  },
} as const;

const fallbackWidgetSettings: WidgetSettings = {
  enabled: true,
  brand_name: "Support assistant",
  avatar_url: "",
  welcome_message: "",
};

type BoundCustomer = {
  externalUserId: string;
  name: string;
  email: string;
  avatarUrl: string;
  source: string;
  payload: Record<string, unknown> | null;
};

type SearchParamReader = {
  get(name: string): string | null;
};

type SupportAvatarProps = {
  avatarUrl?: string;
  label: string;
  className?: string;
};

function SupportAvatar({ avatarUrl, label, className }: SupportAvatarProps) {
  if (avatarUrl) {
    return <img alt={label} className={cn("rounded-full object-cover", className)} src={avatarUrl} />;
  }

  return (
    <div className={cn("flex items-center justify-center rounded-full bg-white/10 text-white", className)}>
      <MessageSquare className="h-5 w-5" />
    </div>
  );
}

function readParamValue(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function parsePayloadParam(raw: string | null) {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readPayloadValue(payload: Record<string, unknown> | null, keys: string[]) {
  if (!payload) {
    return "";
  }

  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function buildBoundCustomer(params: SearchParamReader): BoundCustomer | null {
  const payload = parsePayloadParam(params.get("customer") ?? params.get("profile"));
  const externalUserId =
    readParamValue(params.get("userId") ?? params.get("user_id")) ||
    readPayloadValue(payload, ["user_id", "userId", "member_id", "memberId", "id"]);

  if (!externalUserId) {
    return null;
  }

  return {
    externalUserId,
    name: readParamValue(params.get("name")) || readPayloadValue(payload, ["name", "nickname", "nick_name", "display_name"]),
    email: readParamValue(params.get("email")) || readPayloadValue(payload, ["email"]),
    avatarUrl:
      readParamValue(params.get("avatar") ?? params.get("avatar_url")) ||
      readPayloadValue(payload, ["avatar_url", "avatarUrl", "avatar", "photo"]),
    source: readParamValue(params.get("source")) || "mall",
    payload,
  };
}

function normalizeLocale(raw: string | null | undefined): Locale {
  if (!raw) {
    return "en";
  }

  const value = raw.toLowerCase();
  return value === "zh" || value === "zh-cn" || value === "cn" ? "zh" : "en";
}

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

function appendMessagePage(previous: MessagePage | undefined, message: Message): MessagePage {
  const items = previous?.items ?? [];
  const deduped = new Map(items.map((item) => [item.id, item]));
  deduped.set(message.id, message);

  return {
    items: Array.from(deduped.values()).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    next_cursor: previous?.next_cursor,
  };
}

export default function ChatClient() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const latestMessageKeyRef = useRef("");
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);

  const locale = useMemo(() => normalizeLocale(searchParams.get("lang") ?? searchParams.get("locale")), [searchParams]);
  const boundCustomer = useMemo(() => buildBoundCustomer(searchParams), [searchParams]);
  const t = copy[locale];
  const defaults = formDefaults[locale];
  const initialFormName = boundCustomer ? boundCustomer.name : defaults.name;
  const initialFormEmail = boundCustomer ? boundCustomer.email : defaults.email;
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<VisitorSession | null>(null);
  const [formTouched, setFormTouched] = useState(false);
  const [name, setName] = useState<string>(initialFormName);
  const [email, setEmail] = useState<string>(initialFormEmail);
  const [initialMessage, setInitialMessage] = useState<string>(formDefaults.en.initialMessage);
  const [composer, setComposer] = useState("");
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);

  const widgetSettingsQuery = useQuery({
    queryKey: ["public-widget-settings"],
    queryFn: () => api.get<WidgetSettings>("/api/public/widget-settings", { skipAuth: true }),
    retry: false,
    staleTime: 60_000,
  });


  useEffect(() => {
    const stored = readStoredSession();
    const matchesBoundCustomer = !boundCustomer?.externalUserId || stored?.externalUserId === boundCustomer.externalUserId;

    if (stored && matchesBoundCustomer) {
      setSession(stored);
      setName(stored.customerName || initialFormName);
      setEmail(stored.customerEmail || initialFormEmail);
      setFormTouched(true);
    } else {
      if (stored && !matchesBoundCustomer) {
        persistSession(null);
      }
      setSession(null);
      setName(initialFormName);
      setEmail(initialFormEmail);
      setInitialMessage(defaults.initialMessage);
      setFormTouched(Boolean(boundCustomer));
    }

    setHydrated(true);
  }, [boundCustomer, defaults.initialMessage, initialFormEmail, initialFormName]);

  useEffect(() => {
    if (!session && (!formTouched || boundCustomer)) {
      setName(initialFormName);
      setEmail(initialFormEmail);
      setInitialMessage(defaults.initialMessage);
    }
  }, [boundCustomer, defaults.initialMessage, formTouched, initialFormEmail, initialFormName, session]);

  useEffect(() => {
    return () => {
      if (pendingImage) {
        URL.revokeObjectURL(pendingImage.previewUrl);
      }
    };
  }, [pendingImage]);

  function updateLocale(nextLocale: Locale) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("locale");

    if (nextLocale === "zh") {
      params.set("lang", "zh");
    } else {
      params.delete("lang");
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const messagesQuery = useQuery({
    enabled: Boolean(session?.conversationId),
    queryKey: ["public-messages", session?.conversationId],
    queryFn: async () => {
      if (!session) {
        throw new Error(t.sessionMissing);
      }

      return api.get<MessagePage>(`/api/public/messages?conversation_id=${session.conversationId}&limit=50`, {
        authToken: session.accessToken,
      });
    },
    refetchInterval: 3000,
    retry: false,
  });

  const messages = useMemo(() => messagesQuery.data?.items ?? [], [messagesQuery.data]);
  const { containerRef, handleScroll, scrollToBottom } = useStickyChatScroll({
    enabled: hydrated && Boolean(session),
    itemCount: messages.length,
    resetKey: session?.conversationId ?? null,
  });

  function scrollChatToBottom(behavior: ScrollBehavior = "auto") {
    const run = (nextBehavior: ScrollBehavior) => {
      scrollToBottom(nextBehavior);
      bottomAnchorRef.current?.scrollIntoView({ block: "end", behavior: nextBehavior });
    };

    window.requestAnimationFrame(() => {
      run(behavior);
      window.requestAnimationFrame(() => run("auto"));
    });
  }

  const widgetSettings = widgetSettingsQuery.data ?? fallbackWidgetSettings;

  const supportAvatarUrl = widgetSettings.avatar_url?.trim() || "";
  const supportLabel = widgetSettings.brand_name?.trim() || "Support";
  const visitorAvatarUrl = session?.customerAvatarUrl || boundCustomer?.avatarUrl || "";



  useEffect(() => {
    if (!messagesQuery.error) {
      return;
    }

    const errorMessage = messagesQuery.error instanceof Error ? messagesQuery.error.message : t.sessionExpired;
    toast.error(errorMessage);
    persistSession(null);
    setSession(null);
  }, [messagesQuery.error, t.sessionExpired]);

  useEffect(() => {
    if (!session?.conversationId || messages.length === 0) {
      latestMessageKeyRef.current = "";
      return;
    }

    const latestMessageId = messages[messages.length - 1]?.id;
    if (!latestMessageId) {
      return;
    }

    const nextMessageKey = `${session.conversationId}:${latestMessageId}`;
    const isNewTailMessage = latestMessageKeyRef.current !== "" && latestMessageKeyRef.current !== nextMessageKey;
    latestMessageKeyRef.current = nextMessageKey;
    scrollChatToBottom(isNewTailMessage ? "smooth" : "auto");
  }, [messages, session?.conversationId]);

  const createSessionMutation = useMutation({

    mutationFn: () =>
      api.post<VisitorSessionResponse>(
        "/api/public/session",
        {
          name: name.trim(),
          email: email.trim(),
          avatar_url: boundCustomer?.avatarUrl || "",
          external_user_id: boundCustomer?.externalUserId || "",
          customer_payload: boundCustomer?.payload || undefined,
          initial_message: initialMessage.trim(),
          source: boundCustomer?.source || "chat",
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
        customerAvatarUrl: result.conversation.customer.avatar_url,
        externalUserId: result.conversation.customer.external_user_id,
      };

      persistSession(nextSession);
      setSession(nextSession);
      setFormTouched(true);
      setName(result.conversation.customer.name || name.trim());
      setEmail(result.conversation.customer.email || email.trim());
      setComposer("");
      setInitialMessage("");
      queryClient.setQueryData<MessagePage>(["public-messages", result.conversation.id], {
        items: [result.initial_message, result.welcome_message].filter(Boolean) as Message[],
        next_cursor: "",
      });


      scrollChatToBottom("auto");
      toast.success(t.sessionCreatedToast);

    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t.createSessionFailed);
    },
  });

  async function createOutgoingMessage(payload: { content?: string; message_type: "text" | "emoji" | "image"; media_url?: string; media_key?: string }) {
    if (!session) {
      throw new Error(t.createSessionRequired);
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
      throw new Error(t.createSessionRequired);
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
    mutationFn: async (action: SendAction) => {
      if (!session) {
        throw new Error(t.createSessionRequired);
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


      if (action.kind === "emoji") {
        return createOutgoingMessage({
          content: action.emoji,
          message_type: "emoji",
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
      window.requestAnimationFrame(() => scrollToBottom("auto"));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t.sendFailed);
    },
  });

  function resetSession() {
    persistSession(null);
    setSession(null);
    setComposer("");
    setFormTouched(Boolean(boundCustomer));
    setName(initialFormName);
    setEmail(initialFormEmail);
    setInitialMessage(defaults.initialMessage);
    if (pendingImage) {
      URL.revokeObjectURL(pendingImage.previewUrl);
      setPendingImage(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    void queryClient.invalidateQueries({ queryKey: ["public-messages"] });
  }

  function triggerImagePicker() {
    fileInputRef.current?.click();
  }

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
      toast.error(t.imageTooLarge);
      return;
    }

    if (pendingImage) {
      URL.revokeObjectURL(pendingImage.previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingImage({ file, previewUrl });
    toast.success(t.imageSelectedToast);
  }

  const canSendText = composer.trim().length > 0;
  const canSendImage = Boolean(pendingImage);
  const shellClassName = session ? "min-h-[100dvh] lg:h-[100dvh] lg:overflow-hidden" : "min-h-[100dvh]";
  const innerClassName = session
    ? "mx-auto flex min-h-[100dvh] max-w-7xl flex-col gap-4 px-3 py-3 sm:px-4 sm:py-4 lg:h-full lg:min-h-0 lg:grid lg:grid-cols-[0.92fr_1.08fr] lg:gap-6 lg:px-6 lg:py-6"
    : "mx-auto flex min-h-[100dvh] max-w-7xl flex-col gap-4 px-3 py-3 sm:px-4 sm:py-4 lg:grid lg:grid-cols-[0.92fr_1.08fr] lg:gap-6 lg:px-6 lg:py-6";

  return (
    <div className={cn("bg-slate-950 text-white", shellClassName)} lang={locale === "zh" ? "zh-CN" : "en"}>
      <div className={innerClassName}>
        <Card className={cn("flex min-h-0 flex-col overflow-hidden border-white/10 bg-white/5 text-white backdrop-blur", session ? "order-2 lg:order-1 lg:h-full" : "") }>
          <CardHeader className="shrink-0 pb-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">{t.eyebrow}</p>
                <CardTitle className="mt-3 text-2xl text-white sm:text-3xl">{t.title}</CardTitle>
               
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
                <div className="mb-2 flex items-center gap-2 px-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                  <Languages className="h-4 w-4" />
                  {t.languageLabel}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    aria-pressed={locale === "en"}
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm font-medium transition",
                      locale === "en" ? "bg-cyan-400 text-slate-950" : "bg-white/5 text-slate-300 hover:bg-white/10",
                    )}
                    onClick={() => updateLocale("en")}
                    type="button"
                  >
                    English
                  </button>
                  <button
                    aria-pressed={locale === "zh"}
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm font-medium transition",
                      locale === "zh" ? "bg-cyan-400 text-slate-950" : "bg-white/5 text-slate-300 hover:bg-white/10",
                    )}
                    onClick={() => updateLocale("zh")}
                    type="button"
                  >
                    中文
                  </button>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className={cn("flex min-h-0 flex-1 flex-col gap-4 overscroll-contain", session ? "overflow-visible lg:overflow-y-auto" : "overflow-y-auto") }>
           

            {!session ? (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  createSessionMutation.mutate();
                }}
              >
                {boundCustomer ? (
                  <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-50">
                    <div className="flex items-start gap-3">
                      {boundCustomer.avatarUrl ? (
                        <img alt={boundCustomer.name || boundCustomer.externalUserId} className="mt-0.5 h-12 w-12 rounded-full object-cover ring-2 ring-white/20" src={boundCustomer.avatarUrl} />
                      ) : (
                        <div className="mt-0.5 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                          {(boundCustomer.name || boundCustomer.externalUserId).slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white">{t.boundIdentityTitle}</p>
                        <p className="mt-1 text-sm text-cyan-100/90">{t.boundIdentityBody}</p>
                        <div className="mt-3 grid gap-1 text-xs text-cyan-100/85 sm:grid-cols-2">
                          <p className="break-all">
                            <span className="text-cyan-200">{t.externalUserIdLabel}：</span>
                            {boundCustomer.externalUserId}
                          </p>
                          {boundCustomer.name ? (
                            <p>
                              <span className="text-cyan-200">{t.nameLabel}：</span>
                              {boundCustomer.name}
                            </p>
                          ) : null}
                          {boundCustomer.email ? (
                            <p className="break-all sm:col-span-2">
                              <span className="text-cyan-200">{t.emailLabel}：</span>
                              {boundCustomer.email}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-200">{t.nameLabel}</label>
                      <Input
                        className="border-white/10 bg-white/10 text-white placeholder:text-slate-400"
                        value={name}
                        onChange={(event) => {
                          setFormTouched(true);
                          setName(event.target.value);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-200">{t.emailLabel}</label>
                      <Input
                        className="border-white/10 bg-white/10 text-white placeholder:text-slate-400"
                        value={email}
                        onChange={(event) => {
                          setFormTouched(true);
                          setEmail(event.target.value);
                        }}
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200">{t.firstMessageLabel}</label>
                  <textarea
                    className="min-h-[140px] w-full rounded-3xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-200/30"
                    placeholder={t.firstMessagePlaceholder}
                    value={initialMessage}
                    onChange={(event) => {
                      setFormTouched(true);
                      setInitialMessage(event.target.value);
                    }}
                  />
                </div>
                <Button className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400" disabled={createSessionMutation.isPending || !initialMessage.trim()}>
                  {createSessionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                  {t.createSession}
                </Button>
              </form>
            ) : (

              <div className="space-y-4 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-50">
                <p className="font-medium text-white">{t.sessionReadyTitle}</p>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <p>
                    <span className="text-slate-300">{t.visitorLabel}：</span>
                    {session.customerName}
                  </p>
                  <p>
                    <span className="text-slate-300">{t.emailLabel}：</span>
                    {session.customerEmail || t.noEmail}
                  </p>
                  {session.externalUserId ? (
                    <p className="break-all">
                      <span className="text-slate-300">{t.externalUserIdLabel}：</span>
                      {session.externalUserId}
                    </p>
                  ) : null}
                  <p className="sm:col-span-2 break-all">
                    <span className="text-slate-300">{t.sessionIdLabel}：</span>
                    {session.conversationId}
                  </p>
                </div>

                <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={resetSession} type="button" variant="secondary">
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {t.startNewSession}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cn("flex min-h-0 flex-1 flex-col overflow-hidden border-white/10 bg-white text-slate-900 lg:h-full", session ? "order-1 min-h-[68dvh] lg:order-2 lg:min-h-0" : "") }>
          <CardHeader className="shrink-0 border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <SupportAvatar avatarUrl={supportAvatarUrl} className="h-11 w-11 border border-slate-200 bg-slate-100 text-slate-700" label={supportLabel} />
                <div>
                  <CardTitle>{t.chatTitle}</CardTitle>
                  <CardDescription>{session ? t.pollingDescription : t.waitingDescription}</CardDescription>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                {hydrated ? (session ? t.connected : t.idle) : t.restoring}
              </span>
            </div>
          </CardHeader>

          <div ref={containerRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/80 px-4 py-4 sm:px-6" onScroll={handleScroll}>
            {!hydrated ? (
              <div className="flex h-full items-center justify-center text-slate-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t.restoringSession}
              </div>
            ) : !session ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
                <MessageSquare className="mb-4 h-10 w-10 text-slate-300" />
                <p className="text-base font-medium text-slate-700">{t.emptyTitle}</p>
                <p className="mt-2 max-w-md text-sm">{t.emptyBody}</p>
              </div>
            ) : messagesQuery.isLoading ? (
              <div className="flex h-full items-center justify-center text-slate-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t.loadingMessages}
              </div>
            ) : (
              <div className="space-y-4 pb-2">
                {messages.map((message) => {
                  const isSelfMessage = message.sender_type === "user";
                  return (
                    <MessageBubble
                      key={message.id}
                      avatarFallback={isSelfMessage ? session?.customerName || boundCustomer?.externalUserId || t.visitorLabel : supportLabel}
                      avatarLabel={isSelfMessage ? session?.customerName || t.visitorLabel : supportLabel}
                      avatarUrl={isSelfMessage ? visitorAvatarUrl : supportAvatarUrl}
                      message={message}
                      self={isSelfMessage}
                      showAvatar={!isSelfMessage}
                      showSenderName={false}
                      timestamp={format(new Date(message.created_at), "MM-dd HH:mm")}
                    />
                  );
                })}
                <div ref={bottomAnchorRef} className="h-px w-full" />
              </div>

            )}
          </div>

          <div className="shrink-0 border-t border-slate-100 bg-white p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:p-4">
            {session ? (
              <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
                <span className="inline-flex shrink-0 items-center text-xs font-medium text-slate-400">
                  <SmilePlus className="mr-1 h-4 w-4" />
                  {t.emojiLabel}
                </span>
                {quickEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xl transition hover:bg-slate-100"
                    disabled={sendMessageMutation.isPending}
                    onClick={() => sendMessageMutation.mutate({ kind: "emoji", emoji })}
                    type="button"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
              <input
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                onChange={(event) => handlePickImage(event.target.files?.[0])}
                ref={fileInputRef}
                type="file"
              />

              {pendingImage ? (
                <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start gap-3">
                    <img alt={t.selectedImage} className="h-16 w-16 rounded-2xl object-cover" src={pendingImage.previewUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">{t.selectedImage}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{pendingImage.file.name}</p>
                    </div>
                    <button className="text-slate-400 transition hover:text-slate-600" onClick={clearPendingImage} type="button">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : null}

              <textarea
                className="min-h-[56px] max-h-[24dvh] w-full resize-none bg-transparent text-sm outline-none placeholder:text-slate-400 sm:min-h-[96px] lg:min-h-[120px]"

                disabled={!session || sendMessageMutation.isPending}
                placeholder={session ? t.composerPlaceholder : t.composerLockedPlaceholder}
                value={composer}
                onChange={(event) => setComposer(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    if ((!composer.trim() && !pendingImage) || !session) return;
                    sendMessageMutation.mutate({ kind: "text" });
                  }
                }}
              />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <button className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-100" disabled={!session || sendMessageMutation.isPending} onClick={triggerImagePicker} type="button">
                    <ImagePlus className="mr-1 h-4 w-4" />
                    {t.chooseImage}
                  </button>
                  <span>{t.composerHint}</span>
                </div>
                <Button className="w-full sm:w-auto" disabled={!session || (!canSendText && !canSendImage) || sendMessageMutation.isPending} onClick={() => sendMessageMutation.mutate({ kind: "text" })}>
                  {sendMessageMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SendHorizonal className="mr-2 h-4 w-4" />}
                  {t.sendMessage}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
