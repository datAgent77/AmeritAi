import { expect, test } from "vitest"
import { normalizeQuickActionButton, resolveQuickActionsConfig } from "@/lib/quick-actions"

test("repairs stale module selection from trigger message", () => {
    const button = normalizeQuickActionButton({
        id: "leadCollection",
        label: "Temsilci İste",
        moduleId: "leadCollection",
        triggerMessage: "bir temsilciyle görüşmek istiyorum",
        visible: true,
        order: 0,
    }, 0)

    expect(button).not.toBeNull()
    expect(button?.moduleId).toBe("humanHandoff")
    expect(button?.id).toBe("humanHandoff")
    expect(button?.label).toBe("Temsilci İste")
    expect(button?.triggerMessage).toBe("bir temsilciyle görüşmek istiyorum")
})

test("filters quick actions to enabled modules and normalizes routing payloads", () => {
    const config = resolveQuickActionsConfig({
        enableHumanHandoff: true,
        enableLeadCollection: true,
        quickActions: {
            enabled: true,
            buttons: [
                {
                    id: "leadCollection",
                    label: "Temsilci İste",
                    moduleId: "leadCollection",
                    triggerMessage: "bir temsilciyle görüşmek istiyorum",
                    visible: true,
                    order: 0,
                },
                {
                    id: "appointments",
                    label: "Randevu Al",
                    moduleId: "appointments",
                    triggerMessage: "randevu almak istiyorum",
                    visible: true,
                    order: 1,
                },
            ],
        },
    })

    expect(config.enabled).toBe(true)
    expect(config.buttons).toHaveLength(2)
    expect(config.buttons[0]).toMatchObject({
        moduleId: "humanHandoff",
        label: "Temsilci İste",
        triggerMessage: "bir temsilciyle görüşmek istiyorum",
    })
    expect(config.buttons[1]).toMatchObject({
        moduleId: "leadCollection",
        triggerMessage: "iletişim bilgilerimi bırakmak istiyorum",
    })
})

test("auto-adds buttons for newly enabled modules not present in saved config", () => {
    const config = resolveQuickActionsConfig({
        enableAppointments: true,
        enableHumanHandoff: true,
        enableLeadCollection: true,
        quickActions: {
            enabled: true,
            buttons: [
                {
                    id: "humanHandoff",
                    label: "Temsilci İste",
                    moduleId: "humanHandoff",
                    triggerMessage: "bir temsilciyle görüşmek istiyorum",
                    visible: true,
                    order: 0,
                },
                {
                    id: "leadCollection",
                    label: "Beni arayın",
                    moduleId: "leadCollection",
                    triggerMessage: "iletişim bilgilerimi bırakmak istiyorum",
                    visible: false,
                    order: 1,
                },
            ],
        },
    })

    expect(config.buttons).toHaveLength(3)
    expect(config.buttons.map(b => b.moduleId).sort()).toEqual(["appointments", "humanHandoff", "leadCollection"])
    // Preserved custom label
    expect(config.buttons.find(b => b.moduleId === "humanHandoff")?.label).toBe("Temsilci İste")
    expect(config.buttons.find(b => b.moduleId === "leadCollection")?.label).toBe("Beni arayın")
    expect(config.buttons.find(b => b.moduleId === "leadCollection")?.visible).toBe(false)
    // Auto-added module has default label and visible:true
    expect(config.buttons.find(b => b.moduleId === "appointments")?.label).toBe("Randevu Al")
    expect(config.buttons.find(b => b.moduleId === "appointments")?.visible).toBe(true)
})
