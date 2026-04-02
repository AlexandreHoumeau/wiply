import { ContactVia, OpportunityStatus } from "@/lib/validators/oppotunities";

type ExtractMessagePartsInput = {
  rawText: string;
  channel: ContactVia;
  status: OpportunityStatus;
  companyName: string;
};

type EvaluateMessageQualityInput = {
  channel: ContactVia;
  subject: string | null;
  body: string;
  companyName: string;
  companyWebsite?: string | null;
  trackingLinkUrl?: string | null;
};

const CTA_REGEX =
  /(appel|échange|créneau|retour|disponible|disponibilités|rendez-vous|rdv|qu[' ]en pensez-vous|cela vous dirait|seriez-vous|pouvons-nous|je vous propose|si cela vous parle)/i;

const GENERIC_OPENING_REGEXES = [
  /^j[' ]esp[eè]re que vous allez bien/i,
  /^j[' ]esp[eè]re que vous vous portez bien/i,
  /^j[' ]esp[eè]re que tout va bien/i,
  /^en esp[eé]rant que vous allez bien/i,
  /^je me permets de vous contacter/i,
  /^je vous contacte aujourd['’]hui/i,
];

const FLUFFY_PHRASE_REGEXES = [
  /a tout pour plaire/i,
  /refl[eè]te cette [a-z]+ et cette [a-z]+/i,
  /visuels percutants/i,
  /au c[oœ]ur du projet/i,
  /tout en pla[çc]ant l['’]utilisateur/i,
  /imaginez /i,
  /energie et cette rigueur/i,
];

const PUSHY_CTA_REGEXES = [
  /si le sujet vous int[eé]resse/i,
  /10 minutes? par t[eé]l[eé]phone/i,
  /quand seriez-vous disponible cette semaine/i,
  /seriez-vous disponible cette semaine/i,
];

const SPECULATIVE_CLAIM_REGEXES = [
  /avis clients tr[eè]s positifs/i,
  /avis (qui parlent d['’]eux[- ]m[eê]mes|clients positifs)/i,
  /service client tr[eè]s appr[eé]ci[ée]s?/i,
  /augmenter significativement/i,
  /nous avons travaill[eé] sur des projets similaires/i,
  /par exemple, nous avons travaill[eé]/i,
  /optimiser votre r[eé]f[eé]rencement local/i,
  /commander en ligne/i,
];

const SPECULATIVE_FEATURE_REGEXES = [
  /configurateur/i,
  /syst[eè]me de r[eé]servation/i,
  /r[eé]servation en ligne/i,
];

const GREETING_LINE_REGEX = /^(bonjour|bonsoir|salut|hello|cher|chere|madame|monsieur)\b/i;
const GENERIC_SUBJECT_REGEXES = [
  /^bonjour$/i,
  /^bonsoir$/i,
  /^site web pour /i,
  /^prise de contact$/i,
  /^suite a /i,
  /^relance$/i,
  /^message$/i,
];

const STATUS_SUBJECT_PREFIX: Record<OpportunityStatus, string> = {
  inbound: "Suite a votre demande",
  to_do: "Prise de contact",
  first_contact: "Suite a mon precedent message",
  second_contact: "Relance",
  proposal_sent: "Suite a la proposition",
  negotiation: "Suite a nos echanges",
  won: "Bienvenue",
  lost: "Merci pour votre retour",
};

function cleanLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeBody(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildFallbackSubject(status: OpportunityStatus, companyName: string): string {
  const prefix = STATUS_SUBJECT_PREFIX[status];

  if (prefix) {
    return `${prefix} avec ${companyName}`.slice(0, 120);
  }

  return `Des pistes concretes pour ${companyName}`.slice(0, 120);
}

export function extractMessageParts({
  rawText,
  channel,
  status,
  companyName,
}: ExtractMessagePartsInput): { subject: string | null; body: string } {
  const normalized = rawText.replace(/\r\n/g, "\n").trim();

  if (channel !== "email") {
    return { subject: null, body: normalizeBody(normalized) };
  }

  const lines = normalized.split("\n");
  const subjectLineIndex = lines.findIndex((line) => /^(objet|sujet|subject)\s*:/i.test(line.trim()));

  let subject: string | null = null;
  let body = normalized;

  if (subjectLineIndex !== -1) {
    subject = cleanLine(lines[subjectLineIndex].replace(/^(objet|sujet|subject)\s*:\s*/i, ""));
    body = lines.slice(subjectLineIndex + 1).join("\n");
  } else if (lines.length > 1 && !GREETING_LINE_REGEX.test(lines[0].trim())) {
    subject = cleanLine(lines[0]);
    body = lines.slice(1).join("\n");
  }

  subject = subject?.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim() || null;
  body = normalizeBody(body);

  if (!subject) {
    subject = buildFallbackSubject(status, companyName);
  }

  return { subject, body };
}

export function evaluateMessageQuality({
  channel,
  subject,
  body,
  companyName,
  companyWebsite,
  trackingLinkUrl,
}: EvaluateMessageQualityInput): string[] {
  const issues: string[] = [];
  const trimmedBody = body.trim();
  const firstLine = trimmedBody.split("\n").find(Boolean)?.trim() ?? "";

  const minimumLength = channel === "email" ? 80 : 24;
  if (trimmedBody.length < minimumLength) {
    issues.push("Le message est trop court pour etre credible et utile.");
  }

  if (channel === "email" && !subject?.trim()) {
    issues.push("L'email doit contenir un objet clair.");
  }

  if (channel === "email" && subject?.trim() && GENERIC_SUBJECT_REGEXES.some((regex) => regex.test(subject.trim()))) {
    issues.push("L'objet est trop generique. Il faut une formule plus concrete et plus engageante.");
  }

  if (GENERIC_OPENING_REGEXES.some((regex) => regex.test(firstLine))) {
    issues.push("L'accroche est trop generique. Elle doit commencer par une observation plus specifique.");
  }

  if (FLUFFY_PHRASE_REGEXES.some((regex) => regex.test(trimmedBody))) {
    issues.push("Le texte sonne trop marketing ou decoratif. Il faut un style plus simple, plus direct et plus sobre.");
  }

  if (SPECULATIVE_CLAIM_REGEXES.some((regex) => regex.test(trimmedBody))) {
    issues.push("Le message contient des preuves ou resultats non verifies. Supprime toute affirmation non presente dans le contexte.");
  }

  if (!companyWebsite && SPECULATIVE_FEATURE_REGEXES.some((regex) => regex.test(trimmedBody))) {
    issues.push("Le message propose des fonctionnalites trop speculatives. Reste sur une valeur generale sans imaginer des features precises.");
  }

  if (!CTA_REGEX.test(trimmedBody)) {
    issues.push("Le message doit se terminer par un appel a l'action clair.");
  }

  if (PUSHY_CTA_REGEXES.some((regex) => regex.test(trimmedBody))) {
    issues.push("Le CTA est trop commercial ou trop scripté. Il faut une fin plus simple, plus naturelle et moins pressante.");
  }

  if (!new RegExp(companyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(trimmedBody)) {
    issues.push("Le nom de l'entreprise doit apparaitre dans le message pour renforcer la personnalisation.");
  }

  if (trackingLinkUrl && !trimmedBody.includes(trackingLinkUrl)) {
    issues.push("Le lien de tracking actif doit etre inclus dans le message final.");
  }

  if (channel === "email" && trimmedBody.length > 900) {
    issues.push("L'email est trop long. Il faut un message plus court et plus direct.");
  }

  return issues;
}
