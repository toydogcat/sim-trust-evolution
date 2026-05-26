/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface EventLogItem {
  id: string;
  tick: number;
  message: string;
  type: string;
}

interface EventLogWidgetProps {
  logs: EventLogItem[];
}

export const EventLogWidget: React.FC<EventLogWidgetProps> = ({ logs }) => {
  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'spawn':
        return 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20';
      case 'death':
        return 'bg-rose-950/40 text-rose-400 border border-rose-500/20';
      case 'mutation':
        return 'bg-violet-950/40 text-violet-400 border border-violet-500/20';
      case 'epic_deal':
        return 'bg-amber-950/40 text-amber-400 border border-amber-500/20';
      case 'extinction':
        return 'bg-red-950/40 text-red-400 border border-red-500/20 animate-pulse';
      default:
        return 'bg-slate-900 border border-white/5 text-slate-300';
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'spawn':
        return '分裂 / 繁衍';
      case 'death':
        return '消亡';
      case 'mutation':
        return '🧬 突變';
      case 'epic_deal':
        return '🤝 生態商談';
      case 'extinction':
        return '⚠️ 滅絕';
      default:
        return '事件';
    }
  };

  return (
    <div className="bg-[#0F1218] p-4 border border-white/10 rounded-2xl shadow-sm flex flex-col h-[230px]">
      <h3 className="font-sans font-semibold text-sm text-white tracking-tight flex items-center gap-1.5 mb-3">
        <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        生態實時事件日誌
      </h3>

      <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">
            尚無重大演化事件。
          </div>
        ) : (
          logs.map((item) => (
            <div
              key={item.id}
              className="p-2 rounded-xl bg-slate-900/40 border border-white/5 hover:bg-slate-900 transition-colors flex items-start gap-2.5"
            >
              <div className="flex flex-col items-center justify-center">
                <span className="font-mono text-[9px] font-bold text-slate-400 bg-white/5 border border-white/5 px-1 rounded">
                  Tick {item.tick}
                </span>
                <span className={`text-[8px] px-1 font-medium rounded mt-1 whitespace-nowrap ${getBadgeStyle(item.type)}`}>
                  {getLabel(item.type)}
                </span>
              </div>
              <p className="text-xs text-slate-300 flex-1 leading-relaxed break-all font-sans">
                {item.message}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
