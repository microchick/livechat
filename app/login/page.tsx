"use client";

import { Loader2, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import type { LoginResponse } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const result = await api.post<LoginResponse>("/api/auth/login", { email, password });
      setSession(result.access_token, result.user);
      toast.success("登录成功，正在进入工作台");
      router.push("/inbox");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-10 text-white backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">Chat </p>
          <h1 className="mt-6 text-4xl font-bold leading-tight">聊天系统</h1>
          <p className="mt-5 max-w-xl text-base text-slate-300">
             
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              ["实时聊天", "Pusher / Soketi"],
              ["权限安全", "JWT + API Guard"],
              ["数据可视化", "Dashboard + 客户洞察"],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <Card className="border-white/80 bg-white">

         <CardHeader>
           <CardTitle className="text-2xl">客服登录</CardTitle>
        </CardHeader>

          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">邮箱</label>
                <Input placeholder="请输入客服邮箱" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">密码</label>
                <Input placeholder="请输入登录密码" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
             
              <Button className="w-full" disabled={submitting || !email.trim() || !password.trim()}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                进入工作台
              </Button>
            </form>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
