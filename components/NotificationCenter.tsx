"use client"

import { useState } from "react"
import { Bell, Check, MessageSquare, UserPlus, TrendingUp, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useNotifications } from "@/hooks/useNotifications"
import { markAsRead } from "@/actions/notifications.server"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import type { Notification } from "@/lib/validators/notifications"
import { Button } from "@/components/ui/button"
import { resolveLink } from "@/lib/notifications/resolve-link"

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "À l'instant"
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}j`
}

const typeIcon: Record<string, React.ElementType> = {
  member_joined: UserPlus,
  task_comment: MessageSquare,
  opportunity_status_changed: TrendingUp,
}

function NotificationItem({ notification, onRead, primaryColor }: { notification: Notification; onRead: () => void; primaryColor: string }) {
  const router = useRouter()
  const isUnread = !notification.read_at
  const Icon = typeIcon[notification.type] ?? Bell

  const link = resolveLink(notification)

  const handleClick = async () => {
    if (isUnread) {
      await markAsRead(notification.id)
      onRead()
    }
    if (link) router.push(link)
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative flex gap-4 p-4 transition-all duration-300",
        link ? "cursor-pointer hover:bg-muted/80 active:scale-[0.98]" : "cursor-default",
        isUnread ? "bg-card" : "opacity-70"
      )}
    >
      {/* Premium Unread Indicator */}
      {isUnread && (
        <div
          className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-1 rounded-full blur-[1px]"
          style={{ backgroundColor: primaryColor }}
        />
      )}

      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-shadow duration-300 group-hover:shadow-md",
        isUnread ? "bg-card border-border" : "bg-muted border-transparent"
      )}>
        <Icon
          className={cn("h-5 w-5", !isUnread && "text-muted-foreground")}
          style={isUnread ? { color: primaryColor } : undefined}
        />
      </div>

      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            "text-[13px] leading-none transition-colors",
            isUnread ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
          )}>
            {notification.title}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground/60 tabular-nums">
            {relativeTime(notification.created_at)}
          </span>
        </div>

        {notification.body && (
          <p className="line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
            {notification.body}
          </p>
        )}
      </div>
    </div>
  )
}

export function NotificationCenter({ primaryColor = "#6366f1" }: { primaryColor?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { notifications, unreadCount, isLoading, markAllAsRead } = useNotifications()

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] })

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "group relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300",
            "hover:bg-muted hover:ring-4 hover:ring-muted active:scale-90",
            isOpen && "bg-muted"
          )}
        >
          <Bell className={cn(
            "h-5 w-5 transition-transform duration-300 group-hover:rotate-12",
            isOpen ? "fill-foreground/60 text-foreground/60" : "text-foreground/50"
          )} />
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: primaryColor }} />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-background" style={{ backgroundColor: primaryColor }} />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[380px] overflow-hidden rounded-[24px] border-border/60 bg-background/80 p-0 shadow-2xl backdrop-blur-xl"
        align="end"
        sideOffset={12}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 bg-background/50 px-5 py-4">
          <div className="flex flex-col">
            <h3 className="text-lg font-bold tracking-tight text-foreground">Notifications</h3>
            <p className="text-[11px] font-medium text-muted-foreground">
              {unreadCount > 0 ? `Vous avez ${unreadCount} messages non lus` : "Tout est à jour"}
            </p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
              {/* <Settings2 className="h-4 w-4" /> */}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-8 rounded-full text-[11px] font-bold text-muted-foreground hover:bg-muted"
              >
                <Check className="mr-1 h-3 w-3" />
                Tout lire
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex h-[300px] items-center justify-center">
             <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-indigo-500" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-10 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-muted ring-8 ring-muted/50">
              <Sparkles className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">Zéro distraction</h4>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Profitez du calme. On vous préviendra dès qu'il y aura du nouveau.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[420px]">
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} onRead={refresh} primaryColor={primaryColor} />
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        {/* <div className="border-t border-border/50 bg-muted/50 p-3">
          <button className="w-full rounded-xl py-2 text-center text-[11px] font-bold text-muted-foreground transition-colors hover:bg-card hover:text-foreground hover:shadow-sm">
            Voir tout l'historique
          </button>
        </div> */}
      </PopoverContent>
    </Popover>
  )
}
