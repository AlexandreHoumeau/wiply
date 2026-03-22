"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getQuotes,
  getQuote,
  createQuote,
  updateQuote,
  updateQuoteStatus,
  deleteQuote,
  addQuoteItem,
  updateQuoteItem,
  deleteQuoteItem,
  reorderQuoteItems,
} from "@/actions/quotes.server"
import { CreateQuoteInput, UpdateQuoteInput, CreateQuoteItemInput, QuoteStatus } from "@/lib/validators/quotes"

export function useQuotes(filters?: { status?: string; company_id?: string; search?: string }) {
  return useQuery({
    queryKey: ["quotes", filters],
    queryFn: () => getQuotes(filters),
    staleTime: 30_000,
  })
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: ["quote", id],
    queryFn: () => getQuote(id),
    staleTime: 30_000,
    enabled: !!id,
  })
}

export function useCreateQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateQuoteInput) => createQuote(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  })
}

export function useUpdateQuote(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateQuoteInput) => updateQuote(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quote", id] })
      qc.invalidateQueries({ queryKey: ["quotes"] })
    },
  })
}

export function useUpdateQuoteStatus(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (status: QuoteStatus) => updateQuoteStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quote", id] })
      qc.invalidateQueries({ queryKey: ["quotes"] })
    },
  })
}

export function useDeleteQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteQuote(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  })
}

export function useAddQuoteItem(quoteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (item: CreateQuoteItemInput) => addQuoteItem(quoteId, item),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote", quoteId] }),
  })
}

export function useUpdateQuoteItem(quoteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, item }: { id: string; item: Partial<CreateQuoteItemInput> }) =>
      updateQuoteItem(id, item),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote", quoteId] }),
  })
}

export function useDeleteQuoteItem(quoteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteQuoteItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote", quoteId] }),
  })
}

export function useReorderQuoteItems(quoteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: string[]) => reorderQuoteItems(quoteId, orderedIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote", quoteId] }),
  })
}
