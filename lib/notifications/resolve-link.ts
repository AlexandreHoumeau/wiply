type NotificationInput = {
  type: string
  metadata: Record<string, any>
}

/**
 * Resolves a deep-link URL from a notification's type and metadata.
 * Returns null when required metadata fields are absent (legacy notifications).
 */
export function resolveLink(notification: NotificationInput): string | null {
  const { type, metadata } = notification

  switch (type) {
    case "member_joined":
      return "/app/agency"

    case "task_comment":
    case "task_assigned":
    case "task_mention": {
      const { project_slug, task_prefix, task_number } = metadata
      if (!project_slug || !task_prefix || task_number == null) return null
      return `/app/projects/${project_slug}/board?task=${task_prefix}-${task_number}`
    }

    case "opportunity_status_changed": {
      const { opportunity_slug } = metadata
      if (!opportunity_slug) return null
      return `/app/opportunities/${opportunity_slug}`
    }

    case "portal_submission": {
      const { project_slug } = metadata
      if (!project_slug) return null
      return `/app/projects/${project_slug}/checklist`
    }

    case "tracking_click": {
      const { opportunity_slug } = metadata
      if (!opportunity_slug) return null
      return `/app/opportunities/${opportunity_slug}/tracking`
    }

    default:
      return null
  }
}
