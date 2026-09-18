import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import {
  DollarSign,
  ClipboardCheck,
  Clock,
  TrendingUp,
  Wallet,
  Target,
  Calendar
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { getEarnings, type EarningsEntry } from '@/lib/api';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  color: string;
  delay: number;
}

function StatCard({ icon: Icon, label, value, subValue, color, delay }: StatCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 30, scale: 0.9 },
        { 
          opacity: 1, 
          y: 0, 
          scale: 1, 
          duration: 0.8, 
          delay,
          ease: 'power3.out'
        }
      );
    }
  }, [delay]);

  return (
    <Card 
      ref={cardRef}
      className="glass-card p-6 hover:scale-105 transition-all duration-500 group cursor-pointer"
      style={{ 
        boxShadow: `0 0 30px ${color}20`,
        borderColor: `${color}30`
      }}
    >
      <div className="flex items-start justify-between">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        {subValue && (
          <span className="text-xs font-medium text-white/40">{subValue}</span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-heading font-bold text-white">{value}</p>
        <p className="text-sm text-white/60 mt-1">{label}</p>
      </div>
    </Card>
  );
}

function FluidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const colors = ['#7F56D9', '#14B8A6', '#3B82F6'];
    const blobs = colors.map((color, i) => ({
      color,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: 200 + Math.random() * 200,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      phase: (i * Math.PI * 2) / 3,
    }));

    const animate = () => {
      time += 0.005;
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      blobs.forEach((blob) => {
        blob.x += blob.vx;
        blob.y += blob.vy;

        if (blob.x < -blob.radius) blob.x = canvas.width + blob.radius;
        if (blob.x > canvas.width + blob.radius) blob.x = -blob.radius;
        if (blob.y < -blob.radius) blob.y = canvas.height + blob.radius;
        if (blob.y > canvas.height + blob.radius) blob.y = -blob.radius;

        const gradient = ctx.createRadialGradient(
          blob.x, blob.y, 0,
          blob.x, blob.y, blob.radius
        );
        gradient.addColorStop(0, `${blob.color}30`);
        gradient.addColorStop(0.5, `${blob.color}10`);
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full"
      style={{ filter: 'blur(60px)' }}
    />
  );
}

function computeStats(entries: EarningsEntry[]) {
  const confirmed = entries.filter((e) => e.status === 'confirmed');
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const totalCents = confirmed.reduce((sum, e) => sum + e.rewardCents, 0);
  const weeklyCents = confirmed
    .filter((e) => now - new Date(e.createdAt).getTime() <= 7 * day)
    .reduce((sum, e) => sum + e.rewardCents, 0);
  const monthlyCents = confirmed
    .filter((e) => now - new Date(e.createdAt).getTime() <= 30 * day)
    .reduce((sum, e) => sum + e.rewardCents, 0);
  const completedToday = confirmed.filter((e) => now - new Date(e.createdAt).getTime() <= day).length;
  return { totalCents, weeklyCents, monthlyCents, completedToday };
}

export function HeroDashboard({ userId }: { userId: string | null }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subheadingRef = useRef<HTMLParagraphElement>(null);
  const mainStatRef = useRef<HTMLDivElement>(null);
  const [animatedEarnings, setAnimatedEarnings] = useState(0);
  const [entries, setEntries] = useState<EarningsEntry[]>([]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await getEarnings(userId);
      setEntries(res.entries);
    } catch (err) {
      console.error('Failed to load earnings', err);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const stats = computeStats(entries);

  useEffect(() => {
    // Animate heading
    if (headingRef.current) {
      gsap.fromTo(
        headingRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }
      );
    }

    // Animate subheading
    if (subheadingRef.current) {
      gsap.fromTo(
        subheadingRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, delay: 0.2, ease: 'power3.out' }
      );
    }

    // Animate main stat
    if (mainStatRef.current) {
      gsap.fromTo(
        mainStatRef.current,
        { opacity: 0, scale: 0.8, rotateX: 30 },
        { opacity: 1, scale: 1, rotateX: 0, duration: 1, delay: 0.3, ease: 'back.out(1.7)' }
      );
    }

    // Animate earnings number
    const duration = 2000;
    const start = 0;
    const end = stats.totalCents / 100;
    const startTime = performance.now();

    const animateNumber = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * easeProgress;
      setAnimatedEarnings(current);

      if (progress < 1) {
        requestAnimationFrame(animateNumber);
      }
    };

    requestAnimationFrame(animateNumber);
  }, [stats.totalCents]);

  const statCards = [
    {
      icon: DollarSign,
      label: 'Total Earnings',
      value: `$${animatedEarnings.toFixed(2)}`,
      subValue: userId ? 'Network-confirmed only' : 'Sign in to load',
      color: '#7F56D9',
      delay: 0.4
    },
    {
      icon: ClipboardCheck,
      label: 'Completed Today',
      value: stats.completedToday.toString(),
      subValue: 'Confirmed by network',
      color: '#14B8A6',
      delay: 0.5
    },
    {
      icon: Calendar,
      label: 'Weekly Earnings',
      value: `$${(stats.weeklyCents / 100).toFixed(2)}`,
      subValue: 'Last 7 days',
      color: '#3B82F6',
      delay: 0.6
    },
    {
      icon: Clock,
      label: 'Monthly Earnings',
      value: `$${(stats.monthlyCents / 100).toFixed(2)}`,
      subValue: 'Last 30 days',
      color: '#F97316',
      delay: 0.7
    },
  ];

  const secondaryStats = [
    { icon: Wallet, label: 'Weekly Earnings', value: `$${(stats.weeklyCents / 100).toFixed(2)}` },
    { icon: TrendingUp, label: 'Monthly Earnings', value: `$${(stats.monthlyCents / 100).toFixed(2)}` },
    { icon: Target, label: 'Confirmed Payments', value: entries.filter((e) => e.status === 'confirmed').length.toString() },
  ];

  return (
    <section id="dashboard" className="relative min-h-screen pt-32 pb-20 overflow-hidden">
      {/* Fluid Background */}
      <FluidBackground />

      {/* Content */}
      <div className="relative z-10 section-container">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 
            ref={headingRef}
            className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-white mb-4"
          >
            Your Earnings{' '}
            <span className="bg-gradient-to-r from-brand-purple via-brand-teal to-brand-blue bg-clip-text text-transparent">
              Command Center
            </span>
          </h1>
          <p 
            ref={subheadingRef}
            className="text-lg text-white/60 max-w-2xl mx-auto"
          >
            Track, manage, and maximize your survey income across all platforms. 
            Your journey to smarter earnings starts here.
          </p>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          {statCards.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Secondary Stats */}
        <div 
          ref={mainStatRef}
          className="glass-card p-6 lg:p-8"
        >
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Large Earnings Display */}
            <div className="text-center lg:text-left">
              <p className="text-sm text-white/60 mb-2">Total Lifetime Earnings</p>
              <div className="flex items-baseline gap-2 justify-center lg:justify-start">
                <span className="text-5xl lg:text-7xl font-heading font-bold text-white">
                  ${animatedEarnings.toFixed(2)}
                </span>
                <span className="text-lg text-brand-teal font-medium">USD</span>
              </div>
              <div className="flex items-center gap-2 mt-2 justify-center lg:justify-start">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm text-white/60">Earnings updating in real-time</span>
              </div>
            </div>

            {/* Secondary Stats Grid */}
            <div className="grid grid-cols-3 gap-6 lg:gap-12">
              {secondaryStats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="text-center">
                    <Icon className="w-5 h-5 text-white/40 mx-auto mb-2" />
                    <p className="text-xl lg:text-2xl font-heading font-bold text-white">
                      {stat.value}
                    </p>
                    <p className="text-xs text-white/60 mt-1">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {!userId && (
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-xs text-white/40">
                Sign in above to load your real earnings ledger.
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button 
            onClick={() => document.getElementById('opportunities')?.scrollIntoView({ behavior: 'smooth' })}
            className="btn-primary flex items-center gap-2"
          >
            <ClipboardCheck className="w-5 h-5" />
            Find Surveys
          </button>
          <button 
            onClick={() => document.getElementById('tasks')?.scrollIntoView({ behavior: 'smooth' })}
            className="btn-secondary flex items-center gap-2"
          >
            <Clock className="w-5 h-5" />
            View Tasks
          </button>
        </div>
      </div>
    </section>
  );
}
