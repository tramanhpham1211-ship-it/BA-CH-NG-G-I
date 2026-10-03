/* BA CHÀNG GÁI — 2-player WebSocket & HTTP Game Server
 * Compatible with Node.js 18+, Render.com, and local environments
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

const DIST_DIR = path.join(__dirname, 'dist');
const ROOT_INDEX = path.join(__dirname, 'index.html');
const DIST_INDEX = path.join(DIST_DIR, 'index.html');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const rooms = new Map();
const MAX_ROOMS = 2000;
const MAX_PAYLOAD = 128 * 1024;
const IDLE_TIMEOUT = 45 * 60 * 1000;

const cleanRoom = (s) => String(s || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 12);
const cleanName = (s) => String(s || '').trim().slice(0, 20);

const send = (ws, msg) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(msg));
    } catch (_) {}
  }
};

function roomInfo(r) {
  return {
    room: r.id,
    count: r.players.size,
    max: 2,
    started: r.started,
    hostId: r.hostId
  };
}

function notify(r) {
  const pList = [...r.players.values()].map((x) => ({
    id: x.id,
    name: x.name,
    side: x.id === r.hostId ? 0 : 1
  }));
  for (const p of r.players.values()) {
    send(p.ws, {
      type: 'peerCount',
      ...roomInfo(r),
      players: pList
    });
  }
}

function newRoom(id) {
  if (rooms.size >= MAX_ROOMS) return null;
  const r = {
    id,
    hostId: null,
    started: false,
    created: Date.now(),
    last: Date.now(),
    players: new Map()
  };
  rooms.set(id, r);
  return r;
}

function leave(ws) {
  const r = ws.room;
  if (!r) return;
  const old = ws.playerId;
  r.players.delete(old);
  ws.room = null;
  ws.playerId = null;
  r.last = Date.now();

  if (r.hostId === old) {
    const nextPlayer = r.players.values().next().value;
    r.hostId = nextPlayer ? nextPlayer.id : null;
    if (nextPlayer) {
      nextPlayer.side = 0;
      send(nextPlayer.ws, { type: 'host', hostId: nextPlayer.id, side: 0 });
    }
  }

  if (r.players.size === 0) {
    rooms.delete(r.id);
    return;
  }

  r.started = false;
  for (const p of r.players.values()) {
    send(p.ws, {
      type: 'peerLeft',
      reason: 'Đối thủ đã rời phòng.',
      ...roomInfo(r)
    });
  }
  notify(r);
}

function join(ws, msg) {
  if (ws.room) return;
  const id = cleanRoom(msg.room);
  const name = cleanName(msg.name);
  if (!id || !name) {
    return send(ws, { type: 'error', message: 'Room ID và tên người chơi là bắt buộc.' });
  }

  let r = rooms.get(id);
  if (!r) r = newRoom(id);
  if (!r) {
    return send(ws, { type: 'error', message: 'Server đang quá tải phòng, vui lòng thử lại sau.' });
  }

  if (r.players.size >= 2) {
    return send(ws, { type: 'error', message: 'Phòng đã đủ 2 người chơi.' });
  }

  const pid = crypto.randomBytes(6).toString('hex');
  const side = r.hostId ? 1 : 0;
  const p = { id: pid, name, ws, side };
  r.players.set(pid, p);

  if (!r.hostId) r.hostId = pid;
  ws.room = r;
  ws.playerId = pid;
  r.last = Date.now();

  send(ws, {
    type: 'joined',
    playerId: pid,
    room: r.id,
    side,
    host: side === 0,
    players: [...r.players.values()].map((x) => ({ id: x.id, name: x.name, side: x.side }))
  });

  for (const o of r.players.values()) {
    if (o.id !== pid) {
      send(o.ws, { type: 'peerJoined', playerId: pid, name, side });
    }
  }
  notify(r);
}

function start(ws) {
  const r = ws.room;
  if (!r) return;
  if (ws.playerId !== r.hostId) {
    return send(ws, { type: 'error', message: 'Chỉ chủ phòng (Host) mới có quyền START.' });
  }
  if (r.players.size !== 2) {
    return send(ws, { type: 'error', message: 'Cần đủ 2 người chơi để bắt đầu.' });
  }

  r.started = true;
  r.last = Date.now();
  for (const p of r.players.values()) {
    send(p.ws, {
      type: 'start',
      serverTime: Date.now(),
      seed: crypto.randomInt(1, 0x7fffffff),
      players: [...r.players.values()].map((x) => ({ id: x.id, name: x.name, side: x.side }))
    });
  }
}

function input(ws, payload) {
  const r = ws.room;
  if (!r || !r.started) return;
  const host = [...r.players.values()].find((p) => p.id === r.hostId);
  if (!host) return;
  if (ws.playerId === r.hostId) return;
  send(host.ws, { type: 'remoteInput', from: ws.playerId, payload });
  r.last = Date.now();
}

function snapshot(ws, payload) {
  const r = ws.room;
  if (!r || !r.started || ws.playerId !== r.hostId) return;
  for (const p of r.players.values()) {
    if (p.id !== r.hostId) {
      send(p.ws, { type: 'snapshot', serverTime: Date.now(), payload });
    }
  }
  r.last = Date.now();
}

function event(ws, payload) {
  const r = ws.room;
  if (!r || !r.started || ws.playerId !== r.hostId) return;
  for (const p of r.players.values()) {
    if (p.id !== r.hostId) {
      send(p.ws, { type: 'event', payload });
    }
  }
}

function handleMessage(ws, raw) {
  if (Buffer.byteLength(raw) > MAX_PAYLOAD) return;
  let m;
  try {
    m = JSON.parse(raw);
  } catch (_) {
    return send(ws, { type: 'error', message: 'Dữ liệu JSON không hợp lệ.' });
  }
  if (!m || typeof m.type !== 'string') return;

  switch (m.type) {
    case 'join':
      join(ws, m);
      break;
    case 'start':
      start(ws);
      break;
    case 'input':
      input(ws, m.payload);
      break;
    case 'snapshot':
      snapshot(ws, m.payload);
      break;
    case 'event':
      event(ws, m.payload);
      break;
    case 'ping':
      send(ws, { type: 'pong', t: Date.now() });
      break;
    case 'leave':
      leave(ws);
      break;
  }
}

// HTTP Server
const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(reqUrl.pathname);

  // Healthcheck endpoint for Render.com
  if (pathname === '/health') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    });
    return res.end(
      JSON.stringify({
        ok: true,
        game: 'BA CHÀNG GÁI — Sea Football',
        rooms: rooms.size,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
      })
    );
  }

  // Room status API for quick check
  if (pathname === '/api/rooms') {
    const list = [...rooms.values()].map((r) => roomInfo(r));
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    });
    return res.end(JSON.stringify({ total: rooms.size, rooms: list }));
  }

  // Instant QR code generation endpoint
  if (pathname === '/api/qr') {
    const text = reqUrl.searchParams.get('text') || '';
    if (!text) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Missing text parameter' }));
    }
    QRCode.toDataURL(text, {
      margin: 1,
      width: 240,
      color: { dark: '#021626', light: '#ffffff' }
    })
      .then((dataUrl) => {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400'
        });
        res.end(JSON.stringify({ ok: true, dataUrl }));
      })
      .catch((err) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
    return;
  }

  // Serve static files
  let safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  // Priority: check dist/ first, then root directory
  let targetFile = path.join(DIST_DIR, safePath);
  if (!fs.existsSync(targetFile) || fs.statSync(targetFile).isDirectory()) {
    targetFile = path.join(__dirname, safePath);
  }

  // Fallback to index.html if not found (SPA fallback)
  if (!fs.existsSync(targetFile) || fs.statSync(targetFile).isDirectory()) {
    targetFile = fs.existsSync(DIST_INDEX) ? DIST_INDEX : ROOT_INDEX;
  }

  fs.readFile(targetFile, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }
    const ext = path.extname(targetFile).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    res.end(data);
  });
});

// WebSocket Server attached to same HTTP Server
const wss = new WebSocketServer({ server, maxPayload: MAX_PAYLOAD });

wss.on('connection', (ws) => {
  ws.alive = true;
  ws.on('pong', () => {
    ws.alive = true;
  });
  ws.on('message', (data) => handleMessage(ws, data.toString()));
  ws.on('close', () => leave(ws));
  ws.on('error', () => leave(ws));

  send(ws, {
    type: 'hello',
    serverTime: Date.now(),
    info: 'BA CHÀNG GÁI WebSocket Server connected.'
  });
});

// Heartbeat ping every 15s to prevent Render free-tier / proxy idle timeouts
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.alive) {
      try {
        ws.terminate();
      } catch (_) {}
      continue;
    }
    ws.alive = false;
    try {
      ws.ping();
    } catch (_) {}
  }
}, 15000).unref();

// Room cleanup every 60s
setInterval(() => {
  const now = Date.now();
  for (const [id, r] of rooms) {
    if (!r.players.size || now - r.last > IDLE_TIMEOUT) {
      for (const p of r.players.values()) {
        try {
          p.ws.close();
        } catch (_) {}
      }
      rooms.delete(id);
    }
  }
}, 60000).unref();

server.listen(PORT, HOST, () => {
  console.log(`[BA CHÀNG GÁI] Game Server running at http://${HOST}:${PORT}`);
  console.log(`[BA CHÀNG GÁI] WebSocket endpoint available on same origin (ws://${HOST}:${PORT})`);
});
