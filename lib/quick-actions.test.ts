import { expect, test } from "vitest"
import {
    areQuickActionsEqual,
    getQuickActionModuleOptions,
    normalizeQuickActionButton,
    resolveQuickActionsConfig,
} from "@/lib/quick-actions"

test("repairs stale module selection from trigger message", () => {
    const button = normalizeQuickActionButton({
        id: "leadCollection",
        label: "Temsilci Iste",
        moduleId: "leadCollection",
        triggerMessage: "bir temsilciyle görüşmek istiyorum",
        visible: true,
        order: 0,
    }, 0)

    expect(button).not.toBeNull()
    expect(button?.moduleId).toBe("humanHandoff")
    expect(button?.id).toBe("humanHandoff")
    expect(button?.triggerMessage).toBe("bir temsilciyle görüşmek istiyorum")
})

test("filters quick actions to enabled modules and normalizes extended module routing", () => {
    const config = resolveQuickActionsConfig({
        enableHumanHandoff: true,
        enableKvkkConsent: true,
        enableDigitalWaiter: true,
        digitalWaiter: { menuUrl: "https://example.com/menu" },
        quickActions: {
            enabled: true,
            buttons: [
                {
                    id: "humanHandoff",
                    label: "KVKK Onayi",
                    moduleId: "humanHandoff",
                    triggerMessage: "kvkk onay metnini görmek istiyorum",
                    visible: true,
                    order: 0,
                },
                {
                    id: "leadCollection",
                    label: "Iletisim Birak",
                    moduleId: "leadCollection",
                    triggerMessage: "iletisim bilgilerimi birakmak istiyorum",
                    visible: true,
                    order: 1,
                },
                {
                    id: "digitalWaiter",
                    label: "Menuden Oner",
                    moduleId: "digitalWaiter",
                    triggerMessage: "menüden bana öneri yap ve sipariş konusunda yardımcı ol",
                    visible: false,
                    order: 2,
                },
            ],
        },
    })

    expect(config.enabled).toBe(true)
    expect(config.buttons).toHaveLength(3)
    expect(config.buttons.map((button) => button.moduleId)).toEqual([
        "kvkkConsent",
        "digitalWaiter",
        "humanHandoff",
    ])
    expect(config.buttons[0].triggerMessage).toBe("kvkk onay metnini görmek istiyorum")
    expect(config.buttons[1].visible).toBe(false)
})

test("auto-adds buttons for newly enabled modules not present in saved config", () => {
    const config = resolveQuickActionsConfig({
        enableAppointments: true,
        enableHumanHandoff: true,
        enableLeadCollection: true,
        enableVisualDiagnosis: true,
        enableKvkkConsent: true,
        enableProactiveMessaging: true,
        enableDigitalWaiter: true,
        digitalWaiter: { menuUrl: "https://example.com/menu" },
        quickActions: {
            enabled: true,
            buttons: [
                {
                    id: "humanHandoff",
                    label: "Temsilci Iste",
                    moduleId: "humanHandoff",
                    triggerMessage: "bir temsilciyle görüşmek istiyorum",
                    visible: true,
                    order: 0,
                },
                {
                    id: "leadCollection",
                    label: "Beni arayin",
                    moduleId: "leadCollection",
                    triggerMessage: "iletişim bilgilerimi bırakmak istiyorum",
                    visible: false,
                    order: 1,
                },
            ],
        },
    })

    expect(config.buttons).toHaveLength(7)
    expect(config.buttons.map((button) => button.moduleId)).toEqual([
        "humanHandoff",
        "leadCollection",
        "appointments",
        "visualDiagnosis",
        "kvkkConsent",
        "proactiveMessaging",
        "digitalWaiter",
    ])
    expect(config.buttons.find((button) => button.moduleId === "leadCollection")?.label).toBe("Beni arayin")
    expect(config.buttons.find((button) => button.moduleId === "leadCollection")?.visible).toBe(false)
    expect(config.buttons.find((button) => button.moduleId === "appointments")?.label).toBe("Randevu Al")
})

test("deduplicates duplicate module selections and keeps config stable", () => {
    const config = resolveQuickActionsConfig({
        enableAppointments: true,
        enableHumanHandoff: true,
        quickActions: {
            enabled: true,
            buttons: [
                {
                    id: "appointments",
                    label: "Randevu Al",
                    moduleId: "appointments",
                    triggerMessage: "randevu almak istiyorum",
                    visible: true,
                    order: 0,
                },
                {
                    id: "appointments",
                    label: "Tekrar Randevu",
                    moduleId: "appointments",
                    triggerMessage: "randevu almak istiyorum",
                    visible: false,
                    order: 1,
                },
            ],
        },
    })

    expect(config.buttons).toHaveLength(2)
    expect(config.buttons.map((button) => button.moduleId)).toEqual(["appointments", "humanHandoff"])
    expect(config.buttons[0].label).toBe("Randevu Al")
})

test("compares quick action configs deeply", () => {
    const left = resolveQuickActionsConfig({
        enableAppointments: true,
        quickActions: {
            enabled: true,
            buttons: [],
        },
    })
    const right = resolveQuickActionsConfig({
        enableAppointments: true,
        quickActions: {
            enabled: true,
            buttons: [],
        },
    })

    expect(areQuickActionsEqual(left, right)).toBe(true)
    expect(getQuickActionModuleOptions("en").map((option) => option.moduleId)).toHaveLength(7)
})
