import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, User, AlertCircle, LogIn, Truck, Calendar, Sun, Moon, Eye, EyeOff, ShieldCheck, TrendingUp, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getTodayShamsi, getShamsiWeekday } from '../utils/shamsi';

// ============================================================
// IMPROVED, MORE REALISTIC SNACK ICONS (SVG)
// ============================================================

const PeanutIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 60 60" className={className} fill="none">
    <defs>
      <radialGradient id="pg1" cx="35%" cy="30%" r="60%">
        <stop offset="0%" stopColor="#E8B87A" />
        <stop offset="60%" stopColor="#C68E4E" />
        <stop offset="100%" stopColor="#A06B32" />
      </radialGradient>
      <radialGradient id="pg2" cx="65%" cy="70%" r="50%">
        <stop offset="0%" stopColor="#D4A86A" />
        <stop offset="100%" stopColor="#8B5E2E" />
      </radialGradient>
      <filter id="pshadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="2" dy="3" stdDeviation="4" floodOpacity="0.3" floodColor="#3D2B1A" />
      </filter>
    </defs>
    <g filter="url(#pshadow)">
      <path d="M30 8C18 8 10 18 10 28c0 6 3 10 4 14 1 6 5 10 10 10 5 0 9-4 10-10 1-4 3-8 3-14 0-10-8-20-20-20z" fill="url(#pg1)" />
      <path d="M30 8C18 8 10 18 10 28c0 6 3 10 4 14 1 6 5 10 10 10V8z" fill="url(#pg2)" opacity="0.6" />
      <path d="M18 20c2-4 6-6 10-6M22 34c1-4 5-6 9-5M26 44c2-3 5-4 8-3" stroke="#7A5428" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M14 28c1-3 4-5 7-5M20 40c2-3 5-4 8-3" stroke="#A06B32" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <ellipse cx="24" cy="22" rx="4" ry="3" fill="white" opacity="0.15" />
    </g>
  </svg>
);

const CornIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 56 64" className={className} fill="none">
    <defs>
      <linearGradient id="cg1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#F5D042" />
        <stop offset="60%" stopColor="#EAB308" />
        <stop offset="100%" stopColor="#C98A0E" />
      </linearGradient>
      <radialGradient id="cg2" cx="40%" cy="40%" r="50%">
        <stop offset="0%" stopColor="#FDE68A" />
        <stop offset="100%" stopColor="#D97706" />
      </radialGradient>
      <filter id="cshadow" x="-5%" y="-5%" width="120%" height="120%">
        <feDropShadow dx="1" dy="2" stdDeviation="3" floodOpacity="0.25" floodColor="#4A3A1A" />
      </filter>
    </defs>
    <g filter="url(#cshadow)">
      <path d="M28 6c6 3 9 10 10 18 1 9 0 18-10 22-10-4-11-13-10-22 0-8 4-15 10-18z" fill="url(#cg1)" />
      <ellipse cx="20" cy="17" rx="4.5" ry="3.5" fill="url(#cg2)" stroke="#B87C0B" strokeWidth="0.8" />
      <ellipse cx="28" cy="13" rx="4.5" ry="3.5" fill="url(#cg2)" stroke="#B87C0B" strokeWidth="0.8" />
      <ellipse cx="36" cy="17" rx="4.5" ry="3.5" fill="url(#cg2)" stroke="#B87C0B" strokeWidth="0.8" />
      <ellipse cx="18" cy="26" rx="4.5" ry="3.5" fill="url(#cg2)" stroke="#B87C0B" strokeWidth="0.8" />
      <ellipse cx="28" cy="22" rx="4.5" ry="3.5" fill="url(#cg2)" stroke="#B87C0B" strokeWidth="0.8" />
      <ellipse cx="38" cy="26" rx="4.5" ry="3.5" fill="url(#cg2)" stroke="#B87C0B" strokeWidth="0.8" />
      <ellipse cx="20" cy="35" rx="4.5" ry="3.5" fill="url(#cg2)" stroke="#B87C0B" strokeWidth="0.8" />
      <ellipse cx="28" cy="31" rx="4.5" ry="3.5" fill="url(#cg2)" stroke="#B87C0B" strokeWidth="0.8" />
      <ellipse cx="36" cy="35" rx="4.5" ry="3.5" fill="url(#cg2)" stroke="#B87C0B" strokeWidth="0.8" />
      <ellipse cx="28" cy="41" rx="4" ry="3" fill="url(#cg2)" stroke="#B87C0B" strokeWidth="0.8" />
      <path d="M14 10c-4-2-8 0-9 5 5 2 8-1 9-5zM42 10c4-2 8 0 9 5-5 2-8-1-9-5z" fill="#4D7C0F" />
      <path d="M12 6c-3-1-6 1-7 4 3 1 6 0 7-4zM44 6c3-1 6 1 7 4-3 1-6 0-7-4z" fill="#3B6A0A" />
    </g>
  </svg>
);

const SeedIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 32 52" className={className} fill="none">
    <defs>
      <linearGradient id="sg1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#F5EDE0" />
        <stop offset="50%" stopColor="#E3D7C0" />
        <stop offset="100%" stopColor="#C4B49C" />
      </linearGradient>
      <linearGradient id="sg2" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#D6CBB0" />
        <stop offset="100%" stopColor="#A89880" />
      </linearGradient>
      <filter id="sshadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="1" dy="3" stdDeviation="3" floodOpacity="0.2" floodColor="#2B2B28" />
      </filter>
    </defs>
    <g filter="url(#sshadow)">
      <path d="M16 4c5 4 8 12 7 20-1 6-3 12-7 18-4-6-6-12-7-18-1-8 2-16 7-20z" fill="url(#sg1)" />
      <path d="M16 4c5 4 8 12 7 20-1 6-3 12-7 18V4z" fill="url(#sg2)" opacity="0.5" />
      <path d="M16 10v32M12 18l4-3 4 3M12 28l4-3 4 3M12 38l4-3 4 3" stroke="#8A7A66" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <ellipse cx="13" cy="16" rx="2" ry="3" fill="white" opacity="0.2" />
    </g>
  </svg>
);

const AlmondIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 44 52" className={className} fill="none">
    <defs>
      <radialGradient id="ag1" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#D9A87C" />
        <stop offset="60%" stopColor="#BF8550" />
        <stop offset="100%" stopColor="#8F5E2E" />
      </radialGradient>
      <radialGradient id="ag2" cx="70%" cy="70%" r="50%">
        <stop offset="0%" stopColor="#C9955E" />
        <stop offset="100%" stopColor="#7A4C24" />
      </radialGradient>
      <filter id="ashadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.3" floodColor="#3D2415" />
      </filter>
    </defs>
    <g filter="url(#ashadow)">
      <path d="M22 4c-8 6-12 16-10 26 1.5 9 5 15 10 16 5-1 8.5-7 10-16 2-10-2-20-10-26z" fill="url(#ag1)" />
      <path d="M22 4c-8 6-12 16-10 26 1.5 9 5 15 10 16V4z" fill="url(#ag2)" opacity="0.6" />
      <path d="M16 16c3-3 8-3 11 0M14 28c4-3 9-3 13 0" stroke="#6A4220" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
      <path d="M18 36c2-2 6-2 8 0" stroke="#6A4220" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <ellipse cx="17" cy="16" rx="4" ry="3" fill="white" opacity="0.15" />
    </g>
  </svg>
);

const SnackBagIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 56 64" className={className} fill="none">
    <defs>
      <linearGradient id="b1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#E8692C" />
        <stop offset="50%" stopColor="#D94F1A" />
        <stop offset="100%" stopColor="#B83A12" />
      </linearGradient>
      <linearGradient id="b2" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#F2A33D" />
        <stop offset="100%" stopColor="#E88A1A" />
      </linearGradient>
      <linearGradient id="b3" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FDF3E3" />
        <stop offset="100%" stopColor="#F5E8D0" />
      </linearGradient>
      <filter id="bshadow" x="-5%" y="-5%" width="120%" height="120%">
        <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.25" floodColor="#2A1A0A" />
      </filter>
    </defs>
    <g filter="url(#bshadow)">
      <path d="M10 18l2-10 6-5h20l6 5 2 10v28c0 5-4 9-9 9H19c-5 0-9-4-9-9V18z" fill="url(#b1)" />
      <path d="M12 10l6-5h20l6 5-3 4H15l-3-4z" fill="url(#b2)" />
      <circle cx="28" cy="32" r="10" fill="url(#b3)" stroke="#D94F1A" strokeWidth="1.5" />
      <path d="M22 28l4 4 8-7" stroke="#E8692C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 22c2-1 4-1 6 0M14 40c2-1 4-1 6 0M38 22c2-1 4-1 6 0M38 40c2-1 4-1 6 0" stroke="#B83A12" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <path d="M12 28h2M12 34h2M42 28h2M42 34h2" stroke="#B83A12" strokeWidth="1" opacity="0.3" />
    </g>
  </svg>
);

