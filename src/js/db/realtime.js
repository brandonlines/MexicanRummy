// Real-time subscriptions
import { getClient } from './supabase.js';

const subscriptions = new Map();

export function subscribeToGame(gameId, callback) {
  const client = getClient();
  
  const subscription = client
    .channel(`games:${gameId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
      (payload) => {
        console.log('Game updated:', payload);
        callback({ type: 'game', payload });
      }
    )
    .subscribe((status) => {
      console.log('Game subscription status:', status);
    });
  
  subscriptions.set(`game:${gameId}`, subscription);
  return subscription;
}

export function subscribeToPlayers(gameId, callback) {
  const client = getClient();
  
  const subscription = client
    .channel(`players:${gameId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
      (payload) => {
        console.log('Players updated:', payload);
        callback({ type: 'players', payload });
      }
    )
    .subscribe((status) => {
      console.log('Players subscription status:', status);
    });
  
  subscriptions.set(`players:${gameId}`, subscription);
  return subscription;
}

export function subscribeToHandProgress(gameId, callback) {
  const client = getClient();
  
  const subscription = client
    .channel(`hands:${gameId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'hand_progress', filter: `game_id=eq.${gameId}` },
      (payload) => {
        console.log('Hand progress updated:', payload);
        callback({ type: 'hands', payload });
      }
    )
    .subscribe((status) => {
      console.log('Hand progress subscription status:', status);
    });
  
  subscriptions.set(`hands:${gameId}`, subscription);
  return subscription;
}

export function unsubscribe(key) {
  const subscription = subscriptions.get(key);
  if (subscription) {
    subscription.unsubscribe();
    subscriptions.delete(key);
  }
}

export function unsubscribeAll() {
  subscriptions.forEach(subscription => subscription.unsubscribe());
  subscriptions.clear();
}
