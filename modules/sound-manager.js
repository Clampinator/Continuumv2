
// continuum/modules/sound-manager.js

/**
 * A lightweight sound synthesizer using Web Audio API.
 * Generates UI sounds programmatically to avoid external asset dependencies.
 */
export class Sound {
    static get ctx() {
        if (!this._ctx) {
            this._ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this._ctx;
    }

    /**
     * Plays a short, mechanical "tick" sound. Ideal for spinners/sliders.
     */
    static tick() {
        if (game.settings.get("core", "globalInterfaceVolume") === 0) return;
        
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.01);
        
        gain.gain.setValueAtTime(0.05, t); // Quiet
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.01);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.01);
    }

    /**
     * Plays a standard UI interaction click (higher pitch).
     */
    static click() {
        if (game.settings.get("core", "globalInterfaceVolume") === 0) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.03);

        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.03);
    }

    /**
     * Plays a pleasant ascending chime for successful actions (Save/Create).
     */
    static confirm() {
        if (game.settings.get("core", "globalInterfaceVolume") === 0) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.setValueAtTime(554, t + 0.1); // C#
        osc.frequency.setValueAtTime(659, t + 0.2); // E

        gain.gain.setValueAtTime(0.05, t);
        gain.gain.linearRampToValueAtTime(0.1, t + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.4);
    }

    /**
     * Plays a descending tone for deletions or negative actions.
     */
    static delete() {
        if (game.settings.get("core", "globalInterfaceVolume") === 0) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.2);

        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.2);
    }
}
