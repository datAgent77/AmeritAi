"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const AccordionContext = React.createContext<{
    value?: string | string[]
    onValueChange?: (value: string) => void
    type?: "single" | "multiple"
}>({})

const Accordion = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
        type?: "single" | "multiple",
        collapsible?: boolean,
        defaultValue?: string | string[]
    }
>(({ className, type = "single", collapsible, defaultValue, children, ...props }, ref) => {
    const [value, setValue] = React.useState<string | string[]>(
        type === "multiple" 
            ? (Array.isArray(defaultValue) ? defaultValue : (defaultValue ? [defaultValue] : []))
            : (typeof defaultValue === "string" ? defaultValue : (Array.isArray(defaultValue) ? defaultValue[0] : ""))
    )

    const handleValueChange = (newValue: string) => {
        if (type === "multiple") {
            setValue(prev => {
                const prevArray = Array.isArray(prev) ? prev : []
                if (prevArray.includes(newValue)) {
                    return prevArray.filter(v => v !== newValue)
                } else {
                    return [...prevArray, newValue]
                }
            })
        } else {
            setValue(prev => (prev === newValue && collapsible) ? "" : newValue)
        }
    }

    return (
        <AccordionContext.Provider value={{ value, onValueChange: handleValueChange, type }}>
            <div ref={ref} className={cn("", className)} {...props}>
                {children}
            </div>
        </AccordionContext.Provider>
    )
})
Accordion.displayName = "Accordion"

const AccordionItem = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, ...props }, ref) => (
    <div ref={ref} className={cn("border-b", className)} data-value={value} {...props} />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
    const { value, onValueChange, type } = React.useContext(AccordionContext)
    // Find parent item value (hacky without context for item, but let's assume direct child or use ref)
    // Actually, for a proper implementation without Radix, we need ItemContext. 
    // Let's rely on simple composition where Trigger is inside Item.
    // We need to know which Item this trigger belongs to.
    // To make it simple and robust: We will require `AccordionItem` to wrap `AccordionTrigger` and provide context.

    return (
        <AccordionItemContext.Consumer>
            {({ value: itemValue }) => {
                const isOpen = type === "multiple" 
                    ? (Array.isArray(value) ? value.includes(itemValue) : false)
                    : (value === itemValue)
                return (
                    <div className="flex">
                        <button
                            ref={ref}
                            onClick={() => onValueChange?.(itemValue)}
                            className={cn(
                                "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
                                className
                            )}
                            data-state={isOpen ? "open" : "closed"}
                            {...props}
                        >
                            {children}
                            <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                        </button>
                    </div>
                )
            }}
        </AccordionItemContext.Consumer>
    )
})
AccordionTrigger.displayName = "AccordionTrigger"

const AccordionContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
    const { value, type } = React.useContext(AccordionContext)
    return (
        <AccordionItemContext.Consumer>
            {({ value: itemValue }) => {
                const isOpen = type === "multiple"
                    ? (Array.isArray(value) ? value.includes(itemValue) : false)
                    : (value === itemValue)
                if (!isOpen) return null
                return (
                    <div
                        ref={ref}
                        className={cn(
                            "overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
                            className
                        )}
                        data-state={isOpen ? "open" : "closed"}
                        {...props}
                    >
                        <div className="pb-4 pt-0">{children}</div>
                    </div>
                )
            }}
        </AccordionItemContext.Consumer>
    )
})
AccordionContent.displayName = "AccordionContent"

// Helper Context for Item
const AccordionItemContext = React.createContext<{ value: string }>({ value: "" })

// Re-wrap AccordionItem to provide context
const AccordionItemOriginal = AccordionItem
const AccordionItemWithContext = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ value, children, ...props }, ref) => (
    <AccordionItemContext.Provider value={{ value }}>
        <AccordionItemOriginal ref={ref} value={value} {...props}>
            {children}
        </AccordionItemOriginal>
    </AccordionItemContext.Provider>
))
AccordionItemWithContext.displayName = "AccordionItem"

export { Accordion, AccordionItemWithContext as AccordionItem, AccordionTrigger, AccordionContent }
