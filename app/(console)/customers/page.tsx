"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import type { CustomerPage } from "@/types";

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("VIP");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (source !== "all") params.set("source", source);
    return params.toString();
  }, [search, source]);

  const { data } = useQuery({
    queryKey: ["customers", queryString],
    queryFn: () => api.get<CustomerPage>(`/api/customers${queryString ? `?${queryString}` : ""}`),
  });

  const tagMutation = useMutation({
    mutationFn: () =>
      api.post("/api/customers/tag", {
        customer_ids: selected,
        tags: tagInput
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      toast.success("客户标签已更新");
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "标签更新失败");
    },
  });

  const customers = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Customers</p>
        <h1 className="mt-2 text-3xl font-bold">客户管理</h1>
        <p className="mt-2 text-sm text-slate-500">支持筛选、搜索与批量打标签，帮助客服快速运营客户池。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>客户列表</CardTitle>
          <CardDescription>按来源与标签筛选客户，支持批量运营。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr_1fr_auto]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-11" placeholder="搜索客户姓名、邮箱" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <select
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-400"
              value={source}
              onChange={(event) => setSource(event.target.value)}
            >
              <option value="all">全部来源</option>
              <option value="广告">广告</option>
              <option value="自然流量">自然流量</option>
              <option value="社媒">社媒</option>
            </select>
            <Input placeholder="输入标签，逗号分隔" value={tagInput} onChange={(event) => setTagInput(event.target.value)} />
            <Button disabled={!selected.length || tagMutation.isPending} onClick={() => tagMutation.mutate()}>
              批量打标签
            </Button>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>客户</TableHead>
                  <TableHead>来源</TableHead>
                  <TableHead>标签</TableHead>
                  <TableHead>最近行为</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => {
                  const checked = selected.includes(customer.id);
                  return (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <input
                          checked={checked}
                          type="checkbox"
                          onChange={() =>
                            setSelected((current) =>
                              checked ? current.filter((id) => id !== customer.id) : [...current, customer.id],
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{customer.name}</p>
                          <p className="text-sm text-slate-500">{customer.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{customer.source}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {customer.tags.map((tag) => (
                            <Badge key={tag}>{tag}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500">{customer.recent_behavior || "暂无行为"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
