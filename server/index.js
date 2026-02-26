import { WebSocket, WebSocketServer } from "ws";
import crypto from "node:crypto";
import http from "node:http";

const PORT = Number(process.env.PORT || 8787);

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    const payload = {
      ok: true,
      service: "telegram-mini-app-matchmaking",
      queueSize: queue.length,
      activeRooms: rooms.size,
      connectedClients: clients.size,
      timestamp: new Date().toISOString()
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Matchmaking server is running");
});

const wss = new WebSocketServer({ noServer: true });

const queue = [];
const clients = new Map();
const rooms = new Map();

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
      rounds: new Map()
    };

    rooms.set(roomId, room);
    clientA.roomId = roomId;
    clientB.roomId = roomId;

    send(clientA.ws, {
      type: "match_found",
      roomId,
      opponentName: getClientName(playerB)
    });

    send(clientB.ws, {
      type: "match_found",
      roomId,
      opponentName: getClientName(playerA)
    });
  }
}

wss.on("connection", (ws) => {
  const clientId = crypto.randomUUID();

  clients.set(clientId, {
    id: clientId,
    ws,
    playerName: "Игрок",
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
      client.playerName = message.playerName || "Игрок";
      removeFromQueue(clientId);
      queue.push(clientId);
      tryMatchmake();
      return;
    }

    if (message.type === "cancel_queue") {
      removeFromQueue(clientId);
      return;
    }

    if (message.type === "accept_match") {
      const room = rooms.get(message.roomId);
      if (!room || !room.players.includes(clientId)) return;

      room.accepted.add(clientId);
      if (room.accepted.size === 2) {
        const [a, b] = room.players;
        const playerA = clients.get(a);
        const playerB = clients.get(b);
        if (!playerA || !playerB) return;

        send(playerA.ws, {
          type: "match_ready",
          roomId: room.id,
          opponentName: getClientName(b)
        });

        send(playerB.ws, {
          type: "match_ready",
          roomId: room.id,
          opponentName: getClientName(a)
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

        send(clientA.ws, {
          type: "round_result",
          roomId: room.id,
          round: message.round,
          enemyState: current.b.state,
          enemyTime: current.b.time
        });

        send(clientB.ws, {
          type: "round_result",
          roomId: room.id,
          round: message.round,
          enemyState: current.a.state,
          enemyTime: current.a.time
        });
      }
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

server.listen(PORT, () => {
  console.log(`Matchmaking WS server is running on ws://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
