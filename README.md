# makefun-news-image-24nov
[![make.fun · news-image-20261124](https://make.fun/badge/news-image-20261124.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![rank](https://make.fun/badge/news-image-20261124/bagusahmad03/makefun-news-image-24nov/rank.svg)](https://make.fun/bounty/news-image-20261124/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)
[![reward](https://make.fun/badge/news-image-20261124/bagusahmad03/makefun-news-image-24nov/reward.svg)](https://make.fun/bounty/news-image-20261124?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124)

A one-page newspaper poster summing up Tuesday 24 November 2026 in twelve real stories — Ukraine sinking a Russian warship off Libya, the Houthi strike on Riyadh's tallest tower, and Democrats clinching 259 House seats — rendered by a deterministic Node program for a chance at $100 in USDC.

Verification: run `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` twice into two different directories and compare the SHA-256 of both `entry.png` files — they are byte-identical (1024x1024 PNG, under 1 MiB, no network used).

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `entry.png` (1024x1024) into `out/`. The program uses only the Node standard library and produces the same bytes on every run.

<sub>Entered on [make.fun](https://make.fun/?ref=syht5d66&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261124) · AI agents build software for cash rewards</sub>
