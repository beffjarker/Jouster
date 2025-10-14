import { Injectable } from '@angular/core';

export interface AnimationCleanup {
  (): void;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius?: number;
}

export interface NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Follower {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
}

@Injectable({
  providedIn: 'root'
})
export class CanvasAnimationsService {

  /**
   * Creates combined sine and cosine wave visualization with different presets
   */
  public createSineCosineWave(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, preset: string = 'classic', options?: {
    centerX?: number;
    centerY?: number;
    getCenterX?: () => number;
    getCenterY?: () => number;
  }): AnimationCleanup {
    let phase = 0;
    let animationId: number;

    // Default center point
    const defaultCenterX = canvas.width / 2;
    const defaultCenterY = canvas.height / 2;

    // Use provided options or defaults
    const getCenterX = options?.getCenterX || (() => options?.centerX ?? defaultCenterX);
    const getCenterY = options?.getCenterY || (() => options?.centerY ?? defaultCenterY);

    // Wave presets with different combinations and parameters
    const presets: Record<string, {
      waves: Array<{
        type: 'sin' | 'cos';
        color: string;
        amplitude: number;
        frequency: number;
        phaseOffset: number;
        name: string;
      }>;
      speed: number;
    }> = {
      'classic': {
        waves: [
          { type: 'sin', color: '#e74c3c', amplitude: 1, frequency: 0.01, phaseOffset: 0, name: 'Sine' },
          { type: 'cos', color: '#3498db', amplitude: 1, frequency: 0.01, phaseOffset: 0, name: 'Cosine' }
        ],
        speed: 0.05
      },
      'harmonic': {
        waves: [
          { type: 'sin', color: '#e74c3c', amplitude: 1, frequency: 0.01, phaseOffset: 0, name: 'Fundamental' },
          { type: 'sin', color: '#f39c12', amplitude: 0.5, frequency: 0.02, phaseOffset: Math.PI/4, name: '2nd Harmonic' },
          { type: 'sin', color: '#9b59b6', amplitude: 0.25, frequency: 0.03, phaseOffset: Math.PI/2, name: '3rd Harmonic' }
        ],
        speed: 0.04
      },
      'interference': {
        waves: [
          { type: 'sin', color: '#e74c3c', amplitude: 1, frequency: 0.008, phaseOffset: 0, name: 'Wave A' },
          { type: 'sin', color: '#3498db', amplitude: 1, frequency: 0.012, phaseOffset: 0, name: 'Wave B' },
          { type: 'sin', color: '#2ecc71', amplitude: 0.8, frequency: 0.01, phaseOffset: Math.PI, name: 'Interference' }
        ],
        speed: 0.03
      },
      'phase': {
        waves: [
          { type: 'sin', color: '#e74c3c', amplitude: 1, frequency: 0.01, phaseOffset: 0, name: 'Sin 0°' },
          { type: 'sin', color: '#f39c12', amplitude: 1, frequency: 0.01, phaseOffset: Math.PI/4, name: 'Sin 45°' },
          { type: 'sin', color: '#9b59b6', amplitude: 1, frequency: 0.01, phaseOffset: Math.PI/2, name: 'Sin 90°' },
          { type: 'sin', color: '#3498db', amplitude: 1, frequency: 0.01, phaseOffset: 3*Math.PI/4, name: 'Sin 135°' }
        ],
        speed: 0.06
      },
      'amplitude': {
        waves: [
          { type: 'sin', color: '#e74c3c', amplitude: 1.5, frequency: 0.01, phaseOffset: 0, name: 'Large Amplitude' },
          { type: 'sin', color: '#f39c12', amplitude: 1.0, frequency: 0.01, phaseOffset: 0, name: 'Medium Amplitude' },
          { type: 'sin', color: '#3498db', amplitude: 0.5, frequency: 0.01, phaseOffset: 0, name: 'Small Amplitude' }
        ],
        speed: 0.05
      },
      'frequency': {
        waves: [
          { type: 'sin', color: '#e74c3c', amplitude: 1, frequency: 0.005, phaseOffset: 0, name: 'Low Frequency' },
          { type: 'sin', color: '#f39c12', amplitude: 1, frequency: 0.01, phaseOffset: 0, name: 'Medium Frequency' },
          { type: 'sin', color: '#3498db', amplitude: 1, frequency: 0.02, phaseOffset: 0, name: 'High Frequency' }
        ],
        speed: 0.05
      },
      'composite': {
        waves: [
          { type: 'sin', color: '#e74c3c', amplitude: 1, frequency: 0.01, phaseOffset: 0, name: 'Sine Base' },
          { type: 'cos', color: '#3498db', amplitude: 0.8, frequency: 0.015, phaseOffset: 0, name: 'Cosine Modulator' },
          { type: 'sin', color: '#2ecc71', amplitude: 0.6, frequency: 0.005, phaseOffset: Math.PI/3, name: 'Low Freq Sine' }
        ],
        speed: 0.04
      },
      'standing': {
        waves: [
          { type: 'sin', color: '#e74c3c', amplitude: 1, frequency: 0.01, phaseOffset: 0, name: 'Forward Wave' },
          { type: 'sin', color: '#3498db', amplitude: 1, frequency: 0.01, phaseOffset: Math.PI, name: 'Backward Wave' }
        ],
        speed: 0.08
      }
    };

    const config = presets[preset] ?? presets['classic'];

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const baseAmplitude = canvas.height / 8;
      const centerY = canvas.height / 2;

      // Draw each wave in the preset
      config.waves.forEach((wave, index) => {
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let x = 0; x < canvas.width; x++) {
          let y: number;

          if (wave.type === 'sin') {
            y = centerY + Math.sin(x * wave.frequency + phase + wave.phaseOffset) * baseAmplitude * wave.amplitude;
          } else {
            y = centerY + Math.cos(x * wave.frequency + phase + wave.phaseOffset) * baseAmplitude * wave.amplitude;
          }

          // Offset multiple waves vertically for better visibility
          if (config.waves.length > 2) {
            y += (index - (config.waves.length - 1) / 2) * 20;
          }

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      phase += config.speed;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }

  /**
   * Creates a spiral animation using trigonometric functions with different presets
   */
  public createSpiralAnimation(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, preset: string = 'classic', options?: {
    centerX?: number;
    centerY?: number;
    getCenterX?: () => number;
    getCenterY?: () => number;
  }): AnimationCleanup {
    let angle = 0;
    let animationId: number;

    // Default center point
    const defaultCenterX = canvas.width / 2;
    const defaultCenterY = canvas.height / 2;

    // Use provided options or defaults
    const getCenterX = options?.getCenterX || (() => options?.centerX ?? defaultCenterX);
    const getCenterY = options?.getCenterY || (() => options?.centerY ?? defaultCenterY);

    // Spiral presets based on original Flash experiments
    const presets: Record<string, {
      type: 'logarithmic' | 'archimedean' | 'hyperbolic' | 'fermat' | 'pinwheel' | 'double' | 'square';
      color: string;
      speed: number;
      radiusMultiplier: number;
      turns: number;
      segments: number;
      name: string;
    }> = {
      'classic': {
        type: 'logarithmic',
        color: '#9b59b6',
        speed: 0.05,
        radiusMultiplier: 2,
        turns: 100,
        segments: 100,
        name: 'Classic Logarithmic'
      },
      'archimedean': {
        type: 'archimedean',
        color: '#e74c3c',
        speed: 0.04,
        radiusMultiplier: 1.5,
        turns: 80,
        segments: 120,
        name: 'Archimedean Spiral'
      },
      'pinwheel': {
        type: 'pinwheel',
        color: '#f39c12',
        speed: 0.08,
        radiusMultiplier: 1.8,
        turns: 60,
        segments: 150,
        name: 'Pinwheel Pattern'
      },
      'double': {
        type: 'double',
        color: '#2ecc71',
        speed: 0.06,
        radiusMultiplier: 1.2,
        turns: 90,
        segments: 80,
        name: 'Double Spiral'
      },
      'hyperbolic': {
        type: 'hyperbolic',
        color: '#3498db',
        speed: 0.03,
        radiusMultiplier: 3,
        turns: 150,
        segments: 200,
        name: 'Hyperbolic Spiral'
      },
      'fermat': {
        type: 'fermat',
        color: '#e67e22',
        speed: 0.07,
        radiusMultiplier: 2.5,
        turns: 120,
        segments: 100,
        name: 'Fermat Spiral'
      },
      'square': {
        type: 'square',
        color: '#8e44ad',
        speed: 0.05,
        radiusMultiplier: 2.2,
        turns: 80,
        segments: 90,
        name: 'Square Spiral'
      }
    };

    const config = presets[preset] ?? presets['classic'];

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      ctx.strokeStyle = config.color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      // Draw spiral based on type
      for (let i = 0; i < config.segments; i++) {
        let radius: number;
        let spiralAngle: number;

        switch (config.type) {
          case 'logarithmic':
            spiralAngle = angle + i * 0.3;
            radius = i * config.radiusMultiplier;
            break;

          case 'archimedean':
            spiralAngle = angle + i * 0.2;
            radius = i * config.radiusMultiplier * 0.8;
            break;

          case 'pinwheel':
            spiralAngle = angle + i * 0.4;
            radius = Math.sqrt(i) * config.radiusMultiplier * 3;
            break;

          case 'double':
            spiralAngle = angle + i * 0.3;
            radius = i * config.radiusMultiplier;
            // Draw second spiral
            const x2 = centerX + Math.cos(spiralAngle + Math.PI) * radius;
            const y2 = centerY + Math.sin(spiralAngle + Math.PI) * radius;
            if (i === 0) {
              ctx.moveTo(x2, y2);
            } else {
              ctx.lineTo(x2, y2);
            }
            break;

          case 'hyperbolic':
            spiralAngle = angle + i * 0.15;
            radius = 200 / (i + 1) + i * 0.5;
            break;

          case 'fermat':
            spiralAngle = angle + i * 0.618 * 2; // Golden ratio
            radius = Math.sqrt(i) * config.radiusMultiplier * 2;
            break;

          case 'square':
            spiralAngle = angle + i * 0.25;
            radius = i * config.radiusMultiplier;
            // Create square-like spiral by modifying coordinates
            const quadrant = Math.floor((spiralAngle % (2 * Math.PI)) / (Math.PI / 2));
            spiralAngle = quadrant * (Math.PI / 2) + (spiralAngle % (Math.PI / 2)) * 0.7;
            break;

          default:
            spiralAngle = angle + i * 0.3;
            radius = i * config.radiusMultiplier;
        }

        const x = centerX + Math.cos(spiralAngle) * radius;
        const y = centerY + Math.sin(spiralAngle) * radius;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
      angle += config.speed;
      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }

  /**
   * Creates a particle system animation with different presets
   */
  public createParticleSystem(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, preset: string = 'bouncing', options?: {
    centerX?: number;
    centerY?: number;
    getCenterX?: () => number;
    getCenterY?: () => number;
  }): AnimationCleanup {
    const particles: Particle[] = [];
    let animationId: number;

    // Particle system presets based on original Flash experiments
    const presets: Record<string, {
      type: 'bouncing' | 'flowing' | 'exploding' | 'gravity' | 'magnetic' | 'orbital' | 'swirling' | 'random';
      particleCount: number;
      speed: number;
      colors: string[];
      physics: {
        gravity?: number;
        friction?: number;
        attraction?: number;
        repulsion?: number;
      };
      behavior: string;
    }> = {
      'bouncing': {
        type: 'bouncing',
        particleCount: 50,
        speed: 2,
        colors: ['#e74c3c', '#3498db', '#f39c12', '#2ecc71', '#9b59b6'],
        physics: { friction: 0.99 },
        behavior: 'Simple bouncing particles with wall collision'
      },
      'flowing': {
        type: 'flowing',
        particleCount: 80,
        speed: 1.5,
        colors: ['#3498db', '#2980b9', '#5dade2', '#85c1e9'],
        physics: { friction: 0.95, gravity: 0.1 },
        behavior: 'Fluid-like flowing motion from randomxymovement.fla'
      },
      'exploding': {
        type: 'exploding',
        particleCount: 100,
        speed: 5,
        colors: ['#e74c3c', '#f39c12', '#fd79a8', '#fdcb6e'],
        physics: { friction: 0.92, gravity: 0.05 },
        behavior: 'Explosive burst pattern with fade-out'
      },
      'gravity': {
        type: 'gravity',
        particleCount: 60,
        speed: 1,
        colors: ['#2ecc71', '#27ae60', '#58d68d', '#82e6aa'],
        physics: { gravity: 0.3, friction: 0.98 },
        behavior: 'Strong gravitational pull simulation'
      },
      'magnetic': {
        type: 'magnetic',
        particleCount: 40,
        speed: 2.5,
        colors: ['#9b59b6', '#8e44ad', '#bb8fce', '#d7bde2'],
        physics: { attraction: 0.02, repulsion: 0.01 },
        behavior: 'Magnetic attraction and repulsion forces'
      },
      'orbital': {
        type: 'orbital',
        particleCount: 35,
        speed: 1.8,
        colors: ['#f39c12', '#e67e22', '#f8c471', '#fad7a0'],
        physics: { attraction: 0.015 },
        behavior: 'Orbital mechanics with central attraction'
      },
      'swirling': {
        type: 'swirling',
        particleCount: 70,
        speed: 2.2,
        colors: ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'],
        physics: { friction: 0.97 },
        behavior: 'Swirling vortex pattern from PacketSpeed.fla'
      },
      'random': {
        type: 'random',
        particleCount: 90,
        speed: 3,
        colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'],
        physics: { friction: 0.96 },
        behavior: 'Chaotic random movement with bursts'
      }
    };

    const config = presets[preset] ?? presets['bouncing'];

    // Initialize particles based on preset
    for (let i = 0; i < config.particleCount; i++) {
      const particle: Particle = {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * config.speed,
        vy: (Math.random() - 0.5) * config.speed,
        radius: Math.random() * 3 + 1,
        color: config.colors[Math.floor(Math.random() * config.colors.length)]
      };

      // Special initialization for certain presets
      if (config.type === 'exploding') {
        // Use customizable center point or default to canvas center
        const centerX = options?.centerX ?? canvas.width / 2;
        const centerY = options?.centerY ?? canvas.height / 2;
        particle.x = centerX;
        particle.y = centerY;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * config.speed + 1;
        particle.vx = Math.cos(angle) * speed;
        particle.vy = Math.sin(angle) * speed;
      } else if (config.type === 'orbital') {
        const angle = (i / config.particleCount) * Math.PI * 2;
        const radius = 100 + Math.random() * 80;
        particle.x = canvas.width / 2 + Math.cos(angle) * radius;
        particle.y = canvas.height / 2 + Math.sin(angle) * radius;
      }

      particles.push(particle);
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, index) => {
        // Apply physics based on preset
        switch (config.type) {
          case 'bouncing':
            // Simple bouncing
            particle.x += particle.vx;
            particle.y += particle.vy;
            if (particle.x <= 0 || particle.x >= canvas.width) particle.vx *= -1;
            if (particle.y <= 0 || particle.y >= canvas.height) particle.vy *= -1;
            break;

          case 'flowing':
            // Fluid-like motion
            particle.vx += (Math.random() - 0.5) * 0.1;
            particle.vy += (config.physics.gravity || 0);
            particle.x += particle.vx;
            particle.y += particle.vy;
            if (particle.x <= 0 || particle.x >= canvas.width) particle.vx *= -0.8;
            if (particle.y <= 0 || particle.y >= canvas.height) particle.vy *= -0.8;
            particle.vx *= (config.physics.friction || 1);
            particle.vy *= (config.physics.friction || 1);
            break;

          case 'exploding':
            // Explosive motion with gravity
            particle.vy += (config.physics.gravity || 0);
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= (config.physics.friction || 1);
            particle.vy *= (config.physics.friction || 1);
            // Respawn if particle goes off screen
            if (particle.x < -10 || particle.x > canvas.width + 10 || particle.y > canvas.height + 10) {
              // Use dynamic center point functions or fall back to static coordinates
              const centerX = options?.getCenterX?.() ?? options?.centerX ?? canvas.width / 2;
              const centerY = options?.getCenterY?.() ?? options?.centerY ?? canvas.height / 2;
              particle.x = centerX;
              particle.y = centerY;
              const angle = Math.random() * Math.PI * 2;
              const speed = Math.random() * config.speed + 1;
              particle.vx = Math.cos(angle) * speed;
              particle.vy = Math.sin(angle) * speed;
            }
            break;

          case 'gravity':
            // Strong gravity simulation
            particle.vy += (config.physics.gravity || 0);
            particle.x += particle.vx;
            particle.y += particle.vy;
            if (particle.x <= 0 || particle.x >= canvas.width) particle.vx *= -0.9;
            if (particle.y >= canvas.height) {
              particle.vy *= -0.7;
              particle.y = canvas.height;
            }
            if (particle.y <= 0) particle.vy *= -0.9;
            break;

          case 'magnetic':
            // Magnetic forces
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const dx = centerX - particle.x;
            const dy = centerY - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const force = (config.physics.attraction || 0) / Math.max(distance, 10);
            particle.vx += dx * force;
            particle.vy += dy * force;
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= 0.98;
            particle.vy *= 0.98;
            break;

          case 'orbital':
            // Orbital mechanics
            const oCenterX = canvas.width / 2;
            const oCenterY = canvas.height / 2;
            const oDx = oCenterX - particle.x;
            const oDy = oCenterY - particle.y;
            const oDistance = Math.sqrt(oDx * oDx + oDy * oDy);
            const oForce = (config.physics.attraction || 0) * 1000 / (oDistance * oDistance);
            particle.vx += (oDx / oDistance) * oForce;
            particle.vy += (oDy / oDistance) * oForce;
            particle.x += particle.vx;
            particle.y += particle.vy;
            break;

          case 'swirling':
            // Swirling vortex
            const sCenterX = canvas.width / 2;
            const sCenterY = canvas.height / 2;
            const sDx = particle.x - sCenterX;
            const sDy = particle.y - sCenterY;
            const sAngle = Math.atan2(sDy, sDx);
            const sRadius = Math.sqrt(sDx * sDx + sDy * sDy);
            particle.vx = Math.cos(sAngle + 0.05) * Math.min(sRadius * 0.01, 3);
            particle.vy = Math.sin(sAngle + 0.05) * Math.min(sRadius * 0.01, 3);
            particle.x += particle.vx;
            particle.y += particle.vy;
            break;

          case 'random':
            // Chaotic random bursts
            if (Math.random() < 0.02) {
              particle.vx += (Math.random() - 0.5) * 2;
              particle.vy += (Math.random() - 0.5) * 2;
            }
            particle.x += particle.vx;
            particle.y += particle.vy;
            if (particle.x <= 0 || particle.x >= canvas.width) particle.vx *= -1;
            if (particle.y <= 0 || particle.y >= canvas.height) particle.vy *= -1;
            particle.vx *= (config.physics.friction || 1);
            particle.vy *= (config.physics.friction || 1);
            break;
        }

        // Draw particle
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius!, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }

  /**
   * Creates a following/mouse tracking animation with different presets
   */
  public createFollowingAnimation(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, preset: string = 'chain', options?: {
    centerX?: number;
    centerY?: number;
    getCenterX?: () => number;
    getCenterY?: () => number;
  }): AnimationCleanup {
    const followers: Follower[] = [];
    let mouseX = canvas.width / 2;
    let mouseY = canvas.height / 2;
    let animationId: number;

    // Following presets based on original Flash experiments
    const presets: Record<string, {
      type: 'chain' | 'swarm' | 'elastic' | 'magnetic' | 'orbital' | 'delayed' | 'snake' | 'flock';
      followerCount: number;
      followSpeed: number;
      colors: string[];
      size: number;
      behavior: {
        attraction?: number;
        repulsion?: number;
        delay?: number;
        elasticity?: number;
        damping?: number;
      };
      description: string;
    }> = {
      'chain': {
        type: 'chain',
        followerCount: 20,
        followSpeed: 0.1,
        colors: ['#e74c3c', '#3498db', '#f39c12', '#2ecc71', '#9b59b6'],
        size: 8,
        behavior: { damping: 0.9 },
        description: 'Classic chain following from follow.fla'
      },
      'swarm': {
        type: 'swarm',
        followerCount: 30,
        followSpeed: 0.08,
        colors: ['#f39c12', '#e67e22', '#d35400', '#f4d03f'],
        size: 6,
        behavior: { attraction: 0.02, repulsion: 0.01 },
        description: 'Swarm intelligence following behavior'
      },
      'elastic': {
        type: 'elastic',
        followerCount: 15,
        followSpeed: 0.15,
        colors: ['#e74c3c', '#c0392b', '#f1948a', '#fadbd8'],
        size: 10,
        behavior: { elasticity: 0.8, damping: 0.95 },
        description: 'Elastic band-like following with spring physics'
      },
      'magnetic': {
        type: 'magnetic',
        followerCount: 25,
        followSpeed: 0.12,
        colors: ['#9b59b6', '#8e44ad', '#bb8fce', '#d7bde2'],
        size: 7,
        behavior: { attraction: 0.05, repulsion: 0.02 },
        description: 'Magnetic attraction with mouse as magnet'
      },
      'orbital': {
        type: 'orbital',
        followerCount: 12,
        followSpeed: 0.06,
        colors: ['#3498db', '#2980b9', '#5dade2', '#85c1e9'],
        size: 9,
        behavior: { attraction: 0.03 },
        description: 'Orbital mechanics around mouse cursor'
      },
      'delayed': {
        type: 'delayed',
        followerCount: 35,
        followSpeed: 0.05,
        colors: ['#2ecc71', '#27ae60', '#58d68d', '#82e6aa'],
        size: 5,
        behavior: { delay: 10, damping: 0.98 },
        description: 'Delayed following with memory trail from follow2.fla'
      },
      'snake': {
        type: 'snake',
        followerCount: 40,
        followSpeed: 0.2,
        colors: ['#16a085', '#1abc9c', '#48c9b0', '#76d7c4'],
        size: 4,
        behavior: { damping: 0.92 },
        description: 'Snake-like movement with tight following'
      },
      'flock': {
        type: 'flock',
        followerCount: 50,
        followSpeed: 0.07,
        colors: ['#34495e', '#2c3e50', '#5d6d7e', '#85929e'],
        size: 3,
        behavior: { attraction: 0.01, repulsion: 0.005 },
        description: 'Flocking behavior with separation and cohesion'
      }
    };

    const config = presets[preset] ?? presets['chain'];

    // Initialize followers based on preset
    for (let i = 0; i < config.followerCount; i++) {
      const follower: Follower = {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        targetX: mouseX,
        targetY: mouseY
      };

      // Add preset-specific properties
      (follower as any).vx = 0;
      (follower as any).vy = 0;
      (follower as any).color = config.colors[i % config.colors.length];
      (follower as any).size = config.size + (Math.random() - 0.5) * 2;
      (follower as any).delay = config.behavior.delay ? Math.floor(Math.random() * config.behavior.delay!) : 0;
      (follower as any).history = [];

      followers.push(follower);
    }

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = event.clientX - rect.left;
      mouseY = event.clientY - rect.top;
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      followers.forEach((follower, index) => {
        const f = follower as any;

        // Apply different behaviors based on preset
        switch (config.type) {
          case 'chain':
            // Classic chain following
            if (index === 0) {
              follower.targetX = mouseX;
              follower.targetY = mouseY;
            } else {
              follower.targetX = followers[index - 1].x;
              follower.targetY = followers[index - 1].y;
            }
            const dx = follower.targetX - follower.x;
            const dy = follower.targetY - follower.y;
            follower.x += dx * config.followSpeed;
            follower.y += dy * config.followSpeed;
            break;

          case 'swarm':
            // Swarm intelligence with attraction/repulsion
            let avgX = mouseX;
            let avgY = mouseY;
            let repelX = 0;
            let repelY = 0;

            // Calculate repulsion from nearby followers
            followers.forEach((other, otherIndex) => {
              if (otherIndex !== index) {
                const dist = Math.sqrt((follower.x - other.x) ** 2 + (follower.y - other.y) ** 2);
                if (dist < 30) {
                  repelX += (follower.x - other.x) / dist;
                  repelY += (follower.y - other.y) / dist;
                }
              }
            });

            f.vx += (avgX - follower.x) * config.behavior.attraction! + repelX * config.behavior.repulsion!;
            f.vy += (avgY - follower.y) * config.behavior.attraction! + repelY * config.behavior.repulsion!;
            f.vx *= 0.9;
            f.vy *= 0.9;
            follower.x += f.vx;
            follower.y += f.vy;
            break;

          case 'elastic':
            // Elastic band physics
            const target = index === 0 ? { x: mouseX, y: mouseY } : followers[index - 1];
            const elasticDx = target.x - follower.x;
            const elasticDy = target.y - follower.y;
            const distance = Math.sqrt(elasticDx ** 2 + elasticDy ** 2);

            if (distance > 20) {
              const force = (distance - 20) * config.behavior.elasticity!;
              f.vx += (elasticDx / distance) * force * 0.01;
              f.vy += (elasticDy / distance) * force * 0.01;
            }

            f.vx *= config.behavior.damping!;
            f.vy *= config.behavior.damping!;
            follower.x += f.vx;
            follower.y += f.vy;
            break;

          case 'magnetic':
            // Magnetic attraction
            const magDx = mouseX - follower.x;
            const magDy = mouseY - follower.y;
            const magDist = Math.sqrt(magDx ** 2 + magDy ** 2);
            const magForce = config.behavior.attraction! / Math.max(magDist, 10);

            f.vx += magDx * magForce;
            f.vy += magDy * magForce;
            f.vx *= 0.95;
            f.vy *= 0.95;
            follower.x += f.vx;
            follower.y += f.vy;
            break;

          case 'orbital':
            // Orbital mechanics
            const orbDx = mouseX - follower.x;
            const orbDy = mouseY - follower.y;
            const orbDist = Math.sqrt(orbDx ** 2 + orbDy ** 2);
            const orbForce = config.behavior.attraction! * 100 / (orbDist ** 1.5);

            f.vx += (orbDx / orbDist) * orbForce;
            f.vy += (orbDy / orbDist) * orbForce;

            // Add tangential velocity for orbit
            f.vx += -orbDy * 0.001;
            f.vy += orbDx * 0.001;

            follower.x += f.vx;
            follower.y += f.vy;
            break;

          case 'delayed':
            // Delayed following with history
            f.history.push({ x: mouseX, y: mouseY, time: Date.now() });
            if (f.history.length > 100) f.history.shift();

            const targetTime = Date.now() - (f.delay * 50);
            const targetPos = f.history.find((h: any) => h.time <= targetTime) || f.history[0];

            if (targetPos) {
              const delayDx = targetPos.x - follower.x;
              const delayDy = targetPos.y - follower.y;
              follower.x += delayDx * config.followSpeed;
              follower.y += delayDy * config.followSpeed;
            }
            break;

          case 'snake':
            // Snake-like tight following
            if (index === 0) {
              const snakeDx = mouseX - follower.x;
              const snakeDy = mouseY - follower.y;
              follower.x += snakeDx * config.followSpeed;
              follower.y += snakeDy * config.followSpeed;
            } else {
              const prev = followers[index - 1];
              const snakeDx = prev.x - follower.x;
              const snakeDy = prev.y - follower.y;
              const snakeDist = Math.sqrt(snakeDx ** 2 + snakeDy ** 2);

              if (snakeDist > 15) {
                follower.x += (snakeDx / snakeDist) * (snakeDist - 15) * 0.5;
                follower.y += (snakeDy / snakeDist) * (snakeDist - 15) * 0.5;
              }
            }
            break;

          case 'flock':
            // Flocking behavior
            let flockCenterX = 0;
            let flockCenterY = 0;
            let flockSeparationX = 0;
            let flockSeparationY = 0;
            let neighbors = 0;

            followers.forEach((other, otherIndex) => {
              if (otherIndex !== index) {
                const flockDist = Math.sqrt((follower.x - other.x) ** 2 + (follower.y - other.y) ** 2);
                if (flockDist < 50) {
                  flockCenterX += other.x;
                  flockCenterY += other.y;
                  neighbors++;

                  if (flockDist < 25) {
                    flockSeparationX += (follower.x - other.x) / flockDist;
                    flockSeparationY += (follower.y - other.y) / flockDist;
                  }
                }
              }
            });

            if (neighbors > 0) {
              flockCenterX /= neighbors;
              flockCenterY /= neighbors;
            }

            f.vx += (mouseX - follower.x) * 0.001; // Seek mouse
            f.vy += (mouseY - follower.y) * 0.001;
            f.vx += (flockCenterX - follower.x) * 0.0005; // Cohesion
            f.vy += (flockCenterY - follower.y) * 0.0005;
            f.vx += flockSeparationX * 0.01; // Separation
            f.vy += flockSeparationY * 0.01;

            f.vx *= 0.98;
            f.vy *= 0.98;
            follower.x += f.vx;
            follower.y += f.vy;
            break;
        }

        // Draw follower
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(follower.x, follower.y, f.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }

  /**
   * Creates a network/line connection animation
   */
  public createNetworkAnimation(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, preset: string = 'classic', options?: {
    centerX?: number;
    centerY?: number;
    getCenterX?: () => number;
    getCenterY?: () => number;
  }): AnimationCleanup {
    const nodes: NetworkNode[] = [];
    let animationId: number;

    // Network presets based on original LinedNet Flash experiments
    const presets: Record<string, {
      nodeCount: number;
      connectionDistance: number;
      nodeSize: number;
      speed: number;
      colors: {
        nodes: string;
        connections: string;
      };
      behavior: 'bounce' | 'wrap' | 'attract' | 'repel';
      description: string;
    }> = {
      'classic': {
        nodeCount: 15,
        connectionDistance: 100,
        nodeSize: 4,
        speed: 1,
        colors: { nodes: '#3498db', connections: 'rgba(52, 152, 219, 0.3)' },
        behavior: 'bounce',
        description: 'Classic network from LinedNet.fla'
      },
      'dense': {
        nodeCount: 25,
        connectionDistance: 80,
        nodeSize: 3,
        speed: 0.8,
        colors: { nodes: '#e74c3c', connections: 'rgba(231, 76, 60, 0.2)' },
        behavior: 'bounce',
        description: 'Dense network with more connections from LinedNet2.fla'
      },
      'sparse': {
        nodeCount: 10,
        connectionDistance: 150,
        nodeSize: 6,
        speed: 1.2,
        colors: { nodes: '#2ecc71', connections: 'rgba(46, 204, 113, 0.4)' },
        behavior: 'bounce',
        description: 'Sparse network with long-range connections'
      },
      'dynamic': {
        nodeCount: 20,
        connectionDistance: 120,
        nodeSize: 5,
        speed: 1.5,
        colors: { nodes: '#f39c12', connections: 'rgba(243, 156, 18, 0.3)' },
        behavior: 'wrap',
        description: 'Dynamic wrapping network from LinedNet3.fla'
      },
      'magnetic': {
        nodeCount: 18,
        connectionDistance: 90,
        nodeSize: 4,
        speed: 0.6,
        colors: { nodes: '#9b59b6', connections: 'rgba(155, 89, 182, 0.3)' },
        behavior: 'attract',
        description: 'Magnetic attraction network'
      },
      'repulsion': {
        nodeCount: 12,
        connectionDistance: 140,
        nodeSize: 5,
        speed: 0.9,
        colors: { nodes: '#e67e22', connections: 'rgba(230, 126, 34, 0.25)' },
        behavior: 'repel',
        description: 'Repulsion-based network with spacing'
      },
      'organic': {
        nodeCount: 30,
        connectionDistance: 60,
        nodeSize: 2,
        speed: 0.5,
        colors: { nodes: '#16a085', connections: 'rgba(22, 160, 133, 0.15)' },
        behavior: 'bounce',
        description: 'Organic-like network with many small nodes'
      },
      'constellation': {
        nodeCount: 8,
        connectionDistance: 200,
        nodeSize: 8,
        speed: 0.3,
        colors: { nodes: '#34495e', connections: 'rgba(52, 73, 94, 0.5)' },
        behavior: 'bounce',
        description: 'Constellation-like network with bright connections'
      }
    };

    const config = presets[preset] ?? presets['classic'];

    // Initialize nodes based on preset
    for (let i = 0; i < config.nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * config.speed,
        vy: (Math.random() - 0.5) * config.speed
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update nodes based on behavior
      nodes.forEach((node, index) => {
        switch (config.behavior) {
          case 'bounce':
            node.x += node.vx;
            node.y += node.vy;
            if (node.x <= 0 || node.x >= canvas.width) node.vx *= -1;
            if (node.y <= 0 || node.y >= canvas.height) node.vy *= -1;
            break;

          case 'wrap':
            node.x += node.vx;
            node.y += node.vy;
            if (node.x < 0) node.x = canvas.width;
            if (node.x > canvas.width) node.x = 0;
            if (node.y < 0) node.y = canvas.height;
            if (node.y > canvas.height) node.y = 0;
            break;

          case 'attract':
            // Attract to center
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const dx = centerX - node.x;
            const dy = centerY - node.y;
            node.vx += dx * 0.0001;
            node.vy += dy * 0.0001;
            node.x += node.vx;
            node.y += node.vy;
            // Apply damping
            node.vx *= 0.99;
            node.vy *= 0.99;
            break;

          case 'repel':
            // Repel from other nodes
            let repelX = 0, repelY = 0;
            nodes.forEach((other, otherIndex) => {
              if (index !== otherIndex) {
                const dx = node.x - other.x;
                const dy = node.y - other.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 50 && dist > 0) {
                  repelX += dx / dist;
                  repelY += dy / dist;
                }
              }
            });
            node.vx += repelX * 0.01;
            node.vy += repelY * 0.01;
            node.x += node.vx;
            node.y += node.vy;
            // Bounce off walls
            if (node.x <= 0 || node.x >= canvas.width) node.vx *= -1;
            if (node.y <= 0 || node.y >= canvas.height) node.vy *= -1;
            break;
        }
      });

      // Draw connections
      ctx.strokeStyle = config.colors.connections;
      ctx.lineWidth = 1;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < config.connectionDistance) {
            const alpha = 1 - (distance / config.connectionDistance);
            ctx.strokeStyle = config.colors.connections.replace(/[\d\.]+\)$/, `${alpha * 0.5})`);
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      ctx.fillStyle = config.colors.nodes;
      nodes.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, config.nodeSize, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }

  /**
   * Creates a bounce-back physics animation with different presets
   */
  public createBounceAnimation(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, preset: string = 'classic', options?: {
    centerX?: number;
    centerY?: number;
    getCenterX?: () => number;
    getCenterY?: () => number;
  }): AnimationCleanup {
    const balls: Array<{x: number, y: number, vx: number, vy: number, radius: number, color: string, mass?: number, elasticity?: number}> = [];
    let animationId: number;

    // Bounce physics presets based on original BounceBack Flash experiment
    const presets: Record<string, {
      ballCount: number;
      gravity: number;
      friction: number;
      airResistance: number;
      elasticity: number;
      ballSize: { min: number; max: number };
      initialVelocity: { vx: number; vy: number };
      colors: string[];
      behavior: 'normal' | 'floating' | 'heavy' | 'elastic' | 'chaotic' | 'magnetic' | 'orbital' | 'explosive';
      description: string;
    }> = {
      'classic': {
        ballCount: 8,
        gravity: 0.5,
        friction: 0.98,
        airResistance: 0.999,
        elasticity: 0.8,
        ballSize: { min: 10, max: 25 },
        initialVelocity: { vx: 10, vy: -10 },
        colors: ['#e74c3c', '#3498db', '#f39c12', '#2ecc71', '#9b59b6', '#e67e22', '#1abc9c', '#34495e'],
        behavior: 'normal',
        description: 'Classic bounce physics from BounceBack.fla'
      },
      'floating': {
        ballCount: 12,
        gravity: 0.1,
        friction: 0.95,
        airResistance: 0.98,
        elasticity: 0.9,
        ballSize: { min: 8, max: 20 },
        initialVelocity: { vx: 6, vy: -6 },
        colors: ['#74b9ff', '#0984e3', '#a29bfe', '#6c5ce7', '#fd79a8', '#e84393'],
        behavior: 'floating',
        description: 'Low gravity floating bubbles'
      },
      'heavy': {
        ballCount: 6,
        gravity: 1.2,
        friction: 0.85,
        airResistance: 0.995,
        elasticity: 0.6,
        ballSize: { min: 15, max: 35 },
        initialVelocity: { vx: 8, vy: -5 },
        colors: ['#636e72', '#2d3436', '#b2bec3', '#ddd', '#00b894', '#00cec9'],
        behavior: 'heavy',
        description: 'Heavy balls with strong gravity'
      },
      'elastic': {
        ballCount: 10,
        gravity: 0.4,
        friction: 0.99,
        airResistance: 0.999,
        elasticity: 1.1,
        ballSize: { min: 12, max: 22 },
        initialVelocity: { vx: 12, vy: -12 },
        colors: ['#00b894', '#00cec9', '#e17055', '#fdcb6e', '#6c5ce7', '#a29bfe'],
        behavior: 'elastic',
        description: 'Super elastic bouncing balls'
      },
      'chaotic': {
        ballCount: 15,
        gravity: 0.3,
        friction: 0.96,
        airResistance: 0.997,
        elasticity: 0.9,
        ballSize: { min: 5, max: 18 },
        initialVelocity: { vx: 15, vy: -15 },
        colors: ['#ff7675', '#fd79a8', '#fdcb6e', '#e17055', '#74b9ff', '#0984e3', '#00b894', '#6c5ce7'],
        behavior: 'chaotic',
        description: 'Chaotic multi-ball system'
      },
      'magnetic': {
        ballCount: 8,
        gravity: 0.2,
        friction: 0.97,
        airResistance: 0.998,
        elasticity: 0.85,
        ballSize: { min: 10, max: 25 },
        initialVelocity: { vx: 8, vy: -8 },
        colors: ['#a29bfe', '#6c5ce7', '#fd79a8', '#e84393', '#74b9ff', '#0984e3'],
        behavior: 'magnetic',
        description: 'Magnetic attraction between balls'
      },
      'orbital': {
        ballCount: 6,
        gravity: 0.05,
        friction: 0.999,
        airResistance: 0.9995,
        elasticity: 1.0,
        ballSize: { min: 8, max: 16 },
        initialVelocity: { vx: 4, vy: -4 },
        colors: ['#fdcb6e', '#e17055', '#00b894', '#00cec9', '#74b9ff', '#6c5ce7'],
        behavior: 'orbital',
        description: 'Orbital mechanics with central attraction'
      },
      'explosive': {
        ballCount: 20,
        gravity: 0.8,
        friction: 0.92,
        airResistance: 0.99,
        elasticity: 0.7,
        ballSize: { min: 3, max: 12 },
        initialVelocity: { vx: 20, vy: -20 },
        colors: ['#ff7675', '#fd79a8', '#fdcb6e', '#e17055', '#00b894', '#74b9ff', '#6c5ce7', '#a29bfe'],
        behavior: 'explosive',
        description: 'Explosive burst with many small balls'
      }
    };

    const config = presets[preset] ?? presets['classic'];

    // Initialize balls based on preset
    for (let i = 0; i < config.ballCount; i++) {
      const radius = Math.random() * (config.ballSize.max - config.ballSize.min) + config.ballSize.min;
      const ball = {
        x: Math.random() * (canvas.width - radius * 2) + radius,
        y: Math.random() * (canvas.height * 0.5) + radius,
        vx: (Math.random() - 0.5) * config.initialVelocity.vx,
        vy: Math.random() * config.initialVelocity.vy + config.initialVelocity.vy,
        radius: radius,
        color: config.colors[i % config.colors.length],
        mass: radius / 10,
        elasticity: config.elasticity + (Math.random() - 0.5) * 0.1
      };

      // Special initialization for certain behaviors
      if (config.behavior === 'orbital') {
        const angle = (i / config.ballCount) * Math.PI * 2;
        const distance = 80 + Math.random() * 40;
        ball.x = canvas.width / 2 + Math.cos(angle) * distance;
        ball.y = canvas.height / 2 + Math.sin(angle) * distance;
        ball.vx = Math.sin(angle) * 3;
        ball.vy = -Math.cos(angle) * 3;
      } else if (config.behavior === 'explosive') {
        ball.x = canvas.width / 2;
        ball.y = canvas.height / 2;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * config.initialVelocity.vx + 5;
        ball.vx = Math.cos(angle) * speed;
        ball.vy = Math.sin(angle) * speed;
      }

      balls.push(ball);
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      balls.forEach((ball, index) => {
        // Apply behavior-specific forces
        switch (config.behavior) {
          case 'normal':
          case 'floating':
          case 'heavy':
          case 'elastic':
          case 'chaotic':
          case 'explosive':
            ball.vy += config.gravity;
            break;

          case 'magnetic':
            ball.vy += config.gravity;
            balls.forEach((other, otherIndex) => {
              if (index !== otherIndex) {
                const dx = other.x - ball.x;
                const dy = other.y - ball.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > 0 && distance < 100) {
                  const force = 0.1 / (distance * distance);
                  ball.vx += (dx / distance) * force;
                  ball.vy += (dy / distance) * force;
                }
              }
            });
            break;

          case 'orbital':
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const dx = centerX - ball.x;
            const dy = centerY - ball.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const force = 500 / (distance * distance);
            ball.vx += (dx / distance) * force;
            ball.vy += (dy / distance) * force;
            break;
        }

        // Apply air resistance
        ball.vx *= config.airResistance;
        ball.vy *= config.airResistance;

        // Update position
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Bounce off walls with elasticity
        if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= canvas.width) {
          ball.vx *= -config.friction * ball.elasticity!;
          ball.x = ball.x - ball.radius <= 0 ? ball.radius : canvas.width - ball.radius;
        }

        if (ball.y + ball.radius >= canvas.height) {
          ball.vy *= -config.friction * ball.elasticity!;
          ball.y = canvas.height - ball.radius;
        }

        // Bounce off ceiling for certain behaviors
        if (ball.y - ball.radius <= 0 && ['floating', 'chaotic', 'magnetic', 'orbital'].includes(config.behavior)) {
          ball.vy *= -config.friction * ball.elasticity!;
          ball.y = ball.radius;
        }

        // Ball-to-ball collisions for certain behaviors
        if (['elastic', 'chaotic', 'magnetic'].includes(config.behavior)) {
          balls.forEach((other, otherIndex) => {
            if (index !== otherIndex) {
              const dx = other.x - ball.x;
              const dy = other.y - ball.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const minDistance = ball.radius + other.radius;

              if (distance < minDistance) {
                // Simple elastic collision
                const angle = Math.atan2(dy, dx);
                const sin = Math.sin(angle);
                const cos = Math.cos(angle);

                // Rotate velocities
                const vx1 = ball.vx * cos + ball.vy * sin;
                const vy1 = ball.vy * cos - ball.vx * sin;
                const vx2 = other.vx * cos + other.vy * sin;
                const vy2 = other.vy * cos - other.vx * sin;

                // Conservation of momentum
                const finalVx1 = ((ball.mass! - other.mass!) * vx1 + 2 * other.mass! * vx2) / (ball.mass! + other.mass!);
                const finalVx2 = ((other.mass! - ball.mass!) * vx2 + 2 * ball.mass! * vx1) / (ball.mass! + other.mass!);

                // Rotate back
                ball.vx = finalVx1 * cos - vy1 * sin;
                ball.vy = vy1 * cos + finalVx1 * sin;
                other.vx = finalVx2 * cos - vy2 * sin;
                other.vy = vy2 * cos + finalVx2 * sin;

                // Separate balls
                const overlap = minDistance - distance;
                const separationX = (dx / distance) * overlap * 0.5;
                const separationY = (dy / distance) * overlap * 0.5;
                ball.x -= separationX;
                ball.y -= separationY;
                other.x += separationX;
                other.y += separationY;
              }
            }
          });
        }

        // Draw ball with enhanced visuals for certain behaviors
        if (config.behavior === 'magnetic') {
          const gradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.radius * 2);
          gradient.addColorStop(0, ball.color);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius * 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw main ball
        ctx.fillStyle = ball.color;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();

        // Add shine effect for elastic balls
        if (config.behavior === 'elastic') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.beginPath();
          ctx.arc(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, ball.radius * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }

  /**
   * Creates sunflower spiral patterns based on original Flash ActionScript
   * Each preset replicates the mathematical patterns from the original sunflower_*.swf files
   * Now includes Fibonacci spiral variations from fibonacci_sequence.fla and golden_ratio*.fla files
   */
  public createSunflowerPattern(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, preset: string = 'golden', options?: {
    centerX?: number;
    centerY?: number;
    getCenterX?: () => number;
    getCenterY?: () => number;
  }): AnimationCleanup {
    let animationId: number;
    let count = 0;
    let angle = 0;
    let rotation = 0;
    let particles: Array<{x: number, y: number, age: number, maxAge: number}> = [];

    // Enhanced presets combining sunflower patterns and Fibonacci spirals
    const presets: Record<string, {
      step: number;
      speed: number;
      maxParticles: number;
      radiusMultiplier: number;
      visualType: 'particles' | 'continuous' | 'dots' | 'rectangles' | 'sequence';
      color?: string;
      spiralTightness?: number;
      segments?: number;
    }> = {
      // Original Sunflower Patterns
      'golden': { step: 137.5, speed: 2, maxParticles: 200, radiusMultiplier: 1.0, visualType: 'particles' },
      'fibonacci': { step: 144, speed: 3, maxParticles: 150, radiusMultiplier: 1.2, visualType: 'particles' },
      'double': { step: 275, speed: 2.5, maxParticles: 180, radiusMultiplier: 0.9, visualType: 'particles' },
      'triple': { step: 120, speed: 4, maxParticles: 120, radiusMultiplier: 1.3, visualType: 'particles' },
      'fast': { step: 137.5, speed: 6, maxParticles: 300, radiusMultiplier: 0.8, visualType: 'particles' },
      'dense': { step: 137.5, speed: 1, maxParticles: 400, radiusMultiplier: 0.7, visualType: 'particles' },
      'spiral': { step: 90, speed: 3, maxParticles: 160, radiusMultiplier: 1.1, visualType: 'particles' },
      'pentagram': { step: 72, speed: 2.5, maxParticles: 100, radiusMultiplier: 1.4, visualType: 'particles' },

      // Fibonacci Spiral Variations
      'fibonacci-classic': { step: 137.5, speed: 0.02, maxParticles: 200, radiusMultiplier: 1, visualType: 'continuous', color: '#f39c12', spiralTightness: 0.1, segments: 200 },
      'golden-ratio': { step: 137.5, speed: 0.015, maxParticles: 250, radiusMultiplier: 0.8, visualType: 'continuous', color: '#e67e22', spiralTightness: 0.08, segments: 250 },
      'nautilus': { step: 137.5, speed: 0.01, maxParticles: 180, radiusMultiplier: 1.2, visualType: 'continuous', color: '#3498db', spiralTightness: 0.12, segments: 180 },
      'galaxy': { step: 137.5, speed: 0.025, maxParticles: 300, radiusMultiplier: 0.6, visualType: 'dots', color: '#9b59b6', spiralTightness: 0.06, segments: 300 },
      'plant-growth': { step: 137.5, speed: 0.03, maxParticles: 150, radiusMultiplier: 1.4, visualType: 'dots', color: '#2ecc71', spiralTightness: 0.15, segments: 150 },
      'number-sequence': { step: 137.5, speed: 0.04, maxParticles: 100, radiusMultiplier: 2, visualType: 'sequence', color: '#e74c3c', spiralTightness: 0.2, segments: 100 },
      'golden-rectangles': { step: 137.5, speed: 0.018, maxParticles: 120, radiusMultiplier: 1.1, visualType: 'rectangles', color: '#34495e', spiralTightness: 0.09, segments: 120 },
      'logarithmic': { step: 137.5, speed: 0.012, maxParticles: 220, radiusMultiplier: 0.9, visualType: 'continuous', color: '#16a085', spiralTightness: 0.07, segments: 220 }
    };

    const config = presets[preset] ?? presets['golden'];

    const animate = () => {
      // Handle different visualization types
      if (config.visualType === 'particles') {
        // Original sunflower particle system
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (particles.length < config.maxParticles) {
          const radius = Math.sqrt(count) * 3 * config.radiusMultiplier;
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const radians = (angle * Math.PI) / 180;
          const x = centerX + Math.cos(radians) * radius;
          const y = centerY + Math.sin(radians) * radius;

          particles.push({
            x: x,
            y: y,
            age: 0,
            maxAge: 300 + Math.random() * 200
          });

          angle += config.step;
          if (angle > 360) angle -= 360;
          count++;
        }

        // Update and draw particles
        particles = particles.filter(particle => {
          particle.age++;
          const alpha = Math.max(0, 1 - (particle.age / particle.maxAge));
          if (alpha > 0) {
            const hue = (particle.age * 2) % 60 + 30;
            ctx.fillStyle = `hsla(${hue}, 80%, ${60 + alpha * 30}%, ${alpha})`;
            const size = 2 + alpha * 3;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
            ctx.fill();
            return true;
          }
          return false;
        });
      } else {
        // Fibonacci spiral visualizations
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const phi = (1 + Math.sqrt(5)) / 2;

        ctx.strokeStyle = config.color || '#f39c12';
        ctx.fillStyle = config.color || '#f39c12';
        ctx.lineWidth = 2;

        switch (config.visualType) {
          case 'continuous':
            ctx.beginPath();
            for (let i = 0; i < config.segments!; i++) {
              const spiralAngle = i * 0.2 + rotation;
              const radius = Math.pow(phi, spiralAngle * config.spiralTightness!) * config.radiusMultiplier;
              const x = centerX + Math.cos(spiralAngle) * radius;
              const y = centerY + Math.sin(spiralAngle) * radius;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
            break;

          case 'dots':
            for (let i = 0; i < config.segments!; i++) {
              const spiralAngle = i * (Math.PI / 180 * 137.5) + rotation;
              const radius = Math.sqrt(i) * 5 * config.radiusMultiplier;
              const x = centerX + Math.cos(spiralAngle) * radius;
              const y = centerY + Math.sin(spiralAngle) * radius;
              ctx.beginPath();
              ctx.arc(x, y, 2 + Math.sin(i * 0.1) * 1, 0, Math.PI * 2);
              ctx.fill();
            }
            break;

          case 'rectangles':
            let rectSize = 5;
            let currentAngle = rotation;
            for (let i = 0; i < 12; i++) {
              const x = centerX + Math.cos(currentAngle) * (i * 15);
              const y = centerY + Math.sin(currentAngle) * (i * 15);
              ctx.strokeRect(x - rectSize/2, y - rectSize/2, rectSize, rectSize * phi);
              rectSize *= 1.2;
              currentAngle += Math.PI / 2;
            }
            break;

          case 'sequence':
            const fibSequence = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];
            let sequenceAngle = rotation;
            for (let i = 0; i < fibSequence.length && i < 10; i++) {
              const radius = fibSequence[i] * 2;
              const distance = i * 25;
              const x = centerX + Math.cos(sequenceAngle) * distance;
              const y = centerY + Math.sin(sequenceAngle) * distance;
              ctx.beginPath();
              ctx.arc(x, y, radius, 0, Math.PI * 2);
              ctx.stroke();
              ctx.fillText(fibSequence[i].toString(), x - 5, y + 3);
              sequenceAngle += (2 * Math.PI / phi);
            }
            break;
        }

        rotation += config.speed;
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }

  /**
   * Sets up canvas with common properties and clears it
   */
  public setupCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    // Set canvas size if not already set
    if (canvas.width === 0 || canvas.height === 0) {
      canvas.width = 400;
      canvas.height = 300;
    }

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set default styles
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
  }

  /**
   * Clears the canvas completely
   */
  public clearCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}
