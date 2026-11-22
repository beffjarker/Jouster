import { AUDIO_CHANNELS } from '@jouster/game/engine';
import type { AudioChannel, AudioManager, InputManager } from '@jouster/game/engine';
import { GameState, SaveStorage, VolumeSettings, saveVolumes, stateSlot } from '../state/game-state';

/** Volume rows in the order they appear in the volume submenus, with their labels. */
export const VOLUME_ROWS: readonly { readonly channel: AudioChannel; readonly label: string }[] = [
  { channel: 'master', label: 'MASTER' },
  { channel: 'music', label: 'MUSIC' },
  { channel: 'ambient', label: 'AMBIENT' },
  { channel: 'battle', label: 'BATTLE' },
  { channel: 'dialogue', label: 'DIALOGUE' },
  { channel: 'ui', label: 'UI / SFX' },
];

/** Step (0 to 1) each left or right press changes a volume row by. */
export const VOLUME_STEP = 0.1;

/** Formats a 0 to 1 volume as a whole-number percentage, e.g. 0.25 becomes '25%'. */
export const volumeLabel = (v: number): string => `${Math.round(v * 100)}%`;

/** Left / right presses on the given channel row adjust its volume. Returns true when the level changed. */
export function adjustVolumeRow(audio: AudioManager, channel: AudioChannel, input: InputManager): boolean {
  const step = input.wasPressed('left') ? -VOLUME_STEP : input.wasPressed('right') ? VOLUME_STEP : 0;
  if (step === 0) {
    return false;
  }
  audio.setChannelVolume(channel, audio.getChannelVolume(channel) + step);
  audio.play('cursor');
  return true;
}

/** The current level of every channel. */
export function currentVolumes(audio: AudioManager): Record<AudioChannel, number> {
  return Object.fromEntries(AUDIO_CHANNELS.map((c) => [c, audio.getChannelVolume(c)])) as Record<AudioChannel, number>;
}

/** Sets each saved channel's level (channels missing from the save keep their current level). */
export function applyVolumes(audio: AudioManager, volumes: VolumeSettings | undefined): void {
  AUDIO_CHANNELS.forEach((c) => {
    const v = volumes?.[c];
    if (v !== undefined) {
      audio.setChannelVolume(c, v);
    }
  });
}

/**
 * After a volume change: keeps the levels in the game in progress and in its stored save (every stored save
 * when no game is in progress, e.g. on the title screen).
 */
export function rememberVolumes(audio: AudioManager, storage: SaveStorage, state: GameState | null): void {
  const volumes = currentVolumes(audio);
  if (state) {
    state.volumes = { ...volumes };
  }
  saveVolumes(storage, volumes, state ? stateSlot(state) : undefined);
}
