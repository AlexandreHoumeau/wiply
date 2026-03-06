"use client"

import { useState } from "react"
import { Bell, Check, MessageSquare, UserPlus, TrendingUp, Inbox, Settings2, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useNotifications } from "@/hooks/useNotifications"
import { markAsRead } from "@/actions/notifications.server"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import type { Notification } from "@/lib/validators/notifications"
import { Button } from "@/components/ui/button"

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

  const handleClick = async () => {
    if (isUnread) {
      await markAsRead(notification.id)
      onRead()
    }
    const meta = notification.metadata
    if (meta?.task_id) router.push(`/app/projects`)
    if (meta?.opportunity_id) router.push(`/app/opportunities`)
  }

  return (
    <div 
      onClick={handleClick}
      className={cn(
        "group relative flex cursor-pointer gap-4 p-4 transition-all duration-300",
        "hover:bg-slate-50/80 active:scale-[0.98]",
        isUnread ? "bg-white" : "opacity-70"
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
        isUnread ? "bg-white border-slate-200" : "bg-slate-50 border-transparent"
      )}>
        <Icon className="h-5 w-5" style={{ color: isUnread ? primaryColor : "#64748b" }} />
      </div>

      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            "text-[13px] leading-none transition-colors",
            isUnread ? "font-semibold text-slate-900" : "font-medium text-slate-500"
          )}>
            {notification.title}
          </span>
          <span className="text-[10px] font-medium text-slate-400 tabular-nums">
            {relativeTime(notification.created_at)}
          </span>
        </div>
        
        {notification.body && (
          <p className="line-clamp-2 text-[12px] leading-relaxed text-slate-500">
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
            "hover:bg-slate-100 hover:ring-4 hover:ring-slate-50 active:scale-90",
            isOpen && "bg-slate-100"
          )}
        >
          <Bell className={cn("h-5 w-5 transition-transform duration-300 group-hover:rotate-12", isOpen ? "fill-slate-600 text-slate-600" : "text-slate-500")} />
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: primaryColor }} />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-white" style={{ backgroundColor: primaryColor }} />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[380px] overflow-hidden rounded-[24px] border-slate-200/60 bg-white/80 p-0 shadow-2xl backdrop-blur-xl"
        align="end"
        sideOffset={12}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100/50 bg-white/50 px-5 py-4">
          <div className="flex flex-col">
            <h3 className="text-lg font-bold tracking-tight text-slate-900">Notifications</h3>
            <p className="text-[11px] font-medium text-slate-400">
              {unreadCount > 0 ? `Vous avez ${unreadCount} messages non lus` : "Tout est à jour"}
            </p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-600">
              {/* <Settings2 className="h-4 w-4" /> */}
            </Button>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="h-8 rounded-full text-[11px] font-bold text-slate-500 hover:bg-slate-100"
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
             <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-10 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 ring-8 ring-slate-50/50">
              <Sparkles className="h-8 w-8 text-slate-200" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900">Zéro distraction</h4>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Profitez du calme. On vous préviendra dès qu'il y aura du nouveau.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[420px]">
            <div className="divide-y divide-slate-50">
              {notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} onRead={refresh} primaryColor={primaryColor} />
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        {/* <div className="border-t border-slate-100/50 bg-slate-50/50 p-3">
          <button className="w-full rounded-xl py-2 text-center text-[11px] font-bold text-slate-500 transition-colors hover:bg-white hover:text-slate-900 hover:shadow-sm">
            Voir tout l'historique
          </button>
        </div> */}
      </PopoverContent>
    </Popover>
  )
}