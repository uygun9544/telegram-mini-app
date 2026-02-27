import { WebSocket, WebSocketServer } from "ws";
import crypto from "node:crypto";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const PORT = Number(process.env.PORT || 8787);
const DEFAULT_BALANCE = 300;
const WIN_REWARD = 5;
const TRAINING_CONFIG_ADMIN_TOKEN = process.env.TRAINING_CONFIG_ADMIN_TOKEN || "";
const DATABASE_URL = process.env.DATABASE_URL || "";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const legacyDataDirPath = path.join(__dirname, "data");
const dataDirPath = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : process.env.RENDER_DISK_PATH
    ? path.join(path.resolve(process.env.RENDER_DISK_PATH), "telegram-mini-app-data")
    : legacyDataDirPath;

const balanceFilePath = path.join(dataDirPath, "balances.json");
const trainingConfigFilePath = path.join(dataDirPath, "training-config.json");
const playersFilePath = path.join(dataDirPath, "players.json");
const legacyBalanceFilePath = path.join(legacyDataDirPath, "balances.json");
const legacyTrainingConfigFilePath = path.join(legacyDataDirPath, "training-config.json");
const legacyPlayersFilePath = path.join(legacyDataDirPath, "players.json");

const DEFAULT_TRAINING_BOT_CONFIG = {
  reactionMinMs: 500,
  reactionMaxMs: 2300,
  missChance: 0.25
};

function normalizeTrainingBotConfig(raw) {
  const minCandidate = Number(raw?.reactionMinMs);
  const maxCandidate = Number(raw?.reactionMaxMs);
  const missChanceCandidate = Number(raw?.missChance);

  const reactionMinMs = Number.isFinite(minCandidate)
    ? Math.max(0, Math.floor(minCandidate))
    : DEFAULT_TRAINING_BOT_CONFIG.reactionMinMs;

  const reactionMaxMs = Number.isFinite(maxCandidate)
    ? Math.max(reactionMinMs, Math.floor(maxCandidate))
    : DEFAULT_TRAINING_BOT_CONFIG.reactionMaxMs;

  const missChance = Number.isFinite(missChanceCandidate)
    ? Math.min(Math.max(missChanceCandidate, 0), 1)
    : DEFAULT_TRAINING_BOT_CONFIG.missChance;

  return {
    reactionMinMs,
    reactionMaxMs,
    missChance
  };
}

function ensureBalanceStorage() {
  if (!fs.existsSync(dataDirPath)) {
    fs.mkdirSync(dataDirPath, { recursive: true });
  }

  if (
    dataDirPath !== legacyDataDirPath &&
    !fs.existsSync(balanceFilePath) &&
    fs.existsSync(legacyBalanceFilePath)
  ) {
    fs.copyFileSync(legacyBalanceFilePath, balanceFilePath);
  }

  if (
    dataDirPath !== legacyDataDirPath &&
    !fs.existsSync(trainingConfigFilePath) &&
    fs.existsSync(legacyTrainingConfigFilePath)
  ) {
    fs.copyFileSync(legacyTrainingConfigFilePath, trainingConfigFilePath);
  }

  if (
    dataDirPath !== legacyDataDirPath &&
    !fs.existsSync(playersFilePath) &&
    fs.existsSync(legacyPlayersFilePath)
  ) {
    fs.copyFileSync(legacyPlayersFilePath, playersFilePath);
  }

  if (!fs.existsSync(balanceFilePath)) {
    fs.writeFileSync(balanceFilePath, "{}", "utf-8");
  }

  if (!fs.existsSync(trainingConfigFilePath)) {
    fs.writeFileSync(
      trainingConfigFilePath,
      JSON.stringify(DEFAULT_TRAINING_BOT_CONFIG, null, 2),
      "utf-8"
    );
  }

  if (!fs.existsSync(playersFilePath)) {
    fs.writeFileSync(playersFilePath, "{}", "utf-8");
  }
}

