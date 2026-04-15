"use client";

import { Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const phrases = [
  {
    id: "1",
    category: "销售",
    title: "新品促销引导",
    keywords: ["新品", "优惠", "折扣"],
    content: "您好，当前新品活动正在进行中，现在下单可享专属折扣，我可以马上帮您推荐最适合的款式。",
  },
  {
    id: "2",
    category: "售后",
    title: "物流延迟安抚",
    keywords: ["物流", "延迟", "催单"],
    content: "抱歉让您久等了，我已经帮您加急跟进物流状态，稍后会第一时间同步最新进展给您。",
  },
  {
    id: "3",
    category: "销售",
    title: "价格异议处理",
    keywords: ["价格", "贵", "优惠券"],
    content: "我理解您对价格的顾虑，这边可以为您申请限时优惠或搭配套餐，整体会更划算。",
  },
];

export default function LibraryPage() {
  const [search, setSearch] = useState("");
  const [composer, setComposer] = useState("/");

  const filtered = useMemo(() => {
    return phrases.filter((item) => {
      const bucket = `${item.title} ${item.category} ${item.keywords.join(" ")} ${item.content}`.toLowerCase();
      return bucket.includes(search.toLowerCase());
    });
  }, [search]);

  const slashSuggestions = useMemo(() => {
    if (!composer.startsWith("/")) return [];
    const keyword = composer.replace("/", "").trim().toLowerCase();
    return phrases.filter((item) => item.title.toLowerCase().includes(keyword) || item.keywords.some((k) => k.includes(keyword)));
  }, [composer]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Library</p>
        <h1 className="mt-2 text-3xl font-bold">话术库</h1>
        <p className="mt-2 text-sm text-slate-500">支持关键词检索、分类展示与 `/` 快捷触发。</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>关键词搜索</CardTitle>
            <CardDescription>按销售、售后分类快速查找常用话术。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-11" placeholder="搜索标题、关键词或内容" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <div className="grid gap-4">
              {filtered.map((item) => (
                <div key={item.id} className="rounded-3xl border border-slate-100 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold">{item.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">{item.content}</p>
                    </div>
                    <Badge variant={item.category === "销售" ? "info" : "warning"}>{item.category}</Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.keywords.map((keyword) => (
                      <Badge key={keyword}>{keyword}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Slash 快捷插入</CardTitle>
            <CardDescription>在聊天输入框中输入 `/` 即可调出推荐话术。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              className="min-h-[180px] w-full rounded-3xl border border-slate-200 p-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              value={composer}
              onChange={(event) => setComposer(event.target.value)}
            />
            <div className="space-y-3 rounded-3xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Sparkles className="h-4 w-4 text-blue-600" />
                推荐话术
              </div>
              {slashSuggestions.map((item) => (
                <button
                  key={item.id}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
                  onClick={() => setComposer(item.content)}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <Badge>{item.category}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{item.content}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
