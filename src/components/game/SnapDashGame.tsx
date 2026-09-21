import React, { useRef, useEffect, useState, useCallback } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Trophy, Sparkles, Zap, ArrowUp } from "lucide-react";
import { SnapDashGameState, UserProfile } from "../../types";
import { GameService } from "../../services/gameService";
import { GameOverModal } from "./GameOverModal";

interface SnapDashGameProps {
  user: UserProfile | null;
  onOpenLeaderboard?: () => void;
  onOpenAuthModal?: () => void;
}

// Visual Dimensions
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const GROUND_Y = 330;
const PLAYER_X = 90;
const PLAYER_SIZE = 36;
const GRAVITY = 0.65;
const JUMP_FORCE = -11.5;
const MAX_JUMPS = 2; // Ground jump + 1 double jump in air

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "spike" | "block" | "drone";
  color: string;
  passed?: boolean;
}

interface Collectible {
  x: number;
  y: number;
  radius: number;
  type: "spark" | "orb" | "multiplier";
  points: number;
  color: string;
  pulsePhase: number;
  collected?: boolean;
}

export const SnapDashGame: React.FC<SnapDashGameProps> = ({
  user,
  onOpenLeaderboard,
  onOpenAuthModal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // React states
  const [gameState, setGameState] = useState<SnapDashGameState>("READY");
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [isNewBest, setIsNewBest] = useState<boolean>(false);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(GameService.isMuted());
  const [levelNotification, setLevelNotification] = useState<string | null>(null);
  const [multiplierActive, setMultiplierActive] = useState<boolean>(false);

  // Engine references (to avoid closure capture in requestAnimationFrame)
  const engineRef = useRef({
    gameState: "READY" as SnapDashGameState,
    score: 0,
    highScore: 0,
    startTime: 0,
    speed: 5.5,
    distanceTraveled: 0,
    multiplierTimer: 0,
    currentMultiplier: 1,
    level: 1,

    // Player
    playerY: GROUND_Y - PLAYER_SIZE,
    playerVy: 0,
    jumpsRemaining: MAX_JUMPS,
    isGrounded: true,
    rotation: 0,

    // Entities
    obstacles: [] as Obstacle[],
    collectibles: [] as Collectible[],
    particles: [] as Particle[],
    stars: [] as Array<{ x: number; y: number; size: number; alpha: number; speed: number }>,

    // Spawning timers
    obstacleSpawnTimer: 0,
    collectibleSpawnTimer: 0,

    // Animation frame
    animFrameId: 0,
  });

  // Load initial high score on mount
  useEffect(() => {
    GameService.getUserStats(user).then((stats) => {
      setHighScore(stats.personalBest);
      engineRef.current.highScore = stats.personalBest;
    });
  }, [user?.id]);

  // Initialize starfield
  useEffect(() => {
    const stars: Array<{ x: number; y: number; size: number; alpha: number; speed: number }> = [];
    for (let i = 0; i < 70; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * (GROUND_Y - 40),
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.8 + 0.2,
        speed: Math.random() * 0.8 + 0.2,
      });
    }
    engineRef.current.stars = stars;
  }, []);

  // Jump Action Handler
  const handleJump = useCallback(() => {
    const eng = engineRef.current;
    if (eng.gameState === "READY") {
      startGame();
      return;
    }
    if (eng.gameState === "GAME_OVER") {
      startGame();
      return;
    }
    if (eng.gameState === "PAUSED") {
      togglePause();
      return;
    }
    if (eng.gameState !== "PLAYING") return;

    if (eng.jumpsRemaining > 0) {
      eng.playerVy = JUMP_FORCE;
      eng.isGrounded = false;
      eng.jumpsRemaining -= 1;

      // Web Audio sound & haptics
      GameService.playJumpSound();
      GameService.triggerHaptic(20);

      // Spawn thruster particle explosion
      for (let i = 0; i < 10; i++) {
        eng.particles.push({
          x: PLAYER_X + PLAYER_SIZE / 2,
          y: eng.playerY + PLAYER_SIZE,
          vx: (Math.random() - 0.5) * 4 - 2,
          vy: Math.random() * 3 + 2,
          size: Math.random() * 4 + 2,
          color: eng.jumpsRemaining === 0 ? "#A855F7" : "#00F0FF",
          alpha: 0.9,
          decay: 0.04,
        });
      }
    }
  }, []);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Jump keys: Space, ArrowUp, KeyW
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        handleJump();
      }
      // Pause key: KeyP or Escape
      if (e.code === "KeyP" || e.code === "Escape") {
        e.preventDefault();
        togglePause();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleJump]);

  // Start / Restart Game
  const startGame = () => {
    const eng = engineRef.current;
    eng.gameState = "PLAYING";
    eng.score = 0;
    eng.startTime = Date.now();
    eng.speed = 5.5;
    eng.distanceTraveled = 0;
    eng.multiplierTimer = 0;
    eng.currentMultiplier = 1;
    eng.level = 1;
    eng.playerY = GROUND_Y - PLAYER_SIZE;
    eng.playerVy = 0;
    eng.jumpsRemaining = MAX_JUMPS;
    eng.isGrounded = true;
    eng.rotation = 0;
    eng.obstacles = [];
    eng.collectibles = [];
    eng.particles = [];
    eng.obstacleSpawnTimer = 40;
    eng.collectibleSpawnTimer = 60;

    setScore(0);
    setIsNewBest(false);
    setLevelNotification(null);
    setMultiplierActive(false);
    setGameState("PLAYING");
  };

  // Toggle Pause
  const togglePause = () => {
    const eng = engineRef.current;
    if (eng.gameState === "PLAYING") {
      eng.gameState = "PAUSED";
      setGameState("PAUSED");
    } else if (eng.gameState === "PAUSED") {
      eng.gameState = "PLAYING";
      setGameState("PLAYING");
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const muted = GameService.toggleMute();
    setIsMuted(muted);
  };

  // End Game (Crash)
  const gameOver = async () => {
    const eng = engineRef.current;
    eng.gameState = "GAME_OVER";
    setGameState("GAME_OVER");

    // Audio & Haptic
    GameService.playCrashSound();
    GameService.triggerHaptic(80);

    // Collision burst explosion
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 2;
      eng.particles.push({
        x: PLAYER_X + PLAYER_SIZE / 2,
        y: eng.playerY + PLAYER_SIZE / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 5 + 2,
        color: i % 2 === 0 ? "#FF3B30" : "#38BDF8",
        alpha: 1.0,
        decay: 0.025,
      });
    }

    const durationSeconds = Math.max(1, Math.floor((Date.now() - eng.startTime) / 1000));
    const finalScore = Math.floor(eng.score);

    // Submit score securely with anti-cheat checks
    try {
      const res = await GameService.submitScore(finalScore, durationSeconds, user);
      if (res.success) {
        setHighScore(res.highScore);
        setIsNewBest(res.isNewBest);
        setUserRank(res.currentRank);
        if (res.isNewBest) {
          GameService.playHighScoreFanfare();
        }
      }
    } catch (err) {
      console.warn("[SnapDash] Score save error:", err);
    }
  };

  // =========================================================================
  // MAIN 60 FPS GAME LOOP
  // =========================================================================
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const canvas = canvasRef.current;
      if (!canvas) {
        engineRef.current.animFrameId = requestAnimationFrame(loop);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        engineRef.current.animFrameId = requestAnimationFrame(loop);
        return;
      }

      const eng = engineRef.current;

      // -----------------------------------------------------------------
      // UPDATE STATE (IF PLAYING)
      // -----------------------------------------------------------------
      if (eng.gameState === "PLAYING") {
        // Distance & score calculation
        eng.distanceTraveled += eng.speed;
        const scoreGain = (eng.speed * 0.1) * eng.currentMultiplier;
        eng.score += scoreGain;
        setScore(Math.floor(eng.score));

        // Multiplier Timer
        if (eng.multiplierTimer > 0) {
          eng.multiplierTimer -= dt;
          if (eng.multiplierTimer <= 0) {
            eng.currentMultiplier = 1;
            setMultiplierActive(false);
          }
        }

        // Dynamic Speed & Level Scaling (starts at 5.5, scales smoothly up to 12.0)
        const targetSpeed = Math.min(12.0, 5.5 + Math.floor(eng.score / 600) * 0.65);
        if (eng.speed < targetSpeed) {
          eng.speed += 0.005;
        }

        // Level notifications
        const currentLevel = 1 + Math.floor(eng.score / 1000);
        if (currentLevel > eng.level) {
          eng.level = currentLevel;
          setLevelNotification(`⚡ LEVEL ${currentLevel} REACHED`);
          setTimeout(() => setLevelNotification(null), 2500);
        }

        // Player physics
        eng.playerVy += GRAVITY;
        eng.playerY += eng.playerVy;

        // Ground collision
        if (eng.playerY >= GROUND_Y - PLAYER_SIZE) {
          eng.playerY = GROUND_Y - PLAYER_SIZE;
          eng.playerVy = 0;
          eng.isGrounded = true;
          eng.jumpsRemaining = MAX_JUMPS;
          eng.rotation = 0;
        } else {
          eng.isGrounded = false;
          eng.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, eng.playerVy * 0.05));
        }

        // Trailing particles behind bot
        if (Math.random() < 0.8) {
          eng.particles.push({
            x: PLAYER_X + 4,
            y: eng.playerY + PLAYER_SIZE * 0.7,
            vx: -eng.speed * 0.7 - Math.random() * 2,
            vy: (Math.random() - 0.5) * 1.5,
            size: Math.random() * 3 + 1.5,
            color: eng.currentMultiplier > 1 ? "#F59E0B" : "#00F0FF",
            alpha: 0.75,
            decay: 0.05,
          });
        }

        // -----------------------------------------------------------------
        // OBSTACLES SPAWNING & UPDATING
        // -----------------------------------------------------------------
        eng.obstacleSpawnTimer -= 1;
        if (eng.obstacleSpawnTimer <= 0) {
          const rand = Math.random();
          let type: "spike" | "block" | "drone" = "spike";
          let obsWidth = 32;
          let obsHeight = 44;
          let obsY = GROUND_Y - obsHeight;
          let obsColor = "#FF3366";

          if (rand > 0.65) {
            // Floating Corrupted Data Block (air barrier)
            type = "block";
            obsWidth = 36;
            obsHeight = 36;
            obsY = GROUND_Y - PLAYER_SIZE - 45 - Math.random() * 25;
            obsColor = "#A855F7";
          } else if (rand > 0.4) {
            // High Cyber Spikes
            type = "spike";
            obsWidth = 28;
            obsHeight = 52;
            obsY = GROUND_Y - obsHeight;
            obsColor = "#FF3366";
          }

          eng.obstacles.push({
            x: CANVAS_WIDTH + 20,
            y: obsY,
            width: obsWidth,
            height: obsHeight,
            type,
            color: obsColor,
          });

          // Delay to next obstacle (decreases with speed for intense tempo)
          eng.obstacleSpawnTimer = Math.floor(Math.max(50, 110 - eng.speed * 4.5) + Math.random() * 40);
        }

        // Update obstacles & check collision
        for (let i = eng.obstacles.length - 1; i >= 0; i--) {
          const obs = eng.obstacles[i];
          obs.x -= eng.speed;

          // Bounding box collision check with slight inset tolerance (4px)
          const tolerance = 6;
          const pLeft = PLAYER_X + tolerance;
          const pRight = PLAYER_X + PLAYER_SIZE - tolerance;
          const pTop = eng.playerY + tolerance;
          const pBottom = eng.playerY + PLAYER_SIZE - tolerance;

          const oLeft = obs.x + tolerance;
          const oRight = obs.x + obs.width - tolerance;
          const oTop = obs.y + tolerance;
          const oBottom = obs.y + obs.height - tolerance;

          if (pRight > oLeft && pLeft < oRight && pBottom > oTop && pTop < oBottom) {
            gameOver();
            break;
          }

          // Remove offscreen obstacles
          if (obs.x + obs.width < -50) {
            eng.obstacles.splice(i, 1);
          }
        }

        // -----------------------------------------------------------------
        // COLLECTIBLES SPAWNING & UPDATING
        // -----------------------------------------------------------------
        eng.collectibleSpawnTimer -= 1;
        if (eng.collectibleSpawnTimer <= 0) {
          const rand = Math.random();
          let cType: "spark" | "orb" | "multiplier" = "spark";
          let pts = 50;
          let color = "#38BDF8";
          let cY = GROUND_Y - 40 - Math.random() * 110;

          if (rand > 0.88) {
            cType = "multiplier";
            pts = 250;
            color = "#F59E0B";
          } else if (rand > 0.6) {
            cType = "orb";
            pts = 100;
            color = "#C084FC";
          }

          eng.collectibles.push({
            x: CANVAS_WIDTH + 20,
            y: cY,
            radius: cType === "multiplier" ? 14 : 11,
            type: cType,
            points: pts,
            color,
            pulsePhase: 0,
          });

          eng.collectibleSpawnTimer = Math.floor(70 + Math.random() * 80);
        }

        // Update collectibles & check pickup
        for (let i = eng.collectibles.length - 1; i >= 0; i--) {
          const col = eng.collectibles[i];
          col.x -= eng.speed;
          col.pulsePhase += 0.08;

          // Pickup collision
          const botCenterX = PLAYER_X + PLAYER_SIZE / 2;
          const botCenterY = eng.playerY + PLAYER_SIZE / 2;
          const dist = Math.hypot(botCenterX - col.x, botCenterY - col.y);

          if (dist < PLAYER_SIZE / 2 + col.radius) {
            // Picked up!
            eng.score += col.points * eng.currentMultiplier;
            GameService.playCollectSound();
            GameService.triggerHaptic(15);

            if (col.type === "multiplier") {
              eng.currentMultiplier = 2;
              eng.multiplierTimer = 6; // 6 seconds 2x boost
              setMultiplierActive(true);
            }

            // Sparkle particles
            for (let p = 0; p < 12; p++) {
              const angle = Math.random() * Math.PI * 2;
              const spd = Math.random() * 4 + 1;
              eng.particles.push({
                x: col.x,
                y: col.y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                size: Math.random() * 3 + 1.5,
                color: col.color,
                alpha: 0.9,
                decay: 0.05,
              });
            }

            eng.collectibles.splice(i, 1);
            continue;
          }

          if (col.x < -40) {
            eng.collectibles.splice(i, 1);
          }
        }
      }

      // -----------------------------------------------------------------
      // UPDATE PARTICLES & STARFIELD
      // -----------------------------------------------------------------
      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const p = eng.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
          eng.particles.splice(i, 1);
        }
      }

      // Move stars for parallax
      const starSpeedFactor = eng.gameState === "PLAYING" ? eng.speed * 0.2 : 0.4;
      eng.stars.forEach((s) => {
        s.x -= s.speed * starSpeedFactor;
        if (s.x < 0) s.x = CANVAS_WIDTH;
      });

      // -----------------------------------------------------------------
      // RENDER CANVAS SCENE
      // -----------------------------------------------------------------
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Deep space background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      bgGrad.addColorStop(0, "#05070A");
      bgGrad.addColorStop(0.65, "#0A0E18");
      bgGrad.addColorStop(1, "#0D1322");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Starfield
      eng.stars.forEach((s) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Distant Cyber City Silhouette
      ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
      const bldgOffset = (eng.distanceTraveled * 0.15) % 160;
      for (let bx = -160; bx < CANVAS_WIDTH + 160; bx += 80) {
        const h = 40 + ((Math.sin(bx * 0.05) + 1) * 35);
        ctx.fillRect(bx - bldgOffset, GROUND_Y - h, 72, h);
      }

      // Ground Plane & Neon Grid Floor
      const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_HEIGHT);
      groundGrad.addColorStop(0, "#070B14");
      groundGrad.addColorStop(1, "#020408");
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

      // Ground Top Neon Rail Line
      ctx.strokeStyle = eng.currentMultiplier > 1 ? "#F59E0B" : "#00F0FF";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = eng.currentMultiplier > 1 ? "rgba(245, 158, 11, 0.8)" : "rgba(0, 240, 255, 0.8)";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset shadow

      // Moving Grid Markings on Ground
      ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
      ctx.lineWidth = 1;
      const gridOffset = eng.distanceTraveled % 40;
      for (let gx = -gridOffset; gx < CANVAS_WIDTH; gx += 40) {
        ctx.beginPath();
        ctx.moveTo(gx, GROUND_Y);
        ctx.lineTo(gx - 20, CANVAS_HEIGHT);
        ctx.stroke();
      }

      // Render Obstacles
      eng.obstacles.forEach((obs) => {
        if (obs.type === "spike") {
          // Sharp Cyber Spikes
          ctx.fillStyle = obs.color;
          ctx.shadowColor = obs.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y + obs.height);
          ctx.lineTo(obs.x + obs.width / 2, obs.y);
          ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
          ctx.closePath();
          ctx.fill();

          // Inner metallic glow
          ctx.fillStyle = "#FFA3B8";
          ctx.beginPath();
          ctx.moveTo(obs.x + obs.width * 0.3, obs.y + obs.height);
          ctx.lineTo(obs.x + obs.width / 2, obs.y + obs.height * 0.2);
          ctx.lineTo(obs.x + obs.width * 0.7, obs.y + obs.height);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          // Corrupted Data Block
          ctx.fillStyle = obs.color;
          ctx.shadowColor = obs.color;
          ctx.shadowBlur = 10;
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

          ctx.strokeStyle = "#E9D5FF";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(obs.x + 3, obs.y + 3, obs.width - 6, obs.height - 6);
          ctx.shadowBlur = 0;
        }
      });

      // Render Collectibles
      eng.collectibles.forEach((col) => {
        const pulse = Math.sin(col.pulsePhase) * 2;
        ctx.save();
        ctx.translate(col.x, col.y);

        ctx.shadowColor = col.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = col.color;

        if (col.type === "spark") {
          // Diamond / Gem shape
          ctx.beginPath();
          ctx.moveTo(0, -col.radius - pulse);
          ctx.lineTo(col.radius + pulse, 0);
          ctx.moveTo(0, -col.radius - pulse);
          ctx.lineTo(-col.radius - pulse, 0);
          ctx.lineTo(0, col.radius + pulse);
          ctx.lineTo(col.radius + pulse, 0);
          ctx.fill();
        } else if (col.type === "multiplier") {
          // Glowing 2X Core
          ctx.beginPath();
          ctx.arc(0, 0, col.radius + pulse, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#000";
          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("2X", 0, 1);
        } else {
          // AI Energy Orb
          ctx.beginPath();
          ctx.arc(0, 0, col.radius + pulse, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.arc(0, 0, col.radius * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      // Render Particles
      eng.particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      // -----------------------------------------------------------------
      // RENDER CHARACTER: SNAPFIND SCANNER DRONE
      // -----------------------------------------------------------------
      if (eng.gameState !== "GAME_OVER") {
        ctx.save();
        ctx.translate(PLAYER_X + PLAYER_SIZE / 2, eng.playerY + PLAYER_SIZE / 2);
        ctx.rotate(eng.rotation);

        const half = PLAYER_SIZE / 2;

        // Drone Hull Shadow / Aura
        ctx.shadowColor = eng.currentMultiplier > 1 ? "#F59E0B" : "#00F0FF";
        ctx.shadowBlur = eng.currentMultiplier > 1 ? 16 : 12;

        // Drone Body (Futuristic Angular Capsule)
        ctx.fillStyle = "#0D1E36";
        ctx.beginPath();
        ctx.roundRect(-half, -half, PLAYER_SIZE, PLAYER_SIZE, 8);
        ctx.fill();

        // Hull Frame Trim
        ctx.strokeStyle = eng.currentMultiplier > 1 ? "#F59E0B" : "#38BDF8";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Front Camera / AI Scanner Eye (Glowing Lens)
        ctx.fillStyle = eng.currentMultiplier > 1 ? "#FDE047" : "#00F0FF";
        ctx.beginPath();
        ctx.arc(half * 0.35, 0, 6.5, 0, Math.PI * 2);
        ctx.fill();

        // Lens Center Pupil
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(half * 0.4, -1.5, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Rear Thruster Jet Nozzle
        ctx.fillStyle = "#1E293B";
        ctx.fillRect(-half - 4, -5, 4, 10);

        // Thruster Plasma Flame
        const flameLength = 8 + Math.random() * 8;
        ctx.fillStyle = eng.currentMultiplier > 1 ? "#F59E0B" : "#00F0FF";
        ctx.beginPath();
        ctx.moveTo(-half - 4, -4);
        ctx.lineTo(-half - 4 - flameLength, 0);
        ctx.lineTo(-half - 4, 4);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }

      // Ready State Prompt Banner
      if (eng.gameState === "READY") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("READY TO SCAN", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

        ctx.fillStyle = "#38BDF8";
        ctx.font = "14px sans-serif";
        ctx.fillText("Press SPACE, Tap screen, or Click Jump to Launch", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 15);
      }

      // Paused State Prompt Banner
      if (eng.gameState === "PAUSED") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("FLIGHT PAUSED", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);

        ctx.fillStyle = "#94A3B8";
        ctx.font = "13px sans-serif";
        ctx.fillText("Press P or click Resume to continue", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
      }

      engineRef.current.animFrameId = requestAnimationFrame(loop);
    };

    engineRef.current.animFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(engineRef.current.animFrameId);
  }, []);

  return (
    <div
      id="snapdash-game-container"
      className="relative w-full rounded-2xl overflow-hidden bg-[#07090D] border border-slate-800 shadow-2xl flex flex-col items-center select-none"
    >
      {/* Top HUD Bar */}
      <div className="w-full px-4 py-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between z-10 backdrop-blur-md">
        {/* Score & Multiplier */}
        <div className="flex items-center space-x-3">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Score</span>
            <div className="text-xl md:text-2xl font-black font-mono text-cyan-400">
              {score.toLocaleString()}
            </div>
          </div>

          {multiplierActive && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 text-xs font-black animate-pulse">
              <Zap className="w-3.5 h-3.5 fill-amber-400" />
              <span>2X BOOST</span>
            </div>
          )}
        </div>

        {/* High Score & Controls */}
        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Best:</span>
            <span className="font-mono text-white">{Math.max(score, highScore).toLocaleString()}</span>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            id="snapdash-mute-btn"
            onClick={handleToggleMute}
            aria-label={isMuted ? "Unmute game audio" : "Mute game audio"}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Pause / Resume */}
          {gameState === "PLAYING" && (
            <button
              type="button"
              id="snapdash-pause-btn"
              onClick={togglePause}
              aria-label="Pause game"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}
          {gameState === "PAUSED" && (
            <button
              type="button"
              id="snapdash-resume-btn"
              onClick={togglePause}
              aria-label="Resume game"
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Resume</span>
            </button>
          )}
        </div>
      </div>

      {/* Level Notification Toast */}
      {levelNotification && (
        <div className="absolute top-16 z-30 px-4 py-1.5 rounded-full bg-blue-600/90 text-white text-xs font-bold shadow-lg border border-cyan-400/50 animate-bounce">
          {levelNotification}
        </div>
      )}

      {/* Game Canvas */}
      <div
        className="relative w-full aspect-[2/1] max-w-[800px] flex items-center justify-center cursor-pointer overflow-hidden touch-none"
        onClick={handleJump}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-contain block"
        />

        {/* Game Over Modal Overlay */}
        <GameOverModal
          isOpen={gameState === "GAME_OVER"}
          score={score}
          highScore={highScore}
          isNewBest={isNewBest}
          userRank={userRank}
          user={user}
          onPlayAgain={startGame}
          onOpenLeaderboard={onOpenLeaderboard || (() => {})}
          onOpenAuthModal={onOpenAuthModal}
        />
      </div>

      {/* Mobile / Screen Jump Bar */}
      <div className="w-full p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-3 z-10">
        <div className="text-[11px] text-slate-400 flex items-center gap-2">
          <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300">
            SPACE
          </kbd>
          <span>or Click to Jump • Double Jump enabled</span>
        </div>

        <button
          type="button"
          id="snapdash-jump-btn"
          onClick={handleJump}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 active:scale-95 transition-all"
        >
          <ArrowUp className="w-4 h-4" />
          <span>{gameState === "READY" ? "LAUNCH" : "JUMP"}</span>
        </button>
      </div>
    </div>
  );
};
