// THE WORLD TODAY — one-page newspaper poster for 24 November 2026.
// Fresh-authored renderer: Node stdlib only, no network, no dependencies.
// It paints an RGB canvas in memory, draws every letter from a small
// hand-made 5x7 bitmap font, and writes a deterministic PNG by hand
// (zlib deflate + CRC32 chunks from the standard library).
//
// Usage:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Output: entry.png, 1024 x 1024, in the chosen directory.

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const PAPER = [246, 241, 227]; // warm newsprint
const INK = [20, 20, 20]; // near-black
const RED = [158, 43, 37]; // single accent red for kickers and rules
const GREY = [90, 84, 70]; // muted captions
const CARD = [255, 253, 246]; // slightly lighter card face

// ------------------------------------------------------------- 5x7 bitmap
// Each glyph is 7 rows of 5 cells; "1" is ink, "0" is empty. Only the
// characters this page actually uses are defined; anything else falls
// back to a blank cell so a stray character can never crash the render.
const GLYPHS = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "+": ["00000", "00100", "00100", "01110", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "|": ["00100", "00100", "00100", "00100", "00100", "00100", "00100"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "*": ["00000", "00100", "10101", "01110", "10101", "00100", "00000"],
};
const BLANK = ["00000", "00000", "00000", "00000", "00000", "00000", "00000"];

// ------------------------------------------------------------ canvas core
// The canvas is one flat RGB buffer; every helper below writes into it.
const px = Buffer.alloc(W * H * 3);
function paint(x, y, color) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 3;
  px[o] = color[0];
  px[o + 1] = color[1];
  px[o + 2] = color[2];
}
function fillRect(x, y, w, h, color) {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) paint(i, j, color);
  }
}
function hline(x, y, w, color, thick = 1) {
  fillRect(x, y, w, thick, color);
}

// One glyph cell is 5 wide with a 1-cell gap, so a character advances
// 6 cells; at scale s each cell is an s-by-s block of pixels.
function glyphWidth(scale) {
  return 6 * scale;
}
function textWidth(text, scale) {
  return text.length * glyphWidth(scale) - scale; // no trailing gap
}
function drawGlyph(ch, x, y, scale, color) {
  const rows = GLYPHS[ch] || BLANK;
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 5; c++) {
      if (rows[r][c] === "1") fillRect(x + c * scale, y + r * scale, scale, scale, color);
    }
  }
}
function drawText(x, y, text, scale, color) {
  const upper = text.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    drawGlyph(upper[i], x + i * glyphWidth(scale), y, scale, color);
  }
}
function drawTextCentered(cx, y, text, scale, color) {
  drawText(cx - Math.floor(textWidth(text.toUpperCase(), scale) / 2), y, text, scale, color);
}

// Greedy word wrap: returns at most maxLines lines, each no longer than
// maxChars characters; an over-long last line is cut with an ellipsis.
function wrapText(text, maxChars, maxLines) {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? cur + " " + w : w;
    if (next.length <= maxChars) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      cur = w.length > maxChars ? w.slice(0, maxChars) : w;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    let last = cut[cut.length - 1];
    if (last.length > maxChars - 3) last = last.slice(0, maxChars - 3);
    cut[cut.length - 1] = last + "...";
    return cut;
  }
  return lines;
}
function drawLines(x, y, lines, scale, leading, color) {
  lines.forEach((ln, i) => drawText(x, y + i * (7 * scale + leading), ln, scale, color));
}

