let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtor) return null
  if (!ctx) ctx = new AudioCtor()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function partial(audioCtx: AudioContext, freq: number, startTime: number, decay: number, peakGain: number) {
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, startTime)
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + decay)
  osc.connect(gain).connect(audioCtx.destination)
  osc.start(startTime)
  osc.stop(startTime + decay + 0.05)
}

function chordTone(
  audioCtx: AudioContext,
  freq: number,
  startTime: number,
  decay: number,
  harmonics: Array<[number, number]>,
  peakGain: number,
) {
  const totalAmp = 1 + harmonics.reduce((sum, [, amp]) => sum + amp, 0)
  partial(audioCtx, freq, startTime, decay, peakGain / totalAmp)
  for (const [mult, amp] of harmonics) {
    partial(audioCtx, freq * mult, startTime, decay, (peakGain * amp) / totalAmp)
  }
}

function sweep(audioCtx: AudioContext, f0: number, f1: number, startTime: number, duration: number, decay: number, peakGain: number) {
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(f0, startTime)
  osc.frequency.linearRampToValueAtTime(f1, startTime + duration)
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + decay)
  osc.connect(gain).connect(audioCtx.destination)
  osc.start(startTime)
  osc.stop(startTime + decay + 0.05)
}

export function playSendSound() {
  const audioCtx = getContext()
  if (!audioCtx) return
  const now = audioCtx.currentTime
  sweep(audioCtx, 500, 1250, now, 0.12, 0.08, 0.28)
}

export function playReceiveSound() {
  const audioCtx = getContext()
  if (!audioCtx) return
  const now = audioCtx.currentTime
  chordTone(audioCtx, 880, now, 0.12, [[2, 0.3], [3, 0.15]], 0.28)
  chordTone(audioCtx, 1175, now + 0.19, 0.16, [[2, 0.3]], 0.28)
}

export function playLikeSound() {
  const audioCtx = getContext()
  if (!audioCtx) return
  const now = audioCtx.currentTime
  partial(audioCtx, 1300, now, 0.05, 0.14)
  partial(audioCtx, 1750, now + 0.045, 0.06, 0.14)
}
