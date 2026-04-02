import { describe, expect, it } from "vitest";

import {
  buildStructuredEmailBody,
  parseStructuredEmailDraft,
} from "@/lib/email_generator/structured-message";

describe("parseStructuredEmailDraft", () => {
  it("parses the tagged response into structured fields", () => {
    const draft = parseStructuredEmailDraft(
      [
        "subject: Site web pour Acme",
        "intro: Avec ma compagne, on a cree Atelier Voisin.",
        "observation: En regardant Acme, j'ai note que la presentation de l'offre manque de clarte.",
        "improvements: clarifier les pages cles | mieux hierarchiser les contenus | rendre la navigation plus directe",
        "outcome: L'objectif est de rendre le site plus clair et plus convaincant.",
        "cta: Si vous le souhaitez, nous pouvons vous partager quelques pistes concretes, sans engagement.",
      ].join("\n"),
      "Acme"
    );

    expect(draft.subject).toBe("Site web pour Acme");
    expect(draft.improvements).toHaveLength(3);
    expect(draft.observation).toContain("presentation de l'offre");
  });

  it("falls back when some fields are missing", () => {
    const draft = parseStructuredEmailDraft("subject: Bonjour", "Acme");

    expect(draft.subject).toBe("Bonjour");
    expect(draft.intro).toContain("Nous accompagnons les structures");
    expect(draft.cta).toContain("2 ou 3 pistes concretes");
  });

  it("uses a less generic fallback subject when none is provided", () => {
    const draft = parseStructuredEmailDraft("intro: Bonjour", "Acme");

    expect(draft.subject).toBe("Des pistes concretes pour Acme");
  });
});

describe("buildStructuredEmailBody", () => {
  it("builds a deterministic email body from structured parts", () => {
    const body = buildStructuredEmailBody(
      {
        subject: "Site web pour Acme",
        intro: "Avec ma compagne, on a cree Atelier Voisin.",
        observation: "En regardant Acme, j'ai note que l'offre pourrait etre presentee plus clairement.",
        improvements: ["clarifier les pages cles", "mieux hierarchiser les contenus"],
        outcome: "L'objectif est de rendre le site plus clair et plus convaincant.",
        cta: "Si vous le souhaitez, nous pouvons vous partager quelques pistes concretes, sans engagement.",
      },
      "https://wiply.app/t/abc123"
    );

    expect(body).toContain("Bonjour,");
    expect(body).toContain("Il y aurait un vrai potentiel pour :");
    expect(body).toContain("- clarifier les pages cles");
    expect(body).toContain("https://wiply.app/t/abc123");
  });
});
