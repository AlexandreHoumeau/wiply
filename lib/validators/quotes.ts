import { z } from 'zod'

export const QuoteStatusSchema = z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired'])
export const QuoteItemTypeSchema = z.enum(['fixed', 'hourly', 'expense'])

export const QuoteItemSchema = z.object({
  id: z.string().uuid(),
  quote_id: z.string().uuid(),
  type: QuoteItemTypeSchema,
  label: z.string().min(1),
  description: z.string().optional(),
  quantity: z.number().min(0),
  unit_price: z.number().min(0),
  order: z.number().int(),
})

export const QuoteSchema = z.object({
  id: z.string().uuid(),
  agency_id: z.string().uuid(),
  company_id: z.string().uuid().nullable(),
  opportunity_id: z.string().uuid().nullable(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  status: QuoteStatusSchema,
  token: z.string(),
  valid_until: z.string().nullable(),
  currency: z.string().default('EUR'),
  discount_type: z.enum(['percentage', 'fixed']).nullable(),
  discount_value: z.number().nullable(),
  tax_rate: z.number().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(QuoteItemSchema).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export const CreateQuoteSchema = QuoteSchema.omit({
  id: true,
  token: true,
  status: true,
  items: true,
  agency_id: true,
  created_at: true,
  updated_at: true,
})

export const UpdateQuoteSchema = CreateQuoteSchema.partial()

export const CreateQuoteItemSchema = QuoteItemSchema.omit({
  id: true,
  quote_id: true,
})

export const UpdateQuoteItemSchema = CreateQuoteItemSchema.partial()

export type Quote = z.infer<typeof QuoteSchema>
export type QuoteItem = z.infer<typeof QuoteItemSchema>
export type CreateQuoteInput = z.infer<typeof CreateQuoteSchema>
export type UpdateQuoteInput = z.infer<typeof UpdateQuoteSchema>
export type CreateQuoteItemInput = z.infer<typeof CreateQuoteItemSchema>
export type QuoteStatus = z.infer<typeof QuoteStatusSchema>
export type QuoteItemType = z.infer<typeof QuoteItemTypeSchema>

// Allowed status transitions
export const ALLOWED_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ['sent', 'expired'],
  sent: ['accepted', 'rejected', 'expired'],
  accepted: ['expired'],
  rejected: ['expired'],
  expired: [],
}

// Computed totals helper
export function computeQuoteTotals(quote: Pick<Quote, 'discount_type' | 'discount_value' | 'tax_rate'> & { items?: Pick<QuoteItem, 'quantity' | 'unit_price'>[] }) {
  const items = quote.items ?? []
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)

  let discountAmount = 0
  if (quote.discount_type === 'percentage' && quote.discount_value != null) {
    discountAmount = subtotal * quote.discount_value / 100
  } else if (quote.discount_type === 'fixed' && quote.discount_value != null) {
    discountAmount = quote.discount_value
  }

  const taxBase = subtotal - discountAmount
  const taxAmount = quote.tax_rate != null ? taxBase * quote.tax_rate / 100 : 0
  const total = taxBase + taxAmount

  return { subtotal, discountAmount, taxAmount, total }
}
