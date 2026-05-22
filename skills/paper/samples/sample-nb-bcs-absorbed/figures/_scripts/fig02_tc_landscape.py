#!/usr/bin/env python3
# Figure 2: Tc predicted (McMillan/Allen-Dynes) vs measured across SC families.
# Shows where BCS-class formulas work (Nb) and fail (MgB2 two-gap, Nb3Sn strong-coupling).
# Demonstrates why "Tc parity" alone is NOT the right metric — motivates the universal-ratio.
import math
import matplotlib.pyplot as plt
import numpy as np

def mcmillan(w_log, lam, mu):
    return w_log/1.2 * math.exp(-1.04*(1+lam)/(lam - mu*(1+0.62*lam)))

def allen_dynes(w_log, lam, mu, w2=None):
    if w2 is None: w2 = w_log
    L1 = 2.46*(1+3.8*mu); L2 = 1.82*(1+6.3*mu)*(w2/w_log)
    f1 = (1 + (lam/L1)**1.5)**(1/3)
    f2 = 1 + (lam**2*(w2/w_log - 1))/(lam**2 + L2**2)
    return f1*f2*mcmillan(w_log, lam, mu)

# (material, w_log_K, lambda, mu_star, Tc_measured_K, family)
CANDIDATES = [
    ("Al",     375, 0.43, 0.13, 1.18, "lts"),
    ("Sn",     195, 0.72, 0.11, 3.72, "lts"),
    ("Pb",      55, 1.55, 0.13, 7.20, "lts-sc"),
    ("Nb",     262, 0.82, 0.13, 9.25, "lts"),
    ("Nb$_3$Sn", 220, 1.70, 0.13, 18.30, "lts-sc"),
    ("MgB$_2$",   520, 0.87, 0.13, 39.00, "mgb2"),
    ("YBCO",     0,  0,    0,    92.00, "cuprate"),  # BCS N/A
]

plt.rcParams.update({
    "font.family": "serif", "font.size": 10,
    "axes.linewidth": 0.8, "xtick.direction": "in", "ytick.direction": "in",
    "figure.dpi": 150,
})

fig, ax = plt.subplots(figsize=(6.5, 4.0))

xs = np.arange(len(CANDIDATES))
meas = []
ad = []
labels = []
colors = []
COLORS = {"lts": "#1565c0", "lts-sc": "#6a1b9a", "mgb2": "#ef6c00",
          "cuprate": "#c62828"}
for i, (name, w, lam, mu, tm, fam) in enumerate(CANDIDATES):
    if fam == "cuprate":
        ad.append(np.nan)
    else:
        ad.append(allen_dynes(w, lam, mu) if lam > 0 else np.nan)
    meas.append(tm)
    labels.append(name)
    colors.append(COLORS[fam])

x = np.arange(len(CANDIDATES))
width = 0.35

bars_m = ax.bar(x - width/2, meas, width, color=colors, alpha=0.85,
                label="Measured $T_c$")
bars_p = ax.bar(x + width/2, ad, width, color=colors, alpha=0.45,
                edgecolor="black", linewidth=0.5, hatch="//",
                label="Allen-Dynes predicted")

ax.set_yscale("log")
ax.set_ylim(0.5, 500)
ax.set_xticks(x)
ax.set_xticklabels(labels, rotation=20, ha="right", fontsize=9)
ax.set_ylabel(r"$T_c$ (K)")
ax.set_title("BCS-class $T_c$ prediction vs measurement across SC families",
             fontsize=10)
ax.legend(loc="upper left", fontsize=8, frameon=False)
ax.grid(axis="y", which="both", linestyle=":", linewidth=0.5, alpha=0.5)

# Annotate YBCO (BCS N/A)
i_y = labels.index("YBCO")
ax.annotate("BCS N/A\n($d$-wave)",
            xy=(i_y + width/2, 1.0),
            xytext=(i_y + 0.4, 2.5),
            fontsize=7.5, color="#c62828",
            arrowprops=dict(arrowstyle="->", color="#c62828", lw=0.6))

plt.tight_layout()
out = "/Users/ghost/core/demiurge/PAPERS/sample-nb-bcs-absorbed/figures/fig02_tc_landscape.pdf"
plt.savefig(out, bbox_inches="tight", pad_inches=0.05)
print(f"[fig02] wrote {out}")
print("  family Tc-AD vs measured deltas:")
for (name, _, lam, _, tm, fam), p in zip(CANDIDATES, ad):
    if not math.isnan(p):
        d = abs(p - tm) / tm * 100
        print(f"    {name:10s}  ad={p:7.2f}  meas={tm:7.2f}  delta={d:6.1f}%")
