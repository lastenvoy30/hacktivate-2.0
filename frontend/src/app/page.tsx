"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, BookOpen, ChevronRight, Download, History, LayoutDashboard, Menu, Play, X, Sun, Moon } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { runAttackSimulation, runCleanSimulation } from "@/lib/api";
import { attackLabels, type AttackType, type RunRecord } from "@/lib/types";

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
const formatTime = (timestamp: string) => new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 });
const initialChart = [{ index: 0, error: 0.006 }, { index: 1, error: 0.011 }, { index: 2, error: 0.004 }, { index: 3, error: 0.008 }, { index: 4, error: 0.002 }];

function Metric({ label, value, detail, isAlert = false }: { label: string; value: string; detail: string; isAlert?: boolean }) {
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-sm transition-colors">
      <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className={`mt-1.5 text-xl font-semibold tracking-tight ${isAlert ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-100"}`}>{value}</div>
      <div className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">{detail}</div>
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  const latest = result ?? history[0];
  const nominal = latest?.status !== "attack_detected";
  const chartData = useMemo(() => chart.slice(-15), [chart]);


  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else {
      // Force light mode as the default for new visitors
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }
  }, []);

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 1024) setSidebarOpen(false); };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  async function execute(type: AttackType | "clean") {
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
    anchor.download = `qds-audit-${latest.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 overflow-x-hidden selection:bg-blue-500/30 transition-colors">
      <style>{`
        @keyframes qds-dash { to { stroke-dashoffset: -12; } }
        @keyframes qds-travel {
          0% { left: 0%; opacity: 0; transform: translateY(-50%) scale(0.8); }
          15% { opacity: 1; transform: translateY(-50%) scale(1); }
          85% { opacity: 1; transform: translateY(-50%) scale(1); }
          100% { left: 100%; opacity: 0; transform: translateY(-50%) scale(0.8); }
        }
        @keyframes qds-arrive {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 dark:bg-black/80 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] transition-transform duration-200 ease-in-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-14 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4">
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold tracking-tight">QBIT</div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"><X size={18} /></button>
        </div>
        
        <div className="px-3 py-4">
          <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 mb-2 px-2 uppercase tracking-wider">Navigation</div>
          <nav className="space-y-0.5">
            {[
              ["command", LayoutDashboard, "Dashboard"],
              ["history", History, "Audit Logs"],
              ["docs", BookOpen, "System Docs"]
            ].map(([key, Icon, label]) => (
              <button 
                key={key as string} 
                onClick={() => { setView(key as typeof view); setSidebarOpen(false); }} 
                className={`flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm transition-colors ${view === key ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200"}`}
              >
                <Icon size={14} />{label as string}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] p-4">
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className={`h-2 w-2 rounded-full ${apiOnline ? "bg-emerald-500" : "bg-red-500"}`} />
            Backend {apiOnline ? "Connected" : "Disconnected"}
          </div>
        </div>
      </aside>

      <main className="relative z-10 min-h-screen lg:ml-64 transition-all duration-200">
        <header className="flex h-14 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-md px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"><Menu size={18} /></button>
            <h1 className="text-sm font-medium">{view === "command" ? "Live Verification Dashboard" : view === "history" ? "Session Audit Logs" : "Documentation"}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 border-r border-zinc-200 dark:border-zinc-800 pr-4">
              <span className={`h-1.5 w-1.5 rounded-full ${nominal ? "bg-emerald-500" : "bg-red-500"}`} />
              Status: {nominal ? "Nominal" : "Alert"}
            </div>
            <button onClick={toggleTheme} className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
              {mounted && (theme === "dark" ? <Sun size={16} /> : <Moon size={16} />)}
            </button>
          </div>
        </header>

        <div className="p-4 lg:p-6 max-w-[1400px] mx-auto">
          {view === "docs" ? (
             <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 rounded-sm p-6 max-w-3xl">
               <h2 className="text-lg font-medium mb-4">Architecture Overview</h2>
               <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">This dashboard interfaces with a FastAPI/Qiskit backend to monitor Quantum Digital Signatures (QDS). It measures channel integrity using empirical Quantum Bit Error Rates (QBER) rather than relying on unverified theoretical bounds.</p>
               <div className="grid gap-3 sm:grid-cols-2">
                 <Metric label="Empirical Threshold" value="5.0%" detail="Configured based on baseline noise" />
                 <Metric label="Verification Standard" value="SHA3-512" detail="Session hashing algorithm" />
               </div>
             </div>
          ) : view === "history" ? (
             <RunHistory history={history} />
          ) : (
            <div className="space-y-4">
              
              <div className="mb-4">
                <QDSFlow transmitting={isRunning} result={latest} runSeq={runSeq} theme={theme} />
              </div>

              {latest ? (
                <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                  <div className={`border rounded-sm p-5 transition-colors ${nominal ? "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30" : "border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/10"}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className={`text-xs font-semibold uppercase tracking-wider ${nominal ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500"}`}>
                        {nominal ? "✓ Authentication Passed" : "⚠ Security Alert Triggered"}
                      </div>
                      <button onClick={exportResult} className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-sm px-2 py-1 transition-colors flex items-center gap-1">
                        <Download size={12} /> Export JSON
                      </button>
                    </div>
                    <h2 className="text-2xl font-semibold mb-1">{latest.verdict}</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">{latest.attack_type ? `${attackLabels[latest.attack_type]} vector simulation evaluated.` : "No eavesdropping or bit-flip forgery detected."}</p>
                    
                    <div className="bg-zinc-100 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-sm p-2 flex items-center justify-between">
                       <span className="text-[10px] text-zinc-500">SESSION FINGERPRINT</span>
                       <span className="font-mono text-[10px] text-zinc-700 dark:text-zinc-300 break-all">{latest.session_hash ?? "N/A"}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                    <Metric label="Quantum Bit Error Rate" value={formatPercent(latest.error_rate)} detail={`Threshold: ${formatPercent(latest.threshold)}`} isAlert={!nominal} />
                    <Metric label="Bell-State Fidelity" value={formatPercent(1 - latest.error_rate)} detail="Derived from QBER" />
                    <Metric label="Forgery Probability" value={formatPercent(latest.forgery_probability)} detail="Empirical risk factor" isAlert={latest.forgery_probability > 0.05} />
                    <Metric label="Execution Latency" value={latest.latency_ms !== undefined ? `${latest.latency_ms}ms` : "N/A"} detail="Backend processing time" />
                  </div>
                </div>
              ) : (
                <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 rounded-sm p-8 text-center text-zinc-500 text-sm">
                  System initialized. Select simulation parameters to begin verification.
                </div>
              )}
              
              <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                <ChartCard data={chartData} threshold={latest?.threshold ?? 0.05} theme={theme} />

                <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 rounded-sm p-4 flex flex-col">
                  <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">Simulation Control</h3>
                  
                  <div className="space-y-1.5 flex-1">
                    {(Object.keys(attackLabels) as AttackType[]).map((type) => (
                      <label key={type} className={`flex items-center justify-between p-2.5 rounded-sm border cursor-pointer transition-colors ${selectedAttack === type ? "border-blue-500/30 dark:border-blue-500/50 bg-blue-50 dark:bg-blue-500/10" : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"}`}>
                        <div className="flex items-center gap-2">
                           <input type="radio" name="attack" checked={selectedAttack === type} onChange={() => setSelectedAttack(type)} className="accent-blue-600 dark:accent-blue-500" />
                           <span className="text-xs text-zinc-700 dark:text-zinc-300">{attackLabels[type]}</span>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <button disabled={isRunning} onClick={() => execute("clean")} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-medium py-2 rounded-sm disabled:opacity-50 transition-colors border border-zinc-200 dark:border-zinc-700">
                      Run Clean
                    </button>
                    <button disabled={isRunning} onClick={() => execute(selectedAttack)} className="bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-semibold py-2 rounded-sm disabled:opacity-50 transition-colors">
                      {isRunning ? "Executing..." : "Inject Attack"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ------------------------------------------------------------------
// Sub-components
// ------------------------------------------------------------------

function ChartCard({ data, threshold, theme }: { data: { index: number; error: number }[]; threshold: number; theme: string }) {
  const latestError = data[data.length - 1]?.error || 0;
  const isAttack = latestError > threshold;
  const strokeColor = isAttack ? "#ef4444" : "#3b82f6";
  const gridColor = theme === "dark" ? "#27272a" : "#e4e4e7";
  const textColor = theme === "dark" ? "#52525b" : "#a1a1aa";
  const tooltipBg = theme === "dark" ? "#09090b" : "#ffffff";
  const tooltipText = theme === "dark" ? "#e4e4e7" : "#18181b";

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 rounded-sm p-4 flex flex-col">
      <div className="flex justify-between items-center mb-4">
         <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Live QBER Telemetry</h3>
         <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">DOMAIN: 0.0 - 0.6</span>
      </div>
      <div className="h-48 w-full flex-1 min-w-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="qberGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="index" tick={{ fill: textColor, fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 0.6]} tickFormatter={formatPercent} tick={{ fill: textColor, fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip 
              formatter={(value) => [formatPercent(Number(value)), 'Error Rate']} 
              contentStyle={{ backgroundColor: tooltipBg, borderColor: gridColor, fontSize: "11px", borderRadius: "2px" }} 
              itemStyle={{ color: tooltipText }}
            />
            <ReferenceLine y={threshold} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "ABORT LIMIT", fill: "#ef4444", fontSize: 9, position: 'insideTopLeft' }} />
            <Area type="monotone" dataKey="error" stroke={strokeColor} strokeWidth={2} fill="url(#qberGrad)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface QDSFlowProps {
  transmitting: boolean;
  result: RunRecord | null;
  runSeq: number;
  theme: string;
}

function QDSFlow({ transmitting, result, runSeq, theme }: QDSFlowProps) {
  const detected = result?.status === "attack_detected" || result?.status === "attack_undetected";
  
  const BLUE = "#3b82f6";
  const RED = "#ef4444";
  const ZINC = theme === "dark" ? "#3f3f46" : "#d4d4d8"; 
  const MUTED = theme === "dark" ? "#71717a" : "#a1a1aa"; 

  const bobColor = !result ? BLUE : detected ? RED : BLUE;
  const channelColor = transmitting ? (detected ? RED : BLUE) : ZINC;

  return (
    <div aria-label="Alice to Bob quantum teleportation channel" className="relative rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 px-4 py-6 sm:px-8 sm:py-8 overflow-hidden transition-colors">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Channel Topology</h3>
        {result && <div className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">LAST SYNC: {formatTime(result.timestamp)}</div>}
      </div>

      <div className="flex items-center justify-between gap-1 sm:gap-6 max-w-3xl mx-auto">
        <FlowNode name="Alice" role="Signer" color={BLUE} active={transmitting} arriveSeq={0} theme={theme} />

        <div className="relative mx-1 flex-1 min-w-[50px]">
          <svg className="h-12 sm:h-16 w-full" viewBox="0 0 400 64" preserveAspectRatio="none" aria-hidden>
            <line x1="0" y1="20" x2="400" y2="20" stroke={channelColor} strokeWidth="1.5" strokeDasharray="6 6" style={{ animation: "qds-dash 1.2s linear infinite" }} opacity="0.7" />
            <line x1="0" y1="44" x2="400" y2="44" stroke={channelColor} strokeWidth="1.5" strokeDasharray="6 6" style={{ animation: "qds-dash 1.6s linear infinite reverse" }} opacity="0.7" />
            <text x="200" y="14" textAnchor="middle" fill={MUTED} fontSize="9" fontFamily="monospace" letterSpacing="1" className="hidden sm:block">
              entangled pair
            </text>
          </svg>

          {transmitting && (
            <span
              key={runSeq}
              className="pointer-events-none absolute top-1/2 h-2.5 w-12 -translate-y-1/2 rounded-sm"
              style={{ background: channelColor, animation: "qds-travel 1.1s ease-in-out infinite" }}
            />
          )}
        </div>

        <FlowNode name="Bob" role="Verifier" color={bobColor} active={transmitting} arriveSeq={result ? runSeq : 0} lit={!!result && !transmitting} theme={theme} />
      </div>

      <p className="mt-4 sm:mt-6 text-center font-mono text-[9px] sm:text-[10px] text-zinc-400 dark:text-zinc-500 px-2">
        {transmitting
          ? "Transmitting classical correction bits…"
          : result
            ? detected
              ? "Bob's measurement statistics flagged tampering."
              : "Bob reconstructed Alice's signed qubit successfully."
            : "Idle — entangled pair shared (Trials: 20)"}
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
  theme: string;
}

function FlowNode({ name, role, color, arriveSeq, theme }: NodeProps) {
  return (
    <div className="flex w-16 sm:w-20 shrink-0 flex-col items-center gap-2">
      <div
        key={arriveSeq}
        className="relative flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 bg-zinc-50 dark:bg-zinc-950 transition-colors"
        style={{
          borderColor: color,
          animation: arriveSeq ? "qds-arrive 0.7s ease-out" : undefined,
        }}
      >
        <QubitGlyph color={color} />
      </div>
      <div className="text-center mt-1">
        <p className="font-mono text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">{name}</p>
        <p className="font-mono text-[8px] sm:text-[9px] uppercase tracking-widest text-zinc-500 mt-0.5">{role}</p>
      </div>
    </div>
  );
}

function QubitGlyph({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 34 34" aria-hidden className="sm:w-[34px] sm:h-[34px]">
      <circle cx="17" cy="17" r="4" fill={color} />
      <ellipse cx="17" cy="17" rx="14" ry="6" fill="none" stroke={color} strokeWidth="1.2" opacity="0.7" />
      <ellipse cx="17" cy="17" rx="14" ry="6" fill="none" stroke={color} strokeWidth="1.2" opacity="0.7" transform="rotate(60 17 17)" />
      <ellipse cx="17" cy="17" rx="14" ry="6" fill="none" stroke={color} strokeWidth="1.2" opacity="0.7" transform="rotate(120 17 17)" />
    </svg>
  );
}

function RunHistory({ history }: { history: RunRecord[] }) {
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 rounded-sm overflow-hidden transition-colors">
      <div className="border-b border-zinc-200 dark:border-zinc-800 p-4 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50 transition-colors">
        <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Execution Logs</h3>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">TOTAL: {history.length}</span>
      </div>
      {history.length === 0 ? (
        <div className="p-8 text-center text-sm text-zinc-500">No logs found for current session.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100 dark:bg-zinc-900/80 text-zinc-500 font-mono text-[9px] uppercase transition-colors">
              <tr>
                <th className="px-4 py-2 font-normal">Time</th>
                <th className="px-4 py-2 font-normal">Vector</th>
                <th className="px-4 py-2 font-normal">QBER</th>
                <th className="px-4 py-2 font-normal">Verdict</th>
                <th className="px-4 py-2 font-normal text-right">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50 text-zinc-700 dark:text-zinc-300">
              {history.map((run) => (
                <tr key={run.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-[10px] text-zinc-500">{formatTime(run.timestamp)}</td>
                  <td className="px-4 py-3">{run.attack_type ? attackLabels[run.attack_type] : "Clean Baseline"}</td>
                  <td className="px-4 py-3 font-mono text-[10px]">{formatPercent(run.error_rate)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-1.5 py-0.5 rounded-sm text-[9px] uppercase ${run.status === "attack_detected" ? "bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400" : "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
                      {run.status === "attack_detected" ? "Rejected" : "Passed"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-right text-zinc-500">{run.latency_ms}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}