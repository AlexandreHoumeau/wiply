import { describe, it, expect } from "vitest"
import { resolveLink } from "@/lib/notifications/resolve-link"

describe("resolveLink", () => {
  it("returns /app/agency for member_joined", () => {
    expect(resolveLink({ type: "member_joined", metadata: {} })).toBe("/app/agency")
  })

  it("returns task board URL for task_comment with full metadata", () => {
    const meta = { project_slug: "my-proj", task_prefix: "MYP", task_number: 42 }
    expect(resolveLink({ type: "task_comment", metadata: meta })).toBe(
      "/app/projects/my-proj/board?task=MYP-42"
    )
  })

  it("returns task board URL for task_assigned", () => {
    const meta = { project_slug: "crm", task_prefix: "CRM", task_number: 7 }
    expect(resolveLink({ type: "task_assigned", metadata: meta })).toBe(
      "/app/projects/crm/board?task=CRM-7"
    )
  })

  it("returns task board URL for task_mention", () => {
    const meta = { project_slug: "crm", task_prefix: "CRM", task_number: 3 }
    expect(resolveLink({ type: "task_mention", metadata: meta })).toBe(
      "/app/projects/crm/board?task=CRM-3"
    )
  })

  it("returns null for task_comment when metadata is missing slug", () => {
    expect(resolveLink({ type: "task_comment", metadata: { task_id: "abc" } })).toBeNull()
  })

  it("returns opportunity URL for opportunity_status_changed", () => {
    const meta = { opportunity_slug: "my-opp" }
    expect(resolveLink({ type: "opportunity_status_changed", metadata: meta })).toBe(
      "/app/opportunities/my-opp"
    )
  })

  it("returns null for opportunity_status_changed when slug missing", () => {
    expect(resolveLink({ type: "opportunity_status_changed", metadata: {} })).toBeNull()
  })

  it("returns checklist URL for portal_submission", () => {
    const meta = { project_slug: "client-proj" }
    expect(resolveLink({ type: "portal_submission", metadata: meta })).toBe(
      "/app/projects/client-proj/checklist"
    )
  })

  it("returns null for portal_submission when slug missing", () => {
    expect(resolveLink({ type: "portal_submission", metadata: {} })).toBeNull()
  })

  it("returns tracking URL for tracking_click", () => {
    const meta = { opportunity_slug: "big-deal" }
    expect(resolveLink({ type: "tracking_click", metadata: meta })).toBe(
      "/app/opportunities/big-deal/tracking"
    )
  })

  it("returns null for tracking_click when slug missing", () => {
    expect(resolveLink({ type: "tracking_click", metadata: {} })).toBeNull()
  })

  it("returns null for unknown type", () => {
    expect(resolveLink({ type: "unknown_type", metadata: {} })).toBeNull()
  })
})
