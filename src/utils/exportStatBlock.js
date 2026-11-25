// Draws a monster's stat block onto a canvas and downloads it as a PNG.
// No extra packages: it uses the browser's built-in canvas.
import { ABILITIES, modifier } from "./constants.js";

const W = 1000;
const PAD = 56;
const INK = "#1b1818";
const RED = "#bb3a2f";
const MUTE = "#6f6864";
const LINE = "#ddd6cf";
const PAPER = "#f6f3f0";
const DISPLAY = '"Chakra Petch", sans-serif';
const BODY = '"Montserrat", sans-serif';

const lines = (text = "") => text.split("\n").filter(Boolean);
const splitEntry = (line) => {
  const i = line.indexOf(". ");
  return i === -1 ? { name: line, desc: "" } : { name: line.slice(0, i), desc: line.slice(i + 2) };
};

function wrap(ctx, text, maxWidth) {
  const out = [];
  let line = "";
  for (const word of text.split(" ")) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      out.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) out.push(line);
  return out;
}

// Runs twice: once with draw=false to measure the height, once with draw=true to paint.
function paint(ctx, m, draw) {
  const inner = W - PAD * 2;
  const spacing = (px) => { if ("letterSpacing" in ctx) ctx.letterSpacing = `${px}px`; };

  const text = (str, x, y, font, color, { align = "left", track = 0 } = {}) => {
    if (!draw) return;
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    spacing(track);
    ctx.fillText(str, x, y);
  };

  // Wrapped paragraph. Returns the y position after the last line.
  const paragraph = (str, x, y, font, color, lineHeight) => {
    ctx.font = font;
    spacing(0);
    for (const l of wrap(ctx, str, inner)) {
      text(l, x, y, font, color);
      y += lineHeight;
    }
    return y;
  };

  const label = (str, x, y, color = RED) => text(str.toUpperCase(), x, y, `600 14px ${BODY}`, color, { track: 2.5 });

  const rule = (y) => {
    if (!draw) return;
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(W - PAD, y);
    ctx.stroke();
  };

  // Header
  ctx.font = `700 54px ${DISPLAY}`;
  spacing(0);
  const nameLines = wrap(ctx, m.name.toUpperCase(), inner);
  const headerH = 56 + nameLines.length * 60 + 36 + 44;
  if (draw) {
    ctx.fillStyle = RED;
    ctx.fillRect(0, 0, W, headerH);
  }
  nameLines.forEach((l, i) => text(l, PAD, 56 + i * 60 + 46, `700 54px ${DISPLAY}`, "#ffffff"));
  text(`${m.size} ${m.type.toLowerCase()}`, PAD, 56 + nameLines.length * 60 + 22, `500 22px ${BODY}`, "rgba(255,255,255,0.8)");

  // AC / HP / CR
  let y = headerH + 56;
  [["Armor class", m.ac], ["Hit points", m.hp], ["Challenge", m.cr]].forEach(([name, value], i) => {
    const x = PAD + (inner / 3) * i;
    label(name, x, y);
    text(String(value), x, y + 48, `700 46px ${DISPLAY}`, INK);
  });
  y += 100;

  // Speed
  label("Speed", PAD, y);
  y = paragraph(m.speed, PAD, y + 32, `500 22px ${BODY}`, INK, 32) + 14;
  rule(y);
  y += 44;

  // Ability scores
  ABILITIES.forEach((a, i) => {
    const x = PAD + (inner / 6) * i;
    label(a, x, y);
    text(`${m[a]} (${modifier(m[a])})`, x, y + 34, `700 24px ${DISPLAY}`, INK);
  });
  y += 70;
  rule(y);
  y += 44;

  // Description
  for (const p of lines(m.description)) {
    y = paragraph(p, PAD, y, `400 20px ${BODY}`, MUTE, 32) + 12;
  }

  // Actions
  const sections = [
    ["Actions", lines(m.actions).map(splitEntry)],
    ["Bonus actions", lines(m.bonusActions).map(splitEntry)],
  ];
  for (const [title, entries] of sections) {
    if (!entries.length) continue;
    y += 14;
    label(title, PAD, y);
    y += 40;
    for (const a of entries) {
      y = paragraph(a.name.toUpperCase(), PAD, y, `700 26px ${DISPLAY}`, INK, 34);
      if (a.desc) y = paragraph(a.desc, PAD, y + 2, `400 19px ${BODY}`, MUTE, 29);
      y += 22;
    }
  }

  // Footer
  rule(y);
  y += 40;
  text("Monster Builder", PAD, y, `700 18px ${DISPLAY}`, INK);
  return y + 44;
}

export async function downloadStatBlock(monster) {
  // Make sure the web fonts are ready before drawing, otherwise canvas uses a fallback.
  try {
    await Promise.all([
      document.fonts.load(`700 40px ${DISPLAY}`),
      document.fonts.load(`400 20px ${BODY}`),
      document.fonts.load(`500 20px ${BODY}`),
      document.fonts.load(`600 14px ${BODY}`),
    ]);
  } catch {
    /* fall back to system fonts */
  }

  const height = paint(document.createElement("canvas").getContext("2d"), monster, false);

  const scale = 2; // sharper image
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = Math.ceil(height * scale);
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, height);
  paint(ctx, monster, true);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${monster.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-stat-block.png`;
  a.click();
  URL.revokeObjectURL(url);
}
