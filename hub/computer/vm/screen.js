//created by kinjal
// Runs INSIDE an agent's boat VM: streams the whole Linux desktop (DISPLAY :0) as JPEG frames over a
// WebSocket on 0.0.0.0:9402, in the same shape agent-browser uses, so hub/computer can proxy it:
//   -> {type:"frame", seq, data:<base64 jpeg>, metadata:{deviceWidth, deviceHeight, timestamp}}
//   <- {type:"input_mouse", eventType:"mousePressed"|"mouseReleased"|"mouseMoved"|"mouseWheel", x, y, button, deltaY}
//   <- {type:"input_keyboard", eventType:"keyDown"|"keyUp"|"char", key, text}
// Coordinates are in frame pixels; they get scaled to the real screen for xdotool.
const { spawn, execFileSync, execFile } = require("child_process");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.SCREEN_PORT || 9402);
const FPS = Number(process.env.SCREEN_FPS || 5);
const WIDTH = Number(process.env.SCREEN_WIDTH || 1280);
const env = { ...process.env, DISPLAY: process.env.DISPLAY || ":0" };

const dims = execFileSync("xdpyinfo", [], { env }).toString().match(/dimensions:\s+(\d+)x(\d+)/);
const [SW, SH] = dims ? [Number(dims[1]), Number(dims[2])] : [1920, 1080];
const FW = WIDTH;
const FH = Math.round((SH * WIDTH) / SW / 2) * 2;

const wss = new WebSocketServer({ host: "0.0.0.0", port: PORT });
let seq = 0;
let last = null;

const ff = spawn(
  "ffmpeg",
  ["-loglevel", "error", "-f", "x11grab", "-framerate", String(FPS), "-video_size", `${SW}x${SH}`, "-i", env.DISPLAY,
   "-vf", `scale=${FW}:${FH}`, "-q:v", "7", "-f", "image2pipe", "-vcodec", "mjpeg", "-"],
  { env },
);
let buf = Buffer.alloc(0);
ff.stdout.on("data", (chunk) => {
  buf = Buffer.concat([buf, chunk]);
  for (;;) {
    const start = buf.indexOf(Buffer.from([0xff, 0xd8]));
    const end = buf.indexOf(Buffer.from([0xff, 0xd9]), start + 2);
    if (start < 0 || end < 0) break;
    const jpeg = buf.subarray(start, end + 2);
    buf = buf.subarray(end + 2);
    last = JSON.stringify({
      type: "frame",
      seq: ++seq,
      data: jpeg.toString("base64"),
      metadata: { deviceWidth: FW, deviceHeight: FH, timestamp: Date.now() },
    });
    for (const c of wss.clients) if (c.readyState === 1) c.send(last);
  }
});
ff.stderr.on("data", (d) => process.stderr.write(d));
ff.on("exit", (code) => {
  console.error("ffmpeg exited", code);
  process.exit(1);
});

const xdo = (...args) => execFile("xdotool", args, { env }, () => {});
const sx = (x) => Math.round((x * SW) / FW);
const sy = (y) => Math.round((y * SH) / FH);
const BTN = { left: 1, middle: 2, right: 3 };
const KEYS = { Enter: "Return", Backspace: "BackSpace", Tab: "Tab", Escape: "Escape", ArrowUp: "Up", ArrowDown: "Down",
  ArrowLeft: "Left", ArrowRight: "Right", Delete: "Delete", Home: "Home", End: "End", " ": "space" };

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "status", connected: true, engine: "desktop", viewportWidth: FW, viewportHeight: FH }));
  if (last) ws.send(last);
  ws.on("message", (raw) => {
    let m;
    try { m = JSON.parse(String(raw)); } catch { return; }
    if (m.type === "input_mouse") {
      if (m.eventType === "mouseMoved") xdo("mousemove", String(sx(m.x)), String(sy(m.y)));
      else if (m.eventType === "mousePressed") xdo("mousemove", String(sx(m.x)), String(sy(m.y)), "mousedown", String(BTN[m.button] || 1));
      else if (m.eventType === "mouseReleased") xdo("mouseup", String(BTN[m.button] || 1));
      else if (m.eventType === "mouseWheel") xdo("click", "--repeat", "3", (m.deltaY || 0) > 0 ? "5" : "4");
    } else if (m.type === "input_keyboard") {
      if (m.eventType === "char" && m.text) xdo("type", "--", m.text);
      else if (m.eventType === "keyDown" && m.key) {
        if (KEYS[m.key]) xdo("key", KEYS[m.key]);
        else if (m.key.length === 1) xdo("type", "--", m.key);
      }
    }
  });
});
console.log(`screen ${SW}x${SH} -> ${FW}x${FH} @${FPS}fps on ws://0.0.0.0:${PORT}`);
