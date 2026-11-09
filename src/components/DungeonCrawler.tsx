import React, { useRef, useEffect, useState } from 'react';
import { CommanderCard } from '../game/types';
import { sound } from '../game/audio';
import { calculateDungeonSkillDamage } from '../game/combatEngine';
import { 
  Swords, 
  Flame, 
  Shield, 
  Zap, 
  Trophy, 
  RotateCcw, 
  Sparkles, 
  Gem, 
  Coins, 
  Heart,
  ChevronRight,
  Crosshair
} from 'lucide-react';

interface DungeonCrawlerProps {
  heroCard: CommanderCard;
  onDungeonVictory: (rewards: { gold: number; rubies: number; mana: number }) => void;
  onExit: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  atk: number;
  type: 'goblin' | 'hellhound' | 'boss';
  color: string;
  telegraphTimer: number; // for boss windup attack
  telegraphType?: 'circle' | 'cone';
  telegraphMax: number;
}

export const DungeonCrawler: React.FC<DungeonCrawlerProps> = ({
  heroCard,
  onDungeonVictory,
  onExit,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // High-level game state in React for UI overlays
  const [isStarted, setIsStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [dungeonWave, setDungeonWave] = useState(1);
  const [playerHp, setPlayerHp] = useState(100);
  const [bossHpPercent, setBossHpPercent] = useState<number | null>(null);

  // Skill cooldowns (visual readouts in UI)
  const [cd1, setCd1] = useState(0);
  const [cd2, setCd2] = useState(0);
  const [cd3, setCd3] = useState(0);

  // Virtual Joystick state for touch
  const [touchJoystickActive, setTouchJoystickActive] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const touchStartPos = useRef({ x: 0, y: 0 });
  const touchVector = useRef({ x: 0, y: 0 });

  // References for pure 60fps simulation state (never re-rendered by React)
  const sim = useRef({
    px: 400,
    py: 450,
    vx: 0,
    vy: 0,
    hp: 100,
    maxHp: 100,
    isDodging: false,
    dodgeTimer: 0,
    attackCooldown: 0,
    skill1Cd: 0,
    skill2Cd: 0,
    skill3Cd: 0,
    shake: 0,
    hitstop: 0,
    heldKeys: new Set<string>(),
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    enemies: [] as Enemy[],
    wave: 1,
    maxWave: 3,
    victoryTriggered: false,
  });

  // Spawn enemy waves
  const spawnWave = (waveNum: number) => {
    sim.current.wave = waveNum;
    setDungeonWave(waveNum);
    const enemies: Enemy[] = [];

    if (waveNum === 1) {
      // 4 goblins
      for (let i = 0; i < 4; i++) {
        enemies.push({
          id: Math.random(),
          x: 200 + i * 140,
          y: 120 + (i % 2) * 50,
          radius: 18,
          hp: 75,
          maxHp: 75,
          speed: 85,
          atk: 10,
          type: 'goblin',
          color: '#ef4444',
          telegraphTimer: 0,
          telegraphMax: 0,
        });
      }
    } else if (waveNum === 2) {
      // 3 Hellhounds + 2 Goblins
      for (let i = 0; i < 3; i++) {
        enemies.push({
          id: Math.random(),
          x: 220 + i * 180,
          y: 100,
          radius: 22,
          hp: 120,
          maxHp: 120,
          speed: 120,
          atk: 15,
          type: 'hellhound',
          color: '#f97316',
          telegraphTimer: 0,
          telegraphMax: 0,
        });
      }
      for (let i = 0; i < 2; i++) {
        enemies.push({
          id: Math.random(),
          x: 250 + i * 260,
          y: 200,
          radius: 18,
          hp: 90,
          maxHp: 90,
          speed: 90,
          atk: 12,
          type: 'goblin',
          color: '#ef4444',
          telegraphTimer: 0,
          telegraphMax: 0,
        });
      }
    } else {
      // Wave 3: Gorgon Wyrm Titan Boss!
      enemies.push({
        id: Math.random(),
        x: 400,
        y: 140,
        radius: 46,
        hp: 750,
        maxHp: 750,
        speed: 60,
        atk: 28,
        type: 'boss',
        color: '#dc2626',
        telegraphTimer: 0,
        telegraphMax: 2.2, // 2.2s windup telegraph
        telegraphType: 'circle',
      });
      // 2 escort fiends
      enemies.push({
        id: Math.random(),
        x: 240,
        y: 160,
        radius: 20,
        hp: 110,
        maxHp: 110,
        speed: 95,
        atk: 14,
        type: 'hellhound',
        color: '#f97316',
        telegraphTimer: 0,
        telegraphMax: 0,
      });
      enemies.push({
        id: Math.random(),
        x: 560,
        y: 160,
        radius: 20,
        hp: 110,
        maxHp: 110,
        speed: 95,
        atk: 14,
        type: 'hellhound',
        color: '#f97316',
        telegraphTimer: 0,
        telegraphMax: 0,
      });
    }

    sim.current.enemies = enemies;
  };

  // Trigger basic melee slash attack
  const handleAttack = () => {
    if (sim.current.attackCooldown > 0 || sim.current.hp <= 0) return;
    sim.current.attackCooldown = 0.28;
    sound.playClash();

    // Damage enemies in forward arc
    const range = 85;
    let hitAny = false;

    sim.current.enemies.forEach((enemy) => {
      const dx = enemy.x - sim.current.px;
      const dy = enemy.y - sim.current.py;
      const dist = Math.hypot(dx, dy);

      if (dist < range + enemy.radius) {
        hitAny = true;
        const dmg = Math.floor(45 + Math.random() * 20);
        enemy.hp -= dmg;

        // Visual hitstop & camera shake
        sim.current.hitstop = 0.05;
        sim.current.shake = 6;

        // Floating damage
        sim.current.floatingTexts.push({
          x: enemy.x + (Math.random() - 0.5) * 20,
          y: enemy.y - 15,
          text: `-${dmg}`,
          color: '#fbbf24',
          life: 0.8,
        });

        // Blood / spark particles
        for (let p = 0; p < 8; p++) {
          sim.current.particles.push({
            x: enemy.x,
            y: enemy.y,
            vx: (Math.random() - 0.5) * 160,
            vy: (Math.random() - 0.5) * 160,
            life: 0.4,
            maxLife: 0.4,
            color: '#f87171',
            size: 3 + Math.random() * 3,
          });
        }
      }
    });

    if (hitAny) {
      sound.playHit();
    }
  };

  // Trigger Skill 1 (Solar Slash / Cleave)
  const handleSkill1 = () => {
    if (sim.current.skill1Cd > 0 || sim.current.hp <= 0) return;
    sim.current.skill1Cd = 5;
    setCd1(5);
    sound.playMagic();

    sim.current.shake = 12;

    // Massive 360 AoE burst
    sim.current.enemies.forEach((enemy) => {
      const dist = Math.hypot(enemy.x - sim.current.px, enemy.y - sim.current.py);
      if (dist < 160) {
        const { damage, isCrit } = calculateDungeonSkillDamage('skill_1', heroCard, 100);
        enemy.hp -= damage;
        sim.current.floatingTexts.push({
          x: enemy.x,
          y: enemy.y - 20,
          text: isCrit ? `CRIT -${damage}` : `-${damage}`,
          color: isCrit ? '#facc15' : '#fef08a',
          life: 1.0,
        });
      }
    });

    // Radiant particles
    for (let p = 0; p < 24; p++) {
      const angle = (p / 24) * Math.PI * 2;
      sim.current.particles.push({
        x: sim.current.px,
        y: sim.current.py,
        vx: Math.cos(angle) * 220,
        vy: Math.sin(angle) * 220,
        life: 0.6,
        maxLife: 0.6,
        color: '#fef08a',
        size: 5,
      });
    }
  };

  // Trigger Skill 2 (Aegis Shield / Absorb)
  const handleSkill2 = () => {
    if (sim.current.skill2Cd > 0 || sim.current.hp <= 0) return;
    sim.current.skill2Cd = 8;
    setCd2(8);
    sound.playFanfare();

    sim.current.hp = Math.min(sim.current.maxHp, sim.current.hp + 35);
    setPlayerHp(sim.current.hp);

    sim.current.floatingTexts.push({
      x: sim.current.px,
      y: sim.current.py - 25,
      text: '+35 HP HEALED',
      color: '#4ade80',
      life: 1.0,
    });
  };

  // Trigger Skill 3 (Dragon Flame Roar)
  const handleSkill3 = () => {
    if (sim.current.skill3Cd > 0 || sim.current.hp <= 0) return;
    sim.current.skill3Cd = 7;
    setCd3(7);
    sound.playMagic();
    sim.current.shake = 14;

    sim.current.enemies.forEach((enemy) => {
      const { damage, isCrit } = calculateDungeonSkillDamage('skill_3', heroCard, 75);
      enemy.hp -= damage;
      sim.current.floatingTexts.push({
        x: enemy.x,
        y: enemy.y - 25,
        text: isCrit ? `INFERNO -${damage}` : `BURN -${damage}`,
        color: '#f97316',
        life: 1.0,
      });
    });
  };

  // Dodge Roll (Space or Tap)
  const handleDodge = () => {
    if (sim.current.dodgeTimer > 0 || sim.current.hp <= 0) return;
    sim.current.isDodging = true;
    sim.current.dodgeTimer = 0.45;
    sound.playClick(900);
  };

  // Keyboard input listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      sim.current.heldKeys.add(e.code);

      if (e.code === 'Space') {
        e.preventDefault();
        handleDodge();
      }
      if (e.code === 'KeyJ' || e.code === 'KeyZ') {
        e.preventDefault();
        handleAttack();
      }
      if (e.code === 'Digit1' || e.code === 'KeyK') {
        handleSkill1();
      }
      if (e.code === 'Digit2' || e.code === 'KeyL') {
        handleSkill2();
      }
      if (e.code === 'Digit3' || e.code === 'KeyI') {
        handleSkill3();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      sim.current.heldKeys.delete(e.code);
    };

    const onBlur = () => {
      sim.current.heldKeys.clear();
      touchVector.current = { x: 0, y: 0 };
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Main 60fps Game Loop
  useEffect(() => {
    if (!isStarted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();
    spawnWave(1);

    const loop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05); // Clamped delta time per Game Craft Guidelines

      const s = sim.current;

      // Handle hitstop
      if (s.hitstop > 0) {
        s.hitstop -= dt;
      } else {
        // Decrement cooldowns
        if (s.attackCooldown > 0) s.attackCooldown -= dt;
        if (s.dodgeTimer > 0) {
          s.dodgeTimer -= dt;
          if (s.dodgeTimer <= 0) s.isDodging = false;
        }
        if (s.skill1Cd > 0) {
          s.skill1Cd = Math.max(0, s.skill1Cd - dt);
          setCd1(Math.ceil(s.skill1Cd));
        }
        if (s.skill2Cd > 0) {
          s.skill2Cd = Math.max(0, s.skill2Cd - dt);
          setCd2(Math.ceil(s.skill2Cd));
        }
        if (s.skill3Cd > 0) {
          s.skill3Cd = Math.max(0, s.skill3Cd - dt);
          setCd3(Math.ceil(s.skill3Cd));
        }
        if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 25);

        // Player Movement computation
        let moveX = 0;
        let moveY = 0;

        if (s.heldKeys.has('KeyA') || s.heldKeys.has('ArrowLeft')) moveX -= 1;
        if (s.heldKeys.has('KeyD') || s.heldKeys.has('ArrowRight')) moveX += 1;
        if (s.heldKeys.has('KeyW') || s.heldKeys.has('ArrowUp')) moveY -= 1;
        if (s.heldKeys.has('KeyS') || s.heldKeys.has('ArrowDown')) moveY += 1;

        // Apply touch joystick input
        if (touchVector.current.x !== 0 || touchVector.current.y !== 0) {
          moveX = touchVector.current.x;
          moveY = touchVector.current.y;
        }

        const len = Math.hypot(moveX, moveY);
        const baseSpeed = s.isDodging ? 380 : 210;

        if (len > 0.1) {
          s.px += (moveX / len) * baseSpeed * dt;
          s.py += (moveY / len) * baseSpeed * dt;
        }

        // Clamp to dungeon room bounds (800x560)
        s.px = Math.max(40, Math.min(760, s.px));
        s.py = Math.max(60, Math.min(520, s.py));

        // Update enemies
        let bossFound = false;

        s.enemies.forEach((enemy) => {
          if (enemy.hp <= 0) return;

          if (enemy.type === 'boss') {
            bossFound = true;
            setBossHpPercent(Math.max(0, (enemy.hp / enemy.maxHp) * 100));

            // Boss telegraph attack sequence
            enemy.telegraphTimer += dt;
            if (enemy.telegraphTimer >= enemy.telegraphMax) {
              // Boss attack unleashes!
              enemy.telegraphTimer = 0;
              s.shake = 16;
              sound.playClash();

              // Check if player in damage radius
              const distToBoss = Math.hypot(enemy.x - s.px, enemy.y - s.py);
              if (distToBoss < 180 && !s.isDodging) {
                s.hp -= 25;
                setPlayerHp(Math.max(0, s.hp));
                s.floatingTexts.push({
                  x: s.px,
                  y: s.py - 20,
                  text: '-25 HP HIT',
                  color: '#ef4444',
                  life: 0.9,
                });
                sound.playHit();
              }
            }
          }

          // Move enemy toward player
          const dx = s.px - enemy.x;
          const dy = s.py - enemy.y;
          const dist = Math.hypot(dx, dy);

          if (dist > enemy.radius + 15) {
            enemy.x += (dx / dist) * enemy.speed * dt;
            enemy.y += (dy / dist) * enemy.speed * dt;
          } else {
            // Melee contact damage
            if (!s.isDodging && Math.random() < 0.03) {
              s.hp -= enemy.atk;
              setPlayerHp(Math.max(0, s.hp));
              sound.playHit();
              s.shake = 6;
              s.floatingTexts.push({
                x: s.px,
                y: s.py - 20,
                text: `-${enemy.atk}`,
                color: '#ef4444',
                life: 0.6,
              });
            }
          }
        });

        if (!bossFound && s.wave === 3) {
          setBossHpPercent(null);
        }

        // Filter dead enemies
        const aliveEnemies = s.enemies.filter((e) => e.hp > 0);
        s.enemies = aliveEnemies;

        // Wave progression / Victory
        if (aliveEnemies.length === 0 && !s.victoryTriggered) {
          if (s.wave < s.maxWave) {
            spawnWave(s.wave + 1);
            sound.playFanfare();
          } else {
            s.victoryTriggered = true;
            setIsVictory(true);
            sound.playFanfare();
            onDungeonVictory({ gold: 2400, rubies: 75, mana: 500 });
          }
        }

        // Game Over condition
        if (s.hp <= 0 && !isGameOver) {
          setIsGameOver(true);
          sound.playHit();
        }

        // Update particles
        s.particles.forEach((p) => {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
        });
        s.particles = s.particles.filter((p) => p.life > 0);

        // Update floating text
        s.floatingTexts.forEach((t) => {
          t.y -= 30 * dt;
          t.life -= dt;
        });
        s.floatingTexts = s.floatingTexts.filter((t) => t.life > 0);
      }

      // RENDER
      ctx.save();

      // Screen shake offset
      if (s.shake > 0) {
        const sx = (Math.random() - 0.5) * s.shake;
        const sy = (Math.random() - 0.5) * s.shake;
        ctx.translate(sx, sy);
      }

      // Background dungeon floor
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 800, 560);

      // Floor stone tiles pattern
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 800; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 560);
        ctx.stroke();
      }
      for (let y = 0; y < 560; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(800, y);
        ctx.stroke();
      }

      // Draw Boss telegraph attack zone (Red circle warning)
      s.enemies.forEach((enemy) => {
        if (enemy.type === 'boss' && enemy.telegraphTimer > 0) {
          const progress = enemy.telegraphTimer / enemy.telegraphMax;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, 180, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(239, 68, 68, ${0.1 + progress * 0.25})`;
          ctx.fill();
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Expanding inner indicator
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, 180 * progress, 0, Math.PI * 2);
          ctx.strokeStyle = '#f87171';
          ctx.stroke();
        }
      });

      // Draw enemies
      s.enemies.forEach((enemy) => {
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fillStyle = enemy.color;
        ctx.fill();
        ctx.strokeStyle = '#450a0a';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Enemy HP bar above head
        const barWidth = enemy.radius * 2.2;
        const barHeight = 4;
        const hpRatio = enemy.hp / enemy.maxHp;

        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 10, barWidth, barHeight);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 10, barWidth * hpRatio, barHeight);
      });

      // Draw Player Hero
      ctx.save();
      ctx.translate(s.px, s.py);

      // Hero Aura / Shadow
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fillStyle = s.isDodging ? 'rgba(56, 189, 248, 0.4)' : 'rgba(234, 179, 8, 0.3)';
      ctx.fill();

      // Hero Body
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fillStyle = s.isDodging ? '#38bdf8' : '#eab308';
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Hero Sword indicator
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(14, -4, 18, 8);
      ctx.restore();

      // Draw particles
      s.particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // Draw floating combat numbers
      s.floatingTexts.forEach((t) => {
        ctx.font = 'bold 15px monospace';
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
      });

      ctx.restore();

      if (!isGameOver && !isVictory) {
        animId = requestAnimationFrame(loop);
      }
    };

    animId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animId);
  }, [isStarted, isGameOver, isVictory, onDungeonVictory]);

  // Touch Virtual Joystick Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchJoystickActive(true);
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    setJoystickPos({ x: 0, y: 0 });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchJoystickActive) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;
    const dist = Math.hypot(dx, dy);
    const maxRadius = 45;

    if (dist > maxRadius) {
      setJoystickPos({
        x: (dx / dist) * maxRadius,
        y: (dy / dist) * maxRadius,
      });
      touchVector.current = { x: dx / dist, y: dy / dist };
    } else {
      setJoystickPos({ x: dx, y: dy });
      touchVector.current = { x: dx / maxRadius, y: dy / maxRadius };
    }
  };

  const handleTouchEnd = () => {
    setTouchJoystickActive(false);
    setJoystickPos({ x: 0, y: 0 });
    touchVector.current = { x: 0, y: 0 };
  };

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] pt-14 pb-16 overflow-hidden bg-slate-950 flex flex-col items-center justify-center p-2 sm:p-4 select-none">
      {/* Intro Briefing Modal if not started */}
      {!isStarted && (
        <div className="relative z-30 max-w-lg w-full bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-4 shadow">
            <Swords className="w-8 h-8" />
          </div>

          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Action Raid Dungeon
          </span>
          <h2 className="text-2xl font-black text-slate-100 font-cinzel my-1">
            Catacombs of the Gorgon Wyrm
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto mb-5">
            Command <strong>{heroCard.name}</strong> ({heroCard.title}) in real-time combat. Slay demonic waves, dodge boss telegraph shockwaves, and conquer subterranean relic vaults.
          </p>

          <div className="grid grid-cols-2 gap-3 text-left text-xs bg-slate-950 p-3.5 rounded-2xl border border-slate-800 mb-6 font-mono-nums">
            <div>
              <span className="text-slate-400 text-[10px] block">Hero Vanguard</span>
              <strong className="text-amber-300 font-bold">{heroCard.name}</strong>
              <div className="text-[10px] text-slate-400">ATK {heroCard.atk} · DEF {heroCard.def}</div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Spoils of Victory</span>
              <strong className="text-emerald-400 font-bold">2,400 Gold · 75 Rubies</strong>
              <div className="text-[10px] text-purple-400">Ancient Skill Tome</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onExit}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer"
            >
              Return to Realm
            </button>
            <button
              onClick={() => {
                sound.playFanfare();
                setIsStarted(true);
              }}
              className="flex-2 py-3 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              Enter Dungeon Raid
            </button>
          </div>
        </div>
      )}

      {/* Active 60fps Canvas Playfield */}
      {isStarted && (
        <div className="relative w-full max-w-4xl h-[560px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
          {/* Top In-Dungeon Status Overlay */}
          <div className="pointer-events-none absolute top-3 left-4 right-4 z-20 flex items-center justify-between">
            {/* Player Health Bar */}
            <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-mono-nums">
                  HP: <strong className="text-rose-400">{Math.max(0, playerHp)}</strong> / 100
                </span>
                <div className="w-28 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-0.5">
                  <div
                    className="bg-rose-500 h-full transition-all duration-150"
                    style={{ width: `${Math.max(0, playerHp)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Wave Counter */}
            <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-bold text-amber-400 font-mono-nums">
              Chamber Wave {dungeonWave} / 3
            </div>

            {/* Boss Bar if active */}
            {bossHpPercent !== null && (
              <div className="flex items-center gap-2 bg-red-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-red-700/60">
                <Flame className="w-4 h-4 text-red-500 animate-pulse" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-red-200 font-mono-nums font-bold">
                    Gorgon Wyrm Titan
                  </span>
                  <div className="w-32 bg-slate-900 h-2 rounded-full overflow-hidden mt-0.5 border border-red-900">
                    <div
                      className="bg-gradient-to-r from-red-600 to-amber-500 h-full transition-all duration-150"
                      style={{ width: `${bossHpPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dedicated Canvas Mount */}
          <canvas
            ref={canvasRef}
            width={800}
            height={560}
            className="w-full h-full object-contain"
          />

          {/* Touch Joystick on Bottom-Left */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            className="absolute bottom-6 left-6 z-20 w-28 h-28 rounded-full bg-slate-900/50 border border-slate-700/70 backdrop-blur-sm flex items-center justify-center touch-none sm:hidden"
          >
            <div
              style={{
                transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
              }}
              className="w-12 h-12 rounded-full bg-amber-500/80 border-2 border-amber-300 shadow-lg pointer-events-none transition-transform"
            />
          </div>

          {/* Touch Action Buttons on Bottom-Right */}
          <div className="absolute bottom-4 right-4 z-20 flex items-end gap-2 sm:hidden">
            <button
              onClick={handleDodge}
              className="w-12 h-12 rounded-full bg-sky-600/90 active:bg-sky-500 text-white font-bold text-xs flex items-center justify-center shadow-lg border border-sky-400/50 cursor-pointer"
            >
              Dodge
            </button>
            <button
              onClick={handleAttack}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 active:scale-95 text-slate-950 font-black text-sm flex items-center justify-center shadow-xl border-2 border-amber-300 cursor-pointer"
            >
              <Swords className="w-7 h-7" />
            </button>
          </div>

          {/* Desktop Skill Bar (Bottom Center) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={handleAttack}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow active:scale-95 transition-all cursor-pointer"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Strike [J]</span>
            </button>
            <button
              disabled={cd1 > 0}
              onClick={handleSkill1}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow active:scale-95 transition-all cursor-pointer ${
                cd1 > 0 ? 'bg-slate-800 text-slate-500' : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Solar Burst {cd1 > 0 ? `(${cd1}s)` : '[1]'}</span>
            </button>
            <button
              disabled={cd2 > 0}
              onClick={handleSkill2}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow active:scale-95 transition-all cursor-pointer ${
                cd2 > 0 ? 'bg-slate-800 text-slate-500' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Aegis {cd2 > 0 ? `(${cd2}s)` : '[2]'}</span>
            </button>
            <button
              disabled={cd3 > 0}
              onClick={handleSkill3}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow active:scale-95 transition-all cursor-pointer ${
                cd3 > 0 ? 'bg-slate-800 text-slate-500' : 'bg-purple-600 hover:bg-purple-500 text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Inferno {cd3 > 0 ? `(${cd3}s)` : '[3]'}</span>
            </button>
            <button
              onClick={handleDodge}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow active:scale-95 transition-all cursor-pointer"
            >
              <span>Roll [Space]</span>
            </button>
          </div>

          {/* Victory Modal */}
          {isVictory && (
            <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
              <div className="max-w-md w-full bg-slate-900 border border-amber-500/80 rounded-3xl p-6 text-center shadow-2xl animate-in zoom-in-95">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 mx-auto mb-3 shadow-lg">
                  <Trophy className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-amber-300 font-cinzel">Dungeon Conquered!</h3>
                <p className="text-xs text-slate-300 mt-1 mb-4">
                  The Gorgon Wyrm Titan has fallen. The subterranean relic vaults are unlocked.
                </p>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 mb-5 text-xs font-mono-nums grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <span className="text-slate-400 text-[10px] block">Gold</span>
                    <strong className="text-yellow-400 font-bold">+2,400</strong>
                  </div>
                  <div className="text-center">
                    <span className="text-slate-400 text-[10px] block">Rubies</span>
                    <strong className="text-rose-400 font-bold">+75</strong>
                  </div>
                  <div className="text-center">
                    <span className="text-slate-400 text-[10px] block">Aether</span>
                    <strong className="text-purple-400 font-bold">+500</strong>
                  </div>
                </div>

                <button
                  onClick={onExit}
                  className="w-full py-3 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg active:scale-95 cursor-pointer"
                >
                  Claim Spoils & Return
                </button>
              </div>
            </div>
          )}

          {/* Game Over Modal */}
          {isGameOver && (
            <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
              <div className="max-w-md w-full bg-slate-900 border border-red-500/80 rounded-3xl p-6 text-center shadow-2xl animate-in zoom-in-95">
                <h3 className="text-2xl font-black text-red-400 font-cinzel">Defeat in the Abyss</h3>
                <p className="text-xs text-slate-300 mt-1 mb-4">
                  Your hero commander was overwhelmed by dungeon fiends. Retreat and regroup.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={onExit}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer"
                  >
                    Retreat
                  </button>
                  <button
                    onClick={() => {
                      sim.current.hp = 100;
                      sim.current.victoryTriggered = false;
                      setPlayerHp(100);
                      setIsGameOver(false);
                      spawnWave(1);
                    }}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
