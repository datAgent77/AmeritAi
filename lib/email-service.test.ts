import { describe, expect, it, vi } from "vitest";

import { resolveSenderIdentity } from "./email-service";

describe("resolveSenderIdentity", () => {
    it("keeps the configured From address when Gmail auth is aligned to the same domain", () => {
        const sender = resolveSenderIdentity({
            smtpHost: "smtp.gmail.com",
            authenticatedEmail: "notifications@vion.ai",
            configuredFromEmail: "no-reply@vion.ai",
            configuredFromName: "Vion AI",
        });

        expect(sender).toEqual({
            fromEmail: "no-reply@vion.ai",
            fromName: "Vion AI",
            sender: "notifications@vion.ai",
        });
    });

    it("falls back to the authenticated Gmail mailbox when the configured From domain is different", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        const sender = resolveSenderIdentity({
            smtpHost: "smtp.gmail.com",
            authenticatedEmail: "founder@gmail.com",
            configuredFromEmail: "no-reply@vion.ai",
            configuredFromName: "Vion AI",
        });

        expect(sender).toEqual({
            fromEmail: "founder@gmail.com",
            fromName: "Vion AI",
            replyTo: "no-reply@vion.ai",
            sender: "founder@gmail.com",
        });
        expect(warnSpy).toHaveBeenCalledOnce();

        warnSpy.mockRestore();
    });

    it("keeps the configured From address for non-Gmail SMTP providers", () => {
        const sender = resolveSenderIdentity({
            smtpHost: "smtp.resend.com",
            authenticatedEmail: "resend",
            configuredFromEmail: "no-reply@vion.ai",
            configuredFromName: "Vion AI",
        });

        expect(sender).toEqual({
            fromEmail: "no-reply@vion.ai",
            fromName: "Vion AI",
        });
    });
});
