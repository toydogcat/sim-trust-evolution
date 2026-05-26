/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Agent, MemoryFilter, BehaviorStyle, SimulationParams, CollisionVisual, StrategyGroupStats, HistoryPoint } from './types';

// Helper to generate a unique ID
function generateId(): string {
  return 'agent_' + Math.random().toString(36).substring(2, 9);
}

// Map the 12 combinations to beautiful, distinct Tailwind HEX colors
export const COLOR_MAP: Record<string, string> = {
  'Objective-Trader': '#6366f1',    // Indigo
  'Objective-Defensive': '#06b6d4', // Cyan
  'Objective-Exploiter': '#f59e0b', // Amber
  'Objective-Saint': '#10b981',     // Emerald
  
  'Optimist-Trader': '#3b82f6',     // Blue
  'Optimist-Defensive': '#14b8a6',  // Teal
  'Optimist-Exploiter': '#ec4899',  // Pink
  'Optimist-Saint': '#a855f7',      // Purple
  
  'Pessimist-Trader': '#6b7280',    // Slate Gray
  'Pessimist-Defensive': '#1e293b', // Dark Charcoal Slate
  'Pessimist-Exploiter': '#ef4444', // Tomato Red
  'Pessimist-Saint': '#f43f5e',     // Rose Red
};

export const STRATEGY_LABELS: Record<string, { name: string; desc: string }> = {
  'Objective-Trader': { name: '客觀交易商', desc: '以牙還牙，對等回報，記憶真實' },
  'Objective-Defensive': { name: '客觀自保者', desc: '保守自保，加倍懷疑，記憶真實' },
  'Objective-Exploiter': { name: '客觀剝削者', desc: '恃強凌弱，欺善怕惡，記憶真實' },
  'Objective-Saint': { name: '客觀聖人', desc: '積極回報，大愛破冰，記憶真實' },
  
  'Optimist-Trader': { name: '樂觀交易商', desc: '以牙還牙，虧錢時美化對手' },
  'Optimist-Defensive': { name: '樂觀自保者', desc: '保守自保，虧錢時美化對手' },
  'Optimist-Exploiter': { name: '樂觀剝削者', desc: '極度貪婪，自我崇拜與過濾' },
  'Optimist-Saint': { name: '樂觀派聖人', desc: '極善使者，對世界報以厚望' },
  
  'Pessimist-Trader': { name: '悲觀交易商', desc: '以牙還牙，賺錢時懷疑對方' },
  'Pessimist-Defensive': { name: '悲觀自保者', desc: '加倍警惕，賺錢時依舊防備' },
  'Pessimist-Exploiter': { name: '悲觀剝削者', desc: '疑心病重的掠奪者，深刻記仇' },
  'Pessimist-Saint': { name: '悲觀派聖人', desc: '在懷疑與寬容之間糾結的信徒' },
};

export class SimulationEngine {
  public agents: Agent[] = [];
  public width: number;
  public height: number;
  public params: SimulationParams;
  public tickCount: number = 0;
  public collisionsThisTick: number = 0;
  
  // Collision visual effects
  public collisionVisuals: CollisionVisual[] = [];
  
  // History log for chart drawing
  public history: HistoryPoint[] = [];
  
  // Log of recent major events (e.g. mutant births, big transactions)
  public eventLog: { id: string; tick: number; message: string; type: string }[] = [];

  constructor(width: number, height: number, params: SimulationParams) {
    this.width = width;
    this.height = height;
    this.params = params;
    this.reset();
  }

  // Add an event to log
  private addLog(message: string, type: 'spawn' | 'death' | 'mutation' | 'epic_deal' | 'extinction') {
    this.eventLog.unshift({
      id: Math.random().toString(),
      tick: this.tickCount,
      message,
      type
    });
    // Keep last 40 events
    if (this.eventLog.length > 40) {
      this.eventLog.pop();
    }
  }

