/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HistoryPoint, MemoryFilter, BehaviorStyle } from '../types';
import { COLOR_MAP } from '../simulationEngine';

interface HistoryChartProps {
  history: HistoryPoint[];
}

type ChartTab = 'population' | 'filters' | 'styles' | 'wealth';

export const HistoryChart: React.FC<HistoryChartProps> = ({ history }) => {
  const [activeTab, setActiveTab] = useState<ChartTab>('population');

  const width = 500;
  const height = 180;
  const paddingLeft = 40;
  const paddingRight = 10;
  const paddingTop = 15;
  const paddingBottom = 25;

  if (history.length < 2) {
    return (
      <div className="h-[210px] flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl bg-[#0F1218] text-slate-400 text-xs">
        <svg className="w-8 h-8 opacity-40 mb-2 animate-pulse text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <span>等待模擬運行中，累積數據後將繪製演化趨勢圖...</span>
      </div>
    );
  }

  // Max points to show to prevent performance degradation on long runs
  const maxDisplayPoints = 100;
  let sampledHistory = history;
  if (history.length > maxDisplayPoints) {
    const stepBytes = Math.ceil(history.length / maxDisplayPoints);
    sampledHistory = [];
    for (let i = 0; i < history.length; i += stepBytes) {
      sampledHistory.push(history[i]);
    }
    // Always include latest
    if (sampledHistory[sampledHistory.length - 1].tick !== history[history.length - 1].tick) {
      sampledHistory.push(history[history.length - 1]);
    }
  }

  const linesToDraw: { label: string; color: string; values: number[] }[] = [];

  if (activeTab === 'population') {
    linesToDraw.push({
      label: '社會總個體數',
      color: '#4f46e5', // indigo
      values: sampledHistory.map(h => h.totalPopulation),
    });
  } else if (activeTab === 'filters') {
    linesToDraw.push(
      {
        label: '客觀理性派 (Objective)',
        color: '#6366f1',
        values: sampledHistory.map(h => h.filterCounts.Objective),
      },
      {
        label: '樂觀記正派 (Optimist)',
        color: '#3b82f6',
        values: sampledHistory.map(h => h.filterCounts.Optimist),
      },
      {
        label: '悲觀記仇派 (Pessimist)',
        color: '#ef4444',
        values: sampledHistory.map(h => h.filterCounts.Pessimist),
      }
    );
  } else if (activeTab === 'styles') {
    linesToDraw.push(
      {
        label: '交易商 (Trader)',
        color: '#a855f7',
        values: sampledHistory.map(h => h.styleCounts.Trader),
      },
      {
        label: '防衛者 (Defensive)',
        color: '#14b8a6',
        values: sampledHistory.map(h => h.styleCounts.Defensive),
      },
      {
        label: '剝削者 (Exploiter)',
        color: '#f43f5e',
        values: sampledHistory.map(h => h.styleCounts.Exploiter),
      },
      {
        label: '聖人 (Saint)',
        color: '#10b981',
        values: sampledHistory.map(h => h.styleCounts.Saint),
      }
    );
  } else if (activeTab === 'wealth') {
    linesToDraw.push({
      label: '社會總財富 (Wealth)',
      color: '#f59e0b', // amber
      values: sampledHistory.map(h => h.totalWealth),
    });
  }

  // Find max value across all drawn lines for scaling y-axis
  let maxVal = 0;
  linesToDraw.forEach(line => {
    line.values.forEach(v => {
      if (v > maxVal) maxVal = v;
    });
  });
  if (maxVal === 0) maxVal = 10;
  // Round maxVal upwards
  maxVal = Math.ceil(maxVal * 1.1);

  const getPointsPath = (values: number[]) => {
    const size = values.length;
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;
    
    return values.map((val, idx) => {
      const x = paddingLeft + (idx / (size - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (val / maxVal) * chartHeight;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };

  const ticksCount = 5;
  const yTicks = Array.from({ length: ticksCount }, (_, i) => (maxVal * i) / (ticksCount - 1));
  const xTicks = Array.from({ length: 4 }, (_, i) => {
    const idx = Math.floor((sampledHistory.length - 1) * i / 3);
    return sampledHistory[idx]?.tick ?? 0;
  });

  return (
    <div className="bg-[#0F1218] p-4 border border-white/10 rounded-2xl shadow-sm text-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <h3 className="font-sans font-semibold text-sm text-white tracking-tight flex items-center gap-1.5">
          <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          演化趨勢分析
        </h3>
        <div className="flex flex-wrap gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5">
          <button
            id="chart-tab-population"
            onClick={() => setActiveTab('population')}
            className={`px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'population'
                ? 'bg-blue-600 text-white shadow-sm border border-blue-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            總人口
          </button>
          <button
            id="chart-tab-filters"
            onClick={() => setActiveTab('filters')}
            className={`px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'filters'
                ? 'bg-blue-600 text-white shadow-sm border border-blue-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            認知過濾
          </button>
          <button
            id="chart-tab-styles"
            onClick={() => setActiveTab('styles')}
            className={`px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'styles'
                ? 'bg-blue-600 text-white shadow-sm border border-blue-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            行為決策
          </button>
          <button
            id="chart-tab-wealth"
            onClick={() => setActiveTab('wealth')}
            className={`px-2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === 'wealth'
                ? 'bg-blue-600 text-white shadow-sm border border-blue-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            總能量財富
          </button>
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
          {/* Grid lines */}
          {yTicks.map((tickVal, idx) => {
            const chartHeight = height - paddingTop - paddingBottom;
            const y = paddingTop + chartHeight - (tickVal / maxVal) * chartHeight;
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth={1}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="font-mono text-[9px] fill-slate-500"
                >
                  {tickVal.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* X ticks */}
          {xTicks.map((tickVal, idx) => {
            const chartWidth = width - paddingLeft - paddingRight;
            const x = paddingLeft + (idx / (xTicks.length - 1)) * chartWidth;
            return (
              <g key={idx}>
                <line
                  x1={x}
                  y1={height - paddingBottom}
                  x2={x}
                  y2={height - paddingBottom + 4}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={height - paddingBottom + 14}
                  textAnchor="middle"
                  className="font-mono text-[9px] fill-slate-500"
                >
                  {tickVal}
                </text>
              </g>
            );
          })}

          {/* Axes */}
          <line
            x1={paddingLeft}
            y1={height - paddingBottom}
            x2={width - paddingRight}
            y2={height - paddingBottom}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={1}
          />
          <line
            x1={paddingLeft}
            y1={paddingTop}
            x2={paddingLeft}
            y2={height - paddingBottom}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={1}
          />

          {/* Trend lines */}
          {linesToDraw.map((line, idx) => (
            <path
              key={idx}
              d={getPointsPath(line.values)}
              fill="none"
              stroke={line.color}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
          ))}
        </svg>
      </div>

      {/* Legends info */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-2.5 pt-2 border-t border-white/5">
        {linesToDraw.map((line, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: line.color }}></span>
            <span className="text-[10px] text-slate-400 font-medium">{line.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
