#!/usr/bin/gnuplot
# Cold vs warm prompt comparison for local LLM speed notes.
# Rendered automatically by the gnuplot-charts Astro integration on every
# `astro dev` / `astro build` (src/integrations/gnuplot-charts.ts).
# To render by hand: cd into this directory and run
#   gnuplot llm-speed-plot.gnuplot
# Input:  ../data/llm-speed-plot.csv  ->  model,cold_tok_s,warm_tok_s,cold_ttft_ms,warm_ttft_ms
# Outputs: ../assets/llm-speed-tps.png, ../assets/llm-speed-ttft-cold.png,
#          ../assets/llm-speed-ttft-warm.png
#
# Throughput is ~flat cold vs warm, so one grouped chart reads well.
# Time-to-first-token collapses 5-56x, so cold and warm get their own linear
# chart -- a shared axis would make the warm bars invisible.
#
# Bars are placed at explicit x positions (column 0 index +/- offset) rather
# than gnuplot's `histogram` style, which reserves a slot per data column and
# skews the groups left. Labels are hardcoded to the same order as the CSV.
#
# Fonts are sized against a 1200x700 canvas so they stay legible at the
# ~620px article column width (22pt base renders at ~11pt on the page).
#
# Palette is the site's Nord theme (src/styles/nord.css), rotated so every
# foreground clears WCAG AA against the nord0 background:
#   nord0  #2e3440 background
#   nord3  #4c566a frame
#   nord2  #434c5e grid
#   nord4  #d8dee9 axes / text (9.2:1)
#   nord8  #88c0d0 cold (frost, 6.6:1)
#   nord13 #ebcb8b warm (aurora yellow, 8.0:1; blue/yellow is also the
#          colorblind-safe pair, unlike the previous #d08770 at 4.0:1)

set datafile separator comma
set style fill solid border lc rgb "#2e3440"
set boxwidth 0.35 absolute
set style line 1 lc rgb "#4c566a" lw 1
set style line 2 lc rgb "#434c5e" lw 1
set style line 6 lc rgb "#88c0d0" lw 6
set style line 7 lc rgb "#ebcb8b" lw 6
set border back ls 1
set tics

set xrange [0.3:3.7]

MODELS = 'set xtics ("qwen3.8:27b-mlx" 1, "gemma4:31b-mxfp8" 2, "devstral:latest" 3) font "sans,20" textcolor rgb "#d8dee9"'
eval(MODELS)
set ytics font "sans,20" textcolor rgb "#d8dee9"
set xlabel "local LLM model" font "sans,24" textcolor rgb "#d8dee9"
set ylabel font "sans,24" textcolor rgb "#d8dee9"
set title font "sans,28"

set terminal pngcairo size 1200,700 background rgb "#2e3440" enhanced font "sans,22"

# --------------------------------------------------------- Throughput (grouped)
set output "../assets/llm-speed-tps.png"
set title "Throughput" textcolor rgb "#88c0d0"
set ylabel "tok / s"
set yrange [0:30]
set ytics 5
set grid ytics ls 2
# pngcairo draws `with boxes` key labels in the terminal default black, so the
# key is built manually from colored labels and swatch rectangles.
unset key
set label "cold" at graph 0.455,0.905 right front tc rgb "#d8dee9" font "sans,20"
set object 1 rectangle from graph 0.465,0.885 to graph 0.525,0.925 fs solid fc rgb "#88c0d0" front
set label "warm" at graph 0.455,0.83 right front tc rgb "#d8dee9" font "sans,20"
set object 2 rectangle from graph 0.465,0.81 to graph 0.525,0.85 fs solid fc rgb "#ebcb8b" front
plot "../data/llm-speed-plot.csv" every ::1 using ($0+1-0.2):2 with boxes ls 6 title "cold", \
     "../data/llm-speed-plot.csv" every ::1 using ($0+1+0.2):3 with boxes ls 7 title "warm"
unset label
unset object

# ------------------------------------------------------ Cold time to first token
set output "../assets/llm-speed-ttft-cold.png"
set title "Cold prompt: time to first token" textcolor rgb "#88c0d0"
set ylabel "ms"
set yrange [0:70000]
set ytics 10000
set boxwidth 0.45 absolute
unset key
plot "../data/llm-speed-plot.csv" every ::1 using ($0+1):4 with boxes ls 6 title "cold"

# ------------------------------------------------------ Warm time to first token
set output "../assets/llm-speed-ttft-warm.png"
set title "Warm prompt: time to first token" textcolor rgb "#88c0d0"
set ylabel "ms"
set yrange [0:10000]
set ytics 2000
set boxwidth 0.45 absolute
plot "../data/llm-speed-plot.csv" every ::1 using ($0+1):5 with boxes ls 7 title "warm"

unset output
