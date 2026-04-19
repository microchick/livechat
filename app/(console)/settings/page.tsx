"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircleMore, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { Category, CategoryPage, WidgetSettings } from "@/types";

const defaultBrandName = "Support assistant";
const defaultWelcomeMessage = "Hello! Thank you for reaching out to us. How can I assist you today?";

type CategoryDraft = {
  id: string;
  name: string;
  color: string;
  sort: number;
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(true);
  const [brandName, setBrandName] = useState(defaultBrandName);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState(defaultWelcomeMessage);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#2563EB");
  const [newCategorySort, setNewCategorySort] = useState("0");
  const [categoryDrafts, setCategoryDrafts] = useState<CategoryDraft[]>([]);

  const settingsQuery = useQuery({
    queryKey: ["widget-settings"],
    queryFn: () => api.get<WidgetSettings>("/api/widget-settings"),
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<CategoryPage>("/api/categories"),
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

  useEffect(() => {
    if (!categoriesQuery.data) {
      return;
    }

    setCategoryDrafts(
      categoriesQuery.data.items.map((category) => ({
        id: category.id,
        name: category.name,
        color: category.color,
        sort: category.sort,
      })),
    );
  }, [categoriesQuery.data]);

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
  const createCategoryMutation = useMutation({
    mutationFn: () =>
      api.post<Category>("/api/categories", {
        name: newCategoryName.trim(),
        color: newCategoryColor.trim(),
        sort: Number(newCategorySort) || 0,
      }),
    onSuccess: () => {
      setNewCategoryName("");
      setNewCategoryColor("#2563EB");
      setNewCategorySort("0");
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("分类已创建");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "创建分类失败");
    },
  });
  const updateCategoryMutation = useMutation({
    mutationFn: (draft: CategoryDraft) =>
      api.patch<Category>(`/api/categories/${draft.id}`, {
        name: draft.name.trim(),
        color: draft.color.trim(),
        sort: Number(draft.sort) || 0,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("分类已更新");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "更新分类失败");
    },
  });
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/api/categories/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("分类已删除");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "删除分类失败");
    },
  });

  const isSaving = saveMutation.isPending;
  const previewBrandName = brandName.trim() || defaultBrandName;
  const previewWelcomeMessage = welcomeMessage.trim() || defaultWelcomeMessage;

  function updateCategoryDraft(id: string, field: keyof Omit<CategoryDraft, "id">, value: string) {
    setCategoryDrafts((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: field === "sort" ? Number(value) || 0 : value,
            }
          : item,
      ),
    );
  }

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

      <Card>
        <CardHeader>
          <CardTitle>会话分类管理</CardTitle>
          <CardDescription>在这里维护客服工作台可用的会话分类，新增后可直接在 Inbox 中筛选和分配。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1.2fr)_180px_120px_auto]">
            <Input placeholder="分类名称" value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} />
            <Input placeholder="#2563EB" value={newCategoryColor} onChange={(event) => setNewCategoryColor(event.target.value)} />
            <Input placeholder="排序" value={newCategorySort} onChange={(event) => setNewCategorySort(event.target.value)} />
            <Button
              disabled={!newCategoryName.trim() || !newCategoryColor.trim() || createCategoryMutation.isPending}
              onClick={() => createCategoryMutation.mutate()}
              type="button"
            >
              {createCategoryMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              新增分类
            </Button>
          </div>

          {categoriesQuery.isLoading ? (
            <div className="flex h-28 items-center justify-center rounded-3xl border border-dashed border-slate-200 text-sm text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 正在加载分类...
            </div>
          ) : categoryDrafts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              暂无会话分类，先创建一个吧。
            </div>
          ) : (
            <div className="space-y-3">
              {categoryDrafts.map((category) => (
                <div key={category.id} className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(0,1.2fr)_180px_120px_auto_auto]">
                  <Input value={category.name} onChange={(event) => updateCategoryDraft(category.id, "name", event.target.value)} />
                  <Input value={category.color} onChange={(event) => updateCategoryDraft(category.id, "color", event.target.value)} />
                  <Input value={String(category.sort)} onChange={(event) => updateCategoryDraft(category.id, "sort", event.target.value)} />
                  <Button disabled={updateCategoryMutation.isPending} onClick={() => updateCategoryMutation.mutate(category)} type="button" variant="secondary">
                    {updateCategoryMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    保存
                  </Button>
                  <Button
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    disabled={deleteCategoryMutation.isPending}
                    onClick={() => deleteCategoryMutation.mutate(category.id)}
                    type="button"
                    variant="outline"
                  >
                    {deleteCategoryMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    删除
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
