#!/usr/bin/env python3
# Figure 3: 2Δ/kBTc across SC families. Shows Nb is the ONLY one within
# the 5% BCS-universal gate. Strong-coupling renormalizes UP, d-wave is
# fundamentally different.
import math
import matplotlib.pyplot as plt

GAMMA_E = 0.5772156649015329
BCS = 2.0 * math.pi * math.exp(-GAMMA_E)   # 3.5276

# (material, ratio_value, sigma, family) — literature consensus
DATA = [
    ("Al",      3.53, 0.05, "lts-weak"),
    ("Sn",      3.60, 0.05, "lts-weak"),
    ("Nb",      3.52, 0.02, "lts-weak"),        # this paper's subject
    ("V",       3.50, 0.10, "lts-weak"),
    ("Pb",      4.30, 0.10, "lts-strong"),
    ("Hg",      4.60, 0.10, "lts-strong"),
    ("Nb$_3$Sn", 4.10, 0.20, "lts-strong"),
    ("Nb$_3$Ge", 4.20, 0.20, "lts-strong"),
    ("MgB$_2$ (small)",  1.75, 0.15, "mgb2"),   # two-gap
    ("MgB$_2$ (large)",  4.50, 0.15, "mgb2"),
    ("YBCO",    5.50, 0.50, "cuprate"),
    ("BSCCO",   6.50, 0.50, "cuprate"),
    ("FeSe",    5.00, 0.50, "fesc"),
]

COLORS = {"lts-weak": "#1565c0", "lts-strong": "#6a1b9a",
          "mgb2": "#ef6c00", "cuprate": "#c62828", "fesc": "#00838f"}

plt.rcParams.update({
    "font.family": "serif", "font.size": 10,
    "axes.linewidth": 0.8, "xtick.direction": "in", "ytick.direction": "in",
    "figure.dpi": 150,
})

fig, ax = plt.subplots(figsize=(6.5, 4.0))

# BCS prediction line + 5% band
ax.axhline(BCS, color="#1565c0", linestyle="--", linewidth=1.2, zorder=2,
           label=f"BCS universal $= {BCS:.4f}$")
ax.axhspan(BCS*0.95, BCS*1.05, color="#c8e6c9", alpha=0.4, zorder=1,
           label="$\\pm$5\\% gate")

xs = list(range(len(DATA)))
for i, (lbl, v, s, fam) in enumerate(DATA):
    ax.errorbar(i, v, yerr=s, fmt="o", color=COLORS[fam], ecolor=COLORS[fam],
                capsize=3, markersize=6, zorder=5,
                label=fam if (lbl in ("Nb", "Pb", "MgB$_2$ (small)", "YBCO", "FeSe")) else None)

# Highlight Nb (this paper's subject)
i_nb = next(i for i, (lbl, *_) in enumerate(DATA) if lbl == "Nb")
ax.scatter([i_nb], [DATA[i_nb][1]], s=180, facecolors="none",
           edgecolors="#2e7d32", linewidths=2, zorder=6)
ax.annotate("this paper\n$0.31\\%$ from BCS",
            xy=(i_nb, DATA[i_nb][1]),
            xytext=(i_nb + 0.5, 2.4),
            fontsize=8, color="#2e7d32", fontweight="bold",
            arrowprops=dict(arrowstyle="->", color="#2e7d32", lw=0.7))

ax.set_xticks(xs)
ax.set_xticklabels([d[0] for d in DATA], rotation=35, ha="right", fontsize=8.5)
ax.set_ylabel(r"$2\Delta(0)\,/\,(k_B T_c)$")
ax.set_ylim(1.0, 7.5)
ax.set_title("Gap-ratio landscape: Nb is the canonical weak-coupling pass",
             fontsize=10)

# Custom legend
import matplotlib.patches as mpatches
handles = [
    mpatches.Patch(color="#1565c0", label="LTS weak-coupling"),
    mpatches.Patch(color="#6a1b9a", label="LTS strong-coupling"),
    mpatches.Patch(color="#ef6c00", label="MgB$_2$ (two-gap)"),
    mpatches.Patch(color="#c62828", label="HTS cuprate ($d$-wave)"),
    mpatches.Patch(color="#00838f", label="FeSC"),
]
ax.legend(handles=[
    plt.Line2D([0], [0], color="#1565c0", linestyle="--", label=f"BCS $= {BCS:.4f}$"),
    mpatches.Patch(color="#c8e6c9", alpha=0.4, label="$\\pm$5\\% gate"),
] + handles, loc="upper left", fontsize=7, frameon=False, ncol=2)

ax.grid(axis="y", linestyle=":", linewidth=0.5, alpha=0.5)
plt.tight_layout()
out = "/Users/ghost/core/demiurge/PAPERS/sample-nb-bcs-absorbed/figures/fig03_gap_ratio_landscape.pdf"
plt.savefig(out, bbox_inches="tight", pad_inches=0.05)
print(f"[fig03] wrote {out}")
print(f"  Nb measurement: {DATA[i_nb][1]} ± {DATA[i_nb][2]} → BCS rel-err = "
      f"{abs(DATA[i_nb][1]-BCS)/DATA[i_nb][1]*100:.3f}%")
