const HANDS = [
  {
    id: "two-sets-of-3",
    title: "2 sets of 3",
    detail: "Two groups of three matching card values.",
  },
  {
    id: "two-runs-of-3",
    title: "2 runs of 3",
    detail: "Two sequences of three cards in the same suit.",
  },
  {
    id: "run-of-3-set-of-3",
    title: "A run of 3 and set of 3",
    detail: "One three-card sequence and one three-card set.",
  },
  {
    id: "two-sets-of-4",
    title: "2 sets of 4",
    detail: "Two groups of four matching card values.",
  },
  {
    id: "three-sets-of-3",
    title: "3 sets of 3",
    detail: "Three groups of three matching card values.",
  },
  {
    id: "two-runs-of-4",
    title: "2 runs of 4",
    detail: "Two sequences of four cards in the same suit.",
  },
  {
    id: "two-runs-of-5",
    title: "2 runs of 5",
    detail: "Two sequences of five cards in the same suit.",
  },
  {
    id: "two-sets-of-5",
    title: "2 sets of 5",
    detail: "Two groups of five matching card values.",
  },
  {
    id: "run-of-5-set-of-5",
    title: "A run of 5 and a set of 5",
    detail: "One five-card sequence and one five-card set.",
  },
  {
    id: "run-of-10",
    title: "A run of 10",
    detail: "One ten-card sequence in the same suit.",
  },
];

const STORAGE_KEY = "mexican-rummy-scorekeeper-state-v1";

const dom = {
  body: document.body,
  connectionStatus: document.querySelector("#connectionStatus"),
  copyRoomButton: document.querySelector("#copyRoomButton"),
  welcomeView: document.querySelector("#welcomeView"),
  gameView: document.querySelector("#gameView"),
  hostTab: document.querySelector("#hostTab"),
  joinTab: document.querySelector("#joinTab"),
  hostForm: document.querySelector("#hostForm"),
  joinForm: document.querySelector("#joinForm"),
  hostName: document.querySelector("#hostName"),
  initialPlayers: document.querySelector("#initialPlayers"),
  joinName: document.querySelector("#joinName"),
  roomCode: document.querySelector("#roomCode"),
  localGameButton: document.querySelector("#localGameButton"),
  roomHeading: document.querySelector("#roomHeading"),
  saveSnapshotButton: document.querySelector("#saveSnapshotButton"),
  importSnapshotInput: document.querySelector("#importSnapshotInput"),
  newGameButton: document.querySelector("#newGameButton"),
  addPlayerForm: document.querySelector("#addPlayerForm"),
  newPlayerName: document.querySelector("#newPlayerName"),
  scoreboardBody: document.querySelector("#scoreboardBody"),
  playerButtons: document.querySelector("#playerButtons"),
  selectedPlayerMeta: document.querySelector("#selectedPlayerMeta"),
  selectedPlayerName: document.querySelector("#selectedPlayerName"),
  selectedPlayerTotal: document.querySelector("#selectedPlayerTotal"),
  emptyState: document.querySelector("#emptyState"),
  playerDetails: document.querySelector("#playerDetails"),
  handsSummary: document.querySelector("#handsSummary"),
  handsGrid: document.querySelector("#handsGrid"),
  scoreForm: document.querySelector("#scoreForm"),
  scoreAmount: document.querySelector("#scoreAmount"),
  scoreNote: document.querySelector("#scoreNote"),
  scoreHistory: document.querySelector("#scoreHistory"),
  toast: document.querySelector("#toast"),
};

let role = "home";
let state = null;
let peer = null;
let guestConnection = null;
const hostConnections = new Map();
let toastTimer = 0;

init();

function init() {
  wireEvents();
  hydrateJoinLink();
  updateResumeButton();
  render();
}

function wireEvents() {
  dom.hostTab.addEventListener("click", () => setSetupMode("host"));
  dom.joinTab.addEventListener("click", () => setSetupMode("join"));
  dom.hostForm.addEventListener("submit", handleHostSubmit);
  dom.joinForm.addEventListener("submit", handleJoinSubmit);
  dom.localGameButton.addEventListener("click", startLocalGame);
  dom.copyRoomButton.addEventListener("click", copyRoomLink);
  dom.saveSnapshotButton.addEventListener("click", exportSnapshot);
  dom.importSnapshotInput.addEventListener("change", importSnapshot);
  dom.newGameButton.addEventListener("click", resetToHome);
  dom.addPlayerForm.addEventListener("submit", addPlayerFromForm);
  dom.scoreForm.addEventListener("submit", addScoreEntry);
}

