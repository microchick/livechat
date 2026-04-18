"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, ImagePlus, Loader2, SendHorizonal, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { MessageBubble } from "@/components/chat/message-bubble";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStickyChatScroll } from "@/hooks/use-sticky-chat-scroll";
import { api } from "@/lib/api";
import { getPusherClient } from "@/lib/pusher";
import { cn } from "@/lib/utils";
import { useInboxStore } from "@/store/inbox-store";
import type { Conversation, ConversationPage, ImageUploadPrepareResponse, Message, MessagePage, UploadImageResponse } from "@/types";

type MobilePanel = "list" | "chat" | "notes";

type PendingImage = {
  file: File;
  previewUrl: string;
};

type CustomerNoteRecord = {
  content: string;
  updatedAt: string;
};

const customerNotesStorageKey = "inbox_customer_notes";
let inboxAudioContext: AudioContext | null = null;

function playInboxNotificationTone() {
  if (typeof window === "undefined" || typeof window.AudioContext === "undefined") {
    return;
  }

  if (!inboxAudioContext) {
    inboxAudioContext = new window.AudioContext();
  }

  const context = inboxAudioContext;
  const playTone = () => {
    const startedAt = context.currentTime + 0.01;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, startedAt);
    oscillator.frequency.exponentialRampToValueAtTime(660, startedAt + 0.22);

    gain.gain.setValueAtTime(0.0001, startedAt);
    gain.gain.exponentialRampToValueAtTime(0.12, startedAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startedAt + 0.24);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startedAt);
    oscillator.stop(startedAt + 0.26);
  };

  if (context.state === "suspended") {
    void context.resume().then(playTone).catch(() => undefined);
    return;
  }

  playTone();
}

function readCustomerNotes(): Record<string, CustomerNoteRecord> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = localStorage.getItem(customerNotesStorageKey);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, CustomerNoteRecord>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persistCustomerNotes(notes: Record<string, CustomerNoteRecord>) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(customerNotesStorageKey, JSON.stringify(notes));
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

