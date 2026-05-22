#!/usr/bin/env python3
# Figure 1: 5-lab Nb tunneling measurements vs BCS prediction.
# Publication-style: 1-column matplotlib, error bars, threshold band, consensus.
import math
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

# Constants
GAMMA_E = 0.5772156649015329
BCS = 2.0 * math.pi * math.exp(-GAMMA_E)   # 3.5276
THR = 0.05

# Inverse-variance weighted measurements
DATA = [
    ("Giaever 1960",        3.50, 0.10, "PRL 5, 147"),
    ("Townsend-Sutton 1962", 3.55, 0.05, "PR 128, 591"),
    ("Schwidtal 1969",      3.50, 0.05, "PSS 31, 71"),
    ("Lichtenberg 1989",    3.52, 0.04, "Z.Phys.B 77, 83"),
    ("Tinkham 1996",        3.50, 0.05, "textbook ch.3"),
]

def consensus(rows):
    w = [1/s**2 for _, _, s, _ in rows]
    r = [v for _, v, _, _ in rows]
    return sum(wi*ri for wi, ri in zip(w, r)) / sum(w), 1/math.sqrt(sum(w))

mean, sigma = consensus(DATA)
rel = abs(BCS - mean) / mean * 100

plt.rcParams.update({
    "font.family": "serif", "font.size": 10,
    "axes.linewidth": 0.8, "axes.labelsize": 11,
    "xtick.direction": "in", "ytick.direction": "in",
    "xtick.major.size": 4, "ytick.major.size": 4,
    "figure.dpi": 150,
})

fig, ax = plt.subplots(figsize=(6.0, 3.5))

# Threshold band (5%)
ax.axvspan(BCS*(1-THR), BCS*(1+THR), color="#c8e6c9", alpha=0.4,
           label=f"$\\pm$5% gate")

# BCS prediction (dashed vertical)
ax.axvline(BCS, color="#1565c0", linestyle="--", linewidth=1.4, zorder=3,
           label=f"BCS universal $2\\pi e^{{-\\gamma_E}} = {BCS:.4f}$")

# Individual measurements (red error bars, with author label on right)
ys = list(range(len(DATA), 0, -1))
for y, (lbl, v, s, ref) in zip(ys, DATA):
    ax.errorbar(v, y, xerr=s, fmt="o", color="#c62828",
                ecolor="#c62828", capsize=3, markersize=5, zorder=5)
    ax.text(3.71, y, f"{lbl}", fontsize=8, va="center", color="#333")

# Consensus (green diamond at y=0, bigger)
ax.errorbar(mean, 0, xerr=sigma, fmt="D", color="#2e7d32",
            ecolor="#2e7d32", capsize=4, markersize=8, zorder=6,
            label=f"Consensus (inv-var): ${mean:.4f}\\pm{sigma:.4f}$")
ax.text(3.71, 0, "weighted mean", fontsize=8, va="center",
        color="#2e7d32", fontweight="bold")

ax.set_yticks([])
ax.set_ylim(-0.7, len(DATA) + 0.7)
ax.set_xlim(3.30, 3.80)
ax.set_xlabel(r"$2\Delta(0)\,/\,(k_B T_c)$")
ax.set_title(f"Nb tunneling consensus vs BCS prediction (rel.\\,err.\\,$= {rel:.3f}\\%$)",
             fontsize=10)
ax.legend(loc="lower left", fontsize=8, frameon=False)
ax.grid(axis="x", linestyle=":", linewidth=0.5, alpha=0.5)

plt.tight_layout()
out = "/Users/ghost/core/demiurge/PAPERS/sample-nb-bcs-absorbed/figures/fig01_measurement_panel.pdf"
plt.savefig(out, bbox_inches="tight", pad_inches=0.05)
print(f"[fig01] wrote {out}  rel_err={rel:.4f}%  consensus={mean:.4f}+/-{sigma:.4f}")
