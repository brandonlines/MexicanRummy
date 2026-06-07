// Client-side game state management

class GameState {
  constructor() {
    this.currentGame = null;
    this.currentPlayer = null;
    this.players = [];
    this.handProgress = {};
    this.listeners = new Map();
  }

  setState(newState) {
    Object.assign(this, newState);
    this.notifyListeners();
  }

  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);
  }

  unsubscribe(key, callback) {
    if (this.listeners.has(key)) {
      const listeners = this.listeners.get(key);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  notifyListeners() {
    for (const callbacks of this.listeners.values()) {
      callbacks.forEach(callback => callback(this));
    }
  }

  clear() {
    this.currentGame = null;
    this.currentPlayer = null;
    this.players = [];
    this.handProgress = {};
    this.notifyListeners();
  }
}

export const gameState = new GameState();
