// ============================================
// PROTOX PROTOCOL - particles.js
// Modulo: Animazione particelle Level Up
// Versione: 1.0
// ============================================

const Particles = {

    canvas: null,
    ctx: null,
    particles: [],
    animating: false,

    // Crea canvas overlay
    createCanvas() {
        if (this.canvas) return;

        this.canvas = document.createElement('canvas');
        this.canvas.id = 'particles-canvas';
        this.canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1001;
        `;
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },

    // Resize canvas
    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },

    // Genera particella
    createParticle(x, y, color) {
        return {
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10 - 5,
            size: Math.random() * 6 + 2,
            color: color,
            alpha: 1,
            decay: Math.random() * 0.02 + 0.01,
            gravity: 0.1,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10,
            shape: Math.random() > 0.5 ? 'circle' : 'square'
        };
    },

    // Esplosione Level Up
    levelUpExplosion() {
        this.createCanvas();
        this.particles = [];

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const colors = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#7c3aed',
                        '#10b981', '#34d399', '#fbbf24', '#f59e0b',
                        '#ef4444', '#ffffff'];

        // 150 particelle dal centro
        for (let i = 0; i < 150; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const particle = this.createParticle(centerX, centerY, color);
            particle.vx = (Math.random() - 0.5) * 20;
            particle.vy = (Math.random() - 0.5) * 20 - 3;
            particle.size = Math.random() * 8 + 3;
            this.particles.push(particle);
        }

        // Pioggia dall'alto
        for (let i = 0; i < 50; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const particle = this.createParticle(
                Math.random() * window.innerWidth,
                -20,
                color
            );
            particle.vx = (Math.random() - 0.5) * 3;
            particle.vy = Math.random() * 5 + 2;
            particle.size = Math.random() * 5 + 2;
            particle.decay = 0.005;
            this.particles.push(particle);
        }

        if (!this.animating) {
            this.animating = true;
            this.animate();
        }
    },

    // XP gain mini particles
    xpGainBurst(x, y) {
        this.createCanvas();

        const colors = ['#10b981', '#34d399', '#6ee7b7'];

        for (let i = 0; i < 15; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const particle = this.createParticle(x, y, color);
            particle.vx = (Math.random() - 0.5) * 6;
            particle.vy = -Math.random() * 6 - 2;
            particle.size = Math.random() * 4 + 1;
            particle.decay = 0.03;
            this.particles.push(particle);
        }

        if (!this.animating) {
            this.animating = true;
            this.animate();
        }
    },

    // XP loss particles
    xpLossBurst(x, y) {
        this.createCanvas();

        const colors = ['#ef4444', '#f87171', '#fca5a5'];

        for (let i = 0; i < 10; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const particle = this.createParticle(x, y, color);
            particle.vx = (Math.random() - 0.5) * 4;
            particle.vy = Math.random() * 3 + 1;
            particle.size = Math.random() * 3 + 1;
            particle.decay = 0.03;
            this.particles.push(particle);
        }

        if (!this.animating) {
            this.animating = true;
            this.animate();
        }
    },

    // Badge unlock particles
    badgeUnlockBurst() {
        this.createCanvas();

        const colors = ['#fbbf24', '#f59e0b', '#fcd34d', '#ffffff'];
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        for (let i = 0; i < 80; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const angle = (Math.PI * 2 / 80) * i;
            const speed = Math.random() * 8 + 4;
            const particle = this.createParticle(centerX, centerY, color);
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            particle.size = Math.random() * 5 + 2;
            particle.decay = 0.015;
            this.particles.push(particle);
        }

        if (!this.animating) {
            this.animating = true;
            this.animate();
        }
    },

    // Loop animazione
    animate() {
        if (!this.ctx || this.particles.length === 0) {
            this.animating = false;
            if (this.ctx) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
            return;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles = this.particles.filter(p => {
            // Aggiorna posizione
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.alpha -= p.decay;
            p.rotation += p.rotationSpeed;
            p.vx *= 0.99;

            if (p.alpha <= 0) return false;

            // Disegna
            this.ctx.save();
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate((p.rotation * Math.PI) / 180);

            if (p.shape === 'circle') {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            }

            this.ctx.restore();
            return true;
        });

        requestAnimationFrame(() => this.animate());
    }
};