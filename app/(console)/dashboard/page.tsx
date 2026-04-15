"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Clock3, MessageSquareText, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatDuration } from "@/lib/utils";
import type { DashboardStats } from "@/types";

const statItems = [
  {
    key: "conversations_today",
    title: "今日会话数",
    icon: MessageSquareText,
  },
  {
    key: "avg_response_seconds",
    title: "平均响应时间",
    icon: Clock3,
  },
  {
    key: "online_agents",
    title: "在线客服数量",
    icon: Users,
  },
] as const;

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get<DashboardStats>("/api/stats"),
  });

  const stats = data ?? {
    conversations_today: 0,
    avg_response_seconds: 0,
    online_agents: 0,
    sources: [],
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Dashboard</p>
        <h1 className="mt-2 text-3xl font-bold">数据大盘</h1>
        <p className="mt-2 text-sm text-slate-500">聚合今日会话、响应效率、来源渠道与在线客服状态。</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {statItems.map((item) => {
          const Icon = item.icon;
          const value = stats[item.key];

          return (
            <Card key={item.key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardDescription>{item.title}</CardDescription>
                  <CardTitle className="mt-3 text-3xl">
                    {item.key === "avg_response_seconds" ? formatDuration(Number(value)) : value}
                  </CardTitle>
                </div>
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <Activity className="h-4 w-4" />
                  {isLoading ? "加载中..." : "与最近 24 小时对比保持稳定"}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>渠道来源分析</CardTitle>
          <CardDescription>广告、自然流量、社媒等渠道贡献会话量。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.sources}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="source" stroke="#64748b" />
                <YAxis stroke="#64748b" allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(59,130,246,0.08)" }} />
                <Bar dataKey="count" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
