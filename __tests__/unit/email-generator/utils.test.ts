import { describe, it, expect } from "vitest";
import {
  STATUS_TO_INTENT,
  CONTACT_RULES,
  MessageSchema,
} from "@/lib/email_generator/utils";

describe("STATUS_TO_INTENT", () => {
  it("couvre les 8 statuts d'opportunité", () => {
    const statuses = [
      "inbound", "to_do", "first_contact", "second_contact",
      "proposal_sent", "negotiation", "won", "lost",
    ];
    for (const s of statuses) {
      expect(STATUS_TO_INTENT[s as keyof typeof STATUS_TO_INTENT]).toBeDefined();
    }
  });

  it("inbound → first_contact", () => {
    expect(STATUS_TO_INTENT.inbound).toBe("first_contact");
  });

  it("to_do et first_contact → first_contact", () => {
    expect(STATUS_TO_INTENT.to_do).toBe("first_contact");
    expect(STATUS_TO_INTENT.first_contact).toBe("first_contact");
  });

  it("second_contact → follow_up", () => {
    expect(STATUS_TO_INTENT.second_contact).toBe("follow_up");
  });

  it("proposal_sent → proposal_follow_up", () => {
    expect(STATUS_TO_INTENT.proposal_sent).toBe("proposal_follow_up");
  });

  it("won → thank_you", () => {
    expect(STATUS_TO_INTENT.won).toBe("thank_you");
  });

  it("lost → reconnect", () => {
    expect(STATUS_TO_INTENT.lost).toBe("reconnect");
  });
});

describe("CONTACT_RULES", () => {
  it("email : hasSubject=true, 3 paragraphes max", () => {
    expect(CONTACT_RULES.email.hasSubject).toBe(true);
    expect(CONTACT_RULES.email.maxParagraphs).toBe(3);
  });

  it("linkedin : hasSubject=false (pas de ligne objet)", () => {
    expect(CONTACT_RULES.linkedin.hasSubject).toBe(false);
  });

  it("instagram : hasSubject=false, 1 paragraphe max (DM court)", () => {
    expect(CONTACT_RULES.instagram.hasSubject).toBe(false);
    expect(CONTACT_RULES.instagram.maxParagraphs).toBe(1);
  });

  it("instagram est plus court que linkedin qui est plus court que email", () => {
    expect(CONTACT_RULES.instagram.maxParagraphs).toBeLessThan(CONTACT_RULES.linkedin.maxParagraphs);
    expect(CONTACT_RULES.linkedin.maxParagraphs).toBeLessThan(CONTACT_RULES.email.maxParagraphs);
  });
});

describe("MessageSchema", () => {
  const validPayload = {
    opportunity: { id: "opp-1" },
    tone: "formal" as const,
    length: "short" as const,
    channel: "email" as const,
    customContext: "Contexte personnalisé",
  };

  it("valide un payload correct", () => {
    const result = MessageSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("customContext est optionnel", () => {
    const { customContext: _customContext, ...withoutContext } = validPayload;
    const result = MessageSchema.safeParse(withoutContext);
    expect(result.success).toBe(true);
  });

  it("rejette un tone invalide", () => {
    const result = MessageSchema.safeParse({ ...validPayload, tone: "aggressive" });
    expect(result.success).toBe(false);
  });

  it("rejette un channel inconnu", () => {
    const result = MessageSchema.safeParse({ ...validPayload, channel: "fax" });
    expect(result.success).toBe(false);
  });

  it("rejette un length invalide", () => {
    const result = MessageSchema.safeParse({ ...validPayload, length: "extra-long" });
    expect(result.success).toBe(false);
  });

  it("accepte tous les channels valides", () => {
    const channels = ["email", "instagram", "linkedin", "phone", "IRL"] as const;
    for (const channel of channels) {
      const result = MessageSchema.safeParse({ ...validPayload, channel });
      expect(result.success, `channel '${channel}' devrait être valide`).toBe(true);
    }
  });
});