function loadBalances() {
  ensureBalanceStorage();

  try {
    const raw = fs.readFileSync(balanceFilePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveBalances(balances) {
  ensureBalanceStorage();
  fs.writeFileSync(balanceFilePath, JSON.stringify(balances, null, 2), "utf-8");
}

function loadPlayers() {
  ensureBalanceStorage();

  try {
    const raw = fs.readFileSync(playersFilePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function savePlayers(players) {
  ensureBalanceStorage();
  fs.writeFileSync(playersFilePath, JSON.stringify(players, null, 2), "utf-8");
}

function loadTrainingBotConfig() {
  ensureBalanceStorage();

  try {
    const raw = fs.readFileSync(trainingConfigFilePath, "utf-8");
    const parsed = JSON.parse(raw);
    return normalizeTrainingBotConfig(parsed);
  } catch {
    return DEFAULT_TRAINING_BOT_CONFIG;
  }
}

function saveTrainingBotConfig(config) {
  const normalized = normalizeTrainingBotConfig(config);
  ensureBalanceStorage();
  fs.writeFileSync(trainingConfigFilePath, JSON.stringify(normalized, null, 2), "utf-8");
  return normalized;
}

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token"
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk.toString();
      if (raw.length > 1024 * 16) {
        reject(new Error("Payload too large"));
      }
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

const playerBalances = loadBalances();
const playerStats = loadPlayers();
let trainingBotConfig = loadTrainingBotConfig();
let postgresPool = null;
let storageMode = "json";

function isPostgresEnabled() {
  return Boolean(postgresPool);
}

function upsertPlayerToPostgres(playerId) {
  if (!isPostgresEnabled()) return;

  const stats = playerStats[playerId];
  if (!stats) return;

  void postgresPool
    .query(
      `
        INSERT INTO player_stats (player_id, name, balance, wins, losses, avatar_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (player_id)
        DO UPDATE SET
          name = EXCLUDED.name,
          avatar_url = EXCLUDED.avatar_url,
          balance = EXCLUDED.balance,
          wins = EXCLUDED.wins,
          losses = EXCLUDED.losses,
          updated_at = NOW()
      `,
      [
        stats.playerId,
        stats.name,
        stats.balance,
        stats.wins,
        stats.losses,
        stats.avatarUrl || null
      ]
    )
    .catch((error) => {
      console.error("[storage] failed to upsert player to postgres:", error.message);
    });
}

async function initializePostgresIfConfigured() {
  if (!DATABASE_URL) {
    console.log("[storage] DATABASE_URL is not set; using JSON storage");
    return;
  }

  try {
    postgresPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    await postgresPool.query(`
      CREATE TABLE IF NOT EXISTS player_stats (
        player_id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT 'Игрок',
        avatar_url TEXT,
        balance INT NOT NULL DEFAULT 300,
        wins INT NOT NULL DEFAULT 0,
        losses INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await postgresPool.query(`
      ALTER TABLE player_stats
      ADD COLUMN IF NOT EXISTS avatar_url TEXT
    `);

    const { rows } = await postgresPool.query(
      "SELECT player_id, name, avatar_url, balance, wins, losses FROM player_stats"
    );

    rows.forEach((row) => {
      playerStats[row.player_id] = {
        playerId: row.player_id,
        name: row.name || "Игрок",
        avatarUrl: row.avatar_url || null,
        balance: Number(row.balance) || DEFAULT_BALANCE,
        wins: Number(row.wins) || 0,
        losses: Number(row.losses) || 0
      };

      playerBalances[row.player_id] = playerStats[row.player_id].balance;
    });

    storageMode = "postgres";
    console.log(`[storage] postgres enabled, loaded ${rows.length} players`);
  } catch (error) {
    postgresPool = null;
    storageMode = "json";
    console.error("[storage] failed to initialize postgres, fallback to JSON:", error.message);
  }
}

function ensurePlayerStats(playerId) {
  if (!playerStats[playerId]) {
    playerStats[playerId] = {
      playerId,
      name: "Игрок",
      avatarUrl: null,
      balance: DEFAULT_BALANCE,
      wins: 0,
      losses: 0
    };
    savePlayers(playerStats);
    upsertPlayerToPostgres(playerId);
  }

  const stats = playerStats[playerId];

  if (typeof stats.playerId !== "string") {
    stats.playerId = playerId;
  }

  if (typeof stats.name !== "string" || !stats.name.trim()) {
    stats.name = "Игрок";
  }

  if (typeof stats.avatarUrl !== "string" || !stats.avatarUrl.trim()) {
    stats.avatarUrl = null;
  }

  if (typeof stats.balance !== "number") {
    stats.balance = DEFAULT_BALANCE;
  }

  if (typeof stats.wins !== "number") {
    stats.wins = 0;
  }

  if (typeof stats.losses !== "number") {
    stats.losses = 0;
  }

  savePlayers(playerStats);

  return stats;
}

function updatePlayerStatsMeta(playerId, patch) {
  const stats = ensurePlayerStats(playerId);

  if (typeof patch.name === "string" && patch.name.trim()) {
    stats.name = patch.name.trim();
  }

  if (typeof patch.avatarUrl === "string" && patch.avatarUrl.trim()) {
    stats.avatarUrl = patch.avatarUrl;
  }

  savePlayers(playerStats);
  upsertPlayerToPostgres(playerId);
}

function buildLeaderboard(limit = 50) {
  const normalizedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);

  return Object.values(playerStats)
    .map((row) => {
      const wins = Number(row.wins) || 0;
      const losses = Number(row.losses) || 0;
      const balance = Number(row.balance) || DEFAULT_BALANCE;
      const matches = wins + losses;
      const winRate = matches > 0
        ? Math.round((wins / matches) * 1000) / 10
        : 0;

      return {
        playerId: row.playerId,
        name: row.name || "Игрок",
        avatarUrl: row.avatarUrl || null,
        balance,
        wins,
        losses,
        matches,
        winRate
      };
    })
    .sort((a, b) => {
      if (b.balance !== a.balance) return b.balance - a.balance;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      return a.name.localeCompare(b.name, "ru");
    })
    .slice(0, normalizedLimit);
}

function ensurePlayerBalance(playerId) {
  ensurePlayerStats(playerId);
  if (typeof playerBalances[playerId] !== "number") {
    playerBalances[playerId] = DEFAULT_BALANCE;
    saveBalances(playerBalances);
  }

  if (typeof playerStats[playerId]?.balance !== "number") {
    playerStats[playerId].balance = playerBalances[playerId];
    savePlayers(playerStats);
  }

  return playerBalances[playerId];
}

function adjustPlayerBalance(playerId, delta) {
  const current = ensurePlayerBalance(playerId);
  const next = current + delta;
  playerBalances[playerId] = next;
  saveBalances(playerBalances);
  playerStats[playerId].balance = next;
  savePlayers(playerStats);
  upsertPlayerToPostgres(playerId);
  return next;
}

const server = http.createServer(async (req, res) => {
  if (req.url?.startsWith("/training-config")) {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token"
      });
      res.end();
      return;
    }

    if (req.method === "GET") {
      writeJson(res, 200, {
        ok: true,
        config: trainingBotConfig
      });
      return;
    }

    if (req.method === "POST") {
      if (!TRAINING_CONFIG_ADMIN_TOKEN) {
        writeJson(res, 503, {
          ok: false,
          message: "TRAINING_CONFIG_ADMIN_TOKEN is not configured"
        });
        return;
      }

      const adminToken = req.headers["x-admin-token"];

      if (adminToken !== TRAINING_CONFIG_ADMIN_TOKEN) {
        writeJson(res, 401, {
          ok: false,
          message: "Unauthorized"
        });
        return;
      }

      try {
        const body = await readJsonBody(req);
        trainingBotConfig = saveTrainingBotConfig({
          ...trainingBotConfig,
          ...body
        });

        writeJson(res, 200, {
          ok: true,
          config: trainingBotConfig
        });
      } catch (error) {
        writeJson(res, 400, {
          ok: false,
          message: error instanceof Error ? error.message : "Invalid request"
        });
      }

      return;
    }

    writeJson(res, 405, {
      ok: false,
      message: "Method not allowed"
    });
    return;
  }

  if (req.url === "/health") {
    const payload = {
      ok: true,
      service: "telegram-mini-app-matchmaking",
      queueSize: queue.length,
      activeRooms: rooms.size,
      connectedClients: clients.size,
      trackedPlayers: Object.keys(playerBalances).length,
      trainingBotConfig,
      storagePath: dataDirPath,
      storageMode,
      timestamp: new Date().toISOString()
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
    return;
  }

  if (req.url?.startsWith("/leaderboard") && req.method === "GET") {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const limit = parsedUrl.searchParams.get("limit") || "50";
    const rows = buildLeaderboard(Number(limit));

    writeJson(res, 200, {
      ok: true,
      totalPlayers: Object.keys(playerStats).length,
      limit: rows.length,
      rows
    });
    return;
  }

  if (req.url?.startsWith("/leaders") && req.method === "GET") {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const limit = parsedUrl.searchParams.get("limit") || "20";
    const rows = buildLeaderboard(Number(limit));

    writeJson(res, 200, {
      ok: true,
      totalPlayers: Object.keys(playerStats).length,
      limit: rows.length,
      rows
    });
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Matchmaking server is running");
});

const wss = new WebSocketServer({ noServer: true });

const queue = [];
const clients = new Map();
const rooms = new Map();
const COLORS = ["blue", "red", "yellow", "green"];

function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function createRoomId() {
  return crypto.randomBytes(4).toString("hex");
}

function removeFromQueue(clientId) {
  const index = queue.findIndex((id) => id === clientId);
  if (index >= 0) {
    queue.splice(index, 1);
  }
}

function getClientName(clientId) {
  const client = clients.get(clientId);
  return client?.playerName || "Игрок";
}

function getClientProfile(clientId) {
  const client = clients.get(clientId);

  return {
    playerId: client?.playerId || clientId,
    name: client?.playerName || "Игрок",
    avatarUrl: client?.avatarUrl || null,
    slipper: client?.slipper || "/default.png"
  };
}

function getRandomPairColors() {
  const shuffled = [...COLORS].sort(() => 0.5 - Math.random());
  return [shuffled[0], shuffled[1]];
}

function generatePositions() {
  const p1 = {
    top: Math.random() * 50 + 10,
    left: Math.random() * 70 + 10
  };

  let p2;

  do {
    p2 = {
      top: Math.random() * 50 + 10,
      left: Math.random() * 70 + 10
    };
  } while (
    Math.abs(p1.top - p2.top) < 20 &&
    Math.abs(p1.left - p2.left) < 20
  );

  return [p1, p2];
}

function createRoundPlan(roundNumber) {
  const revealDelayMs = Math.floor(Math.random() * 6000) + 2000;

  return {
    round: roundNumber,
    colors: getRandomPairColors(),
    positions: generatePositions(),
    revealAt: Date.now() + revealDelayMs,
    actionWindowMs: 20000
  };
}

function notifyRoomBoth(room, payloadA, payloadB = payloadA) {
  const clientA = clients.get(room.players[0]);
  const clientB = clients.get(room.players[1]);

  if (clientA) send(clientA.ws, payloadA);
  if (clientB) send(clientB.ws, payloadB);
}

function cancelRoom(roomId, initiatorId = null) {
  const room = rooms.get(roomId);
  if (!room) return;

  notifyRoomBoth(room, { type: "match_cancelled", roomId });

  room.players.forEach((playerId) => {
    const client = clients.get(playerId);
    if (!client) return;
    if (client.roomId === roomId) {
      client.roomId = null;
    }
  });

  rooms.delete(roomId);
}

function tryMatchmake() {
  while (queue.length >= 2) {
    const playerA = queue.shift();
    const playerB = queue.shift();

    if (!playerA || !playerB) return;

    const clientA = clients.get(playerA);
    const clientB = clients.get(playerB);

    if (!clientA || !clientB) continue;

    const roomId = createRoomId();
    const room = {
      id: roomId,
      players: [playerA, playerB],
      accepted: new Set(),
      rounds: new Map(),
      roundPlans: new Map(),
      resultApplied: false
    };

    rooms.set(roomId, room);
    clientA.roomId = roomId;
    clientB.roomId = roomId;

    send(clientA.ws, {
      type: "match_found",
      roomId,
      opponent: getClientProfile(playerB)
    });

    send(clientB.ws, {
      type: "match_found",
      roomId,
      opponent: getClientProfile(playerA)
    });
  }
}

wss.on("connection", (ws) => {
  const clientId = crypto.randomUUID();

  clients.set(clientId, {
    id: clientId,
    ws,
    playerName: "Игрок",
    playerId: clientId,
    avatarUrl: null,
    slipper: "/default.png",
    roomId: null
  });

  send(ws, { type: "connected" });

  ws.on("message", (raw) => {
    let message;

    try {
      message = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: "error", message: "Invalid JSON" });
      return;
    }

    const client = clients.get(clientId);
    if (!client) return;

    if (message.type === "join_queue") {
      const profile = message.profile || {};

      client.playerName = profile.name || "Игрок";
      client.playerId = profile.playerId || clientId;
      client.avatarUrl = profile.avatarUrl || null;
      client.slipper = profile.slipper || "/default.png";

      updatePlayerStatsMeta(client.playerId, {
        name: client.playerName,
        avatarUrl: client.avatarUrl
      });

      const balance = ensurePlayerBalance(client.playerId);

      send(client.ws, {
        type: "balance_sync",
        playerId: client.playerId,
        balance
      });

      removeFromQueue(clientId);
      queue.push(clientId);
      tryMatchmake();
      return;
    }

    if (message.type === "sync_balance") {
      const profile = message.profile || {};

      client.playerName = profile.name || client.playerName || "Игрок";
      client.playerId = profile.playerId || client.playerId || clientId;
      client.avatarUrl = profile.avatarUrl || client.avatarUrl || null;
      client.slipper = profile.slipper || client.slipper || "/default.png";

      updatePlayerStatsMeta(client.playerId, {
        name: client.playerName,
        avatarUrl: client.avatarUrl
      });

      const balance = ensurePlayerBalance(client.playerId);

      send(client.ws, {
        type: "balance_sync",
        playerId: client.playerId,
        balance
      });
      return;
    }

    if (message.type === "cancel_queue") {
      removeFromQueue(clientId);
      return;
    }

    if (message.type === "accept_match") {
      const room = rooms.get(message.roomId);
      if (!room || !room.players.includes(clientId)) return;

      room.accepted.add(client.playerId);

      notifyRoomBoth(room, {
        type: "match_accept_update",
        roomId: room.id,
        acceptedPlayerIds: Array.from(room.accepted)
      });

      if (room.accepted.size === 2) {
        const [a, b] = room.players;
        const playerA = clients.get(a);
        const playerB = clients.get(b);
        if (!playerA || !playerB) return;

        const firstRoundPlan = createRoundPlan(1);
        room.roundPlans.set(1, firstRoundPlan);

        send(playerA.ws, {
          type: "match_ready",
          roomId: room.id,
          opponent: getClientProfile(b),
          roundPlan: firstRoundPlan,
          acceptedPlayerIds: Array.from(room.accepted)
        });

        send(playerB.ws, {
          type: "match_ready",
          roomId: room.id,
          opponent: getClientProfile(a),
          roundPlan: firstRoundPlan,
          acceptedPlayerIds: Array.from(room.accepted)
        });
      }
      return;
    }

    if (message.type === "cancel_match") {
      cancelRoom(message.roomId, clientId);
      return;
    }

    if (message.type === "round_submit") {
      const room = rooms.get(message.roomId);
      if (!room || !room.players.includes(clientId)) return;

      const roundKey = String(message.round);
      const current = room.rounds.get(roundKey) || {};

      if (room.players[0] === clientId) {
        current.a = {
          state: message.state,
          time: message.time ?? null
        };
      } else {
        current.b = {
          state: message.state,
          time: message.time ?? null
        };
      }

      room.rounds.set(roundKey, current);

      if (current.a && current.b) {
        const [a, b] = room.players;
        const clientA = clients.get(a);
        const clientB = clients.get(b);
        if (!clientA || !clientB) return;

        const nextRoundNumber = Number(message.round) + 1;
        const nextRoundPlan = createRoundPlan(nextRoundNumber);
        room.roundPlans.set(nextRoundNumber, nextRoundPlan);

        send(clientA.ws, {
          type: "round_result",
          roomId: room.id,
          round: message.round,
          enemyState: current.b.state,
          enemyTime: current.b.time,
          nextRoundPlan
        });

        send(clientB.ws, {
          type: "round_result",
          roomId: room.id,
          round: message.round,
          enemyState: current.a.state,
          enemyTime: current.a.time,
          nextRoundPlan
        });
      }
      return;
    }

    if (message.type === "match_result") {
      const room = rooms.get(message.roomId);
      if (!room || !room.players.includes(clientId)) return;

      if (room.resultApplied) {
        const currentBalance = ensurePlayerBalance(client.playerId || clientId);
        send(client.ws, {
          type: "balance_update",
          playerId: client.playerId || clientId,
          balance: currentBalance
        });
        return;
      }

      const winnerPlayerId = message.winnerPlayerId;
      const roomClients = room.players
        .map((id) => clients.get(id))
        .filter(Boolean);

      const winnerClient = roomClients.find((roomClient) => roomClient.playerId === winnerPlayerId);
      if (!winnerClient) return;

      const loserClient = roomClients.find((roomClient) => roomClient.playerId !== winnerPlayerId);
      if (!loserClient) return;

      const winnerBalance = adjustPlayerBalance(winnerClient.playerId, WIN_REWARD);
      const loserBalance = adjustPlayerBalance(loserClient.playerId, -WIN_REWARD);

      const winnerStats = ensurePlayerStats(winnerClient.playerId);
      const loserStats = ensurePlayerStats(loserClient.playerId);

      winnerStats.wins += 1;
      loserStats.losses += 1;
      savePlayers(playerStats);
      upsertPlayerToPostgres(winnerClient.playerId);
      upsertPlayerToPostgres(loserClient.playerId);

      send(winnerClient.ws, {
        type: "balance_update",
        playerId: winnerClient.playerId,
        balance: winnerBalance
      });

      send(loserClient.ws, {
        type: "balance_update",
        playerId: loserClient.playerId,
        balance: loserBalance
      });

      room.resultApplied = true;

      room.players.forEach((roomClientId) => {
        const roomClient = clients.get(roomClientId);
        if (roomClient && roomClient.roomId === room.id) {
          roomClient.roomId = null;
        }
      });

      rooms.delete(room.id);
      return;
    }

    send(ws, { type: "error", message: "Unknown message type" });
  });

  ws.on("close", () => {
    const client = clients.get(clientId);
    if (!client) return;

    removeFromQueue(clientId);

    if (client.roomId) {
      const room = rooms.get(client.roomId);
      if (room) {
        const otherId = room.players.find((id) => id !== clientId);
        if (otherId) {
          const other = clients.get(otherId);
          if (other) {
            other.roomId = null;
            send(other.ws, { type: "opponent_left", roomId: room.id });
          }
        }
        rooms.delete(room.id);
      }
    }

    clients.delete(clientId);
  });
});

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

async function startServer() {
  await initializePostgresIfConfigured();

  server.listen(PORT, () => {
    console.log(`Matchmaking WS server is running on ws://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

void startServer();

process.once("SIGINT", async () => {
  if (postgresPool) {
    await postgresPool.end();
  }
  process.exit(0);
});

process.once("SIGTERM", async () => {
  if (postgresPool) {
    await postgresPool.end();
  }
  process.exit(0);
});