export default function InboxPage() {
  const queryClient = useQueryClient();
  const [composer, setComposer] = useState("");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("list");
  const [customerNotes, setCustomerNotes] = useState<Record<string, CustomerNoteRecord>>({});
  const [noteDraft, setNoteDraft] = useState("");
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previousUnreadMapRef = useRef<Record<string, number> | null>(null);
  const latestMessageKeyRef = useRef("");
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);

  const {

    selectedConversationId,
    setSelectedConversationId,
    liveMessages,
    appendMessage,
    typingConversationIds,
    setTyping,
  } = useInboxStore();
  const pusherClient = useMemo(() => getPusherClient(), []);

  const conversationQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.get<ConversationPage>("/api/conversations?limit=20"),
    refetchInterval: 5000,
  });

  const conversations = useMemo(() => conversationQuery.data?.items ?? [], [conversationQuery.data]);
  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId),
    [conversations, selectedConversationId],
  );
  const activeConversationId = selectedConversation?.id;
  const selectedCustomer = selectedConversation?.customer;
  const savedNote = selectedCustomer ? customerNotes[selectedCustomer.id] : undefined;

  useEffect(() => {
    setCustomerNotes(readCustomerNotes());
  }, []);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    const exists = conversations.some((item) => item.id === selectedConversationId);
    if (!exists) {
      setSelectedConversationId(undefined);
      setMobilePanel("list");
    }
  }, [conversations, selectedConversationId, setSelectedConversationId]);

  useEffect(() => {
    if (!selectedCustomer) {
      setNoteDraft("");
      return;
    }

    setNoteDraft(customerNotes[selectedCustomer.id]?.content ?? "");
  }, [customerNotes, selectedCustomer]);

  useEffect(() => {
    return () => {
      if (pendingImage) {
        URL.revokeObjectURL(pendingImage.previewUrl);
      }
    };
  }, [pendingImage]);

  const messagesQuery = useQuery({
    enabled: Boolean(activeConversationId),
    queryKey: ["messages", activeConversationId],
    queryFn: () => api.get<MessagePage>(`/api/messages?conversation_id=${activeConversationId}&limit=30`),
    refetchInterval: pusherClient ? false : 3000,
  });

  useEffect(() => {
    if (!pusherClient || conversations.length === 0) {
      return;
    }

    const client = pusherClient;
    const cleanupCallbacks: Array<() => void> = [];

    conversations.forEach((conversation) => {
      const conversationId = conversation.id;
      const channel = client.subscribe(`conversation_${conversationId}`);

      const handleMessage = (payload: Message) => {
        if (conversationId === activeConversationId) {
          appendMessage(conversationId, payload);
        }
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      };

      const handleTyping = (payload: { is_typing: boolean }) => {
        if (conversationId !== activeConversationId) {
          return;
        }
        setTyping(conversationId, payload.is_typing);
        window.setTimeout(() => setTyping(conversationId, false), 1800);
      };

      channel.bind("new_message", handleMessage);
      channel.bind("typing", handleTyping);

      cleanupCallbacks.push(() => {
        channel.unbind("new_message", handleMessage);
        channel.unbind("typing", handleTyping);
        client.unsubscribe(`conversation_${conversationId}`);
      });
    });

    return () => {
      cleanupCallbacks.forEach((cleanup) => cleanup());
    };
  }, [activeConversationId, appendMessage, conversations, pusherClient, queryClient, setTyping]);

  const mergedMessages = useMemo(() => {
    const currentMessages = messagesQuery.data?.items ?? [];
    const realtimeMessages = activeConversationId ? liveMessages[activeConversationId] || [] : [];

    const deduped = new Map<string, Message>();
    [...currentMessages, ...realtimeMessages]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .forEach((message) => {
        deduped.set(message.id, message);
      });

    return Array.from(deduped.values());
  }, [messagesQuery.data?.items, liveMessages, activeConversationId]);

  const { containerRef, handleScroll, scrollToBottom } = useStickyChatScroll({
    enabled: Boolean(activeConversationId),
    itemCount: mergedMessages.length,
    resetKey: activeConversationId ?? null,
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

  useEffect(() => {
    const currentUnreadMap = Object.fromEntries(conversations.map((conversation) => [conversation.id, conversation.unread_count]));

    const previousUnreadMap = previousUnreadMapRef.current;

    if (previousUnreadMap) {
      const hasNewUnread = conversations.some((conversation) => conversation.unread_count > (previousUnreadMap[conversation.id] ?? 0));
      if (hasNewUnread) {
        playInboxNotificationTone();
      }
    }

    previousUnreadMapRef.current = currentUnreadMap;
  }, [conversations]);

  useEffect(() => {
    if (!activeConversationId || mergedMessages.length === 0) {
      latestMessageKeyRef.current = "";
      return;
    }

    const latestMessageId = mergedMessages[mergedMessages.length - 1]?.id;
    if (!latestMessageId) {
      return;
    }

    const nextMessageKey = `${activeConversationId}:${latestMessageId}`;
    const isNewTailMessage = latestMessageKeyRef.current !== "" && latestMessageKeyRef.current !== nextMessageKey;
    latestMessageKeyRef.current = nextMessageKey;
    scrollChatToBottom(isNewTailMessage ? "smooth" : "auto");
  }, [activeConversationId, mergedMessages]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!activeConversationId) {
        throw new Error("请先选择会话");
      }

      if (pendingImage) {
        const upload = await uploadPendingImageFile(pendingImage.file);
        return api.post<Message>("/api/messages", {
          conversation_id: activeConversationId,
          content: composer.trim(),
          message_type: "image",
          media_url: upload.url,
          media_key: upload.key,
        });
      }

      return api.post<Message>("/api/messages", {
        conversation_id: activeConversationId,
        content: composer.trim(),
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
      queryClient.setQueryData<MessagePage>(["messages", activeConversationId], (previous: MessagePage | undefined) => appendMessagePage(previous, message));
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      scrollChatToBottom("auto");
    },

    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "消息发送失败");
    },
  });

  async function emitTyping() {
    if (!activeConversationId) return;

    try {
      await api.post("/api/conversations/typing", {
        conversation_id: activeConversationId,
        is_typing: true,
      });
    } catch {
      // ignore typing errors
    }
  }

  async function uploadPendingImageFile(file: File): Promise<UploadImageResponse> {
    const prepare = await api.post<ImageUploadPrepareResponse>("/api/upload/image/prepare", {
      filename: file.name,
      mime_type: file.type,
      size: file.size,
    });

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
    return api.postForm<UploadImageResponse>("/api/upload/image", formData);
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
      toast.error("请选择 10 MB 以内的图片");
      return;
    }

    if (pendingImage) {
      URL.revokeObjectURL(pendingImage.previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingImage({ file, previewUrl });
    toast.success("图片已选择，点击发送即可上传并发出");
  }

  function handleSelectConversation(conversationId: string) {
    if (selectedConversationId !== conversationId) {
      setComposer("");
      clearPendingImage();
    }
    setSelectedConversationId(conversationId);
    setMobilePanel("chat");
  }

  function handleBackToList() {
    setMobilePanel("list");
  }

  function saveCustomerNote() {
    if (!selectedCustomer) {
      return;
    }

    const content = noteDraft.trim();
    const nextNotes = { ...customerNotes };

    if (!content) {
      delete nextNotes[selectedCustomer.id];
      setCustomerNotes(nextNotes);
      persistCustomerNotes(nextNotes);
      toast.success("客户备注已清空");
      return;
    }

    nextNotes[selectedCustomer.id] = {
      content,
      updatedAt: new Date().toISOString(),
    };

    setCustomerNotes(nextNotes);
    persistCustomerNotes(nextNotes);
    toast.success("客户备注已保存");
  }

  const canSendMessage = composer.trim().length > 0 || Boolean(pendingImage);

  function renderConversationList() {
    return (
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CardHeader className="shrink-0 border-b border-slate-100 pb-4">
          <CardTitle>会话列表</CardTitle>
          <CardDescription>这里只保留会话入口，点击某个客户后再展开聊天内容和客户备注。</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-4">
          {conversationQuery.isLoading ? (
            <div className="flex h-48 items-center justify-center text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 正在拉取会话...
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm text-slate-500">
              <p className="font-medium text-slate-700">当前还没有会话</p>
              <p className="mt-2">新会话进来后会显示在这里。</p>
            </div>
          ) : (
            conversations.map((conversation: Conversation) => {
              const active = conversation.id === activeConversationId;
              const note = customerNotes[conversation.customer.id]?.content;

              return (
                <button
                  key={conversation.id}
                  className={cn(
                    "w-full rounded-3xl border p-4 text-left transition",
                    active ? "border-blue-200 bg-blue-50/80 shadow-sm" : "border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white",
                  )}
                  onClick={() => handleSelectConversation(conversation.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-slate-900">{conversation.customer.name}</p>
                        {note ? <Badge variant="warning">有备注</Badge> : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{conversation.last_message || "暂无最新消息"}</p>
                    </div>
                    {conversation.unread_count > 0 ? <Badge variant="info">{conversation.unread_count}</Badge> : null}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-400">
                    <span className="truncate">{conversation.customer.source}</span>
                    <span>{format(new Date(conversation.updated_at), "MM-dd HH:mm")}</span>
                  </div>
                </button>
              );
            })
          )}
        </CardContent>
      </Card>
    );
  }

  function renderChatPanel() {
    return (
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CardHeader className="shrink-0 border-b border-slate-100 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="truncate">{selectedCustomer?.name}</CardTitle>
              <CardDescription className="mt-1 truncate">
                {[selectedCustomer?.source, selectedCustomer?.email].filter(Boolean).join(" · ") || "当前客户暂无更多基础信息"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 xl:hidden">
              <Button onClick={handleBackToList} size="sm" type="button" variant="ghost">
                <ArrowLeft className="mr-1 h-4 w-4" />
                返回
              </Button>
              <Button onClick={() => setMobilePanel("notes")} size="sm" type="button" variant="ghost">
                客户备注
              </Button>
            </div>
          </div>
        </CardHeader>

        <div ref={containerRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/80 px-4 py-4 sm:px-6" onScroll={handleScroll}>
          {messagesQuery.isLoading ? (
            <div className="flex h-full items-center justify-center text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 正在拉取消息...
            </div>
          ) : mergedMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-slate-400">当前会话还没有消息</div>
          ) : (
            <div className="space-y-4 pb-2">
              {mergedMessages.map((message) => (
                <MessageBubble key={message.id} message={message} self={message.sender_type !== "user"} timestamp={format(new Date(message.created_at), "HH:mm")} />
              ))}
              {activeConversationId && typingConversationIds[activeConversationId] ? <div className="text-sm text-slate-400">对方正在输入...</div> : null}
              <div ref={bottomAnchorRef} className="h-px w-full" />
            </div>

          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:p-4">
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
                  <img alt="已选图片" className="h-16 w-16 rounded-2xl object-cover" src={pendingImage.previewUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">已选图片</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{pendingImage.file.name}</p>
                  </div>
                  <button className="text-slate-400 transition hover:text-slate-600" onClick={clearPendingImage} type="button">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}

            <textarea
              className="min-h-[72px] w-full resize-none bg-transparent text-sm outline-none placeholder:text-slate-400 sm:min-h-[96px] lg:min-h-[120px]"
              placeholder="输入消息，回车发送，Shift + Enter 换行"
              value={composer}
              onChange={(event) => {
                setComposer(event.target.value);
                if (typingTimer.current) clearTimeout(typingTimer.current);
                void emitTyping();
                typingTimer.current = setTimeout(() => {
                  if (!activeConversationId) return;
                  void api.post("/api/conversations/typing", {
                    conversation_id: activeConversationId,
                    is_typing: false,
                  });
                }, 1200);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if ((!composer.trim() && !pendingImage) || !activeConversationId) return;
                  sendMutation.mutate();
                }
              }}
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <button
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-100"
                  disabled={sendMutation.isPending || !activeConversationId}
                  onClick={triggerImagePicker}
                  type="button"
                >
                  <ImagePlus className="mr-1 h-4 w-4" />
                  上传图片
                </button>
                <span>备注独立保存，不会作为聊天消息发送</span>
              </div>
              <Button className="w-full sm:w-auto" disabled={!canSendMessage || sendMutation.isPending || !activeConversationId} onClick={() => sendMutation.mutate()}>
                {sendMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SendHorizonal className="mr-2 h-4 w-4" />}
                发送消息
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  function renderNotesPanel() {
    return (
      <Card className="flex min-h-0 flex-col overflow-hidden">
        <CardHeader className="shrink-0 border-b border-slate-100 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>客户备注</CardTitle> 
            </div>
            <div className="flex items-center gap-2 xl:hidden">
              <Button onClick={handleBackToList} size="sm" type="button" variant="ghost">
                会话列表
              </Button>
              <Button onClick={() => setMobilePanel("chat")} size="sm" type="button" variant="ghost">
                聊天内容
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4">
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">客户资料</p>
            <div className="mt-4 space-y-4 text-sm text-slate-600">
              <div>
                <p className="text-xs text-slate-400">客户名称</p>
                <p className="mt-1 font-medium text-slate-900">{selectedCustomer?.name || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">邮箱</p>
                <p className="mt-1 break-all text-slate-700">{selectedCustomer?.email || "未填写"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">来源渠道</p>
                <div className="mt-2">
                  <Badge variant="warning">{selectedCustomer?.source || "未知来源"}</Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400">客户标签</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedCustomer?.tags?.length ? selectedCustomer.tags.map((tag) => <Badge key={tag}>{tag}</Badge>) : <span>暂无标签</span>}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400">最近行为</p>
                <p className="mt-1 rounded-2xl bg-white p-3 text-slate-700">{selectedCustomer?.recent_behavior || "暂无行为记录"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">最近会话时间</p>
                <p className="mt-1 text-slate-700">{selectedConversation ? format(new Date(selectedConversation.updated_at), "yyyy-MM-dd HH:mm") : "-"}</p>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-100 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">独立备注记录</p>
                <p className="mt-1 text-xs text-slate-500">按客户单独保存，仅供客服内部查看。</p>
              </div>
              <span className="text-xs text-slate-400">{savedNote?.updatedAt ? `上次保存：${format(new Date(savedNote.updatedAt), "MM-dd HH:mm")}` : "尚未保存备注"}</span>
            </div>

            <textarea
              className="mt-4 min-h-[220px] flex-1 resize-none rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
              placeholder="记录客户偏好、禁忌词、报价敏感度、跟进计划等内部备注..."
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-400">这里的内容不会发送给客户，也不会出现在消息气泡里。</p>
              <Button className="w-full sm:w-auto" onClick={saveCustomerNote} type="button">
                保存备注
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderEmptyState() {
    return (
      <Card className="flex min-h-[68dvh] flex-1 flex-col items-center justify-center border-dashed border-slate-200 bg-slate-50/60 text-center">
        <CardContent className="max-w-lg space-y-3 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-600">Conversation Detail</p>
          <h2 className="text-2xl font-bold text-slate-900">先从左侧选择一个客户</h2>
          <p className="text-sm text-slate-500">选中会话后，这里才会展示聊天内容和客户备注区，页面不会默认占满多余区域。</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-8.5rem)] flex-col gap-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] lg:pb-6 xl:min-h-0 xl:flex-1 xl:overflow-hidden xl:gap-6 xl:pb-0">
 

      <div className="hidden min-h-0 flex-1 xl:grid xl:grid-cols-[320px_minmax(0,1fr)] xl:gap-6">
        {renderConversationList()}
        {activeConversationId ? (
          <div className="grid min-h-0 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            {renderChatPanel()}
            {renderNotesPanel()}
          </div>
        ) : (
          renderEmptyState()
        )}
      </div>

      <div className="flex min-h-[68dvh] flex-1 xl:hidden">
        {!activeConversationId || mobilePanel === "list" ? (
          renderConversationList()
        ) : (
          <div className="flex min-h-0 w-full flex-col gap-4">
            <div className="grid shrink-0 grid-cols-2 gap-2 rounded-3xl border border-slate-200 bg-white p-1 shadow-soft">
              <button
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm font-medium transition",
                  mobilePanel === "chat" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100",
                )}
                onClick={() => setMobilePanel("chat")}
                type="button"
              >
                聊天内容
              </button>
              <button
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm font-medium transition",
                  mobilePanel === "notes" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100",
                )}
                onClick={() => setMobilePanel("notes")}
                type="button"
              >
                客户备注
              </button>
            </div>

            <div className="min-h-0 flex-1">{mobilePanel === "chat" ? renderChatPanel() : renderNotesPanel()}</div>
          </div>
        )}
      </div>
    </div>
  );
}
