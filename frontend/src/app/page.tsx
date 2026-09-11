"use client";

import { useMemo, useState } from "react";
import { Activity, BookOpen, CheckCircle2, ChevronRight, Clock3, Download, History, LayoutDashboard, Menu, Play, ShieldAlert, ShieldCheck, Zap } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { runAttackSimulation, runCleanSimulation } from "@/lib/api";
import { attackLabels, type AttackType, type RunRecord } from "@/lib/types";

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
const formatTime = (timestamp: string) => new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const initialChart = [{ index: 0, error: 0.006 }, { index: 1, error: 0.011 }, { index: 2, error: 0.004 }, { index: 3, error: 0.008 }, { index: 4, error: 0.002 }];

function Metric({ label, value, detail, accent = "cyan" }: { label: string; value: string; detail: string; accent?: "cyan" | "mint" | "orange" }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[#101e30] p-4">
      <div className="mono text-[10px] uppercase tracking-[.14em] text-[var(--muted)]">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${accent === "mint" ? "text-mint" : accent === "orange" ? "text-orange-300" : "text-cyan"}`}>{value}</div>
      <div className="mono mt-1 text-[10px] text-slate-500">{detail}</div>
    </div>
  );
}

export default function Dashboard() {
  const [view, setView] = useState<"command" | "history" | "docs">("command");
  const [selectedAttack, setSelectedAttack] = useState<AttackType>("forgery");
  const [history, setHistory] = useState<RunRecord[]>([]);
  const [result, setResult] = useState<RunRecord | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [apiOnline, setApiOnline] = useState(true);
  const [chart, setChart] = useState(initialChart);
  const [runSeq, setRunSeq] = useState(0);

  const latest = result ?? history[0];
  const nominal = latest?.status !== "attack_detected";
  const chartData = useMemo(() => chart.slice(-12), [chart]);

  async function execute(type: AttackType | "clean") {
    // Automatically scroll to the top to see the transmission animation
    window.scrollTo({ top: 0, behavior: "smooth" });

    setIsRunning(true);
    setResult(null);
    setRunSeq(s => s + 1);
    const started = Date.now();
    try {
      const response = type === "clean" ? await runCleanSimulation() : await runAttackSimulation(type);
      const wait = Math.max(0, 1500 - (Date.now() - started));
      await new Promise((resolve) => setTimeout(resolve, wait));
      const record = { ...response, id: Date.now() };
      setResult(record);
      setHistory((current) => [record, ...current]);
      setChart((current) => [...current, { index: current.length, error: response.error_rate }]);
      setApiOnline(true);
    } catch {
      setApiOnline(false);
    } finally {
      setIsRunning(false);
    }
  }

  function exportResult() {
    if (!latest) return;
    const blob = new Blob([JSON.stringify(latest, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `qbit-verdict-${latest.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#07101d]">
      <style>{`
        @keyframes qds-dash {
          to { stroke-dashoffset: -12; }
        }
        @keyframes qds-travel {
          0% { left: 0%; opacity: 0; transform: translateY(-50%) scale(0.8); }
          15% { opacity: 1; transform: translateY(-50%) scale(1); }
          85% { opacity: 1; transform: translateY(-50%) scale(1); }
          100% { left: 100%; opacity: 0; transform: translateY(-50%) scale(0.8); }
        }
        @keyframes qds-arrive {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
      <aside className="sidebar fixed inset-y-0 left-0 z-20 w-64 border-r border-[var(--line)] bg-[#081321] p-5">
        <div className="flex items-center gap-3 border-b border-[var(--line)] pb-6">
          <div className="grid h-10 w-10 place-items-center rounded-lg border border-cyan/40 bg-cyan/10 text-xs font-bold text-cyan">QBIT</div>
          <div><div className="text-sm font-bold tracking-wide">QBIT</div><div className="mono text-[9px] tracking-[.18em] text-cyan">QUANTUM SIGNATURE LAB</div></div>
        </div>
        <div className="mono mb-3 mt-8 text-[10px] uppercase tracking-[.2em] text-slate-500">Mission subsystems</div>
        <nav className="space-y-2">
          {[
            ["command", LayoutDashboard, "Command Center"],
            ["history", History, "Simulation History"],
            ["docs", BookOpen, "Documentation"]
          ].map(([key, Icon, label]) => (
            <button key={key as string} onClick={() => setView(key as typeof view)} className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm ${view === key ? "bg-slate-700/60 text-cyan" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
              <Icon size={16} />{label as string}<ChevronRight size={14} className="ml-auto opacity-40" />
            </button>
          ))}
        </nav>
        <div className="absolute bottom-5 left-5 right-5 rounded-lg border border-[var(--line)] bg-[#0d1a2b] p-4">
          <div className="mono text-[9px] uppercase tracking-widest text-slate-500">System status</div>
          <div className="mt-2 flex items-center gap-2 text-xs"><span className={`pulse-dot h-2 w-2 rounded-full ${apiOnline ? "bg-mint" : "bg-red-400"}`} /> API {apiOnline ? "ONLINE" : "OFFLINE"}</div>
          <div className="mono mt-3 text-[9px] text-slate-500">SESSION RUNS: {history.length.toString().padStart(2, "0")}</div>
        </div>
      </aside>
      <main className="content ml-0 min-h-screen lg:ml-64">
        <header className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4 lg:px-10">
          <div><div className="mono text-[10px] uppercase tracking-[.2em] text-slate-500">QDS threat detection / {view}</div><h1 className="mt-1 text-xl font-semibold">{view === "command" ? "Command Center" : view === "history" ? "Simulation History" : "QBIT Documentation"}</h1></div>
          <div className="flex items-center gap-3"><div className={`flex items-center gap-2 rounded-full border px-3 py-2 mono text-[10px] ${nominal ? "border-mint/30 text-mint" : "border-red-400/30 text-red-300"}`}><span className={`h-2 w-2 rounded-full ${nominal ? "bg-mint" : "bg-red-400"}`} />{nominal ? "NOMINAL" : "DEFCON-1"}</div><Menu className="text-slate-500 lg:hidden" /></div>
        </header>
        {view === "docs" ? (
          <section className="mx-auto max-w-4xl p-6 lg:p-10">
            <div className="rounded-xl border border-[var(--line)] bg-[#0d1828] p-8">
              <div className="mb-5 flex items-center gap-3 text-cyan"><BookOpen /> <h2 className="text-lg font-semibold text-white">About QBIT</h2></div>
              <p className="leading-7 text-slate-400">QBIT is a live dashboard for Quantum Digital Signature threat detection. It sends clean and adversarial verification runs to the FastAPI + Qiskit backend, then visualizes the measured quantum bit error rate, forgery probability, fidelity, and verdict.</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <Metric label="Error rate" value="Decimal 0–1" detail="Displayed as a percentage" />
                <Metric label="Threshold" value="Backend field" detail="No hard-coded BB84 limit" accent="mint" />
              </div>
            </div>
          </section>
        ) : view === "history" ? (
          <section className="p-6 lg:p-10"><RunHistory history={history} /></section>
        ) : (
          <section className="grid-bg min-h-[calc(100vh-74px)] p-6 lg:p-10">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mono text-[10px] uppercase tracking-[.22em] text-cyan">Live verification console</p>
                <p className="mt-2 text-sm text-slate-400">Measure quantum channel integrity against active threats.</p>
              </div>
              <div className="mono text-[10px] text-slate-500">{latest ? `LAST RUN ${formatTime(latest.timestamp)}` : "AWAITING FIRST RUN"}</div>
            </div>
            
            <div className="mb-6">
              <QDSFlow transmitting={isRunning} result={latest} runSeq={runSeq} />
            </div>

            {isRunning && (
              <div className="mb-5 flex items-center gap-3 rounded-lg border border-cyan/30 bg-cyan/5 px-4 py-3 mono text-xs text-cyan">
                <Activity size={15} className="animate-pulse" /> ACTIVE SCAN — waiting for backend verdict and channel telemetry
              </div>
            )}
            
            {latest ? (
              <div className="mb-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                <div className={`rounded-xl border p-6 ${latest.status === "attack_detected" ? "border-red-400/40 bg-red-950/20" : "border-mint/30 bg-[#102b2b]"}`}>
                  <div className={`mono flex items-center gap-2 text-[10px] uppercase tracking-widest ${latest.status === "attack_detected" ? "text-red-300" : "text-mint"}`}>
                    {latest.status === "attack_detected" ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />} {latest.status === "attack_detected" ? "Threat detected" : "Authenticated"}
                  </div>
                  <h2 className="mt-4 text-3xl font-bold">{latest.verdict}</h2>
                  <p className="mt-2 text-sm text-slate-400">{latest.attack_type ? `${attackLabels[latest.attack_type]} simulation` : "Quantum optical channel verified intact."}</p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <span className="rounded border border-white/10 px-3 py-2 mono text-[10px] text-slate-400">SESSION HASH: {latest.session_hash ?? "NOT RETURNED"}</span>
                    <button onClick={exportResult} className="flex items-center gap-2 rounded bg-cyan px-3 py-2 text-xs font-bold text-[#06202a]"><Download size={14} /> Export JSON</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="Bell-state fidelity" value={formatPercent(1 - latest.error_rate)} detail="1 − error_rate" accent="mint" />
                  <Metric label="Quantum error / QBER" value={formatPercent(latest.error_rate)} detail={`Threshold ${formatPercent(latest.threshold)}`} />
                  <Metric label="Forgery anomaly risk" value={formatPercent(latest.forgery_probability)} detail="Backend probability" accent="orange" />
                  <Metric label="Backend computation time" value={latest.latency_ms !== undefined ? `${latest.latency_ms} ms` : "NOT RETURNED"} detail="Measured request time" />
                </div>
              </div>
            ) : <EmptyState />}
            
            <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
              <ChartCard data={chartData} threshold={latest?.threshold ?? 0.05} />
              <AttackPanel selected={selectedAttack} onSelect={setSelectedAttack} onRun={execute} isRunning={isRunning} />
            </div>
            
            <div className="mt-4"><RunHistory history={history.slice(0, 5)} /></div>
          </section>
        )}
      </main>
    </div>
  );
}

function EmptyState() { 
  return (
    <div className="mb-6 rounded-xl border border-dashed border-[var(--line)] bg-[#0b1625] p-8 text-center">
      <Zap className="mx-auto text-cyan" size={24} />
      <p className="mt-3 font-medium">No verification run yet</p>
      <p className="mt-1 text-sm text-slate-500">Choose a scenario below to query the live backend.</p>
    </div>
  ); 
}

function ChartCard({ data, threshold }: { data: { index: number; error: number }[]; threshold: number }) {
  // Dynamically change chart color if a spike exceeds the threshold
  const latestError = data[data.length - 1]?.error || 0;
  const isAttack = latestError > threshold;
  const strokeColor = isAttack ? "#f87171" : "#22d3ee";

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[#0d1828] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold"><Activity size={15} className="text-cyan" /> Live QBER telemetry</div>
          <div className="mono mt-1 text-[9px] text-slate-500">ERROR RATE / THRESHOLD {formatPercent(threshold)}</div>
        </div>
        <div className="mono text-[10px] text-slate-500">DOMAIN 0–60%</div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="qber" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#203148" strokeDasharray="3 3" />
            <XAxis dataKey="index" tick={{ fill: "#64748b", fontSize: 10 }} />
            <YAxis domain={[0, 0.6]} tickFormatter={formatPercent} tick={{ fill: "#64748b", fontSize: 10 }} />
            <Tooltip formatter={(value) => formatPercent(Number(value))} contentStyle={{ background: "#0b1625", border: "1px solid #25405b", fontSize: 11 }} />
            <ReferenceLine y={threshold} stroke="#fb923c" strokeDasharray="5 5" label={{ value: "THRESHOLD", fill: "#fb923c", fontSize: 9 }} />
            <Area type="monotone" dataKey="error" stroke={strokeColor} strokeWidth={2} fill="url(#qber)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AttackPanel({ selected, onSelect, onRun, isRunning }: { selected: AttackType; onSelect: (type: AttackType) => void; onRun: (type: AttackType | "clean") => void; isRunning: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[#0d1828] p-5">
      <div className="flex items-center gap-2 text-sm font-semibold"><ShieldAlert size={15} className="text-orange-300" /> Attack control panel</div>
      <p className="mono mt-1 text-[9px] text-slate-500">ONE SOURCE OF TRUTH FOR SIMULATION TRIGGERS</p>
      <div className="mt-4 space-y-2">
        {(Object.keys(attackLabels) as AttackType[]).map((type) => (
          <button key={type} onClick={() => onSelect(type)} className={`flex w-full items-center justify-between rounded-md border px-3 py-3 text-left text-xs ${selected === type ? "border-cyan/60 bg-cyan/10 text-cyan" : "border-white/10 text-slate-400 hover:border-cyan/30"}`}>
            <span>{attackLabels[type]}</span><span className="mono text-[9px]">{selected === type ? "SELECTED" : "SELECT"}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button disabled={isRunning} onClick={() => onRun("clean")} className="flex items-center justify-center gap-2 rounded-md border border-mint/30 py-3 text-xs text-mint disabled:opacity-40"><CheckCircle2 size={14} /> Clean run</button>
        <button disabled={isRunning} onClick={() => onRun(selected)} className="flex items-center justify-center gap-2 rounded-md bg-orange-400 py-3 text-xs font-bold text-[#221306] disabled:opacity-40"><Play size={14} /> Run attack</button>
      </div>
    </div>
  );
}

function RunHistory({ history }: { history: RunRecord[] }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[#0d1828] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold"><History size={15} className="text-cyan" /> Session audit trail</div>
        <div className="mono text-[9px] text-slate-500">RUNS: {history.length.toString().padStart(2, "0")}</div>
      </div>
      {history.length === 0 ? (
        <div className="py-5 text-center text-sm text-slate-500">No runs recorded in this session.</div>
      ) : (
        <div className="space-y-2">
          {history.map((run, index) => (
            <div key={run.id} className="grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-md border border-white/5 bg-[#101e30] px-3 py-3">
              <span className="mono text-[10px] text-cyan">#{String(history.length - index).padStart(2, "0")}</span>
              <div>
                <div className="text-xs font-medium">{run.attack_type ? attackLabels[run.attack_type] : "Clean baseline"}</div>
                <div className="mono mt-1 flex items-center gap-2 text-[9px] text-slate-500"><Clock3 size={11} /> {formatTime(run.timestamp)} · QBER {formatPercent(run.error_rate)}</div>
              </div>
              <span className={`rounded px-2 py-1 mono text-[9px] ${run.status === "attack_detected" ? "bg-red-400/10 text-red-300" : "bg-mint/10 text-mint"}`}>
                {run.status === "attack_detected" ? "DETECTED" : "ACCEPTED"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// QDSFlow Components (Alice -> Bob Visualization)
// ------------------------------------------------------------------

interface QDSFlowProps {
  transmitting: boolean;
  result: RunRecord | null;
  runSeq: number;
}

function QDSFlow({ transmitting, result, runSeq }: QDSFlowProps) {
  const detected = result?.status === "attack_detected" || result?.status === "attack_undetected";
  const idleTrialCount = result?.trial_count ?? 20;

  // Map css variables to the dashboard's specific hex colors
  const CYAN = "#22d3ee";
  const DANGER = "#f87171";
  const BORDER = "#1e293b";
  const MUTED = "#64748b";

  const bobColor = !result ? CYAN : detected ? DANGER : CYAN;
  const channelColor = transmitting ? (detected ? DANGER : CYAN) : BORDER;

  return (
    <div aria-label="Alice to Bob quantum teleportation channel" className="relative rounded-xl border border-[#1e293b] bg-[#0d1828] px-4 py-8 sm:px-8 sm:py-10">
      <div className="mb-8 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyan/80">
          Quantum Teleportation Channel
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 sm:gap-6">
        <FlowNode name="Alice" role="Signer" color={CYAN} active={transmitting} />

        {/* Channel between the two parties. */}
        <div className="relative mx-1 flex-1">
          {/* entangled link (idle shimmer) */}
          <svg className="h-16 w-full" viewBox="0 0 400 64" preserveAspectRatio="none" aria-hidden>
            <line x1="0" y1="20" x2="400" y2="20" stroke={channelColor} strokeWidth="1.5" strokeDasharray="6 6" style={{ animation: "qds-dash 1.2s linear infinite" }} opacity="0.7" />
            <line x1="0" y1="44" x2="400" y2="44" stroke={channelColor} strokeWidth="1.5" strokeDasharray="6 6" style={{ animation: "qds-dash 1.6s linear infinite reverse" }} opacity="0.7" />
            <text x="200" y="14" textAnchor="middle" fill={MUTED} fontSize="9" fontFamily="monospace" letterSpacing="1">
              entangled pair
            </text>
          </svg>

          {/* Traveling classical-bit pulse. */}
          {transmitting && (
            <span
              key={runSeq}
              className="pointer-events-none absolute top-1/2 h-2.5 w-12 -translate-y-1/2 rounded-full"
              style={{
                background: channelColor,
                boxShadow: `0 0 14px 4px ${channelColor}`,
                animation: "qds-travel 1.1s ease-in-out infinite",
              }}
            />
          )}
        </div>

        <FlowNode name="Bob" role="Verifier" color={bobColor} active={transmitting} arriveSeq={result ? runSeq : 0} lit={!!result && !transmitting} />
      </div>

      <p className="mt-6 text-center font-mono text-[11px] text-slate-500">
        {transmitting
          ? "Transmitting classical correction bits…"
          : result
            ? detected
              ? "Bob's measurement statistics flagged tampering."
              : "Bob reconstructed Alice's signed qubit successfully."
            : `Idle — entangled pair shared (Trials: ${idleTrialCount})`}
      </p>
    </div>
  );
}

interface NodeProps {
  name: string;
  role: string;
  color: string;
  active: boolean;
  lit?: boolean;
  arriveSeq?: number;
}

function FlowNode({ name, role, color, active, lit, arriveSeq }: NodeProps) {
  return (
    <div className="flex w-20 shrink-0 flex-col items-center gap-2 sm:w-28">
      <div
        key={arriveSeq}
        className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 sm:h-20 sm:w-20"
        style={{
          borderColor: color,
          background: "#101e30",
          boxShadow: active || lit ? `0 0 20px 2px ${color}55` : "none",
          animation: arriveSeq ? "qds-arrive 0.7s ease-out" : undefined,
        }}
      >
        <QubitGlyph color={color} />
      </div>
      <div className="text-center">
        <p className="font-mono text-sm font-semibold sm:text-base" style={{ color }}>{name}</p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{role}</p>
      </div>
    </div>
  );
}

function QubitGlyph({ color }: { color: string }) {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden>
      <circle cx="17" cy="17" r="4" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      <ellipse cx="17" cy="17" rx="14" ry="6" fill="none" stroke={color} strokeWidth="1.2" opacity="0.7" />
      <ellipse cx="17" cy="17" rx="14" ry="6" fill="none" stroke={color} strokeWidth="1.2" opacity="0.7" transform="rotate(60 17 17)" />
      <ellipse cx="17" cy="17" rx="14" ry="6" fill="none" stroke={color} strokeWidth="1.2" opacity="0.7" transform="rotate(120 17 17)" />
    </svg>
  );
}