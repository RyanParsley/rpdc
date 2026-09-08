#!/usr/bin/gnuplot
# Cold vs warm prompt comparison for local LLM speed notes.
# Run from this directory: gnuplot llm-speed-plot.gnuplot
# Input:  ../data/llm-speed-plot.csv  ->  model,cold_tok_s,warm_tok_s,cold_ttft_ms,warm_ttft_ms
# Outputs: ../assets/llm-speed-tps.png, ../assets/llm-speed-ttft-cold.png,
#          ../assets/llm-speed-ttft-warm.png
#
# Throughput is ~flat cold vs warm, so one grouped chart reads well.
# Time-to-first-token collapses 5-56x, so cold and warm get their own linear
# chart -- a shared axis would make the warm bars invisible.
#
# Palette is the site's Nord theme (src/styles/nord.css) so the figures bleed
# into the dark note background instead of clashing:
#   nord0  #2e3440 background
#   nord3  #4c566a frame
#   nord2  #434c5e grid
#   nord4  #d8dee9 axes / text
#   nord8  #88c0d0 cold (frost)
#   nord12 #d08770 warm (aurora)

set datafile separator comma
set style data histogram
set style fill solid
set style line 1 lc rgb "#4c566a" lw 1
set style line 2 lc rgb "#434c5e" lw 1
set style line 6 lc rgb "#88c0d0" lw 6
set style line 7 lc rgb "#d08770" lw 6

set terminal pngcairo size 1400,800 background rgb "#2e3440" enhanced font "sans,14"

# --------------------------------------------------------- Throughput (grouped)
set output "../assets/llm-speed-tps.png"
unset log y
set border back ls 1
set tics front
set grid ytics ls 2
set key top center spacing 1.5
set title "Throughput" font "sans,20" textcolor rgb "#88c0d0"
set xlabel "local LLM model" font "sans,16" textcolor rgb "#d8dee9"
set ylabel "tok / s" font "sans,16" textcolor rgb "#d8dee9"
set yrange [0:28]
set ytics 5 textcolor rgb "#d8dee9"
plot "../data/llm-speed-plot.csv" \
    using 2:xtic(1) title "cold" ls 6, \
     "" using 3 title "warm" ls 7

# ------------------------------------------------------ Cold time to first token
set output "../assets/llm-speed-ttft-cold.png"
unset key
set title "Cold prompt . time to first token" font "sans,20" textcolor rgb "#88c0d0"
set xlabel "local LLM model" font "sans,16" textcolor rgb "#d8dee9"
set ylabel "ms" font "sans,16" textcolor rgb "#d8dee9"
set yrange [0:70000]
set ytics 10000 textcolor rgb "#d8dee9"
set boxwidth 0.5
plot "../data/llm-speed-plot.csv" \
    using 4:xtic(1) with boxes ls 6

# ------------------------------------------------------ Warm time to first token
set output "../assets/llm-speed-ttft-warm.png"
set title "Warm prompt . time to first token" font "sans,20" textcolor rgb "#88c0d0"
set xlabel "local LLM model" font "sans,16" textcolor rgb "#d8dee9"
set ylabel "ms" font "sans,16" textcolor rgb "#d8dee9"
set yrange [0:10000]
set ytics 2000 textcolor rgb "#d8dee9"
plot "../data/llm-speed-plot.csv" \
    using 5:xtic(1) with boxes ls 7

unset output