function hydrateJoinLink() {
  const params = new URLSearchParams(window.location.search);
  const room = params.get("room");

  if (room) {
    setSetupMode("join");
    dom.roomCode.value = formatRoomCode(room);
    dom.joinName.focus();
  }
}

function updateResumeButton() {
  const saved = readSavedState();
  dom.localGameButton.textContent = saved ? "Resume saved scorecard" : "Start local scorecard";
}

function setSetupMode(mode) {
  const isHost = mode === "host";
  dom.hostTab.classList.toggle("active", isHost);
  dom.joinTab.classList.toggle("active", !isHost);
  dom.hostTab.setAttribute("aria-selected", String(isHost));
  dom.joinTab.setAttribute("aria-selected", String(!isHost));
  dom.hostForm.classList.toggle("hidden", !isHost);
  dom.joinForm.classList.toggle("hidden", isHost);
}

function handleHostSubmit(event) {
  event.preventDefault();

  const hostName = cleanName(dom.hostName.value) || "Host";
  const playerNames = collectInitialPlayers(hostName, dom.initialPlayers.value);
  const roomId = createRoomCode();

  state = createGameState(roomId, hostName, playerNames);
  role = "host";
  saveState();
  render();

  if (!canUsePeer()) {
    role = "local";
    showToast("Live rooms need the PeerJS script. This scorecard is running locally.");
    render();
    return;
  }

  startHostPeer(roomId);
}

function handleJoinSubmit(event) {
  event.preventDefault();

  const name = cleanName(dom.joinName.value);
  const roomId = formatRoomCode(dom.roomCode.value);

  if (!name) {
    showToast("Enter your name before joining.");
    dom.joinName.focus();
    return;
  }

  if (!roomId) {
    showToast("Enter the room code from the host.");
    dom.roomCode.focus();
    return;
  }

  if (!canUsePeer()) {
    showToast("Live joining needs the PeerJS script. Check your connection and try again.");
    return;
  }

  role = "guest";
  state = createWaitingState(roomId, name);
  render();
  startGuestPeer(roomId, name);
}

function startLocalGame() {
  disconnectPeer();

  const saved = readSavedState();
  if (saved) {
    state = saved;
    role = "local";
    showToast("Saved scorecard restored.");
  } else {
    const hostName = cleanName(dom.hostName.value) || "Host";
    const playerNames = collectInitialPlayers(hostName, dom.initialPlayers.value);
    state = createGameState("", hostName, playerNames);
    role = "local";
    saveState();
  }

  render();
}

function startHostPeer(roomId) {
  disconnectPeer();
  setStatus(`Opening ${roomId}...`);

  peer = new window.Peer(roomCodeToPeerId(roomId), {
    debug: 0,
  });

  peer.on("open", () => {
    setStatus(`Hosting ${roomId}`);
    showToast(`Room ${roomId} is ready.`);
    render();
  });

  peer.on("connection", (connection) => {
    hostConnections.set(connection.peer, connection);
    setStatus(`Hosting ${roomId}`);

    connection.on("data", (message) => handleHostMessage(connection, message));
    connection.on("close", () => {
      hostConnections.delete(connection.peer);
      render();
    });
    connection.on("error", () => {
      hostConnections.delete(connection.peer);
      render();
    });

    connection.on("open", () => {
      sendToConnection(connection, {
        type: "state",
        state,
      });
    });
  });

  peer.on("error", (error) => {
    if (error.type === "unavailable-id") {
      const newRoomId = createRoomCode();
      state.roomId = newRoomId;
      saveAndBroadcast();
      showToast("That room code was busy, so a new one was created.");
      startHostPeer(newRoomId);
      render();
      return;
    }

    role = "local";
    setStatus("Local scorecard");
    showToast("Live hosting is unavailable right now. You can still score locally.");
    render();
  });
}