  // Initialize/Reset
  public reset() {
    this.tickCount = 0;
    this.agents = [];
    this.collisionVisuals = [];
    this.history = [];
    this.eventLog = [];
    
    // Create random initial agents
    const filterPool: MemoryFilter[] = [];
    const filterWeights = {
      'Objective': this.params.spawnRatioObjective,
      'Optimist': this.params.spawnRatioOptimist,
      'Pessimist': this.params.spawnRatioPessimist,
    };
    
    const totalFilters = filterWeights.Objective + filterWeights.Optimist + filterWeights.Pessimist;
    
    const stylePool: BehaviorStyle[] = [];
    const styleWeights = {
      'Trader': this.params.behaviorTraderRatio,
      'Defensive': this.params.behaviorDefensiveRatio,
      'Exploiter': this.params.behaviorExploiterRatio,
      'Saint': this.params.behaviorSaintRatio,
    };
    const totalStyles = styleWeights.Trader + styleWeights.Defensive + styleWeights.Exploiter + styleWeights.Saint;

    for (let i = 0; i < this.params.initialPopulation; i++) {
      // Pick random filter based on weights
      let filter: MemoryFilter = 'Objective';
      let rFilter = Math.random() * totalFilters;
      if (rFilter < filterWeights.Objective) {
        filter = 'Objective';
      } else if (rFilter < filterWeights.Objective + filterWeights.Optimist) {
        filter = 'Optimist';
      } else {
        filter = 'Pessimist';
      }

      // Pick random style based on weights
      let style: BehaviorStyle = 'Trader';
      let rStyle = Math.random() * totalStyles;
      if (rStyle < styleWeights.Trader) {
        style = 'Trader';
      } else if (rStyle < styleWeights.Trader + styleWeights.Defensive) {
        style = 'Defensive';
      } else if (rStyle < styleWeights.Trader + styleWeights.Defensive + styleWeights.Exploiter) {
        style = 'Exploiter';
      } else {
        style = 'Saint';
      }

      const minCap = this.params.minMemoryCapacity ?? 3;
      const maxCap = this.params.maxMemoryCapacity ?? 10;
      const memoryCapacity = Math.floor(Math.random() * (maxCap - minCap + 1)) + minCap;
      const color = COLOR_MAP[`${filter}-${style}`];

      // Spawn position (avoid getting stuck in walls)
      const radius = 5;
      const x = Math.random() * (this.width - radius * 4) + radius * 2;
      const y = Math.random() * (this.height - radius * 4) + radius * 2;
      
      // Random direction velocity
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * this.params.maxSpeed;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      // Lower start wealth if isHarshMode is active
      const startingWealth = this.params.isHarshMode ? 65 : 100;

      this.agents.push({
        id: generateId(),
        x,
        y,
        vx,
        vy,
        radius,
        wealth: startingWealth,
        memoryCapacity,
        memoryFilter: filter,
        behaviorStyle: style,
        memoryBook: {},
        color,
        generation: 1
      });
    }

    this.addLog(`實驗已重置。初始化派生了 ${this.agents.length} 個細胞實體。`, 'spawn');
    this.recordHistoryPoint();
  }

  // Master Step Function (Runs every frame / game tick)
  public step() {
    this.tickCount++;
    this.collisionsThisTick = 0;

    // 1. Survival Cost, death & reproduction
    this.applyEcology();

    // 2. Physics displacement (Movement, Random Walk, Wall Collision)
    this.updatePositions();

    // 3. Collision logic (Collision detection, Game triggers, Payoff updates, Push-apart)
    this.handleCollisions();

    // 4. Update visual effects
    this.updateVisualEffects();

    // 5. Periodically record chart history (every 5 Ticks)
    if (this.tickCount % 5 === 0) {
      this.recordHistoryPoint();
    }
  }

