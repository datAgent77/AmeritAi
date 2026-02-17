"use client";

import { useParams } from "next/navigation";
import { ShopperWorkspace } from "@/components/shopper/shopper-workspace";

export default function TenantShopperPage() {
    const params = useParams();
    const targetUserId = params.userId as string;

    return <ShopperWorkspace targetUserId={targetUserId} />;
}
