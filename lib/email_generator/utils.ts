import z from "zod";
import { OpportunityStatus, OpportunityWithCompany } from "../validators/oppotunities";

export const STATUS_TO_INTENT: Record<OpportunityStatus, EmailIntent> = {
    inbound: "first_contact",
    to_do: "first_contact",
    first_contact: "first_contact",
    second_contact: "follow_up",
    proposal_sent: "proposal_follow_up",
    negotiation: "negotiation",
    won: "thank_you",
    lost: "reconnect",
}

export type EmailIntent =
    | "first_contact"
    | "follow_up"
    | "no_response"
    | "proposal_sent"
    | "reconnect"
    | "proposal_follow_up"
    | "negotiation"
    | "thank_you";

export type EmailTone =
    | "very_short"
    | "professional"
    | "friendly"
    | "confident"
    | "warm"
    | "direct"


export const CONTACT_RULES = {
    email: {
        hasSubject: true,
        maxParagraphs: 3,
        greeting: "formal",
    },
    linkedin: {
        hasSubject: false,
        maxParagraphs: 2,
        greeting: "casual",
    },
    instagram: {
        hasSubject: false,
        maxParagraphs: 1,
        greeting: "very_casual",
    },
}

export type OpportunityAIContext = OpportunityWithCompany;

export const MessageSchema = z.object({
  opportunity: z.any(), // Will be parsed separately
  tone: z.enum(["formal", "friendly", "casual"]),
  length: z.enum(["short", "medium"]),
  channel: z.enum(["email", "instagram", "linkedin", "phone", "IRL"]),
  customContext: z.string().optional(),
});

export type MessageFormData = z.infer<typeof MessageSchema>;