// ============================================================
// FLOATING SNACK COMPONENT (IMPROVED ANIMATION)
// ============================================================

const FloatingSnack = ({
  icon: Icon,
  style,
  size,
  duration = 7,
  delay = 0,
  blurPx = 0,
  opacity = 0.85,
  rotateRange = 12,
  yRange = 18
}: {
  icon: React.FC<{ className?: string }>;
  style: React.CSSProperties;
  size: number;
  duration?: number;
  delay?: number;
  blurPx?: number;
  opacity?: number;
  rotateRange?: number;
  yRange?: number;
}) => (
  <motion.div
    className="absolute pointer-events-none select-none"
    style={{ ...style, width: size, height: size, filter: blurPx ? `blur(${blurPx}px)` : undefined, opacity }}
    initial={{ y: 0, opacity: 0, rotate: 0 }}
    animate={{
      y: [0, -yRange, 0],
      rotate: [-rotateRange, rotateRange, -rotateRange],
      opacity: opacity
    }}
    transition={{
      y: { duration, repeat: Infinity, ease: "easeInOut", delay },
      rotate: { duration: duration * 1.3, repeat: Infinity, ease: "easeInOut", delay },
      opacity: { duration: 0.8, delay }
    }}
  >
    <Icon className="w-full h-full drop-shadow-xl" />
  </motion.div>
);

// ============================================================
// MAIN LOGIN SCREEN COMPONENT
// ============================================================

