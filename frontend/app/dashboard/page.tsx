"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Car, Users } from "lucide-react";
import api from "@/lib/api";

type CurrentUser = {
    email: string;
};

export default function DashboardPage() {
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        api.get("/auth/me/")
            .then(res => {
                setUser(res.data);
                setLoading(false);
            })
            .catch(() => {
                router.replace("/login");
            });
    }, [router]);

    if (loading) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                Loading dashboard...
            </div>
        );
    }

    return (
        <div className="space-y-5 sm:space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Dashboard</h1>
                <p className="mt-2 text-sm text-slate-600 sm:text-base">Welcome back, {user?.email}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-teal-50 p-2">
                            <Car className="h-5 w-5 text-teal-600" />
                        </div>
                        <p className="text-sm font-medium text-slate-600">Vehicles status</p>
                    </div>
                    <p className="mt-4 text-2xl font-semibold text-slate-900">Coming soon</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-indigo-50 p-2">
                            <Users className="h-5 w-5 text-indigo-600" />
                        </div>
                        <p className="text-sm font-medium text-slate-600">Drivers activity</p>
                    </div>
                    <p className="mt-4 text-2xl font-semibold text-slate-900">Coming soon</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2 2xl:col-span-1">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-amber-50 p-2">
                            <Bell className="h-5 w-5 text-amber-600" />
                        </div>
                        <p className="text-sm font-medium text-slate-600">Maintenance alerts</p>
                    </div>
                    <p className="mt-4 text-2xl font-semibold text-slate-900">Coming soon</p>
                </div>
            </div>
        </div>
    );
}
