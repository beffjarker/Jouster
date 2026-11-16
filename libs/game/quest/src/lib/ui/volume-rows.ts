import type { AudioChannel, AudioManager, InputManager } from '@jouster/game/engine';

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
