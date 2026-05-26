/**
 * visualizer.js — Network Graph + Trust Chart Renderer
 *
 * Uses Canvas 2D for network visualization.
 * Uses Chart.js (loaded via CDN in index.html) for the time-series chart.
 */

'use strict';

/* ── Color helpers ─────────────────────────────────────────── */
function trustColor(trust) {
  // 0 → red (#f43f5e), 0.5 → amber (#f59e0b), 1 → cyan (#22d3ee)
  const t = Math.max(0, Math.min(1, trust));
  if (t < 0.5) {
    const p = t * 2; // 0→1
    // red → amber
    const r = Math.round(244 + (245 - 244) * p);
    const g = Math.round(63  + (158 - 63)  * p);
    const b = Math.round(94  + (11  - 94)  * p);
    return `rgb(${r},${g},${b})`;
  } else {
    const p = (t - 0.5) * 2; // 0→1
    // amber → cyan
    const r = Math.round(245 + (34  - 245) * p);
    const g = Math.round(158 + (211 - 158) * p);
    const b = Math.round(11  + (238 - 11)  * p);
    return `rgb(${r},${g},${b})`;
  }
}

function edgeColor(trustI, trustJ, alpha = 0.35) {
  const avg = (trustI + trustJ) / 2;
  if (avg > 0.6)       return `rgba(34,211,238,${alpha})`;
  else if (avg > 0.35) return `rgba(245,158,11,${alpha})`;
  else                 return `rgba(244,63,94,${alpha})`;
}

/* ── NetworkRenderer ───────────────────────────────────────── */
class NetworkRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx    = this.canvas.getContext('2d');

    // Hover state
    this.hoveredId = null;
    this.tooltip   = document.getElementById('agent-tooltip');

    this._bindEvents();
  }

  _bindEvents() {
    this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => {
      this.hoveredId = null;
      if (this.tooltip) this.tooltip.classList.remove('show');
    });
  }

  _onMouseMove(e) {
    if (!this._agents) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const my = (e.clientY - rect.top)  / rect.height;

    let closest = null, minDist = Infinity;
    for (const a of this._agents) {
      const dx = a.x - mx, dy = a.y - my;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d < minDist) { minDist = d; closest = a; }
    }

    const threshold = 0.05;
    if (minDist < threshold && closest) {
      this.hoveredId = closest.id;
      if (this.tooltip) {
        const trust = closest.avgTrust;
        const coop  = (closest.recentCoopRate * 100).toFixed(0);
        this.tooltip.innerHTML =
          `<b>Agent #${closest.id}</b><br>` +
          `信任度：${(trust*100).toFixed(1)}%<br>` +
          `合作率：${coop}%<br>` +
          `鄰居：${Object.keys(closest.trust).length} 位`;
        this.tooltip.style.left = (e.clientX + 12) + 'px';
        this.tooltip.style.top  = (e.clientY - 10) + 'px';
        this.tooltip.classList.add('show');
      }
    } else {
      this.hoveredId = null;
      if (this.tooltip) this.tooltip.classList.remove('show');
    }
  }

  /** Resize canvas to match CSS display size (pixel-perfect on HiDPI) */
  resize() {
    const dpr  = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const w    = Math.floor(rect.width  * dpr);
    const h    = Math.floor(rect.height * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width  = w;
      this.canvas.height = h;
      this.ctx.scale(dpr, dpr);
    }
  }

  /** Main render call */
  render(agents, edges) {
    this._agents = agents;
    this._edges  = edges;

    this.resize();
    const { ctx, canvas } = this;
    const W = canvas.getBoundingClientRect().width;
    const H = canvas.getBoundingClientRect().height;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Draw edges
    for (const [i, j] of edges) {
      const a = agents[i], b = agents[j];
      if (!a || !b) continue;
      const ti = a.trust[j] ?? 0.5;
      const tj = b.trust[i] ?? 0.5;
      ctx.beginPath();
      ctx.moveTo(a.x * W, a.y * H);
      ctx.lineTo(b.x * W, b.y * H);
      ctx.strokeStyle = edgeColor(ti, tj, 0.4);
      ctx.lineWidth   = 1 + (ti + tj) * 0.4;
      ctx.stroke();
    }

    // Draw nodes
    for (const agent of agents) {
      const cx = agent.x * W;
      const cy = agent.y * H;
      const trust = agent.avgTrust;
      const color = trustColor(trust);
      const isHovered = agent.id === this.hoveredId;
      const r = isHovered ? 10 : (5 + trust * 3);

      // Glow
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.5);
      glow.addColorStop(0, color.replace('rgb', 'rgba').replace(')', `,${isHovered ? 0.5 : 0.3})`));
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, r * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Node body
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Border
      ctx.lineWidth   = isHovered ? 2.5 : 1;
      ctx.strokeStyle = isHovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)';
      ctx.stroke();
    }
  }

  /** Render a placeholder "waiting" state */
  renderIdle(W, H) {
    this.resize();
    const { ctx } = this;
    const w = this.canvas.getBoundingClientRect().width;
    const h = this.canvas.getBoundingClientRect().height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(148,163,184,0.2)';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('點擊「初始化」開始模擬', w / 2, h / 2);
  }
}

/* ── TrustChart (Chart.js wrapper) ─────────────────────────── */
class TrustChart {
  constructor(canvasId) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: '平均信任度',
            data: [],
            borderColor: '#22d3ee',
            backgroundColor: 'rgba(34,211,238,0.08)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2,
          },
          {
            label: '合作率',
            data: [],
            borderColor: '#a855f7',
            backgroundColor: 'rgba(168,85,247,0.06)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            grid:  { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#475569', font: { size: 10 }, maxTicksLimit: 10 },
            title: { display: true, text: '回合', color: '#475569', font: { size: 11 } },
          },
          y: {
            min: 0, max: 1,
            grid:  { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#475569', font: { size: 10 },
              callback: v => (v * 100).toFixed(0) + '%' },
          },
        },
        plugins: {
          legend: {
            labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 14 },
          },
          tooltip: {
            backgroundColor: 'rgba(13,20,36,0.95)',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            titleColor: '#e2e8f0',
            bodyColor:  '#94a3b8',
            callbacks: {
              label: ctx => `${ctx.dataset.label}：${(ctx.raw * 100).toFixed(1)}%`,
            },
          },
        },
      },
    });
  }

  update(rounds, trustArr, coopArr) {
    // Keep last 200 points for performance
    const MAX = 200;
    const labels = rounds.slice(-MAX).map(r => `R${r}`);
    const trust  = trustArr.slice(-MAX);
    const coop   = coopArr.slice(-MAX);

    this.chart.data.labels           = labels;
    this.chart.data.datasets[0].data = trust;
    this.chart.data.datasets[1].data = coop;
    this.chart.update('none');
  }

  reset() {
    this.chart.data.labels           = [];
    this.chart.data.datasets[0].data = [];
    this.chart.data.datasets[1].data = [];
    this.chart.update('none');
  }
}

// Export to global
window.NetworkRenderer = NetworkRenderer;
window.TrustChart      = TrustChart;
window.trustColor      = trustColor;
