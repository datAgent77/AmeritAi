import { describe, expect, it, vi } from "vitest";

import {
    getAdminNotificationEmail,
    getContactInboxEmail,
    resolveSenderIdentity,
} from "./email-service";

describe("resolveSenderIdentity", () => {
    it("keeps the configured From address when Gmail auth is aligned to the same domain", () => {
        const sender = resolveSenderIdentity({
            smtpHost: "smtp.gmail.com",
            authenticatedEmail: "notifications@ameritai.com",
            configuredFromEmail: "no-reply@ameritai.com",
            configuredFromName: "AmeritAI",
        });

        expect(sender).toEqual({
            fromEmail: "no-reply@ameritai.com",
            fromName: "AmeritAI",
            sender: "notifications@ameritai.com",
        });
    });

    it("falls back to the authenticated Gmail mailbox when the configured From domain is different", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        const sender = resolveSenderIdentity({
            smtpHost: "smtp.gmail.com",
            authenticatedEmail: "founder@gmail.com",
            configuredFromEmail: "no-reply@ameritai.com",
            configuredFromName: "AmeritAI",
        });

        expect(sender).toEqual({
            fromEmail: "founder@gmail.com",
            fromName: "AmeritAI",
            replyTo: "no-reply@ameritai.com",
            sender: "founder@gmail.com",
        });
        expect(warnSpy).toHaveBeenCalledOnce();

        warnSpy.mockRestore();
    });

    it("keeps the configured From address for non-Gmail SMTP providers", () => {
        const sender = resolveSenderIdentity({
            smtpHost: "smtp.resend.com",
            authenticatedEmail: "resend",
            configuredFromEmail: "no-reply@ameritai.com",
            configuredFromName: "AmeritAI",
        });

        expect(sender).toEqual({
            fromEmail: "no-reply@ameritai.com",
            fromName: "AmeritAI",
        });
    });

    it("defaults unconfigured senders to ameritai.com", () => {
        const sender = resolveSenderIdentity({
            authenticatedEmail: null,
            configuredFromEmail: null,
            configuredFromName: "AmeritAI",
        });

        expect(sender).toEqual({
            fromEmail: "no-reply@ameritai.com",
            fromName: "AmeritAI",
        });
    });

    it("defaults internal recipients to ameritai.com", () => {
        vi.stubEnv("VION_ADMIN_EMAIL", "");
        vi.stubEnv("ADMIN_NOTIFICATION_EMAIL", "");
        vi.stubEnv("SUPER_ADMIN_EMAIL", "");
        vi.stubEnv("VION_CONTACT_EMAIL", "");
        vi.stubEnv("CONTACT_EMAIL", "");
        vi.stubEnv("SUPPORT_EMAIL", "");

        expect(getAdminNotificationEmail()).toBe("info@ameritai.com");
        expect(getContactInboxEmail()).toBe("info@ameritai.com");

        vi.unstubAllEnvs();
    });
});
