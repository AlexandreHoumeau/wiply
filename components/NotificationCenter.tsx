"use client"

import { useState } from "react"
import { Bell, Check, MessageSquare, UserPlus, TrendingUp, Inbox } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useNotifications } from "@/hooks/useNotifications"
import { markAsRead } from "@/actions/notifications.server"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import type { Notification } from "@/lib/validators/notifications"

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "À l'instant"
  if (mins < 60) return `Il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `Il y a ${days}j`
}

const typeIcon: Record<string, React.ReactNode> = {
  member_joined: <UserPlus className="size-4" />,
  task_comment: <MessageSquare className="size-4" />,
  opportunity_status_changed: <TrendingUp className="size-4" />,
}

function NotificationItem({ notification, onRead, primaryColor }: { notification: Notification; onRead: () => void; primaryColor: string }) {
  const router = useRouter()
  const isUnread = !notification.read_at

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
    <button
      onClick={handleClick}
      className={cn("w-full text-left px-4 py-3.5 flex gap-3 transition-all duration-200 group relative", isUnread ? "bg-slate-50/50 hover:bg-slate-50" : "hover:bg-slate-50/80")}
    >
      {isUnread && <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-r-full" style={{ backgroundColor: primaryColor }} />}
      <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full mt-0.5 shadow-sm border border-slate-100", isUnread ? "bg-white text-slate-700" : "bg-slate-50 text-slate-400")}>
        {typeIcon[notification.type] ?? <Bell className="size-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm leading-tight truncate mb-0.5", isUnread ? "font-bold text-slate-900" : "font-medium text-slate-600")}>
          {notification.title}
        </p>
        {notification.body && <p className="text-xs text-slate-500 truncate">{notification.body}</p>}
        <p className="text-[10px] font-medium text-slate-400 mt-1.5 uppercase tracking-wider">{relativeTime(notification.created_at)}</p>
      </div>
      {isUnread && <span className="mt-1.5 size-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: primaryColor }} />}
    </button>
  )
}

export function NotificationCenter({ isCollapsed, primaryColor = "#2563EB" }: { isCollapsed?: boolean; primaryColor?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { notifications, unreadCount, isLoading, markAllAsRead } = useNotifications()

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] })

  const triggerButton = (
    <Button
      variant="ghost"
      className={cn(
        "w-full transition-all duration-200 group relative overflow-hidden h-10",
        isCollapsed ? "justify-center px-0 w-10 mx-auto" : "justify-start gap-3 px-3",
        isOpen ? "bg-slate-50" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
      )}
      style={isOpen ? { color: primaryColor } : undefined}
    >
      {isOpen && (
        <motion.div layoutId="sidebarActive" className="absolute left-0 w-1 h-5 rounded-r-full" style={{ backgroundColor: primaryColor }} transition={{ type: "spring", stiffness: 300, damping: 30 }} />
      )}

      <Bell className={cn("h-[18px] w-[18px] shrink-0 transition-colors", !isOpen && "text-slate-400 group-hover:text-slate-600")} style={isOpen ? { color: primaryColor } : undefined} />

      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} className={cn("flex-1 text-left text-sm whitespace-nowrap overflow-hidden", isOpen ? "font-bold" : "font-medium")}>
            Notifications
          </motion.span>
        )}
      </AnimatePresence>

      {!isCollapsed && unreadCount > 0 && (
        <Badge className="ml-auto h-5 min-w-5 flex items-center justify-center px-1.5 text-[10px] leading-none text-white border-0 shadow-sm" style={{ backgroundColor: primaryColor }}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
      
      {isCollapsed && unreadCount > 0 && (
        <span className="absolute top-2 right-2 size-2 rounded-full border border-white shadow-sm" style={{ backgroundColor: primaryColor }} />
      )}
    </Button>
  )

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={10} className="font-semibold rounded-lg bg-slate-900 text-white">Notifications</TooltipContent>
          </Tooltip>
        ) : triggerButton}
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0 rounded-2xl shadow-2xl border-slate-100 overflow-hidden" align="start" side="right" sideOffset={12}>
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-100 backdrop-blur-sm">
          <span className="text-sm font-bold text-slate-900">Notifications</span>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wider">
              <Check className="size-3" />
              Tout marquer
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
             <div className="size-5 rounded-full border-2 border-slate-200 border-t-slate-400 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-slate-50">
                <Inbox className="size-6 text-slate-300" />
            </div>
            <div>
                <p className="text-sm font-bold text-slate-900">Tout est à jour</p>
                <p className="text-xs text-slate-500 mt-1">Vous n'avez aucune notification.</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="max-h-[26rem]">
            <div className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} onRead={refresh} primaryColor={primaryColor} />
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  )
}