import Link from "next/link";
import { ArrowRight, MessageSquareText, ShieldCheck, Sparkles, Workflow } from "lucide-react";

const featureCards = [
  {
    title: "网站右下角挂件",
    description: "访客无需跳转页面，直接从官网右下角发起咨询，客服在后台收件箱实时接待。",
    icon: MessageSquareText,
  },
  {
    title: "自动欢迎语",
    description: "会话创建后立即自动回复欢迎消息，减少首响等待，并支持后台自由修改。",
    icon: Sparkles,
  },
  {
    title: "统一会话流转",
    description: "官网挂件、公开聊天页和客服后台共用一套会话数据与消息链路。",
    icon: Workflow,
  },
  {
    title: "安全上传链路",
    description: "图片支持按存储驱动自动切换，本地模式走原接口，七牛模式浏览器直传。",
    icon: ShieldCheck,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-[100dvh] bg-slate-950 text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.22),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.22),transparent_28%)]" />
        <div className="relative mx-auto flex min-h-[100dvh] max-w-7xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">Customer Support Cloud</p>
              <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                让网站访客直接从
                <span className="text-cyan-300"> 右下角聊天挂件 </span>
                发起咨询。
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                这套客服系统已经支持官网挂件、公开聊天页与客服工作台统一联动。访客发送第一条消息后，会立即收到自动欢迎语，客服侧则在后台收件箱持续跟进。
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-cyan-400 px-6 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  href="/login"
                >
                  进入客服后台
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
                  href="/chat"
                >
                  打开完整聊天页
                </Link>
              </div>

              <div className="mt-8 rounded-[1.75rem] border border-white/10 bg-white/5 p-5 text-sm text-slate-300 backdrop-blur">
                <p className="font-medium text-white">现在就试试：</p>
                <p className="mt-2 leading-7">打开页面右下角的聊天挂件，发送第一条消息后，系统会自动回一条欢迎语，后台客服可在设置页自定义这条内容。</p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur xl:p-8">
              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">Website widget flow</p>
                    <p className="mt-1 text-sm text-slate-400">From visitor entry to agent follow-up</p>
                  </div>
                  <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300">Live</div>
                </div>

                <div className="mt-5 space-y-3 text-sm">
                  {[
                    "访客打开右下角挂件并输入第一条消息",
                    "系统自动创建会话并写入欢迎语消息",
                    "客服后台收件箱接收会话并继续处理",
                    "欢迎语可在后台设置页随时更新",
                  ].map((item, index) => (
                    <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-200">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-xs font-semibold text-cyan-300">{index + 1}</div>
                      <p className="leading-6">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-white/5">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Features</p>
            <h2 className="text-3xl font-bold text-white">围绕官网咨询场景做的完整客服链路</h2>
            <p className="max-w-3xl text-sm leading-7 text-slate-300">既保证访客端足够轻量，也兼顾客服工作台的可操作性，包括图片上传、欢迎语管理和多端消息同步。</p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {featureCards.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
