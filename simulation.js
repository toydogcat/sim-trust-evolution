/**
 * simulation.js — Trust Evolution Simulation Engine
 *
 * Model: Iterated Prisoner's Dilemma on a random network
 * - Each agent maintains a trust level toward each neighbor (0..1)
 * - Each round: agents decide to Cooperate or Defect based on trust + noise
 * - Payoffs update trust values (Pavlov-like update rule)
 * - Network: Erdős–Rényi random graph (or small-world option)
 */

'use strict';

/* ── Payoff matrix (standard IPD, T > R > P > S) ─────────── */
const PAYOFF = {
  //            B cooperates   B defects
  // A cooperates  [R, R]        [S, T]
  // A defects     [T, S]        [P, P]
  R: 3,   // Reward for mutual cooperation
  T: 5,   // Temptation (defection when other cooperates)
  S: 0,   // Sucker's payoff (cooperated while other defected)
  P: 1,   // Punishment for mutual defection
};

/* ── Agent class ──────────────────────────────────────────── */
class Agent {
  constructor(id, x, y) {
    this.id   = id;
    this.x    = x;
    this.y    = y;

    // Trust toward each neighbor: agentId -> [0, 1]
    this.trust = {};

    // Cumulative score this round
    this.score = 0;

    // Cooperation ratio (last 10 rounds, for color mapping)
    this.coopHistory = [];

    // Last action per neighbor
    this.lastAction = {};
  }

  /** Initialize trust to neighbors with a given distribution */
  initTrust(neighborIds, dist) {
    for (const nid of neighborIds) {
      switch (dist) {
        case 'high':   this.trust[nid] = 0.7 + Math.random() * 0.3; break;
        case 'low':    this.trust[nid] = Math.random() * 0.3; break;
        case 'mixed':  this.trust[nid] = Math.random() < 0.5 ? Math.random() * 0.3 : 0.7 + Math.random() * 0.3; break;
        default:       this.trust[nid] = Math.random(); // uniform
      }
    }
  }

  /** Decide: cooperate (true) or defect (false) with neighbor nid */
  decide(nid, noise) {
    const t = this.trust[nid] ?? 0.5;
    // Probabilistic: cooperate with probability = trust, perturbed by noise
    const prob = clamp(t + (Math.random() - 0.5) * noise, 0, 1);
    return Math.random() < prob;
  }

  /** Update trust toward nid given payoff received */
  updateTrust(nid, payoff, leniency) {
    // Normalize payoff to [-1, +1] range based on min/max
    const norm = (payoff - PAYOFF.P) / (PAYOFF.T - PAYOFF.P) * 2 - 1; // -1..+1
    const delta = norm * leniency * 0.15;
    this.trust[nid] = clamp((this.trust[nid] ?? 0.5) + delta, 0, 1);
  }

  /** Average trust toward all neighbors */
  get avgTrust() {
    const vals = Object.values(this.trust);
    if (!vals.length) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  /** Push coop result and trim history */
  recordCoop(cooperated) {
    this.coopHistory.push(cooperated ? 1 : 0);
    if (this.coopHistory.length > 10) this.coopHistory.shift();
  }

  get recentCoopRate() {
    if (!this.coopHistory.length) return 0.5;
    return this.coopHistory.reduce((a, b) => a + b, 0) / this.coopHistory.length;
  }
}

/* ── Simulation class ─────────────────────────────────────── */
class Simulation {
  constructor() {
    this.agents  = [];
    this.edges   = [];
    this.round   = 0;
    this.running = false;
    this.timer   = null;

    // History for chart
    this.trustHistory  = [];
    this.coopHistory   = [];
    this.roundHistory  = [];

    // Params (set by UI)
    this.params = {
      numAgents:    40,
      connectivity: 0.15,
      initDist:     'uniform',
      temptation:   5,
      leniency:     0.6,
      noise:        0.2,
      topology:     'random',
    };

    // Callbacks
    this.onRoundComplete = null;
  }

  /* ── Build network ─────────────────────────────────────── */
  init(params) {
    Object.assign(this.params, params);
    PAYOFF.T = this.params.temptation;

    this.agents = [];
    this.edges  = [];
    this.round  = 0;
    this.trustHistory  = [];
    this.coopHistory   = [];
    this.roundHistory  = [];

    const n = this.params.numAgents;

    // Place agents in a circle layout (+ small jitter)
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n;
      const r = 0.38 + (Math.random() - 0.5) * 0.05;
      const x = 0.5 + r * Math.cos(angle);
      const y = 0.5 + r * Math.sin(angle);
      this.agents.push(new Agent(i, x, y));
    }