export const LoginScreen = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const shamsiDate = getTodayShamsi();
  const weekday = getShamsiWeekday(shamsiDate.year, shamsiDate.month, shamsiDate.day);
  const formattedDate = `${weekday} ${shamsiDate.day} ${shamsiDate.monthName} ${shamsiDate.year}`;

  const currentHour = new Date().getHours();
  let greeting = "";
  let isNight = false;
  if (currentHour >= 5 && currentHour < 12) {
    greeting = "صبح بخیر";
  } else if (currentHour >= 12 && currentHour < 17) {
    greeting = "روز بخیر";
  } else if (currentHour >= 17 && currentHour < 20) {
    greeting = "عصر بخیر";
  } else {
    greeting = "شب بخیر";
    isNight = true;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('لطفا نام کاربری و رمز عبور را وارد کنید.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await login(username, password);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.message === 'user-not-found' || err.message === 'wrong-password') {
        setError('نام کاربری یا رمز عبور نادرست است.');
      } else if (err.message === 'user-disabled') {
        setError('این حساب کاربری غیرفعال شده است.');
      } else {
        setError(`خطا در ورود: ${err.message || err}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: TrendingUp, text: "برنامه‌ریزی فروش و توزیع روزانه" },
    { icon: MapPin, text: "مدیریت مسیر و رانندگان" },
    { icon: ShieldCheck, text: "امنیت و پشتیبان‌گیری کامل" },
  ];

  return (
    <div className="relative flex flex-col min-h-screen font-sans transition-colors duration-300" dir="rtl">
      {/* Background image */}
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/login-hero.jpg')" }}
      />
      
      {/* 30% brighter / lighter overlay */}
      <div className="fixed inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/15 to-slate-950/30" />

      {/* Theme toggle */}
      <div className="fixed top-4 left-4 z-50 no-print">
        <button
          type="button"
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 transition-all duration-300 shadow-md flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
          title={isDarkMode ? "تغییر به حالت روز (روشن)" : "تغییر به حالت شب (تیره)"}
        >
          {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
        </button>
      </div>

      {/* Main card */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 w-full">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-black/40 ring-1 ring-white/10 border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-300 grid grid-cols-1 md:grid-cols-2"
        >
          {/* LEFT PANEL */}
          <div className="relative hidden md:flex flex-col p-9 text-white overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center scale-110" style={{ backgroundImage: "url('/login-hero.jpg')" }} />
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/70 via-blue-700/65 to-indigo-800/70" />
            <div className="absolute -top-16 -left-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -right-10 w-72 h-72 bg-cyan-300/20 rounded-full blur-3xl" />
            <div className="absolute top-1/3 left-1/2 w-56 h-56 bg-amber-400/10 rounded-full blur-3xl" />
            <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "22px 22px" }} />

            {/* IMPROVED FLOATING SNACKS WITH MORE REALISTIC ICONS */}
            <div className="absolute inset-0 overflow-hidden">
              <FloatingSnack icon={PeanutIcon} size={58} style={{ top: "6%", left: "10%" }} duration={8} delay={0.1} opacity={0.95} rotateRange={14} yRange={20} />
              <FloatingSnack icon={CornIcon} size={52} style={{ top: "14%", right: "8%" }} duration={9} delay={0.5} opacity={0.9} rotateRange={10} yRange={18} />
              <FloatingSnack icon={SeedIcon} size={34} style={{ top: "40%", left: "2%" }} duration={7} delay={0.3} blurPx={1.5} opacity={0.5} rotateRange={8} yRange={12} />
              <FloatingSnack icon={AlmondIcon} size={44} style={{ bottom: "24%", right: "14%" }} duration={8.5} delay={0.8} opacity={0.85} rotateRange={12} yRange={16} />
              <FloatingSnack icon={SnackBagIcon} size={56} style={{ bottom: "4%", left: "6%" }} duration={10} delay={0.2} opacity={0.9} rotateRange={10} yRange={22} />
              <FloatingSnack icon={PeanutIcon} size={32} style={{ top: "56%", right: "4%" }} duration={7.5} delay={1.0} blurPx={2} opacity={0.45} rotateRange={8} yRange={10} />
              <FloatingSnack icon={SeedIcon} size={26} style={{ bottom: "38%", left: "36%" }} duration={6.5} delay={0.6} blurPx={2.5} opacity={0.35} rotateRange={6} yRange={8} />
              <FloatingSnack icon={CornIcon} size={30} style={{ bottom: "10%", right: "36%" }} duration={8} delay={1.2} blurPx={2} opacity={0.4} rotateRange={7} yRange={10} />
            </div>

            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-2 bg-white/15 self-start px-3.5 py-2 rounded-full text-[11px] font-bold backdrop-blur-md shadow-inner border border-white/10 mb-8">
                {isNight ? <Moon className="w-3.5 h-3.5 text-amber-200" /> : <Sun className="w-3.5 h-3.5 text-amber-300 animate-pulse" />}
                <span>{greeting}</span>
                <span className="w-1 h-1 bg-white/40 rounded-full" />
                <Calendar className="w-3.5 h-3.5 opacity-80" />
                <span className="font-mono">{formattedDate}</span>
              </div>

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="bg-white/15 w-14 h-14 rounded-2xl backdrop-blur-sm flex items-center justify-center mb-6 shadow-lg"
              >
                <Truck className="w-7 h-7 text-white" />
              </motion.div>
              <h1 className="text-2xl font-extrabold tracking-tight leading-relaxed">
                سامانه یکپارچه<br />برنامه‌ریزی و توزیع
              </h1>
              <p className="text-sm text-white/70 mt-2 font-medium">برنا تجارت باور</p>

              <div className="mt-8 space-y-3">
                {features.map((f, i) => (
                  <motion.div
                    key={f.text}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.1, duration: 0.35 }}
                    className="flex items-center gap-3 bg-white/10 rounded-xl px-3.5 py-2.5 backdrop-blur-sm border border-white/10"
                  >
                    <f.icon className="w-4 h-4 text-cyan-200 shrink-0" />
                    <span className="text-xs font-semibold text-white/90">{f.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL — "خوش اومدی" removed, spacing optimized */}
          <div className="p-8 sm:p-10 flex flex-col justify-center">
            {/* Mobile brand header */}
            <div className="md:hidden flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-tr from-cyan-600 to-blue-700 p-2.5 rounded-xl text-white shadow-md">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">سامانه یکپارچه توزیع</h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">برنا تجارت باور</p>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Username */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">نام کاربری / ایمیل</label>
                <div className="relative group">
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400 transition-colors">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                    className="w-full pl-3 pr-10 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/70 focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">رمز عبور</label>
                <div className="relative group">
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400 transition-colors">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/70 focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    tabIndex={-1}
                    title={showPassword ? "پنهان کردن رمز" : "نمایش رمز"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-l from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>در حال ورود...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>ورود به سامانه</span>
                  </>
                )}
              </motion.button>
            </form>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-6 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              اطلاعات ورود شما رمزنگاری و محافظت می‌شود
            </p>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-5 px-6 border-t border-white/10 bg-black/20 backdrop-blur-md text-center text-xs text-white/70 select-none no-print transition-colors duration-300 w-full">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-bold">
            © کلیه حقوق مادی و معنوی این سیستم برای <span className="text-cyan-300 text-sm font-black">برناتجارت باور</span> محفوظ است.
          </p>
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/15 font-mono text-[11px] font-semibold text-white/80 hover:text-cyan-300 transition-all">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>حق کپی رایت محفوظ است:</span>
            <a href="mailto:nazari925@gmail.com" className="underline hover:no-underline">nazari925@gmail.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
};