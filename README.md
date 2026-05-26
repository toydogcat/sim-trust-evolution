# sim-trust-evolution

**信任演化模擬實驗** — 以重複囚徒困境（Iterated Prisoner's Dilemma）為框架，模擬多智能體社群中信任的動態演化。

🔗 **Live Demo**: [https://toydogcat.github.io/sim-trust-evolution/](https://toydogcat.github.io/sim-trust-evolution/)

## 功能

- 🕸️ 互動式信任網路圖（Canvas 2D）
- 📈 平均信任度 & 合作率即時折線圖
- ⚙️ 可調參數：智能體數量、網路拓撲、背叛誘惑值、寬容係數、決策雜訊
- 👁️ Vercount.one 瀏覽計次器

## 模型說明

| 符號 | 意義 | 預設值 |
|------|------|-------|
| R | 互相合作的獎勵 | 3 |
| T | 背叛誘惑值 | 5 |
| S | 被背叛的懲罰 | 0 |
| P | 互相背叛的懲罰 | 1 |

每回合，相鄰 Agent 以當前信任值（加雜訊）決定合作或背叛，博弈結果反饋更新信任值。

## 技術

純 HTML + CSS + JavaScript，由 GitHub Pages 直接託管，無需建置步驟。

## 授權

MIT License
