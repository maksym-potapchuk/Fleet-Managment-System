import api from "@/lib/api";

export function loginRequest(email: string, password: string) {
    return api.post("/auth/login/", { email, password });
}