    // Build edges
    if (this.params.topology === 'small-world') {
      this._buildSmallWorld(n);
    } else {
      this._buildRandom(n);
    }

    // Initialize trust
    const adjList = this._adjacencyList();
    for (const agent of this.agents) {
      agent.initTrust(adjList[agent.id] ?? [], this.params.initDist);
    }
  }

  _buildRandom(n) {
    const p = this.params.connectivity;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.random() < p) {
          this.edges.push([i, j]);
        }
      }
    }
  }

  _buildSmallWorld(n) {
    const k = Math.max(2, Math.floor(n * this.params.connectivity));
    // Ring lattice
    for (let i = 0; i < n; i++) {
      for (let d = 1; d <= k; d++) {
        const j = (i + d) % n;
        if (i < j) this.edges.push([i, j]);
      }
    }
    // Rewire with prob 0.1
    const beta = 0.12;
    const rewired = [];
    for (const edge of this.edges) {
      if (Math.random() < beta) {
        let j2;
        do { j2 = Math.floor(Math.random() * n); }
        while (j2 === edge[0] || rewired.some(e => (e[0]===edge[0]&&e[1]===j2)||(e[1]===edge[0]&&e[0]===j2)));
        rewired.push([edge[0], j2]);
      } else {
        rewired.push(edge);
      }
    }
    this.edges = rewired;
  }

  _adjacencyList() {
    const adj = {};
    for (const a of this.agents) adj[a.id] = [];
    for (const [i, j] of this.edges) {
      adj[i].push(j);
      adj[j].push(i);
    }
    return adj;
  }

  /* ── One simulation step ───────────────────────────────── */
  step() {
    if (!this.agents.length) return;

    const { leniency, noise } = this.params;
    const adjList = this._adjacencyList();

    // Reset scores
    for (const a of this.agents) a.score = 0;

    // Play IPD on each edge
    const actions = {}; // edgeKey -> {iCoop, jCoop}
    for (const [i, j] of this.edges) {
      const ai = this.agents[i];
      const aj = this.agents[j];

      const iCoop = ai.decide(j, noise);
      const jCoop = aj.decide(i, noise);
      actions[`${i}-${j}`] = { iCoop, jCoop };

      // Payoffs
      let pi, pj;
      if (iCoop && jCoop)        { pi = PAYOFF.R; pj = PAYOFF.R; }
      else if (iCoop && !jCoop)  { pi = PAYOFF.S; pj = PAYOFF.T; }
      else if (!iCoop && jCoop)  { pi = PAYOFF.T; pj = PAYOFF.S; }
      else                        { pi = PAYOFF.P; pj = PAYOFF.P; }

      ai.score += pi;
      aj.score += pj;

      // Trust updates
      ai.updateTrust(j, pi, leniency);
      aj.updateTrust(i, pj, leniency);

      ai.recordCoop(iCoop);
      aj.recordCoop(jCoop);

      ai.lastAction[j] = iCoop;
      aj.lastAction[i] = jCoop;
    }

    this.round++;

    // Aggregate stats
    const avgTrust = this.agents.reduce((s, a) => s + a.avgTrust, 0) / this.agents.length;
    const coopCount = this.agents.reduce((s, a) => s + a.recentCoopRate, 0) / this.agents.length;
    this.trustHistory.push(avgTrust);
    this.coopHistory.push(coopCount);
    this.roundHistory.push(this.round);

    if (this.onRoundComplete) this.onRoundComplete({ avgTrust, coopCount, actions });
  }

  /* ── Run / Pause ───────────────────────────────────────── */
  start(intervalMs) {
    if (this.running) return;
    this.running = true;
    const tick = () => {
      this.step();
      if (this.running) this.timer = setTimeout(tick, intervalMs);
    };
    tick();
  }

  pause() {
    this.running = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  }

  get stats() {
    if (!this.agents.length) return { avgTrust: 0, coopRate: 0, minTrust: 0, maxTrust: 0 };
    const trusts = this.agents.map(a => a.avgTrust);
    return {
      avgTrust: average(trusts),
      coopRate: this.coopHistory[this.coopHistory.length - 1] ?? 0,
      minTrust: Math.min(...trusts),
      maxTrust: Math.max(...trusts),
    };
  }
}

/* ── Helpers ──────────────────────────────────────────────── */
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function average(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

// Export to global
window.Simulation = Simulation;
window.SimPayoff  = PAYOFF;