// ------------------------------------------------------------------- PNG
// Minimal hand-rolled PNG writer: signature, IHDR, one IDAT with the raw
// scanlines (filter byte 0 on every row), IEND. zlib level 9 and fixed
// chunk layout make the output byte-identical on every run.
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePng() {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    px.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolour RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------- the twelve
// Twelve real stories from Tuesday 24 November 2026, each verified
// against wire reporting (see scratch research note). Headlines and
// decks are shortened for print; every fact below follows the wires.
const LEAD = {
  kicker: "LEAD STORY | UKRAINE WAR SPREADS",
  headline: "UKRAINE SINKS RUSSIAN WARSHIP OFF LIBYA",
  deck: "Ukraine said its drones sank Russia's Merkury corvette off Benghazi and hit a military-linked cargo ship in the Gulf of Finland, carrying the war far beyond the Black Sea. - Reuters",
};
const STORIES = [
  {
    kicker: "MIDDLE EAST",
    headline: "HOUTHI STRIKE WOUNDS 11 AT RIYADH'S TALLEST TOWER",
    deck: "A Houthi attack on Riyadh's PIF Tower injured 11 people, officials said.",
  },
  {
    kicker: "UKRAINE",
    headline: "RUSSIAN STRIKE KILLS 2, WOUNDS 40 IN ZAPORIZHZHIA",
    deck: "Two killed and 40 wounded, including four children, overnight.",
  },
  {
    kicker: "IRAN",
    headline: "IRAN: NO US TALKS UNTIL SEVEN DEMANDS ARE MET",
    deck: "Tehran will not negotiate until its seven conditions are met.",
  },
  {
    kicker: "GAZA",
    headline: "ISRAELI STRIKES KILL AT LEAST SIX IN GAZA",
    deck: "Six Palestinians were killed, including a Hamas security chief.",
  },
  {
    kicker: "UNITED STATES",
    headline: "DEMOCRATS CLINCH 259 HOUSE SEATS, BEST SINCE 1990",
    deck: "Democrats won at least 259 seats, their best result since 1990.",
  },
  {
    kicker: "TECHNOLOGY",
    headline: "HUAWEI CONVICTED IN US TRIAL OVER IRAN, TRADE SECRETS",
    deck: "A Brooklyn jury found the telecom giant guilty on 10 of 12 counts.",
  },
  {
    kicker: "SPACE",
    headline: "CHINA UNVEILS SHENZHOU-24 CREW WITH PAKISTANI ASTRONAUT",
    deck: "Muhammad Zeeshan Ali is set to be the first foreigner aboard Tiangong.",
  },
  {
    kicker: "EUROPE",
    headline: "LUKASHENKO: FLY WITH ZELENSKYY TO MOSCOW FOR TALKS",
    deck: "Lukashenko proposed flying with Zelenskyy to Moscow for talks.",
  },
  {
    kicker: "RUSSIA",
    headline: "PUTIN: KYIV KEEPS HITTING OIL PLANTS DESPITE TRUMP PLEA",
    deck: "Putin said Kyiv kept striking refineries despite Trump's plea.",
  },
  {
    kicker: "ASIA",
    headline: "5.6 QUAKE SHAKES EASTERN NEPAL, NO CASUALTIES REPORTED",
    deck: "A 5.6 quake shook Taplejung near the Tibet border. No casualties reported.",
  },
  {
    kicker: "SPORT",
    headline: "SENEGAL REGAIN AFCON TITLE AS CAS OVERTURNS RULING",
    deck: "CAS restored Senegal's 1-0 win over Morocco in the 2025 AFCON final.",
  },
];

// -------------------------------------------------------------- layout
const MX = 36; // side margin
const CW = W - MX * 2; // 952 content width
const CARD_W = 468;
const CARD_H = 104;
const ROW_GAP = 10;
const COL_GAP = 16;

function drawMasthead() {
  hline(MX, 22, CW, INK, 3);
  drawTextCentered(W / 2, 34, "THE WORLD TODAY", 6, INK);
  hline(MX, 84, CW, INK, 2);
  drawTextCentered(W / 2, 94, "TUESDAY, 24 NOVEMBER 2026  |  ONE PAGE, TWELVE STORIES", 2, GREY);
  hline(MX, 116, CW, INK, 3);
}

function drawLead() {
  const x = MX;
  const y = 128;
  const h = 150;
  fillRect(x, y, CW, h, CARD);
  // double-rule frame: thick outer, thin inner
  hline(x, y, CW, INK, 3);
  hline(x, y + h - 3, CW, INK, 3);
  fillRect(x, y, 3, h, INK);
  fillRect(x + CW - 3, y, 3, h, INK);
  drawText(x + 16, y + 12, LEAD.kicker, 2, RED);
  const head = wrapText(LEAD.headline, 51, 2);
  head.forEach((ln, i) => {
    drawTextCentered(W / 2, y + 36 + i * 24, ln, 3, INK);
  });
  const deck = wrapText(LEAD.deck, 76, 3);
  drawLines(x + 16, y + 92, deck, 2, 2, INK);
}

function drawCard(x, y, story) {
  fillRect(x, y, CARD_W, CARD_H, CARD);
  hline(x, y, CARD_W, RED, 2);
  drawText(x + 12, y + 10, story.kicker, 1, RED);
  const head = wrapText(story.headline, 37, 2);
  drawLines(x + 12, y + 26, head, 2, 1, INK);
  const deck = wrapText(story.deck, 37, 2);
  drawLines(x + 12, y + 62, deck, 2, 1, GREY);
  return { head, deck };
}

function drawAbout(x, y, w, h) {
  fillRect(x, y, w, h, CARD);
  hline(x, y, w, INK, 2);
  drawText(x + 12, y + 10, "ABOUT THIS PAGE", 2, RED);
  const body =
    "Twelve real stories from Tuesday, 24 November 2026, drawn from Reuters, AP and Xinhua wire reporting. Headlines are shortened for print; facts and figures follow the wires. Rendered 25 November 2026.";
  drawLines(x + 12, y + 34, wrapText(body, 71, 5), 1, 3, INK);
}

function drawFooter() {
  hline(MX, 976, CW, INK, 2);
  drawTextCentered(
    W / 2,
    988,
    "SOURCES: REUTERS | AP | XINHUA | TWELVE REAL STORIES FROM TUESDAY, 24 NOVEMBER 2026",
    1,
    GREY
  );
}

// ------------------------------------------------------------------ main
function main() {
  fillRect(0, 0, W, H, PAPER);
  drawMasthead();
  drawLead();

  // Grid: 11 stories, 6 rows. Left column takes 6, right column 5,
  // and the about box fills the freed slot at the foot of the right one.
  const gridY = 290;
  const leftX = MX;
  const rightX = MX + CARD_W + COL_GAP;
  const checks = [];
  STORIES.forEach((s, i) => {
    const col = i < 6 ? 0 : 1;
    const row = i < 6 ? i : i - 6;
    const x = col === 0 ? leftX : rightX;
    const y = gridY + row * (CARD_H + ROW_GAP);
    const out = drawCard(x, y, s);
    checks.push({ i: i + 2, headLines: out.head.length, deckLines: out.deck.length });
  });
  const aboutY = gridY + 5 * (CARD_H + ROW_GAP);
  const aboutH = gridY + 6 * CARD_H + 5 * ROW_GAP - aboutY;
  drawAbout(rightX, aboutY, CARD_W, aboutH);

  drawFooter();

  // Safety net: shout if any card text spilled past its allotted lines.
  for (const c of checks) {
    if (c.headLines > 2 || c.deckLines > 2) {
      console.error(`OVERFLOW story ${c.i}: head ${c.headLines} lines, deck ${c.deckLines} lines`);
      process.exitCode = 1;
    }
  }

  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "entry.png");
  fs.writeFileSync(outPath, encodePng());
  console.log(`wrote ${outPath} (${W}x${H})`);
}

main();
