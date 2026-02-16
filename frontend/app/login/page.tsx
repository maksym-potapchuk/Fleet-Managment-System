"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginRequest } from "@/services/auth";
import { LoginForm } from "@/components/login/LoginForm";

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (email: string, password: string) => {
        setLoading(true);
        setError("");
        try {
            await loginRequest(email, password);
            router.replace("/dashboard");
        } catch {
            setError("Невірний email або пароль");
        } finally {
            setLoading(false);
        }
    };

    return (
        <LoginForm
            loading={loading}
            error={error}
            onSubmit={handleLogin}
        />
    );
}

