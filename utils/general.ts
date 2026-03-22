import { ContactVia, OpportunityStatus } from "@/lib/validators/oppotunities";

export const STATUS_COLORS: Record<OpportunityStatus, string> = {
    inbound: "bg-cyan-100 text-cyan-800",
    to_do: "bg-gray-100 text-gray-800",
    first_contact: "bg-blue-100 text-blue-800",
    second_contact: "bg-indigo-100 text-indigo-800",
    proposal_sent: "bg-yellow-100 text-yellow-800",
    negotiation: "bg-orange-100 text-orange-800",
    won: "bg-green-100 text-green-800",
    lost: "bg-red-100 text-red-800",
};

export const CONTACT_COLORS: Record<ContactVia, string> = {
    email: "bg-sky-100 text-sky-800",
    phone: "bg-purple-100 text-purple-800",
    IRL: "bg-emerald-100 text-emerald-800",
    instagram: "bg-lime-100 text-lime-800",
    linkedin: "bg-indigo-100 text-indigo-800",
};