function startGuestPeer(roomId, playerName) {
  disconnectPeer();
  setStatus(`Joining ${roomId}...`);

  peer = new window.Peer(undefined, {
    debug: 0,
  });

  peer.on("open", () => {
    guestConnection = peer.connect(roomCodeToPeerId(roomId), {
      reliable: true,
    });

    guestConnection.on("open", () => {
      setStatus(`Joined ${roomId}`);
      sendToConnection(guestConnection, {
        type: "join",
        name: playerName,
      });
    });

    guestConnection.on("data", (message) => {
      if (message?.type === "state" && message.state) {
        state = normalizeState(message.state);
        role = "guest";
        render();
      }
    });

    guestConnection.on("close", () => {
      setStatus("Disconnected");
      showToast("Connection closed. Ask the host for a fresh room if needed.");
      render();
    });

    guestConnection.on("error", () => {
      setStatus("Connection error");
      showToast("Could not stay connected to the room.");
      render();
    });
  });

  peer.on("error", () => {
    setStatus("Join failed");
    showToast("Could not join that room. Check the code with the host.");
    render();
  });
}

function handleHostMessage(connection, message) {
  if (message?.type !== "join") {
    return;
  }

  const playerName = cleanName(message.name) || "Player";
  const existing = findPlayerByName(playerName);

  if (!existing) {
    const player = createPlayer(playerName);
    state.players.push(player);
    state.selectedPlayerId ||= player.id;
    showToast(`${playerName} joined the game.`);
  }

  sendToConnection(connection, {
    type: "state",
    state,
  });
  saveAndBroadcast();
}

function addPlayerFromForm(event) {
  event.preventDefault();

  if (!canHostEdit()) {
    return;
  }

  const playerName = cleanName(dom.newPlayerName.value);
  if (!playerName) {
    showToast("Enter a player name.");
    dom.newPlayerName.focus();
    return;
  }

  if (findPlayerByName(playerName)) {
    showToast(`${playerName} is already at the table.`);
    dom.newPlayerName.select();
    return;
  }

  const player = createPlayer(playerName);
  state.players.push(player);
  state.selectedPlayerId = player.id;
  dom.newPlayerName.value = "";
  saveAndBroadcast();
  render();
}

function addScoreEntry(event) {
  event.preventDefault();

  if (!canHostEdit()) {
    return;
  }

  const player = getSelectedPlayer();
  if (!player) {
    showToast("Choose a player before adding a score.");
    return;
  }

  const points = Number.parseInt(dom.scoreAmount.value, 10);
  if (!Number.isFinite(points)) {
    showToast("Enter a whole-number score.");
    dom.scoreAmount.focus();
    return;
  }

  player.scoreEntries.push({
    id: createId("score"),
    points,
    note: cleanText(dom.scoreNote.value, 80),
    createdAt: new Date().toISOString(),
  });

  dom.scoreAmount.value = "";
  dom.scoreNote.value = "";
  saveAndBroadcast();
  render();
  dom.scoreAmount.focus();
}

function toggleHand(playerId, handId, checked) {
  if (!canHostEdit()) {
    return;
  }

  const player = state.players.find((item) => item.id === playerId);
  if (!player) {
    return;
  }

  player.completedHands = player.completedHands || {};
  player.completedHands[handId] = checked;
  saveAndBroadcast();
  render();
}

function removeScoreEntry(playerId, entryId) {
  if (!canHostEdit()) {
    return;
  }

  const player = state.players.find((item) => item.id === playerId);
  if (!player) {
    return;
  }

  player.scoreEntries = player.scoreEntries.filter((entry) => entry.id !== entryId);
  saveAndBroadcast();
  render();
}

function selectPlayer(playerId) {
  if (!state) {
    return;
  }

  state.selectedPlayerId = playerId;
  if (canHostEdit()) {
    saveAndBroadcast();
  }
  render();
}

