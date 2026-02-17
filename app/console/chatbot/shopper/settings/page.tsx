"use client";

import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { ShopperSettings } from "@/components/shopper-settings";

export default function ShopperSettingsPage() {
    const { user } = useAuth();

    if (!user?.uid) {
        return (
            <div className="flex min-h-[260px] items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-8">
            <ShopperSettings targetUserId={user.uid} />
        </div>
    );
}
