"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircleMore, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { WidgetSettings } from "@/types";

const defaultBrandName = "Support assistant";
const defaultWelcomeMessage = "Hello! Thank you for reaching out to us. How can I assist you today?";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(true);
  const [brandName, setBrandName] = useState(defaultBrandName);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState(defaultWelcomeMessage);

  const settingsQuery = useQuery({
    queryKey: ["widget-settings"],
    queryFn: () => api.get<WidgetSettings>("/api/widget-settings"),
  });

  useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }

    setEnabled(settingsQuery.data.enabled);
    setBrandName(settingsQuery.data.brand_name || defaultBrandName);
    setAvatarUrl(settingsQuery.data.avatar_url || "");
    setWelcomeMessage(settingsQuery.data.welcome_message || defaultWelcomeMessage);
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.post<WidgetSettings>("/api/widget-settings", {
        enabled,
        brand_name: brandName.trim(),
        avatar_url: avatarUrl.trim(),
        welcome_message: welcomeMessage.trim(),
      }),
    onSuccess: (next) => {
      queryClient.setQueryData(["widget-settings"], next);
      queryClient.setQueryData(["public-widget-settings"], next);
      toast.success("挂件品牌与欢迎语已保存");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "保存失败");
    },
  });

  const isSaving = saveMutation.isPending;
  const previewBrandName = brandName.trim() || defaultBrandName;
  const previewWelcomeMessage = welcomeMessage.trim() || defaultWelcomeMessage;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Settings</p>
        <h1 className="mt-2 text-3xl font-bold">网站聊天挂件设置</h1>
        <p className="mt-2 text-sm text-slate-500">管理官网右下角聊天挂件的启用状态、品牌形象，以及访客进入后自动发送的欢迎语。</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <Card>
          <CardHeader>
            <CardTitle>品牌与欢迎语配置</CardTitle>
            <CardDescription>这里的配置会同步给官网挂件、外部嵌入挂件，以及公开聊天入口。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {settingsQuery.isLoading ? (
              <div className="flex h-40 items-center justify-center rounded-3xl border border-dashed border-slate-200 text-sm text-slate-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 正在加载当前配置...
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">挂件开关</p>
                    <p className="mt-1 text-sm text-slate-500">关闭后，公共页面与外部嵌入页面都不会再显示右下角聊天挂件。</p>
                  </div>
                  <button
                    aria-pressed={enabled}
                    className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-medium transition ${enabled ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"}`}
                    onClick={() => setEnabled((current) => !current)}
                    type="button"
                  >
                    {enabled ? "已启用" : "已关闭"}
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">品牌名称</label>
                    <Input value={brandName} onChange={(event) => setBrandName(event.target.value)} placeholder={defaultBrandName} />
                    <p className="text-xs text-slate-400">显示在挂件头部、欢迎气泡和机器人消息名称里。</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">客服头像地址</label>
                    <Input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://example.com/support-agent.png" />
                    <p className="text-xs text-slate-400">支持公开可访问的图片链接；会同步到网站挂件、外部嵌入挂件和 `/chat` 用户端，留空则回退到默认图标。</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">自动欢迎语</label>
                  <textarea
                    className="min-h-[220px] w-full rounded-3xl border border-slate-200 px-4 py-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    value={welcomeMessage}
                    onChange={(event) => setWelcomeMessage(event.target.value)}
                  />
                  <p className="text-xs text-slate-400">建议保持简短清晰，这条内容会作为挂件关闭态提示气泡和首条 bot 欢迎语的核心文案。</p>
                </div>

                <div className="flex justify-end">
                  <Button disabled={isSaving || !welcomeMessage.trim()} onClick={() => saveMutation.mutate()} type="button">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    保存设置
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>挂件预览</CardTitle>
            <CardDescription>这里模拟访客在官网右下角看到的关闭态欢迎气泡和展开后的聊天窗口。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-soft">
              <div className="flex justify-end">
                <div className="max-w-[18rem] rounded-[1.4rem] border border-slate-200 bg-white px-4 py-3 text-left text-slate-900 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
                  <div className="flex items-start gap-3">
                    {avatarUrl.trim() ? (
                      <img alt={previewBrandName} className="mt-0.5 h-9 w-9 rounded-2xl object-cover" src={avatarUrl.trim()} />
                    ) : (
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                        <MessageCircleMore className="h-4.5 w-4.5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{previewBrandName}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{previewWelcomeMessage}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="rounded-[1.5rem] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#38bdf8_100%)] p-4">
                  <div className="flex items-start gap-3">
                    {avatarUrl.trim() ? (
                      <img alt={previewBrandName} className="h-11 w-11 rounded-2xl object-cover" src={avatarUrl.trim()} />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                        <MessageCircleMore className="h-5 w-5" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100/90">Live support</p>
                      <p className="mt-1 text-lg font-semibold text-white">{previewBrandName}</p>
                      <p className="mt-1 text-sm text-blue-50/85">Send a message to start the conversation.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-[1.5rem] bg-white/95 p-4 text-slate-900">
                  <div className="flex items-end gap-3">
                    {avatarUrl.trim() ? (
                      <img alt={previewBrandName} className="h-9 w-9 shrink-0 rounded-full border border-slate-200/80 object-cover shadow-sm" src={avatarUrl.trim()} />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm">
                        {previewBrandName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="max-w-[85%] rounded-3xl bg-slate-100 px-4 py-3 text-sm shadow-sm">
                      <p className="leading-6">{previewWelcomeMessage}</p>
                      <p className="mt-2 text-xs text-slate-400">now</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-400">Visitor sends the first message here...</div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                当前状态：<span className="font-medium text-white">{enabled ? "挂件已启用" : "挂件已关闭"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