  // A. Survival Pressure (每回合扣除 wealth, 死亡移除, 分裂繁殖+突變)
  private applyEcology() {
    const survivalCost = this.params.survivalCost;
    const offspringList: Agent[] = [];
    const deadAgents: Agent[] = [];

    // Tracks remaining unique strategy group structures to detect extinction
    const beforeGroupCounts = this.getGroupStrategyCounts();

    this.agents = this.agents.filter(agent => {
      // Deduct survival cost
      agent.wealth -= survivalCost;
      
      // Check bankruptcy death
      if (agent.wealth <= 0) {
        deadAgents.push(agent);
        return false;
      }

      const fissionThreshold = this.params.isHarshMode ? 350 : 300;
      const splitParentWealth = this.params.isHarshMode ? 120 : 150;
      const splitChildWealth = this.params.isHarshMode ? 120 : 150;

      // Check cloning / fission
      if (agent.wealth >= fissionThreshold) {
        agent.wealth = splitParentWealth;
        
        let childFilter = agent.memoryFilter;
        let childStyle = agent.behaviorStyle;
        let childCapacity = agent.memoryCapacity;
        let mutated = false;
        let mutationMsg = '';

        // Mutation check (configurable via params.mutationRate)
        if (Math.random() < this.params.mutationRate) {
          mutated = true;
          const mutationType = Math.floor(Math.random() * 3);
          if (mutationType === 0) {
            // Mutate memoryFilter
            const filters: MemoryFilter[] = ['Objective', 'Optimist', 'Pessimist'];
            const availableFilters = filters.filter(f => f !== agent.memoryFilter);
            childFilter = availableFilters[Math.floor(Math.random() * availableFilters.length)];
            mutationMsg = `認知過濾器自 [${agent.memoryFilter}] 突變為 [${childFilter}]`;
          } else if (mutationType === 1) {
            // Mutate behaviorStyle
            const styles: BehaviorStyle[] = ['Trader', 'Defensive', 'Exploiter', 'Saint'];
            const availableStyles = styles.filter(s => s !== agent.behaviorStyle);
            childStyle = availableStyles[Math.floor(Math.random() * availableStyles.length)];
            mutationMsg = `決策風格自 [${agent.behaviorStyle}] 突變為 [${childStyle}]`;
          } else {
            // Mutate capacity (min 1, clamp to max 20)
            const delta = Math.random() < 0.5 ? -1 : 1;
            childCapacity = Math.max(1, Math.min(20, agent.memoryCapacity + delta));
            mutationMsg = `記憶容量自 ${agent.memoryCapacity} 突變為 ${childCapacity}`;
          }
        }

        const childColor = COLOR_MAP[`${childFilter}-${childStyle}`];
        // Give offspring a slight position nudge to avoid direct immediate collision overlapping
        const offsetAngle = Math.random() * Math.PI * 2;
        const offsetDist = agent.radius * 2.2;
        
        // Ensure within boundaries
        let cx = agent.x + Math.cos(offsetAngle) * offsetDist;
        let cy = agent.y + Math.sin(offsetAngle) * offsetDist;
        cx = Math.max(agent.radius * 2, Math.min(this.width - agent.radius * 2, cx));
        cy = Math.max(agent.radius * 2, Math.min(this.height - agent.radius * 2, cy));

        const offspring: Agent = {
          id: generateId(),
          x: cx,
          y: cy,
          // Opposite velocity vector of parent + small offset
          vx: -agent.vx + (Math.random() - 0.5) * 0.2,
          vy: -agent.vy + (Math.random() - 0.5) * 0.2,
          radius: agent.radius,
          wealth: splitChildWealth,
          memoryCapacity: childCapacity,
          memoryFilter: childFilter,
          behaviorStyle: childStyle,
          memoryBook: JSON.parse(JSON.stringify(agent.memoryBook)), // inherits parent memory!
          color: childColor,
          generation: agent.generation + 1,
          parentStrategy: `${agent.memoryFilter}-${agent.behaviorStyle}`
        };

        offspringList.push(offspring);

        if (mutated) {
          const formatParent = `${agent.memoryFilter}-${agent.behaviorStyle}`;
          const formatChild = `${childFilter}-${childStyle}`;
          this.addLog(`🧬 基因突變！分身實體發生轉變：${mutationMsg} (${formatParent} ➡️ ${formatChild})`, 'mutation');
        } else {
          this.addLog(`🌱 繁殖裂變：${agent.memoryFilter}-${agent.behaviorStyle} 成功自我分裂出一代新細胞 (世代 ${offspring.generation})`, 'spawn');
        }
      }

      return true;
    });

    // Add newborn offspring
    this.agents.push(...offspringList);

    // Alert regarding deaths if significant or log general count
    if (deadAgents.length > 0) {
      if (this.agents.length === 0) {
        this.addLog(`💀 悲劇：生物圈內所有生命皆因破產滅絕！`, 'extinction');
      } else if (deadAgents.length >= 5) {
        this.addLog(`💀 生存清洗：本輪有多達 ${deadAgents.length} 個虛弱細胞因能量耗盡而破產溶解。`, 'death');
      }
    }

    // Extinction warning checks
    const afterGroupCounts = this.getGroupStrategyCounts();
    for (const [strategy, count] of Object.entries(beforeGroupCounts)) {
      if (count > 0 && afterGroupCounts[strategy] === 0) {
        const label = STRATEGY_LABELS[strategy]?.name || strategy;
        this.addLog(`⚠️ 物種滅絕報告：群落中最後一隻「${label} (${strategy})」策略組合宣布消亡！`, 'extinction');
      }
    }
  }

