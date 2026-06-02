/**
 * Reproduce el sonido de notificación usando el archivo MP3 en /public.
 * Fallback a Web Audio API si el navegador bloquea el archivo.
 */
export function playNotificationSound(tipo: 'suave' | 'urgente' = 'suave') {
  if (typeof window === 'undefined') return;

  // Intentar con el MP3 primero
  try {
    const audio = new Audio('/notificacion.mp3');
    audio.volume = tipo === 'urgente' ? 1.0 : 0.75;

    if (tipo === 'urgente') {
      // Para urgente: reproducir dos veces
      const play = () => {
        const a2 = new Audio('/notificacion.mp3');
        a2.volume = 0.85;
        void a2.play().catch(() => {/* ignorar */});
      };
      audio.addEventListener('ended', play, { once: true });
    }

    void audio.play().catch(() => {
      // Si el navegador bloquea el autoplay, usamos Web Audio API como fallback
      fallbackWebAudio(tipo);
    });
    return;
  } catch {
    // Si Audio no está disponible, ir al fallback
  }

  fallbackWebAudio(tipo);
}

function fallbackWebAudio(tipo: 'suave' | 'urgente') {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const ding = (delay: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(tipo === 'urgente' ? 880 : 660, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.45);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.45);
    };

    ding(0);
    if (tipo === 'urgente') ding(0.55);
  } catch {
    // Web Audio API tampoco disponible
  }
}
