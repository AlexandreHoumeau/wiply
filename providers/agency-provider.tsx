"use client"

import { createContext, useContext, useEffect } from "react"
import { AuthUserContext } from "@/lib/validators/definitions"

const AgencyContext = createContext<AuthUserContext | null>(null)

export function AgencyProvider({
    children,
    initialData
}: {
    children: React.ReactNode,
    initialData: AuthUserContext
}) {
    const primaryColor = initialData?.agency?.primary_color
    const secondaryColor = initialData?.agency?.secondary_color

    useEffect(() => {
        const root = document.documentElement
        if (primaryColor) {
            root.style.setProperty('--brand-primary', primaryColor)
        }
        if (secondaryColor) {
            root.style.setProperty('--brand-secondary', secondaryColor)
        }
    }, [primaryColor, secondaryColor])

    return (
        <AgencyContext.Provider value={initialData}>
            {children}
        </AgencyContext.Provider>
    )
}

export const useAgency = () => {
    const context = useContext(AgencyContext)
    if (!context) throw new Error("useAgency must be used within AgencyProvider")
    return context
}

export const useOptionalAgency = () => useContext(AgencyContext)
