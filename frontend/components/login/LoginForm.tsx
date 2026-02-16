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
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-[480px] bg-white rounded-3xl shadow-xl border p-8 relative">

                {/* Logo */}
                <div className="flex justify-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-[#2D8B7E]/10 rounded-2xl flex items-center justify-center">
                        <Car className="w-7 h-7 text-[#2D8B7E]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">FLEET</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Management</p>
                    </div>
                </div>

                <h2 className="text-3xl font-black text-slate-900 text-center mb-2">З поверненням!</h2>
                <p className="text-center text-slate-500 mb-6">
                    Введіть свої дані для входу
                </p>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        onSubmit(email, password);
                    }}
                    className="space-y-5"
                >
                    {/* Email */}
                    <div>
                        <label className="text-sm text-slate-800 font-bold">Email</label>
                        <div className="relative mt-1">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 rounded-xl border bg-slate-50 font-semibold text-slate-800 focus:ring-4 focus:ring-[#2D8B7E]/20"
                                placeholder="name@company.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm  text-slate-800 font-bold">Пароль</label>
                        <div className="relative mt-1">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-12 pr-12 py-3 rounded-xl border bg-slate-50 font-semibold text-slate-800 focus:ring-4 focus:ring-[#2D8B7E]/20"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                            >
                                {showPassword ? <EyeOff /> : <Eye />}
                            </button>
                        </div>
                    </div>

                    <button
                        disabled={loading}
                        className="w-full bg-[#2D8B7E] text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:shadow-xl transition disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <svg
                                    className="mr-3 w-5 h-5 animate-spin text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                </svg>
                                Вхід
                            </>
                        ) : (
                            <>
                                Увійти
                                <ArrowRight />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
