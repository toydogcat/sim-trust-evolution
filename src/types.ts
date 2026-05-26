/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MemoryFilter = 'Objective' | 'Optimist' | 'Pessimist';
export type BehaviorStyle = 'Trader' | 'Defensive' | 'Exploiter' | 'Saint';

export interface Agent {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  wealth: number;
  
  // Genotype (基因型)
  memoryCapacity: number; // M：聰明度：能記住對手的最近互動次數 M (例如 3 ~ 10)
  memoryFilter: MemoryFilter; // 記憶策略過濾器
  behaviorStyle: BehaviorStyle; // 行為決策風格
  
  // Memory
  // 記錄格式：{ '對手的agent_id': [ 歷史過濾後的P_opponent, ... ] }
  memoryBook: Record<string, number[]>;
  
  color: string; // 顏色
  generation: number; // 代數
  parentStrategy?: string; // 記錄母體策略
}

export interface CollisionVisual {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  duration: number; // total frames
  elapsed: number; // current frame
  color: string;
}

export interface SimulationParams {
  survivalCost: number;       // 生存成本：每回合扣費
  initialPopulation: number;  // 初始人數
  mutationRate: number;       // 突變率 (0% ~ 10%)
  maxSpeed: number;           // 最高速度
  spawnRatioObjective: number; // 初始Objective比例
  spawnRatioOptimist: number;  // 初始Optimist比例
  spawnRatioPessimist: number; // 初始Pessimist比例
  behaviorTraderRatio: number;
  behaviorDefensiveRatio: number;
  behaviorExploiterRatio: number;
  behaviorSaintRatio: number;
  payoffMultiplier: number;    // 博弈收益倍率 (1 ~ 30, e.g. 10)
  isHarshMode: boolean;       // 生存地獄模式 (生存扣發、多突變、少重置金幣)
  isScarcityMode: boolean;    // 物物匱乏/崩塌模式 (博弈產產值打折)
  minMemoryCapacity: number;  // 記憶容量隨機下限
  maxMemoryCapacity: number;  // 記憶容量隨機上限
}

export interface StrategyGroupStats {
  filter: MemoryFilter;
  style: BehaviorStyle;
  color: string;
  count: number;
  ratio: number; // percentage
  avgWealth: number;
  totalWealth: number;
}

export interface HistoryPoint {
  tick: number;
  totalPopulation: number;
  totalWealth: number;
  filterCounts: Record<MemoryFilter, number>;
  styleCounts: Record<BehaviorStyle, number>;
  strategyStats: { strategyKey: string; count: number; wealth: number }[];
}
