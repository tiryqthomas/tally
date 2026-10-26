import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

import { useBudget } from './store';

// Sounds and vibration that make Tally feel like a real adding machine.
// Each one checks the Settings switches, so callers don't have to.

let players: { key: AudioPlayer; print: AudioPlayer } | null = null;

function load() {
  if (players) return players;
  // Respect the phone's silent switch and keep any music playing.
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  players = {
    key: createAudioPlayer(require('../../assets/sounds/key.wav')),
    print: createAudioPlayer(require('../../assets/sounds/print.wav')),
  };
  players.key.volume = 0.6;
  return players;
}

function play(which: 'key' | 'print') {
  if (!useBudget.getState().sounds) return;
  try {
    const player = load()[which];
    // Rewind so fast typing still clicks on every press.
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // A missing sound should never get in the way of logging spending.
  }
}

// A key on the keypad was pressed.
export function keyClick() {
  play('key');
}

// Spending was logged: the printer prints a line, and the phone gives a firm bump.
export function logged() {
  play('print');
  if (useBudget.getState().haptics) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }
}

// Loads the sounds early so the first key press clicks right away.
export function preloadFeedback() {
  if (useBudget.getState().sounds) load();
}
