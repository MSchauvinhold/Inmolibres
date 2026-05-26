export function playNotificationSound(tipo: 'suave' | 'urgente' = 'suave') {
  if (typeof window === 'undefined') return
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const audioCtx = new AudioCtx()

    if (tipo === 'suave') {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, audioCtx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5)
      osc.start(audioCtx.currentTime)
      osc.stop(audioCtx.currentTime + 0.5)
    }

    if (tipo === 'urgente') {
      // Doble ding para suscripción por vencer
      ;[0, 0.3].forEach((delay) => {
        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()
        osc.connect(gain)
        gain.connect(audioCtx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(660, audioCtx.currentTime + delay)
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime + delay)
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + 0.4)
        osc.start(audioCtx.currentTime + delay)
        osc.stop(audioCtx.currentTime + delay + 0.4)
      })
    }
  } catch {
    console.warn('Web Audio API no disponible')
  }
}
