/**
 * Web Audio API synthesizer for order alerts.
 * Generates an elegant, distinctive bell/chime tone (no external MP3 download required).
 */

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
  } catch (err) {
    console.warn('Could not initialize AudioContext:', err);
    return null;
  }
}

/** Pre-unlock audio on user gesture (click/touch anywhere on the page). */
export function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume();
  }
}

// Auto-register touch/click unlock on first interaction
if (typeof window !== 'undefined') {
  const unlockListener = () => {
    unlockAudio();
    window.removeEventListener('pointerdown', unlockListener);
    window.removeEventListener('touchstart', unlockListener);
  };
  window.addEventListener('pointerdown', unlockListener, { once: true, passive: true });
  window.addEventListener('touchstart', unlockListener, { once: true, passive: true });
}

export type OrderAlertVariant = 'ready' | 'out_for_delivery' | 'completed' | 'test';

/**
 * Plays a distinctive melodic chime for order status changes:
 * - 'ready': 3-note bright concierge bell chime (E5 -> G#5 -> B5 -> E6).
 * - 'out_for_delivery': 3-note upbeat delivery fanfare (F5 -> A5 -> C6 -> F6).
 * - 'completed': 4-note celebration chime (C5 -> E5 -> G5 -> C6).
 */
export function playOrderAlertChime(variant: OrderAlertVariant = 'ready') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Harmonic chord progressions (Hz)
    const chords: Record<OrderAlertVariant, number[]> = {
      ready: [659.25, 830.61, 987.77, 1318.51], // E5, G#5, B5, E6 (Bright concierge bell)
      out_for_delivery: [698.46, 880.0, 1046.5, 1396.91], // F5, A5, C6, F6 (Upbeat arrival)
      completed: [523.25, 659.25, 783.99, 1046.5], // C5, E5, G5, C6 (Celebration)
      test: [659.25, 830.61, 987.77, 1318.51],
    };

    const notes = chords[variant] || chords.ready;
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Pure fundamental bell tone
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      // Slight natural strike pitch drop
      osc.frequency.exponentialRampToValueAtTime(freq * 0.997, startTime + 0.9);

      // Bell volume curve: instantaneous strike attack + smooth natural acoustic decay
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.015);
      const decayDuration = idx === notes.length - 1 ? 1.6 : 0.65;
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + decayDuration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + decayDuration + 0.1);

      // Metallic chime overtone (gives that rich, authentic restaurant counter bell shimmer)
      const overtone = ctx.createOscillator();
      const overtoneGain = ctx.createGain();
      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 2.76, startTime);

      overtoneGain.gain.setValueAtTime(0.0001, startTime);
      overtoneGain.gain.linearRampToValueAtTime(0.08, startTime + 0.01);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.4);

      overtone.connect(overtoneGain);
      overtoneGain.connect(ctx.destination);

      overtone.start(startTime);
      overtone.stop(startTime + 0.45);
    });

    // Mobile haptic vibration pattern: 2 crisp pulses + longer celebratory pulse
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate([160, 90, 160, 90, 350]);
      } catch {
        // Ignore vibration errors if restricted by device
      }
    }
  } catch (err) {
    console.warn('Could not play order chime:', err);
  }
}
