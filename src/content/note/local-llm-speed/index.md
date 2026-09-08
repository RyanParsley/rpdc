---
title: "Local LLM Speed Notes"
description: "Emperical data about local LLMs on my Mac"
pubDate: "2026-09-04T22:38:04-04:00"
tags: ["LLM", "AI"]
---

I have an M4 Macbook Pro with 48G or unified RAM. I'm capturing some metrics
from local models running via pi. I'm using [pi-token-speed](https://pi.dev/packages/pi-token-speed) plugin to measure. For each model I'll ask the same prompt in a clean session (Tell me a joke about LLMs). I'll then ask for another to compare the time to first token of subsequent prompts to the first.

## Qwen3.8:27b mlx

![qwen3_8-27b-mlx](./assets/qwen3_8-27b-mlx.png)
![qwen3_8-27b-mlx](./assets/qwen3_8-27b-mlx-2.png)

## Qwen3.8:27b nvfp4

![qwen3_8-27b-nvfp4](./assets/qwen3_8-27b-nvfp4.png)

## Gemma4:31b mxfp8

![gemma4-31b-mxfp8](./assets/gemma4-31b-mxfp8.png)
![gemma4-31b-mxfp8](./assets/gemma4-31b-mxfp8-2.png)

## devstral

![devstral](./assets/devstral.png)
![devstral](./assets/devstral-2.png)

## The data

Throughput stays within a token-per-second of cold or warm, so a warm prompt
isn't faster at generating the tokens — it just starts sooner. Time to first
token is where cold and warm diverge (3 to 1 for devstral, 88 for qwen), so
each gets its own chart.

![llm-speed-tps](./assets/llm-speed-tps.png)
![llm-speed-ttft-cold](./assets/llm-speed-ttft-cold.png)
![llm-speed-ttft-warm](./assets/llm-speed-ttft-warm.png)