function exportSnapshot() {
  if (!state) {
    showToast("There is no game to export yet.");
    return;
  }

  const data = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      app: "mexican-rummy-scorekeeper",
      state,
    },
    null,
    2,
  );
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const roomName = state.roomId || "local";
  link.href = url;
  link.download = `mexican-rummy-${roomName}-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Snapshot exported.");
}

function importSnapshot(event) {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const importedState = normalizeState(parsed.state || parsed);
      disconnectPeer();
      state = importedState;
      role = "local";
      saveState();
      render();
      showToast("Snapshot imported as a local scorecard.");
    } catch (error) {
      showToast("That file does not look like a scorekeeper snapshot.");
    } finally {
      event.target.value = "";
    }
  });
  reader.readAsText(file);
}

function resetToHome() {
  const leavingGuest = role === "guest";
  const message = leavingGuest
    ? "Leave this room?"
    : "Start a new game? Your current scorecard will stay exported only if you saved it.";

  if (!window.confirm(message)) {
    return;
  }

  disconnectPeer();
  state = null;
  role = "home";
  if (!leavingGuest) {
    localStorage.removeItem(STORAGE_KEY);
  }
  window.history.replaceState({}, "", window.location.pathname);
  updateResumeButton();
  render();
}

async function copyRoomLink() {
  if (!state?.roomId) {
    return;
  }

  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("room", state.roomId);

  try {
    await navigator.clipboard.writeText(url.toString());
    showToast("Room link copied.");
  } catch (error) {
    showToast(`Room code: ${state.roomId}`);
  }
}

function saveAndBroadcast() {
  if (!state) {
    return;
  }

  state.updatedAt = new Date().toISOString();
  saveState();
  broadcastState();
}

function broadcastState() {
  if (role !== "host") {
    return;
  }

  hostConnections.forEach((connection, key) => {
    if (!connection.open) {
      hostConnections.delete(key);
      return;
    }

    sendToConnection(connection, {
      type: "state",
      state,
    });
  });
}

function sendToConnection(connection, payload) {
  if (connection?.open) {
    connection.send(payload);
  }
}

function render() {
  const inGame = Boolean(state);

  dom.body.classList.toggle("guest-mode", role === "guest");
  dom.body.classList.toggle("host-mode", role === "host");
  dom.body.classList.toggle("local-mode", role === "local");
  dom.welcomeView.classList.toggle("hidden", inGame);
  dom.gameView.classList.toggle("hidden", !inGame);
  dom.copyRoomButton.classList.toggle("hidden", !state?.roomId || role !== "host");
  dom.newGameButton.textContent = role === "guest" ? "Leave room" : "New game";

  if (!inGame) {
    setStatus("Offline setup");
    updateResumeButton();
    return;
  }

  renderStatus();
  renderScoreboard();
  renderPlayerButtons();
  renderSelectedPlayer();
}

function renderStatus() {
  const roomLabel = state.roomId && role !== "local" ? state.roomId : "Local game";
  dom.roomHeading.textContent = roomLabel;

  if (role === "guest") {
    setStatus(`Following ${roomLabel}`);
  } else if (role === "host") {
    const count = hostConnections.size;
    const label = count === 1 ? "guest" : "guests";
    setStatus(`Hosting ${roomLabel} | ${count} ${label}`);
  } else {
    setStatus("Local scorecard");
  }
}

function renderScoreboard() {
  dom.scoreboardBody.replaceChildren();

  state.players.forEach((player) => {
    const row = document.createElement("tr");
    row.classList.toggle("current-player", player.id === state.selectedPlayerId);

    const nameCell = document.createElement("td");
    const playerButton = document.createElement("button");
    playerButton.type = "button";
    playerButton.className = "table-player-button";
    playerButton.textContent = player.name;
    playerButton.addEventListener("click", () => selectPlayer(player.id));
    nameCell.append(playerButton);

    const scoreCell = document.createElement("td");
    scoreCell.textContent = `${getPlayerTotal(player)} pts`;

    const completeCount = getCompletedCount(player);
    const completeCell = document.createElement("td");
    completeCell.textContent = `${completeCount} of ${HANDS.length}`;

    const remainingCell = document.createElement("td");
    remainingCell.textContent = getRemainingSummary(player);

    row.append(nameCell, scoreCell, completeCell, remainingCell);
    dom.scoreboardBody.append(row);
  });
}

function renderPlayerButtons() {
  dom.playerButtons.replaceChildren();

  state.players.forEach((player) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "player-select-button";
    button.classList.toggle("active", player.id === state.selectedPlayerId);
    button.setAttribute("aria-pressed", String(player.id === state.selectedPlayerId));
    button.addEventListener("click", () => selectPlayer(player.id));

    const name = document.createElement("strong");
    name.textContent = player.name;

    const meta = document.createElement("span");
    meta.textContent = `${getPlayerTotal(player)} pts | ${getCompletedCount(player)} of ${HANDS.length} hands`;

    button.append(name, meta);
    dom.playerButtons.append(button);
  });
}

function renderSelectedPlayer() {
  const player = getSelectedPlayer();

  dom.emptyState.classList.toggle("hidden", Boolean(player));
  dom.playerDetails.classList.toggle("hidden", !player);

  if (!player) {
    dom.selectedPlayerMeta.textContent = "No player selected";
    dom.selectedPlayerName.textContent = "Player details";
    dom.selectedPlayerTotal.textContent = "0 pts";
    dom.handsGrid.replaceChildren();
    dom.scoreHistory.replaceChildren();
    return;
  }

  const completeCount = getCompletedCount(player);
  dom.selectedPlayerMeta.textContent = `${completeCount} of ${HANDS.length} hands complete`;
  dom.selectedPlayerName.textContent = player.name;
  dom.selectedPlayerTotal.textContent = `${getPlayerTotal(player)} pts`;
  dom.handsSummary.textContent = `${completeCount} of ${HANDS.length} complete`;

  renderHands(player);
  renderScoreHistory(player);
}

function renderHands(player) {
  dom.handsGrid.replaceChildren();

  HANDS.forEach((hand, index) => {
    const isComplete = Boolean(player.completedHands?.[hand.id]);
    const card = document.createElement("article");
    card.className = "hand-card";
    card.classList.toggle("complete", isComplete);
    card.classList.toggle("locked", !canHostEdit());

    const topline = document.createElement("div");
    topline.className = "hand-topline";

    const title = document.createElement("p");
    title.className = "hand-title";
    title.textContent = `${index + 1}. ${hand.title}`;

    const status = document.createElement("span");
    status.className = "hand-status";
    status.textContent = isComplete ? "Done" : "Left";

    topline.append(title, status);

    const detail = document.createElement("p");
    detail.textContent = hand.detail;

    card.append(topline, detail);

    if (canHostEdit()) {
      const label = document.createElement("label");
      label.className = "hand-toggle";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = isComplete;
      checkbox.setAttribute("aria-label", `${isComplete ? "Unmark" : "Mark"} ${hand.title} for ${player.name}`);
      checkbox.addEventListener("change", () => toggleHand(player.id, hand.id, checkbox.checked));

      const labelText = document.createElement("span");
      labelText.textContent = "Achieved";

      label.append(checkbox, labelText);
      card.append(label);
    }

    dom.handsGrid.append(card);
  });
}

function renderScoreHistory(player) {
  dom.scoreHistory.replaceChildren();

  if (!player.scoreEntries.length) {
    const empty = document.createElement("li");
    const message = document.createElement("span");
    message.textContent = "No score entries yet.";
    empty.append(message);
    dom.scoreHistory.append(empty);
    return;
  }

  [...player.scoreEntries].reverse().forEach((entry) => {
    const item = document.createElement("li");

    const body = document.createElement("div");
    const score = document.createElement("strong");
    score.textContent = `${entry.points} pts`;

    const note = document.createElement("span");
    const createdAt = entry.createdAt ? formatEntryDate(entry.createdAt) : "";
    const noteText = entry.note ? ` | ${entry.note}` : "";
    note.textContent = `${createdAt}${noteText}`;

    body.append(score, document.createElement("br"), note);
    item.append(body);

    if (canHostEdit()) {
      const actions = document.createElement("div");
      actions.className = "entry-actions";

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "tiny-button";
      removeButton.textContent = "Remove";
      removeButton.setAttribute("aria-label", `Remove ${entry.points} point entry for ${player.name}`);
      removeButton.addEventListener("click", () => removeScoreEntry(player.id, entry.id));

      actions.append(removeButton);
      item.append(actions);
    }

    dom.scoreHistory.append(item);
  });
}

function createGameState(roomId, hostName, playerNames) {
  const players = uniqueNames(playerNames).map(createPlayer);
  return normalizeState({
    version: 1,
    roomId,
    hostName,
    selectedPlayerId: players[0]?.id || "",
    players,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function createWaitingState(roomId, playerName) {
  return normalizeState({
    version: 1,
    roomId,
    hostName: "",
    selectedPlayerId: "",
    players: [createPlayer(playerName)],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function normalizeState(candidate) {
  if (!candidate || !Array.isArray(candidate.players)) {
    throw new Error("Invalid scorekeeper state");
  }

  const players = candidate.players.map((player) => ({
    id: cleanText(player.id, 80) || createId("player"),
    name: cleanName(player.name) || "Player",
    completedHands: normalizeCompletedHands(player.completedHands),
    scoreEntries: Array.isArray(player.scoreEntries)
      ? player.scoreEntries.map(normalizeScoreEntry).filter(Boolean)
      : [],
  }));

  const selectedPlayerId = players.some((player) => player.id === candidate.selectedPlayerId)
    ? candidate.selectedPlayerId
    : players[0]?.id || "";

  return {
    version: 1,
    roomId: formatRoomCode(candidate.roomId || ""),
    hostName: cleanName(candidate.hostName) || "",
    selectedPlayerId,
    players,
    createdAt: candidate.createdAt || new Date().toISOString(),
    updatedAt: candidate.updatedAt || new Date().toISOString(),
  };
}

function normalizeCompletedHands(candidate) {
  const result = {};
  HANDS.forEach((hand) => {
    result[hand.id] = Boolean(candidate?.[hand.id]);
  });
  return result;
}

function normalizeScoreEntry(entry) {
  const points = Number.parseInt(entry?.points, 10);
  if (!Number.isFinite(points)) {
    return null;
  }

  return {
    id: cleanText(entry.id, 80) || createId("score"),
    points,
    note: cleanText(entry.note, 80),
    createdAt: entry.createdAt || new Date().toISOString(),
  };
}

function createPlayer(name) {
  return {
    id: createId("player"),
    name: cleanName(name) || "Player",
    completedHands: normalizeCompletedHands({}),
    scoreEntries: [],
  };
}

function collectInitialPlayers(hostName, rawPlayers) {
  const names = [hostName];
  rawPlayers
    .split(/[,\n]/)
    .map(cleanName)
    .filter(Boolean)
    .forEach((name) => names.push(name));
  return uniqueNames(names);
}

function uniqueNames(names) {
  const seen = new Set();
  const result = [];

  names.forEach((name) => {
    const clean = cleanName(name);
    const key = clean.toLocaleLowerCase();
    if (!clean || seen.has(key)) {
      return;
    }

    seen.add(key);
    result.push(clean);
  });

  return result.length ? result : ["Host"];
}

function findPlayerByName(name) {
  const key = cleanName(name).toLocaleLowerCase();
  return state?.players.find((player) => player.name.toLocaleLowerCase() === key);
}

function getSelectedPlayer() {
  if (!state) {
    return null;
  }

  return state.players.find((player) => player.id === state.selectedPlayerId) || state.players[0] || null;
}

function getPlayerTotal(player) {
  return player.scoreEntries.reduce((total, entry) => total + entry.points, 0);
}

function getCompletedCount(player) {
  return HANDS.filter((hand) => player.completedHands?.[hand.id]).length;
}

function getRemainingSummary(player) {
  const remaining = HANDS.filter((hand) => !player.completedHands?.[hand.id]);
  if (!remaining.length) {
    return "All complete";
  }

  return `${remaining.length} left: ${remaining[0].title}`;
}

function createRoomCode() {
  const part = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MR-${part}`;
}

