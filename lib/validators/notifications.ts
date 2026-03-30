export type Notification = {
  id: string
  type: string
  title: string
  body: string | null
  metadata: Record<string, unknown>
  read_at: string | null
  created_at: string
}
