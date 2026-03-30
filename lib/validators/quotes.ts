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
  service_start_date: z.string().nullable().optional(),
  payment_terms_preset: z.enum(['immediate', '15_days', '30_days', '45_days', '60_days', 'custom']).nullable().optional(),
  payment_terms_notes: z.string().nullable().optional(),
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

export const PaymentTermsPresetSchema = z.enum(['immediate', '15_days', '30_days', '45_days', '60_days', 'custom'])
export type PaymentTermsPreset = z.infer<typeof PaymentTermsPresetSchema>

export const PAYMENT_TERMS_LABELS: Record<string, string> = {
  immediate: 'Comptant',
  '15_days': '15 jours',
  '30_days': '30 jours net',
  '45_days': '45 jours',
  '60_days': '60 jours fin de mois',
  custom: 'Personnalisé',
}

export type Quote = z.infer<typeof QuoteSchema>
export type QuoteItem = z.infer<typeof QuoteItemSchema>
export type CreateQuoteInput = z.infer<typeof CreateQuoteSchema>
export type UpdateQuoteInput = z.infer<typeof UpdateQuoteSchema>
export type CreateQuoteItemInput = z.infer<typeof CreateQuoteItemSchema>
export type QuoteStatus = z.infer<typeof QuoteStatusSchema>
export type QuoteItemType = z.infer<typeof QuoteItemTypeSchema>
export type QuoteDiscountType = NonNullable<Quote["discount_type"]>

export type QuoteCompanyRef = {
  id: string
  name: string
  business_sector?: string | null
  billing_address?: string | null
  contact_name?: string | null
  email?: string | null
}

export type QuoteOpportunityRef = {
  id: string
  name: string
  status?: string | null
  description?: string | null
}

export type QuoteAgencyRef = {
  name?: string | null
  legal_name?: string | null
  legal_form?: string | null
  rcs_number?: string | null
  vat_number?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  logo_url?: string | null
  primary_color?: string | null
  secondary_color?: string | null
}

export type QuoteListItem = Quote & {
  items?: Pick<QuoteItem, "quantity" | "unit_price">[]
  company: QuoteCompanyRef | null
  opportunity: QuoteOpportunityRef | null
}

export type QuoteDetail = Quote & {
  items: QuoteItem[]
  company: QuoteCompanyRef | null
  opportunity: QuoteOpportunityRef | null
}

export type PublicQuote = Pick<
  Quote,
  | "id"
  | "title"
  | "description"
  | "status"
  | "valid_until"
  | "currency"
  | "discount_type"
  | "discount_value"
  | "tax_rate"
  | "notes"
  | "created_at"
  | "service_start_date"
  | "payment_terms_preset"
  | "payment_terms_notes"
> & {
  items: Pick<QuoteItem, "id" | "type" | "label" | "description" | "quantity" | "unit_price" | "order">[]
  company: QuoteCompanyRef | null
  agency: QuoteAgencyRef | null
}

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
