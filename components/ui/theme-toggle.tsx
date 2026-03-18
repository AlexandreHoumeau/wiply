"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const themes = [
    { value: "light", icon: Sun, label: "Clair" },
    { value: "dark", icon: Moon, label: "Sombre" },
    { value: "system", icon: Monitor, label: "Système" },
] as const

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()

    const current = themes.find((t) => t.value === theme) ?? themes[2]
    const next = themes[(themes.indexOf(current) + 1) % themes.length]

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                    onClick={() => setTheme(next.value)}
                    aria-label={`Thème actuel : ${current.label}. Cliquer pour passer en mode ${next.label}`}
                >
                    <current.icon className="h-4 w-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10} className="font-semibold rounded-lg bg-foreground text-background">
                Mode {next.label}
            </TooltipContent>
        </Tooltip>
    )
}
