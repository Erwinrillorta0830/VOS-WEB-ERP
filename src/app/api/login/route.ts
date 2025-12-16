// src/app/api/login/route.ts
import { NextRequest, NextResponse } from "next/server";

const REMOTE_USER_API = "http://100.110.197.61:8091/items/user";

type ApiUser = {
    user_id: number;
    user_email: string;
    user_password: string;
    user_fname: string;
    user_mname: string | null;
    user_lname: string;
    user_contact: string | null;
    user_department: number | null;
    user_position: string | null;
    role_id: number | null;
    isAdmin: boolean | null;
    user_image: string | null;
    [key: string]: unknown; // allow extra fields
};

export async function POST(req: NextRequest) {
    try {
        const { email, password } = (await req.json()) as {
            email?: string;
            password?: string;
        };

        if (!email || !password) {
            return NextResponse.json(
                { error: "Missing email or password" },
                { status: 400 }
            );
        }

        // Call your existing API
        const remoteRes = await fetch(REMOTE_USER_API, {
            method: "GET",
            cache: "no-store",
        });

        if (!remoteRes.ok) {
            console.error("Remote API error", await remoteRes.text());
            return NextResponse.json(
                { error: "Failed to contact auth server" },
                { status: 502 }
            );
        }

        const raw = await remoteRes.json();

        // Directus style: { data: [...] } OR plain [...]
        const users: ApiUser[] = Array.isArray(raw) ? raw : raw.data;

        const user = users.find(
            (u) => u.user_email === email && u.user_password === password
        );

        if (!user) {
            return NextResponse.json(
                { error: "Invalid email or password" },
                { status: 401 }
            );
        }

        // Strip password before returning to client
        const { user_password, ...safeUser } = user;

        return NextResponse.json({ user: safeUser }, { status: 200 });
    } catch (err) {
        console.error("Login error", err);
        return NextResponse.json(
            { error: "Unexpected server error" },
            { status: 500 }
        );
    }
}