function formatRoomCode(value) {
  let candidate = String(value || "").trim();

  try {
    const pastedUrl = new URL(candidate);
    candidate = pastedUrl.searchParams.get("room") || candidate;
  } catch (error) {
    // Plain room codes are expected here, so non-URL values are fine.
  }

  const raw = candidate
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");

  if (!raw) {
    return "";
  }

  if (raw.startsWith("MR-")) {
    return raw;
  }

  return `MR-${raw.replace(/^MR/, "")}`;
}

function roomCodeToPeerId(roomId) {
  return formatRoomCode(roomId).toLocaleLowerCase();
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function cleanName(value) {
  return cleanText(value, 40);
}

function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function canHostEdit() {
  return role === "host" || role === "local";
}

function canUsePeer() {
  return typeof window.Peer === "function";
}

function setStatus(message) {
  dom.connectionStatus.textContent = message;
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.add("visible");
  toastTimer = window.setTimeout(() => {
    dom.toast.classList.remove("visible");
  }, 3200);
}

function saveState() {
  if (!state || role === "guest") {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateResumeButton();
}

function readSavedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeState(JSON.parse(saved)) : null;
  } catch (error) {
    return null;
  }
}

function disconnectPeer() {
  hostConnections.forEach((connection) => connection.close());
  hostConnections.clear();

  if (guestConnection) {
    guestConnection.close();
    guestConnection = null;
  }

  if (peer && !peer.destroyed) {
    peer.destroy();
  }

  peer = null;
}

function formatEntryDate(value) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch (error) {
    return "";
  }
}