  // Get headcount distribution grouped by strategy key
  private getGroupStrategyCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const agent of this.agents) {
      const key = `${agent.memoryFilter}-${agent.behaviorStyle}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }

  // B. Physics displacement & wall rebound
  private updatePositions() {
    const r = 5; // standard radius
    for (const agent of this.agents) {
      // 1. Move position
      agent.x += agent.vx;
      agent.y += agent.vy;

      // 2. Bound conditions (Hard walls reflection)
      if (agent.x - r < 0) {
        agent.x = r;
        agent.vx = -agent.vx;
      } else if (agent.x + r > this.width) {
        agent.x = this.width - r;
        agent.vx = -agent.vx;
      }

      if (agent.y - r < 0) {
        agent.y = r;
        agent.vy = -agent.vy;
      } else if (agent.y + r > this.height) {
        agent.y = this.height - r;
        agent.vy = -agent.vy;
      }

      // 3. Random Brownian Walk (微小隨機增量)
      agent.vx += (Math.random() - 0.5) * 0.15;
      agent.vy += (Math.random() - 0.5) * 0.15;

      // 4. Limit velocities
      const speed = Math.sqrt(agent.vx * agent.vx + agent.vy * agent.vy);
      if (speed > this.params.maxSpeed) {
        agent.vx = (agent.vx / speed) * this.params.maxSpeed;
        agent.vy = (agent.vy / speed) * this.params.maxSpeed;
      }
    }
  }

  // C. Collision detection, physics response and continuous trust transactions
  private handleCollisions() {
    const size = this.agents.length;
    
    // To prevent double interactions inside the same frame, let's keep a history set
    const interactionsInFrame = new Set<string>();

    for (let i = 0; i < size; i++) {
      for (let j = i + 1; j < size; j++) {
        const a = this.agents[i];
        const b = this.agents[j];

        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const touchDist = a.radius + b.radius;

        // Collision detected
        if (distance <= touchDist) {
          const pairKey0 = `${a.id}:${b.id}`;
          const pairKey1 = `${b.id}:${a.id}`;
          if (interactionsInFrame.has(pairKey0) || interactionsInFrame.has(pairKey1)) {
            continue;
          }
          interactionsInFrame.add(pairKey0);
          
          this.collisionsThisTick++;

          // 1. Immediately push them away (各推開距離 r) along their center lines to resolve overlap
          let ux = dx / (distance || 1);
          let uy = dy / (distance || 1);
          if (distance === 0) {
            // random direction if overlapping exactly
            const angle = Math.random() * Math.PI * 2;
            ux = Math.cos(angle);
            uy = Math.sin(angle);
          }

          a.x += ux * a.radius;
          a.y += uy * a.radius;
          b.x -= ux * b.radius;
          b.y -= uy * b.radius;

          // 2. In addition, let's do a basic physical velocity rebound (elastic reflection)
          // to make simulation movement look incredibly fluid and premium!
          const kx = a.vx - b.vx;
          const ky = a.vy - b.vy;
          const p = 2 * (ux * kx + uy * ky) / 2; // assuming same mass = 1
          
          a.vx -= p * ux;
          a.vy -= p * uy;
          b.vx += p * ux;
          b.vy += p * uy;

          // Clamped after collision to prevent excessive speed boosts
          const a_speed = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
          if (a_speed > this.params.maxSpeed) {
            a.vx = (a.vx / a_speed) * this.params.maxSpeed;
            a.vy = (a.vy / a_speed) * this.params.maxSpeed;
          }
          const b_speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          if (b_speed > this.params.maxSpeed) {
            b.vx = (b.vx / b_speed) * this.params.maxSpeed;
            b.vy = (b.vy / b_speed) * this.params.maxSpeed;
          }

          // 3. Trigger continuous trust game between A and B
          this.executeTrustGame(a, b);

          // 4. Create nice graphical collision visual ring
          this.createCollisionVisual((a.x + b.x) / 2, (a.y + b.y) / 2, a.color);
        }
      }
    }
  }

  // Executes the trust game between two colliding agents
  private executeTrustGame(a: Agent, b: Agent) {
    // A's memory expectation of B
    const memA_B = a.memoryBook[b.id];
    const expectationB = memA_B && memA_B.length > 0 
      ? memA_B.reduce((sum, v) => sum + v, 0) / memA_B.length 
      : 0.5;

    // B's memory expectation of A
    const memB_A = b.memoryBook[a.id];
    const expectationA = memB_A && memB_A.length > 0 
      ? memB_A.reduce((sum, v) => sum + v, 0) / memB_A.length 
      : 0.5;

    // Output bids based on style
    const pA = this.getBid(expectationB, a.behaviorStyle);
    const pB = this.getBid(expectationA, b.behaviorStyle);

    // Payoff formulas:
    // delta_W_a = multiplier * [ 3 * P_b - P_a ]
    // delta_W_b = multiplier * [ 3 * P_a - P_b ]
    const baseMultiplier = this.params.payoffMultiplier ?? 10;
    const finalMultiplier = baseMultiplier * (this.params.isScarcityMode ? 0.5 : 1.0);
    const deltaWA = finalMultiplier * (3 * pB - pA);
    const deltaWB = finalMultiplier * (3 * pA - pB);

    // Apply wealth changes
    a.wealth += deltaWA;
    b.wealth += deltaWB;

    // Apply memory filters to update records
    this.updateMemoryRecord(a, b.id, pB, deltaWA);
    this.updateMemoryRecord(b, a.id, pA, deltaWB);

    // Add high stakes logs sometimes to make game history intriguing
    if (Math.abs(deltaWA) >= 15 || Math.abs(deltaWB) >= 15) {
      const typeA = `${a.memoryFilter}-${a.behaviorStyle}`;
      const typeB = `${b.memoryFilter}-${b.behaviorStyle}`;
      this.addLog(
        `🤝 高額交易：${typeA} 與 ${typeB} 發生高額博弈。A出價:${pA.toFixed(2)} (${deltaWA > 0 ? '+' : ''}${deltaWA.toFixed(1)}), B出價:${pB.toFixed(2)} (${deltaWB > 0 ? '+' : ''}${deltaWB.toFixed(1)})`,
        'epic_deal'
      );
    }
  }

  // Get agent bid based on style and target expectation
  private getBid(expectation: number, style: BehaviorStyle): number {
    switch (style) {
      case 'Trader':
        // Trader (以牙還牙商：對等回報): P = E
        return expectation;
      case 'Defensive':
        // Defensive (膽小防衛者：加倍自保): P = E^2
        return Math.pow(expectation, 2);
      case 'Exploiter':
        // Exploiter (割韭菜大師：欺善怕惡): P = 1.0 - E
        return 1.0 - expectation;
      case 'Saint':
        // Saint (豪賭聖人：主動破冰): P = sqrt(E)
        return Math.sqrt(expectation);
      default:
        return 0.5;
    }
  }

  // Update memory filter strategy
  private updateMemoryRecord(agent: Agent, opponentId: string, opponentRealBid: number, deltaW: number) {
    if (!agent.memoryBook[opponentId]) {
      agent.memoryBook[opponentId] = [];
    }

    let memoryBid = opponentRealBid;

    switch (agent.memoryFilter) {
      case 'Objective':
        // Direct insert
        memoryBid = opponentRealBid;
        break;
      case 'Optimist':
        // Optimist (樂觀記正向派)
        if (deltaW >= 0) {
          memoryBid = opponentRealBid;
        } else {
          // automatic mind-filtering, insert min(P + 0.3, 1.0)
          memoryBid = Math.min(opponentRealBid + 0.3, 1.0);
        }
        break;
      case 'Pessimist':
        // Pessimist (悲觀記仇派)
        if (deltaW < 0) {
          memoryBid = opponentRealBid;
        } else {
          // Suspicious of counterpart, insert max(P - 0.2, 0.0)
          memoryBid = Math.max(opponentRealBid - 0.2, 0.0);
        }
        break;
    }

    const records = agent.memoryBook[opponentId];
    records.push(memoryBid);

    // Limit length to agent's memory capacity capacity (M)
    while (records.length > agent.memoryCapacity) {
      records.shift();
    }
  }

  // Creates animated fading ring effect in collision points
  private createCollisionVisual(x: number, y: number, color: string) {
    this.collisionVisuals.push({
      x,
      y,
      radius: 2,
      maxRadius: 18,
      alpha: 0.8,
      duration: 15, // 15 frames duration
      elapsed: 0,
      color,
    });

    if (this.collisionVisuals.length > 50) {
      this.collisionVisuals.shift(); // keep visual cache clean
    }
  }

  // Tick the collision visualizations
  private updateVisualEffects() {
    this.collisionVisuals = this.collisionVisuals.map(effect => {
      effect.elapsed++;
      const progress = effect.elapsed / effect.duration;
      effect.radius = effect.radius + (effect.maxRadius - effect.radius) * 0.15;
      effect.alpha = Math.max(0, 0.8 * (1 - progress));
      return effect;
    }).filter(effect => effect.elapsed < effect.duration);
  }

  // Collect history data points for graphs
  public recordHistoryPoint() {
    const countsOfFilters: Record<MemoryFilter, number> = { Objective: 0, Optimist: 0, Pessimist: 0 };
    const countsOfStyles: Record<BehaviorStyle, number> = { Trader: 0, Defensive: 0, Exploiter: 0, Saint: 0 };
    
    // Group-specific counts and wealth sum
    const strategyStatsMap: Record<string, { count: number; totalWealth: number }> = {};
    for (const filter of ['Objective', 'Optimist', 'Pessimist'] as MemoryFilter[]) {
      for (const style of ['Trader', 'Defensive', 'Exploiter', 'Saint'] as BehaviorStyle[]) {
        strategyStatsMap[`${filter}-${style}`] = { count: 0, totalWealth: 0 };
      }
    }

    let totalW = 0;
    
    for (const agent of this.agents) {
      countsOfFilters[agent.memoryFilter]++;
      countsOfStyles[agent.behaviorStyle]++;
      totalW += agent.wealth;
      
      const key = `${agent.memoryFilter}-${agent.behaviorStyle}`;
      if (strategyStatsMap[key]) {
        strategyStatsMap[key].count++;
        strategyStatsMap[key].totalWealth += agent.wealth;
      }
    }

    const strategyStatsList = Object.entries(strategyStatsMap).map(([key, data]) => ({
      strategyKey: key,
      count: data.count,
      wealth: data.totalWealth,
    }));

    this.history.push({
      tick: this.tickCount,
      totalPopulation: this.agents.length,
      totalWealth: parseFloat(totalW.toFixed(1)),
      filterCounts: countsOfFilters,
      styleCounts: countsOfStyles,
      strategyStats: strategyStatsList,
    });

    // Limit history length to avoid high memory profile in tabs (max 1000 data points)
    if (this.history.length > 1000) {
      this.history.shift();
    }
  }

  // Computes the strategy combination leaderboard
  public getLeaderboard(): StrategyGroupStats[] {
    const statsMap: Record<string, { count: number; totalWealth: number }> = {};
    
    // Initialize full 12 combination rows so every combination is always visible in UI
    const filters: MemoryFilter[] = ['Objective', 'Optimist', 'Pessimist'];
    const styles: BehaviorStyle[] = ['Trader', 'Defensive', 'Exploiter', 'Saint'];

    for (const f of filters) {
      for (const s of styles) {
        statsMap[`${f}-${s}`] = { count: 0, totalWealth: 0 };
      }
    }

    let activeCountSum = 0;
    for (const agent of this.agents) {
      const key = `${agent.memoryFilter}-${agent.behaviorStyle}`;
      if (statsMap[key]) {
        statsMap[key].count++;
        statsMap[key].totalWealth += agent.wealth;
        activeCountSum++;
      }
    }

    const leaderboard: StrategyGroupStats[] = [];
    for (const key of Object.keys(statsMap)) {
      const parts = key.split('-');
      const filter = parts[0] as MemoryFilter;
      const style = parts[1] as BehaviorStyle;
      const d = statsMap[key];

      leaderboard.push({
        filter,
        style,
        color: COLOR_MAP[key] || '#cccccc',
        count: d.count,
        ratio: activeCountSum > 0 ? parseFloat(((d.count / activeCountSum) * 100).toFixed(1)) : 0,
        avgWealth: d.count > 0 ? parseFloat((d.totalWealth / d.count).toFixed(1)) : 0,
        totalWealth: parseFloat(d.totalWealth.toFixed(1)),
      });
    }

    // Sort leaderboard desc based on headcounts first, then total wealth
    return leaderboard.sort((x, y) => {
      if (y.count !== x.count) {
        return y.count - x.count;
      }
      return y.totalWealth - x.totalWealth;
    });
  }
}
