/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  Users, 
  Coins, 
  Settings2, 
  Activity, 
  PlusCircle, 
  Sparkles, 
  Info, 
  Cpu, 
  Award,
  BookOpen,
  Skull,
  TrendingUp,
  Sliders,
  History
} from 'lucide-react';
import { SimulationEngine, COLOR_MAP, STRATEGY_LABELS } from './simulationEngine';
import { Agent, MemoryFilter, BehaviorStyle, SimulationParams } from './types';
import { HistoryChart } from './components/HistoryChart';
import { EventLogWidget } from './components/EventLogWidget';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Simulation state config values
  const [params, setParams] = useState<SimulationParams>({
    survivalCost: 0.2,
    initialPopulation: 80,
    mutationRate: 0.012, // 1.2% default
    maxSpeed: 1.5,
    spawnRatioObjective: 4,
    spawnRatioOptimist: 4,
    spawnRatioPessimist: 4,
    behaviorTraderRatio: 3,
    behaviorDefensiveRatio: 3,
    behaviorExploiterRatio: 3,
    behaviorSaintRatio: 3,
    payoffMultiplier: 10,
    isHarshMode: false,
    isScarcityMode: false,
    minMemoryCapacity: 3,
    maxMemoryCapacity: 10,
  });

  // Controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1); // Step ticks per animation frame (1x..10x)
  const [inspectedAgent, setInspectedAgent] = useState<Agent | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('mixed');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'env' | 'gene' | 'spawn'>('env');

  // React-synced metrics for display (updated every 8 frames to avoid React overhead)
  const [ticksCount, setTicksCount] = useState(0);
  const [populationCount, setPopulationCount] = useState(0);
  const [totalWealth, setTotalWealth] = useState(0);
  const [avgWealth, setAvgWealth] = useState(0);
  const [collisionsCount, setCollisionsCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [eventLogs, setEventLogs] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);

  // Simulation Engine reference
  const engineRef = useRef<SimulationEngine | null>(null);

  // Initialize engine on first load
  if (!engineRef.current) {
    engineRef.current = new SimulationEngine(600, 600, params);
  }

  // Create local pointer
  const engine = engineRef.current;

  // Initialize or Reset Core Simulation
  const handleReset = () => {
    engine.params = params;
    engine.reset();
    setInspectedAgent(null);
    syncMetricsToReact();
  };

  // Sync state stats from physics world over to React state
  const syncMetricsToReact = () => {
    setTicksCount(engine.tickCount);
    setPopulationCount(engine.agents.length);
    setCollisionsCount(engine.collisionsThisTick);
    setEventLogs([...engine.eventLog]);
    setHistoryList([...engine.history]);
    
    const activeLeaderboard = engine.getLeaderboard();
    setLeaderboard(activeLeaderboard);

    const totalW = engine.agents.reduce((sum, a) => sum + a.wealth, 0);
    setTotalWealth(parseFloat(totalW.toFixed(0)));
    setAvgWealth(engine.agents.length > 0 ? parseFloat((totalW / engine.agents.length).toFixed(1)) : 0);

    // If inspected agent is select, update its properties in the Inspector view from the living node
    if (inspectedAgent) {
      const liveNode = engine.agents.find(a => a.id === inspectedAgent.id);
      if (liveNode) {
        setInspectedAgent({ ...liveNode });
      } else {
        // Inspected agent has died / went bankrupt
        setInspectedAgent(null);
      }
    }
  };

  // Preset Handler
  const handleApplyPreset = (presetName: string) => {
    setSelectedPreset(presetName);
    let newParams = { 
      ...params,
      payoffMultiplier: 10,
      isHarshMode: false,
      isScarcityMode: false,
      minMemoryCapacity: 3,
      maxMemoryCapacity: 10,
    };

    switch (presetName) {
      case 'coexistence': // High Saints & Traders, No Exploiters
        newParams = {
          ...newParams,
          spawnRatioObjective: 6,
          spawnRatioOptimist: 6,
          spawnRatioPessimist: 2,
          behaviorTraderRatio: 8,
          behaviorDefensiveRatio: 2,
          behaviorExploiterRatio: 0, // no starting exploiters
          behaviorSaintRatio: 8,
        };
        break;
      case 'dystopia': // High Exploiters & Pessimists
        newParams = {
          ...newParams,
          spawnRatioObjective: 2,
          spawnRatioOptimist: 2,
          spawnRatioPessimist: 10,
          behaviorTraderRatio: 1,
          behaviorDefensiveRatio: 4,
          behaviorExploiterRatio: 10, // full exploiters
          behaviorSaintRatio: 1,
        };
        break;
      case 'opportunists': // Optimists + Exploiter / Defensive
        newParams = {
          ...newParams,
          spawnRatioObjective: 2,
          spawnRatioOptimist: 10,
          spawnRatioPessimist: 2,
          behaviorTraderRatio: 1,
          behaviorDefensiveRatio: 4,
          behaviorExploiterRatio: 8,
          behaviorSaintRatio: 2,
        };
        break;
      case 'mixed':
      default: // Balanced Starter Mix
        newParams = {
          ...newParams,
          spawnRatioObjective: 4,
          spawnRatioOptimist: 4,
          spawnRatioPessimist: 4,
          behaviorTraderRatio: 3,
          behaviorDefensiveRatio: 3,
          behaviorExploiterRatio: 3,
          behaviorSaintRatio: 3,
        };
        break;
    }

    setParams(newParams);
    // Force reset with new weights
    engine.params = newParams;
    engine.reset();
    setInspectedAgent(null);
    // Short latency to allow engine update before drawing
    setTimeout(() => {
      syncMetricsToReact();
    }, 20);
  };

  // Sync sliders dynamically with living engine configuration
  useEffect(() => {
    engine.params = params;
  }, [params]);

  // Game Loop Animation Frame
  useEffect(() => {
    let animationId: number;
    let renderFrameCounter = 0;

    const loop = () => {
      if (isPlaying) {
        // Step multiple times for simulated speeds (1x..10x)
        for (let s = 0; s < simulationSpeed; s++) {
          engine.step();
        }
        
        renderFrameCounter++;
        // Throttle React state syncing to once every 10 frames to optimize thread layout speeds
        if (renderFrameCounter % 8 === 0) {
          syncMetricsToReact();
        }
      }

      // Drawing to canvas context on every frame regardless of UI sync
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Clear with charcoal background
          ctx.fillStyle = '#0b0f19'; 
          ctx.fillRect(0, 0, 600, 600);

          // Draw tactical sci-fi grid
          ctx.strokeStyle = 'rgba(79, 70, 229, 0.04)';
          ctx.lineWidth = 1;
          const gridSize = 40;
          for (let x = 0; x < 600; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 600);
            ctx.stroke();
          }
          for (let y = 0; y < 600; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(600, y);
            ctx.stroke();
          }

          // Draw active agents
          engine.agents.forEach(agent => {
            // Faint outer energy field relative to wealth
            if (agent.wealth > 0) {
              ctx.beginPath();
              // scale glow range on wealth
              const auraRadius = agent.radius + Math.min(9, (agent.wealth / 300) * 14);
              ctx.arc(agent.x, agent.y, auraRadius, 0, Math.PI * 2);
              ctx.strokeStyle = `${agent.color}22`; // highly semi-transparent hex
              ctx.lineWidth = 1.2;
              ctx.stroke();
            }

            // Solid inner physical cell
            ctx.beginPath();
            ctx.arc(agent.x, agent.y, agent.radius, 0, Math.PI * 2);
            ctx.fillStyle = agent.color;
            ctx.fill();

            // Highlight reticle if selected
            if (inspectedAgent && agent.id === inspectedAgent.id) {
              ctx.beginPath();
              ctx.arc(agent.x, agent.y, agent.radius + 10, 0, Math.PI * 2);
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1.6;
              ctx.setLineDash([4, 4]); // dashed ring
              ctx.stroke();
              ctx.setLineDash([]); // clear dash
            }
          });

          // Draw physics collision ring transients
          engine.collisionVisuals.forEach(visual => {
            ctx.beginPath();
            ctx.arc(visual.x, visual.y, visual.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `${visual.color}${Math.floor(visual.alpha * 255).toString(16).padStart(2, '0')}`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          });
        }
      }

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, simulationSpeed, inspectedAgent]);

  // Run initial metrics sync
  useEffect(() => {
    syncMetricsToReact();
  }, []);

  // Single step trigger
  const handleSingleStep = () => {
    engine.step();
    syncMetricsToReact();
  };

  // Quick Spawners for interventions on selected types
  const handleInjectAgents = (filter: MemoryFilter, style: BehaviorStyle) => {
    const radius = 5;
    for (let count = 0; count < 8; count++) {
      const x = Math.random() * (600 - radius * 4) + radius * 2;
      const y = Math.random() * (600 - radius * 4) + radius * 2;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * params.maxSpeed;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const color = COLOR_MAP[`${filter}-${style}`];

      engine.agents.push({
        id: 'agent_inj_' + Math.random().toString(36).substring(2, 6),
        x,
        y,
        vx,
        vy,
        radius,
        wealth: 120, // slightly boosted injected wealth
        memoryCapacity: Math.floor(Math.random() * 5) + 4, // 4 ~ 8 memory length
        memoryFilter: filter,
        behaviorStyle: style,
        memoryBook: {},
        color,
        generation: 1
      });
    }

    engine.recordHistoryPoint();
    syncMetricsToReact();
  };

  // Canvas interaction listener
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Scale back to 600x600 logical boundary space
    const clickX = (clientX / rect.width) * 600;
    const clickY = (clientY / rect.height) * 600;

    let nearest: Agent | null = null;
    let minDist = 30; // touch distance tolerance in pixels

    engine.agents.forEach(agent => {
      const dist = Math.hypot(agent.x - clickX, agent.y - clickY);
      if (dist < minDist) {
        minDist = dist;
        nearest = agent;
      }
    });

    setInspectedAgent(nearest);
  };

  return (
    <div className="min-h-screen bg-[#0A0C10] text-[#E2E8F0] font-sans flex flex-col selection:bg-blue-500/20 selection:text-white">
      {/* Top Professional Header */}
      <header className="bg-[#0F1218] border-b border-white/10 sticky top-0 z-10 py-3.5 px-6 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-md shadow-blue-500/20">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-sans font-bold text-lg text-white tracking-tight flex items-center gap-2">
                TrustEvo2D
                <span className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-widest font-mono">
                  v2.2
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                二維空間信任度與認知演化模擬器 (2D Spatial Trust & Cognitive Evolution Playground)
              </p>
            </div>
          </div>

          {/* Quick Preset Selector & Settings Panel Gear Button */}
          <div className="flex items-center gap-3 self-end md:self-center">
            <div className="flex flex-wrap items-center gap-2.5 bg-[#161A22] p-1.5 rounded-xl border border-white/10">
              <span className="text-[11px] text-slate-400 font-medium px-2 flex items-center gap-1 font-sans">
                <Sparkles className="w-3 h-3 text-blue-400" />
                情境基因庫：
              </span>
              {[
                { id: 'mixed', label: '標準均衡派' },
                { id: 'coexistence', label: '和諧烏托邦' },
                { id: 'opportunists', label: '割割樂園' },
                { id: 'dystopia', label: '悲觀煉獄' },
              ].map(preset => (
                <button
                  id={`preset-btn-${preset.id}`}
                  key={preset.id}
                  onClick={() => handleApplyPreset(preset.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    selectedPreset === preset.id
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Advanced Settings Gear control button */}
            <button
              id="header-settings-btn"
              onClick={() => setIsSettingsOpen(true)}
              className="p-3 bg-[#161A22] hover:bg-white/5 text-slate-350 hover:text-white border border-white/10 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-xs font-semibold font-sans shadow-lg shadow-black/20"
              title="進階生物圈系統環境參數配置"
            >
              <Settings2 className="w-4 h-4 text-blue-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>進階設定</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Responsive Grid Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-x-hidden">
        
        {/* Left Grid: Canvas Visualization & Play Controller (Col 5) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          
          {/* Main Simulated Space Window */}
          <div className="bg-[#0F1218] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#161A22]/50">
              <span className="text-xs font-semibold text-slate-200 font-sans tracking-tight flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPlaying ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isPlaying ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                </span>
                2D 生態演化模擬區 ({populationCount} 細胞活躍)
              </span>
              <span className="font-mono text-[10px] text-slate-400 font-bold bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                600 x 600 GRID
              </span>
            </div>

            {/* Simulated Canvas */}
            <div className="relative aspect-square w-full bg-[#050608] flex items-center justify-center">
              <canvas
                id="worldCanvas"
                ref={canvasRef}
                onClick={handleCanvasClick}
                width={600}
                height={600}
                className="w-full h-full cursor-crosshair aspect-square select-none block bg-[#050608]"
              />
              {populationCount === 0 && (
                <div id="extinction-overlay" className="absolute inset-0 bg-[#0A0C10]/95 flex flex-col items-center justify-center text-center p-6 backdrop-blur-sm">
                  <Skull className="w-12 h-12 text-rose-500 mb-3 animate-bounce" />
                  <h4 className="text-white text-base font-bold">全員破產！生物圈滅絕</h4>
                  <p className="text-xs text-slate-400 mt-2 max-w-[280px]">
                    因生存代價大於博弈產能，所有個體耗盡金幣。請點擊上方基因 presets 或重置按鈕。
                  </p>
                  <button
                    id="extinction-reset-btn"
                    onClick={handleReset}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> 重新注入生命
                  </button>
                </div>
              )}
            </div>

            {/* Interaction Tips Footer */}
            <div className="p-3 bg-[#161A22]/30 text-[11px] text-slate-400 border-t border-white/10 text-center font-sans tracking-wide">
              💡 提示：按一下畫布上的小球，即可檢視其完整的記憶與預期出價策略
            </div>
          </div>

          {/* Master Controller Box */}
          <div className="bg-[#0F1218] p-4 border border-white/10 rounded-2xl shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                運行控制器
              </h3>
              <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10">
                <span className="text-[10px] text-slate-400 font-bold px-1.5 font-mono">
                  速度:
                </span>
                {[1, 2, 5, 10].map(speed => (
                  <button
                    id={`speed-btn-${speed}`}
                    key={speed}
                    onClick={() => setSimulationSpeed(speed)}
                    className={`font-mono text-xs px-2 py-1 rounded transition-colors cursor-pointer ${
                      simulationSpeed === speed
                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* Button Layout */}
            <div className="grid grid-cols-3 gap-2.5 font-sans">
              <button
                id="play-pause-btn"
                onClick={() => setIsPlaying(!isPlaying)}
                className={`py-3 px-4 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isPlaying 
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/10' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/10'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-white text-white" />
                    <span>暫停模擬</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white text-white" />
                    <span>開始演化</span>
                  </>
                )}
              </button>

              <button
                id="step-forward-btn"
                onClick={handleSingleStep}
                disabled={isPlaying}
                className="py-3 px-4 bg-[#161A22] border border-white/10 hover:bg-[#1E2430] text-slate-300 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <SkipForward className="w-3.5 h-3.5" />
                單步
              </button>

              <button
                id="reset-btn"
                onClick={handleReset}
                className="py-3 px-4 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重置實驗
              </button>
            </div>
          </div>
        </div>

        {/* Right Grid: Scoreboard, Leaders, Parameters & Inspector Panels (Col 7) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          
          {/* Top Row: Quick Stats Counters (Bento Grid) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#0F1218] p-3 border border-white/10 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="p-2 bg-blue-950/40 text-blue-400 border border-blue-500/15 rounded-xl shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium font-sans">Time / Ticks</span>
                <p id="tick-counter" className="font-mono text-sm font-bold text-white">{ticksCount}</p>
              </div>
            </div>

            <div className="bg-[#0F1218] p-3 border border-white/10 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="p-2 bg-indigo-950/40 text-indigo-400 border border-indigo-500/15 rounded-xl shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium font-sans">群體規模</span>
                <p id="population-counter" className="font-mono text-sm font-bold text-white">{populationCount}</p>
              </div>
            </div>

            <div className="bg-[#0F1218] p-3 border border-white/10 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="p-2 bg-amber-950/40 text-amber-400 border border-amber-500/15 rounded-xl shrink-0">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium font-sans">社會總財產</span>
                <p id="total-wealth-counter" className="font-mono text-sm font-bold text-white">{totalWealth}</p>
              </div>
            </div>

            <div className="bg-[#0F1218] p-3 border border-white/10 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="p-2 bg-emerald-950/40 text-emerald-400 border border-emerald-500/15 rounded-xl shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium font-sans">平均財產</span>
                <p id="avg-wealth-counter" className="font-mono text-sm font-bold text-white">{avgWealth}</p>
              </div>
            </div>
          </div>

          {/* Core Table: Leaderboard & Distribution of Strategies */}
          <div className="bg-[#0F1218] border border-white/10 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#161A22]/50">
              <h3 className="font-sans font-semibold text-sm text-white tracking-tight flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                基因策略組合競爭力排行榜
              </h3>
              <span className="text-[10px] text-slate-400 font-sans tracking-wide">
                依存活數及總能量排序 (全12種)
              </span>
            </div>

            <div className="overflow-x-auto min-w-full">
              <table id="leaderboard-table" className="min-w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#161A22]/40 border-b border-white/10 text-[10px] text-slate-400 font-semibold uppercase tracking-wider font-sans">
                    <th className="py-2.5 px-4">組合策略名稱 (認知 / 行為)</th>
                    <th className="py-2.5 px-4 text-center">存活個體 (佔比)</th>
                    <th className="py-2.5 px-4 text-right">平均財產</th>
                    <th className="py-2.5 px-4 text-right">總財產</th>
                    <th className="py-2.5 px-4 text-center">干預</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {leaderboard.map((item, index) => {
                    const strategyKey = `${item.filter}-${item.style}`;
                    const customLabel = STRATEGY_LABELS[strategyKey] || { name: strategyKey, desc: '' };
                    const isExtinct = item.count === 0;

                    return (
                      <tr 
                        key={strategyKey} 
                        className={`hover:bg-white/5 text-xs transition-colors ${isExtinct ? 'opacity-30 bg-black/10' : ''}`}
                      >
                        <td className="py-2.5 px-4 flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color }} />
                          <div>
                            <span className={`font-semibold ${isExtinct ? 'text-slate-500' : 'text-slate-200'}`}>{customLabel.name}</span>
                            <span className="text-[10px] text-slate-500 block max-w-[210px] truncate leading-tight mt-0.5">
                              {customLabel.desc}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono">
                          <span className={`px-1.5 py-0.5 rounded text-[11px] ${isExtinct ? 'text-slate-600 bg-white/5' : 'bg-blue-950/40 text-blue-400 border border-blue-500/10 font-extrabold'}`}>
                            {item.count}
                          </span>
                          {!isExtinct && (
                            <span className="text-[10px] text-slate-500 ml-1">({item.ratio}%)</span>
                          )}
                        </td>
                        <td className={`py-2.5 px-4 text-right font-mono font-medium ${isExtinct ? 'text-slate-600' : 'text-slate-300'}`}>
                          {isExtinct ? '-' : item.avgWealth}
                        </td>
                        <td className={`py-2.5 px-4 text-right font-mono font-semibold ${isExtinct ? 'text-slate-600' : 'text-white'}`}>
                          {isExtinct ? '-' : item.totalWealth}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            id={`inject-${strategyKey}`}
                            onClick={() => handleInjectAgents(item.filter, item.style)}
                            className="p-1 text-slate-500 hover:text-blue-400 hover:bg-white/5 rounded border border-white/5 hover:border-white/20 transition-all cursor-pointer inline-flex items-center"
                            title="立刻注入 8 個此類型個體至網格"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Agent Inspector Panel (If Selected) */}
          {inspectedAgent ? (
            <div id="inspector-card" className="bg-[#161A22] text-slate-100 p-5 rounded-2xl shadow-xl shadow-slate-950/40 border border-white/10 flex flex-col gap-4 relative overflow-hidden transition-all duration-300">
              {/* Subtle background glow card */}
              <div 
                className="absolute w-40 h-40 rounded-full filter blur-[50px] opacity-10 -top-10 -right-10 pointer-events-none" 
                style={{ backgroundColor: inspectedAgent.color }}
              />

              <div className="flex items-center justify-between border-b border-white/5 pb-3 z-10">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: inspectedAgent.color }} />
                  <div>
                    <h3 className="font-sans font-bold text-sm text-white tracking-tight flex items-center gap-1.5">
                      個體生命監測面板
                      <span className="text-[10px] bg-white/5 border border-white/10 text-slate-350 px-1.5 py-0.5 rounded font-mono uppercase">
                        {inspectedAgent.id}
                      </span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                      世代代數: 第 {inspectedAgent.generation} 代 {inspectedAgent.parentStrategy && `(母體策略: ${inspectedAgent.parentStrategy})`}
                    </p>
                  </div>
                </div>
                <button
                  id="close-inspector-btn"
                  onClick={() => setInspectedAgent(null)}
                  className="text-slate-350 hover:text-white px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-sans font-bold transition-all cursor-pointer"
                >
                  清除鎖定
                </button>
              </div>

              {/* Status breakdown block */}
              <div className="grid grid-cols-3 gap-4 text-xs z-10 w-full">
                <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                  <span className="text-slate-400 font-sans text-[10px]">生物能量 (金幣)</span>
                  <div className="flex items-baseline gap-1 mt-1 font-mono">
                    <span className="text-sm font-bold text-amber-400">{inspectedAgent.wealth.toFixed(1)}</span>
                    <span className="text-[9px] text-slate-500">/ 300</span>
                  </div>
                  {/* Fission progress bar */}
                  <div className="w-full bg-white/5 h-1 rounded overflow-hidden mt-1.5">
                    <div 
                      className="bg-amber-400 h-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (inspectedAgent.wealth / 300) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-black/40 p-2.5 rounded-xl border border-white/5 flex flex-col justify-between">
                  <div>
                    <span className="text-slate-400 font-sans text-[10px]">智商 M (記憶容量)</span>
                    <p className="font-mono text-sm font-bold mt-1 text-blue-400">{inspectedAgent.memoryCapacity}</p>
                  </div>
                  <span className="text-[8px] text-slate-500 font-sans mt-0.5 leading-none">能記住對手最近互動數</span>
                </div>

                <div className="bg-black/40 p-2.5 rounded-xl border border-white/5 flex flex-col justify-between">
                  <div>
                    <span className="text-slate-400 font-sans text-[10px]">認知與行為屬性</span>
                    <p className="text-[11px] font-bold mt-1 text-emerald-400 truncate">
                      {STRATEGY_LABELS[`${inspectedAgent.memoryFilter}-${inspectedAgent.behaviorStyle}`]?.name || `${inspectedAgent.memoryFilter}-${inspectedAgent.behaviorStyle}`}
                    </p>
                  </div>
                  <span className="text-[8px] text-slate-500 font-sans mt-0.5 leading-none">基因組合對應</span>
                </div>
              </div>

              {/* Memory list details */}
              <div className="bg-black/20 p-3 rounded-xl border border-white/5 text-xs flex flex-col gap-2 z-10">
                <span className="text-slate-350 text-[10px] font-sans flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                  大腦聯絡簿：對特定對手預期誠實度記錄 (MemoryBook)
                </span>

                <div className="max-h-[105px] overflow-y-auto pr-1 space-y-1.5 custom-scrollbar text-[11px] font-mono">
                  {(Object.entries(inspectedAgent.memoryBook) as [string, number[]][]).length === 0 ? (
                    <p className="text-slate-500 py-2 font-sans italic text-[11px]">
                      記憶體一空白，該細胞在當前世代中尚未與任何對手碰撞交換過博弈。
                    </p>
                  ) : (
                    (Object.entries(inspectedAgent.memoryBook) as [string, number[]][]).map(([opponentId, historyVals]) => {
                      const avgValue = historyVals.reduce((sum, v) => sum + v, 0) / historyVals.length;
                      
                      // Calculate what bid this agent would place against this opponent
                      const estimatedBid = Math.max(0, Math.min(1, 
                        inspectedAgent.behaviorStyle === 'Trader' ? avgValue :
                        inspectedAgent.behaviorStyle === 'Defensive' ? Math.pow(avgValue, 2) :
                        inspectedAgent.behaviorStyle === 'Exploiter' ? 1.0 - avgValue :
                        Math.sqrt(avgValue)
                      ));

                      return (
                        <div key={opponentId} className="flex flex-col gap-1.5 p-2 bg-black/40 border border-white/5 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-300">
                              對手: <span className="bg-white/5 text-slate-400 px-1 rounded text-[10px]">{opponentId}</span>
                            </span>
                            <span className="text-[10px] text-blue-300 font-semibold">
                              預期誠實度 E_opp: <span className="text-white font-bold">{avgValue.toFixed(2)}</span>
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[10px] text-slate-400">大腦過濾軌跡 P_opp:</span>
                            <div className="flex gap-1 items-center">
                              {historyVals.map((val, idx) => (
                                <span 
                                  key={idx} 
                                  className="px-1 text-[10px] rounded text-white"
                                  style={{ backgroundColor: `rgba(59, 130, 246, ${0.2 + val * 0.8})` }}
                                >
                                  {val.toFixed(2)}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[10px] pt-1 border-t border-white/5 text-slate-400 font-sans">
                            <span>我的決策風格: {inspectedAgent.behaviorStyle}</span>
                            <span>對其預備出價 $P$: <strong className="text-amber-450 font-mono font-bold">{estimatedBid.toFixed(2)}</strong></span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* SVG History Trend Chart Analytics Area */}
          <HistoryChart history={historyList} />

          {/* Environmental parameters editor (Collapsible Sliders Layout) */}
          <div className="bg-[#0F1218] p-4 border border-white/10 rounded-2xl shadow-sm flex flex-col gap-4 text-slate-100">
            <h3 className="font-sans font-semibold text-sm text-white tracking-tight flex items-center gap-1.5">
              <Settings2 className="w-4 h-4 text-blue-400" />
              生物圈系統環境參數配置
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 text-xs font-sans">
              
              {/* Survival Cost Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium font-sans">每步生存成本 (生存扣發)</span>
                  <span id="label-survival-cost" className="font-mono font-bold text-blue-400 bg-blue-950/40 border border-blue-500/15 px-1.5 py-0.5 rounded">
                    {params.survivalCost.toFixed(2)} / Tick
                  </span>
                </div>
                <input
                  id="input-survival-cost"
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.05"
                  value={params.survivalCost}
                  onChange={(e) => setParams({ ...params, survivalCost: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-white/10 accent-blue-500 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  數值越高，細胞死得越快，迫使個體積極參與碰撞交易
                </span>
              </div>

              {/* Mutation Rate Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium font-sans">自我裂變突變機率</span>
                  <span id="label-mutation-rate" className="font-mono font-bold text-violet-400 bg-violet-950/40 border border-violet-500/15 px-1.5 py-0.5 rounded">
                    {(params.mutationRate * 100).toFixed(1)}%
                  </span>
                </div>
                <input
                  id="input-mutation-rate"
                  type="range"
                  min="0"
                  max="0.10"
                  step="0.005"
                  value={params.mutationRate}
                  onChange={(e) => setParams({ ...params, mutationRate: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-white/10 accent-violet-500 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  分裂時突變概率。突變會隨機修飾過濾策略、風格或聰明度 M
                </span>
              </div>

              {/* Initial Population Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium font-sans">重置初始群體規模</span>
                  <span id="label-population-size" className="font-mono font-bold text-sky-400 bg-sky-950/40 border border-sky-500/15 px-1.5 py-0.5 rounded">
                    {params.initialPopulation} 細胞
                  </span>
                </div>
                <input
                  id="input-population-size"
                  type="range"
                  min="20"
                  max="200"
                  step="10"
                  value={params.initialPopulation}
                  onChange={(e) => setParams({ ...params, initialPopulation: parseInt(e.target.value, 10) })}
                  className="w-full h-1 bg-white/10 accent-sky-500 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  調整後需點選上方「重置實驗」以產生全新生態系
                </span>
              </div>

              {/* Max Speed Limit Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium font-sans">細胞行動最大速限 v_max</span>
                  <span id="label-max-speed" className="font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/15 px-1.5 py-0.5 rounded">
                    {params.maxSpeed.toFixed(1)} px/s
                  </span>
                </div>
                <input
                  id="input-max-speed"
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.5"
                  value={params.maxSpeed}
                  onChange={(e) => setParams({ ...params, maxSpeed: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-white/10 accent-emerald-500 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  速限越高，碰撞發生越瘋狂，運動軌跡擴散速率加劇
                </span>
              </div>

            </div>

            {/* Separator and dynamic advanced parameters state badges */}
            <div className="border-t border-white/5 pt-3.5 flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5 text-[10px] font-mono leading-relaxed">
                <span className={`px-2 py-0.5 rounded border ${params.isHarshMode ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-slate-500/5 border-white/5 text-slate-500'}`}>
                  ☠️ 地獄模式: {params.isHarshMode ? '極限開啟' : '未開啟'}
                </span>
                <span className={`px-2 py-0.5 rounded border ${params.isScarcityMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-slate-500/5 border-white/5 text-slate-500'}`}>
                  🌾 物資緊縮: {params.isScarcityMode ? '打折50%' : '物產豐饒'}
                </span>
                <span className="px-2 py-0.5 rounded border bg-blue-500/10 border-blue-500/20 text-blue-400">
                  ⚡ 交易倍率: {params.payoffMultiplier}x
                </span>
                <span className="px-2 py-0.5 rounded border bg-purple-500/10 border-purple-500/20 text-purple-400">
                  🧠 智力隨機範圍: M{params.minMemoryCapacity}-{params.maxMemoryCapacity}
                </span>
              </div>
              
              <button
                id="open-settings-bottom-btn"
                onClick={() => setIsSettingsOpen(true)}
                className="w-full px-4 py-2 bg-blue-600/10 hover:bg-blue-600/25 text-blue-400 hover:text-blue-300 border border-blue-500/20 rounded-xl transition-all font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:border-blue-500/40 shadow-sm"
              >
                <Settings2 className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                <span>齒輪進階控制：極地模式 / 物資比例 / 記憶容量設定</span>
              </button>
            </div>
          </div>

          {/* Dynamic Interactive Event Stream Box */}
          <EventLogWidget logs={eventLogs} />

        </div>
      </main>

      {/* Humble craft credit footer */}
      <footer className="bg-[#0F1218] border-t border-white/10 py-6 text-center text-xs text-slate-500 shrink-0 font-sans tracking-wide flex flex-col items-center gap-3">
        <div className="flex items-center gap-6 justify-center text-slate-450 font-mono text-[11px]">
          <span className="flex items-center gap-1.5">
            👁️ 累計瀏覽: <span id="vercount_value_site_pv" className="text-blue-400 font-bold">--</span> 次
          </span>
          <span className="flex items-center gap-1.5">
            🧑 獨立訪客: <span id="vercount_value_site_uv" className="text-violet-400 font-bold">--</span> 人
          </span>
        </div>
        <div>
          TrustEvo2D 空間交互演化實驗 · <a href="https://github.com/toydogcat/sim-trust-evolution" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">GitHub Repository</a> · 授權: MIT
        </div>
      </footer>

      {/* Advanced Environmental Settings Modal Overlay Panel */}
      {isSettingsOpen && (
        <div id="settings-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60 overflow-y-auto">
          <div className="bg-[#0F1218] border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 bg-[#161A22]/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600/15 border border-blue-500/20 text-blue-400 rounded-lg shrink-0">
                  <Settings2 className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-base text-white tracking-tight">環境高階系統控制台</h3>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">自訂物理法則、生存難度代價、合作收益擴大因子與突變係數</p>
                </div>
              </div>
              <button
                id="close-settings-modal-x"
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 hover:bg-white/5 rounded-lg border border-white/5 hover:border-white/20 transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Tabs Row */}
            <div className="flex border-b border-white/5 px-4 bg-[#11141c] shrink-0">
              {[
                { id: 'env', label: '🌍 生存難度 & 物理環境' },
                { id: 'gene', label: '🧬 繁殖進化 & 大腦智商' },
                { id: 'spawn', label: '⚖️ 創始策略物種權重' }
              ].map(tab => (
                <button
                  id={`tab-btn-${tab.id}`}
                  key={tab.id}
                  onClick={() => setSettingsTab(tab.id as any)}
                  className={`px-4 py-3.5 text-xs font-semibold tracking-wide transition-colors relative cursor-pointer font-sans whitespace-nowrap ${
                    settingsTab === tab.id 
                      ? 'text-blue-400 border-b-2 border-blue-500 font-bold' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Body - Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-100 text-xs font-sans max-h-[50vh] custom-scrollbar">
              
              {settingsTab === 'env' && (
                <div className="space-y-5 animate-fade-in">
                  
                  {/* Extreme Survival Modes Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Harsh Mode Card */}
                    <div className={`p-4 rounded-xl border transition-all flex flex-col gap-2 ${params.isHarshMode ? 'bg-red-950/20 border-red-500/30' : 'bg-black/35 border-white/5'}`}>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-red-400 flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={params.isHarshMode}
                            onChange={(e) => setParams({ ...params, isHarshMode: e.target.checked })}
                            className="accent-red-500 w-4 h-4 rounded"
                          />
                          ☠️ 極度惡劣地獄生存模式
                        </label>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        啟動後：所有繁殖自我裂變所需門檻提升至 <strong>350 金幣</strong>，且子代初始金幣與母代留存金幣皆大幅調減。這將是一場物種生存清洗豪賭。
                      </p>
                    </div>

                    {/* Scarcity Mode Card */}
                    <div className={`p-4 rounded-xl border transition-all flex flex-col gap-2 ${params.isScarcityMode ? 'bg-amber-950/20 border-amber-500/30' : 'bg-black/35 border-white/5'}`}>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-amber-400 flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={params.isScarcityMode}
                            onChange={(e) => setParams({ ...params, isScarcityMode: e.target.checked })}
                            className="accent-amber-500 w-4 h-4 rounded"
                          />
                          🌾 物資緊縮 / 合作剩餘收益折半
                        </label>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        啟動後：博弈所創造出的合作收益和雙方博弈波動皆會 <strong>降低 50%</strong>。低產出資源，代表欺詐剝削將會演化成更嚴酷的割割危機。
                      </p>
                    </div>
                  </div>

                  {/* Environment Physical Sliders */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3">
                    {/* Survival Cost */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">每步生存成本 (生存扣發)</span>
                        <span className="font-mono bg-blue-950/40 border border-blue-500/15 px-1.5 py-0.5 rounded text-blue-400 font-bold">
                          {params.survivalCost.toFixed(2)} / Tick
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1.5"
                        step="0.05"
                        value={params.survivalCost}
                        onChange={(e) => setParams({ ...params, survivalCost: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-white/10 accent-blue-500 rounded-lg cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500">
                        數值越高，細胞在沒有碰撞產生合作利益的狀態下死亡分解越快。
                      </span>
                    </div>

                    {/* Max Speed */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">細胞最大行動速限 v_max</span>
                        <span className="font-mono bg-emerald-950/40 border border-emerald-500/15 px-1.5 py-0.5 rounded text-emerald-400 font-bold">
                          {params.maxSpeed.toFixed(1)} px/s
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="8.0"
                        step="0.5"
                        value={params.maxSpeed}
                        onChange={(e) => setParams({ ...params, maxSpeed: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-white/10 accent-emerald-500 rounded-lg cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500">
                        細胞的物理運行最高限制，高速度會增加碰撞博弈的摩擦密集率與反應。
                      </span>
                    </div>

                    {/* Payoff Multiplier */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">博弈收益協同倍率 (Payoff Multiplier)</span>
                        <span className="font-mono bg-sky-950/40 border border-sky-500/15 px-1.5 py-0.5 rounded text-sky-400 font-bold">
                          {params.payoffMultiplier}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="30"
                        step="1"
                        value={params.payoffMultiplier}
                        onChange={(e) => setParams({ ...params, payoffMultiplier: parseInt(e.target.value, 10) })}
                        className="w-full h-1 bg-white/10 accent-sky-500 rounded-lg cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500">
                        調整合作產出的財富基數。倍率極高時表示環境極致富饒，合作是絕對真理。
                      </span>
                    </div>
                  </div>

                </div>
              )}

              {settingsTab === 'gene' && (
                <div className="space-y-5 animate-fade-in">
                  
                  {/* Smartness / Memory Capacities Limits (M_min & M_max) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Minimum Capacity */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">智商記憶容量下限 (M_min)</span>
                        <span className="font-mono bg-indigo-950/40 border border-indigo-500/15 px-1.5 py-0.5 rounded text-indigo-400 font-bold">
                          {params.minMemoryCapacity} 步紀錄
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="8"
                        step="1"
                        value={params.minMemoryCapacity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setParams({ 
                            ...params, 
                            minMemoryCapacity: val,
                            maxMemoryCapacity: Math.max(val + 1, params.maxMemoryCapacity) 
                          });
                        }}
                        className="w-full h-1 bg-white/10 accent-indigo-500 rounded-lg cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500">
                        新分裂細胞大腦所帶有的最短交往記憶紀錄長度。
                      </span>
                    </div>

                    {/* Maximum Capacity */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">智商記憶容量上限 (M_max)</span>
                        <span className="font-mono bg-violet-950/40 border border-violet-500/15 px-1.5 py-0.5 rounded text-violet-400 font-bold">
                          {params.maxMemoryCapacity} 步紀錄
                        </span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="24"
                        step="1"
                        value={params.maxMemoryCapacity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setParams({ 
                            ...params, 
                            maxMemoryCapacity: val,
                            minMemoryCapacity: Math.min(val - 1, params.minMemoryCapacity) 
                          });
                        }}
                        className="w-full h-1 bg-white/10 accent-violet-500 rounded-lg cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500">
                        細胞大腦記憶的最大深度上限，越高能進行越成熟的歷史審視。
                      </span>
                    </div>
                  </div>

                  {/* Population Size & Gene Mutation Slider */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3">
                    {/* Initial Population */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">初始重置群體細胞規模</span>
                        <span className="font-mono bg-pink-950/40 border border-pink-500/15 px-1.5 py-0.5 rounded text-pink-400 font-bold">
                          {params.initialPopulation} 細胞粒
                        </span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="250"
                        step="10"
                        value={params.initialPopulation}
                        onChange={(e) => setParams({ ...params, initialPopulation: parseInt(e.target.value, 10) })}
                        className="w-full h-1 bg-white/10 accent-pink-500 rounded-lg cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500">
                        調整設定後，必須點撃下方「套用配置並重置實驗」以套用全新規模。
                      </span>
                    </div>

                    {/* Mutation Probability rate */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">自我裂變突變機率</span>
                        <span className="font-mono bg-fuchsia-950/40 border border-fuchsia-500/15 px-1.5 py-0.5 rounded text-fuchsia-400 font-bold">
                          {(params.mutationRate * 100).toFixed(1)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="0.25"
                        step="0.005"
                        value={params.mutationRate}
                        onChange={(e) => setParams({ ...params, mutationRate: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-white/10 accent-fuchsia-500 rounded-lg cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500">
                        細胞分裂時，其遺傳基因突變形成新特徵（認知過濾或行為決策）的機率。
                      </span>
                    </div>
                  </div>

                </div>
              )}

              {settingsTab === 'spawn' && (
                <div className="space-y-5 animate-fade-in">
                  
                  {/* Cognitive Bias Ratios Block */}
                  <div className="p-4 bg-black/20 border border-white/5 rounded-xl space-y-4">
                    <h4 className="font-sans font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <span>🧠</span> 初始認知學過濾器權重比例分佈 (Initial Filters Ratios)
                    </h4>
                    <p className="text-[10px] text-slate-550 leading-relaxed">
                      分配重置初始化實驗時，不同記憶過濾器的配額。若重置時某群落比例為 0，便不會產出該類型。
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans text-xs">
                      {/* Objective */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-350">客觀實記派 (Objective)</span>
                          <span className="font-mono text-blue-400 font-bold">{params.spawnRatioObjective}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="12"
                          step="1"
                          value={params.spawnRatioObjective}
                          onChange={(e) => setParams({ ...params, spawnRatioObjective: parseInt(e.target.value, 10) })}
                          className="w-full h-1 bg-white/10 accent-blue-500 rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Optimist */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-350">樂觀記善美化派 (Optimist)</span>
                          <span className="font-mono text-purple-400 font-bold">{params.spawnRatioOptimist}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="12"
                          step="1"
                          value={params.spawnRatioOptimist}
                          onChange={(e) => setParams({ ...params, spawnRatioOptimist: parseInt(e.target.value, 10) })}
                          className="w-full h-1 bg-white/10 accent-purple-500 rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Pessimist */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-350">悲觀疑嫌記仇派 (Pessimist)</span>
                          <span className="font-mono text-rose-400 font-bold">{params.spawnRatioPessimist}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="12"
                          step="1"
                          value={params.spawnRatioPessimist}
                          onChange={(e) => setParams({ ...params, spawnRatioPessimist: parseInt(e.target.value, 10) })}
                          className="w-full h-1 bg-white/10 accent-rose-500 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Behavioral Style Ratios Block */}
                  <div className="p-4 bg-black/20 border border-white/5 rounded-xl space-y-4">
                    <h4 className="font-sans font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <span>⚖️</span> 初始博弈決策風格權重比例分佈 (Initial Styles Ratios)
                    </h4>
                    <p className="text-[10px] text-slate-550 leading-relaxed">
                      分配重置初始化實驗時，四類基本博弈本性的配額。包括回報交易、自保、掠奪割韭菜與全善。
                    </p>
                    <div className="grid grid-cols-2 gap-x-5 gap-y-4 font-sans text-xs">
                      {/* Trader */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-350">以牙還牙交易型 (Trader)</span>
                          <span className="font-mono text-[#6366f1] font-bold">{params.behaviorTraderRatio}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="12"
                          step="1"
                          value={params.behaviorTraderRatio}
                          onChange={(e) => setParams({ ...params, behaviorTraderRatio: parseInt(e.target.value, 10) })}
                          className="w-full h-1 bg-white/10 accent-[#6366f1] rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Defensive */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-350">加倍懷疑自保型 (Defensive)</span>
                          <span className="font-mono text-[#06b6d4] font-bold">{params.behaviorDefensiveRatio}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="12"
                          step="1"
                          value={params.behaviorDefensiveRatio}
                          onChange={(e) => setParams({ ...params, behaviorDefensiveRatio: parseInt(e.target.value, 10) })}
                          className="w-full h-1 bg-white/10 accent-[#06b6d4] rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Exploiter */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-350">欺善怕惡割韭菜型 (Exploiter)</span>
                          <span className="font-mono text-[#f59e0b] font-bold">{params.behaviorExploiterRatio}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="12"
                          step="1"
                          value={params.behaviorExploiterRatio}
                          onChange={(e) => setParams({ ...params, behaviorExploiterRatio: parseInt(e.target.value, 10) })}
                          className="w-full h-1 bg-white/10 accent-[#f59e0b] rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Saint */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-350">大愛破冰聖人型 (Saint)</span>
                          <span className="font-mono text-[#10b981] font-bold">{params.behaviorSaintRatio}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="12"
                          step="1"
                          value={params.behaviorSaintRatio}
                          onChange={(e) => setParams({ ...params, behaviorSaintRatio: parseInt(e.target.value, 10) })}
                          className="w-full h-1 bg-white/10 accent-[#10b981] rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Modal Controls Footer */}
            <div className="p-4 border-t border-white/10 bg-[#161A22]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <button
                id="modal-restore-btn"
                onClick={() => {
                  setParams({
                    survivalCost: 0.2,
                    initialPopulation: 80,
                    mutationRate: 0.012,
                    maxSpeed: 1.5,
                    spawnRatioObjective: 4,
                    spawnRatioOptimist: 4,
                    spawnRatioPessimist: 4,
                    behaviorTraderRatio: 3,
                    behaviorDefensiveRatio: 3,
                    behaviorExploiterRatio: 3,
                    behaviorSaintRatio: 3,
                    payoffMultiplier: 10,
                    isHarshMode: false,
                    isScarcityMode: false,
                    minMemoryCapacity: 3,
                    maxMemoryCapacity: 10,
                  });
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 transition-colors cursor-pointer text-center"
              >
                恢復預設配置
              </button>

              <div className="flex items-center gap-2.5 justify-end">
                <button
                  id="modal-close-cancel"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer text-center"
                >
                  取消
                </button>
                <button
                  id="modal-apply-btn"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    handleReset(); // reset simulation with new parameters instantly!
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white rounded-xl shadow-md cursor-pointer transition-colors text-center shadow-blue-500/10"
                >
                  套用配置並重置實驗 🚀
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
