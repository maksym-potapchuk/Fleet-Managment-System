"use client";

import { useState } from "react";
import { Eye, EyeOff, ArrowRight, Car, Mail, Lock } from "lucide-react";

type Props = {
    loading: boolean;
    error: string;
    onSubmit: (email: string, password: string) => void;
};

export function LoginForm({ loading, error, onSubmit }: Props) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    return (
        // On mobile: full-screen white, no card chrome — feels native
        // On desktop (md+): centered card with shadow
        <div className="min-h-screen w-full flex flex-col justify-center bg-white md:bg-slate-50 md:items-center px-6 py-12 md:p-4">
            <div className="w-full md:max-w-[440px] md:bg-white md:rounded-3xl md:shadow-xl md:border md:p-8">

                {/* Logo — left-aligned on mobile (easier to scan), centered on desktop */}
                <div className="flex items-center gap-3 mb-10 md:justify-center md:mb-8">
                    <div className="w-12 h-12 bg-[#2D8B7E] rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <Car className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">FLEET</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Management</p>
                    </div>
                </div>

                <h2 className="text-3xl font-black text-slate-900 mb-1">З поверненням!</h2>
                <p className="text-slate-500 font-medium mb-8">
                    Введіть свої дані для входу
                </p>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-6">
                        <p className="text-red-700 text-sm font-semibold" role="alert">{error}</p>
                    </div>
                )}

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        onSubmit(email, password);
                    }}
                    className="space-y-4"
                >
                    {/* Email */}
                    <div>
                        <label className="text-sm font-bold text-slate-700 mb-1.5 block">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="email"
                                inputMode="email"
                                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 bg-slate-50 font-semibold text-slate-800 text-base focus:outline-none focus:border-[#2D8B7E] focus:bg-white focus:ring-4 focus:ring-[#2D8B7E]/10 transition-all"
                                placeholder="name@company.com"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="text-sm font-bold text-slate-700 mb-1.5 block">Пароль</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                className="w-full pl-12 pr-14 py-4 rounded-2xl border-2 border-slate-200 bg-slate-50 font-semibold text-slate-800 text-base focus:outline-none focus:border-[#2D8B7E] focus:bg-white focus:ring-4 focus:ring-[#2D8B7E]/10 transition-all"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors"
                                aria-label={showPassword ? "Сховати пароль" : "Показати пароль"}
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#2D8B7E] text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2.5 hover:bg-[#248B7B] hover:shadow-xl hover:shadow-[#2D8B7E]/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Вхід...
                                </>
                            ) : (
                                <>
                                    Увійти
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
