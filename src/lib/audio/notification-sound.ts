/**
 * Utilitaire de son pour les notifications Dughu.
 *
 * Utilise l'API Web Audio native du navigateur pour synthétiser un carillon doux
 * et élégant (deux tons mélodieux) sans nécessiter de téléchargement de fichier externe.
 */

class NotificationSoundPlayer {
  private audioCtx: AudioContext | null = null

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.audioCtx = new AudioCtx()
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      void this.audioCtx.resume()
    }
    return this.audioCtx
  }

  /**
   * Joue un son discret de notification Dughu (carillon harmonique C6 -> E6).
   */
  public play() {
    try {
      const ctx = this.getAudioContext()
      if (!ctx) return

      const now = ctx.currentTime

      // 1er ton (523.25 Hz - C5)
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = "sine"
      osc1.frequency.setValueAtTime(523.25, now)
      gain1.gain.setValueAtTime(0.08, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.25)

      // 2e ton (659.25 Hz - E5)
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = "sine"
      osc2.frequency.setValueAtTime(659.25, now + 0.08)
      gain2.gain.setValueAtTime(0.1, now + 0.08)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now + 0.08)
      osc2.stop(now + 0.35)
    } catch {
      // Ignorer si bloqué par les politiques de lecture automatique
    }
  }
}

export const notificationSound = new NotificationSoundPlayer()
