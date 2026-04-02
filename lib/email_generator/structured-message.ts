type StructuredEmailDraft = {
  subject: string;
  intro: string;
  observation: string;
  improvements: string[];
  outcome: string;
  cta: string;
};

function cleanSentence(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripBulletPrefix(value: string): string {
  return value.replace(/^[-*•]\s*/, "").trim();
}

function fallbackSubject(companyName: string): string {
  return `Des pistes concretes pour ${companyName}`;
}

function fallbackOutcome(companyName: string): string {
  return `L'objectif est de rendre ${companyName} plus clair et plus convaincant en ligne.`;
}

function fallbackCta(): string {
  return "Si cela peut vous etre utile, je peux vous envoyer 2 ou 3 pistes concretes.";
}

function fallbackIntro(agencyName?: string | null): string {
  if (agencyName?.trim()) {
    return `${agencyName.trim()} accompagne les structures qui veulent faire evoluer leur site avec plus de clarte et de soin.`;
  }

  return "Nous accompagnons les structures qui veulent faire evoluer leur site avec plus de clarte et de soin.";
}

export function parseStructuredEmailDraft(raw: string, companyName: string, agencyName?: string | null): StructuredEmailDraft {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  let currentKey: keyof StructuredEmailDraft | null = null;
  const buckets: Record<keyof StructuredEmailDraft, string[]> = {
    subject: [],
    intro: [],
    observation: [],
    improvements: [],
    outcome: [],
    cta: [],
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^(subject|intro|observation|improvements|outcome|cta)\s*:\s*(.*)$/i);
    if (match) {
      currentKey = match[1].toLowerCase() as keyof StructuredEmailDraft;
      const remainder = match[2]?.trim();
      if (remainder) {
        buckets[currentKey].push(remainder);
      }
      continue;
    }

    if (currentKey) {
      buckets[currentKey].push(trimmed);
    }
  }

  const improvements = buckets.improvements
    .flatMap((line) => line.split("|"))
    .map(stripBulletPrefix)
    .map(cleanSentence)
    .filter(Boolean)
    .slice(0, 4);

  return {
    subject: cleanSentence(buckets.subject.join(" ")) || fallbackSubject(companyName),
    intro: cleanSentence(buckets.intro.join(" ")) || fallbackIntro(agencyName),
    observation: cleanSentence(buckets.observation.join(" ")) || `En regardant ${companyName}, j'ai note qu'il y a probablement une marge de progression sur la clarte du site et la facon dont l'offre est presentee.`,
    improvements,
    outcome: cleanSentence(buckets.outcome.join(" ")) || fallbackOutcome(companyName),
    cta: cleanSentence(buckets.cta.join(" ")) || fallbackCta(),
  };
}

export function buildStructuredEmailBody(draft: StructuredEmailDraft, trackingLinkUrl?: string | null): string {
  const paragraphs: string[] = [
    "Bonjour,",
    draft.intro,
    draft.observation,
  ];

  if (draft.improvements.length > 0) {
    paragraphs.push(
      "Il y aurait un vrai potentiel pour :",
      draft.improvements.map((item) => `- ${item}`).join("\n")
    );
  }

  paragraphs.push(draft.outcome);
  paragraphs.push(draft.cta);

  if (trackingLinkUrl) {
    paragraphs.push(`Vous pouvez decouvrir notre demarche ici :\n${trackingLinkUrl}`);
  }

  return paragraphs.join("\n\n").trim();
}
