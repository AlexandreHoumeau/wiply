// app/(...)_components/AgencyBrandingDialog.tsx
"use client";

import { updateAgencyBranding } from "@/actions/agency.server";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import * as Popover from "@radix-ui/react-popover";
import { Camera, Check, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { HexColorInput, HexColorPicker } from "react-colorful";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full h-11" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Enregistrement...
        </>
      ) : (
        <>
          <Check className="mr-2 h-4 w-4" />
          Enregistrer les modifications
        </>
      )}
    </Button>
  );
}

// Preset palette for quick picks
const PRESETS = [
  "#0F172A", "#1E293B", "#111827", "#1C1917",
  "#6366F1", "#8B5CF6", "#EC4899", "#EF4444",
  "#F97316", "#EAB308", "#22C55E", "#06B6D4",
];

function ColorPicker({
  label,
  sublabel,
  color,
  onChange,
  name,
}: {
  label: string;
  sublabel: string;
  color: string;
  onChange: (c: string) => void;
  name: string;
}) {
  const [open, setOpen] = useState(false);

  // normalise hex for HexColorPicker (must be 6-char with #)
  const safeColor = /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#000000";

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="w-full flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 hover:border-border/80 transition-colors shadow-sm text-left"
          >
            <div
              className="h-8 w-8 rounded-lg shrink-0 border border-black/10 shadow-sm"
              style={{ backgroundColor: safeColor }}
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground font-mono uppercase tracking-wide">
                {safeColor}
              </p>
              <p className="text-[10px] text-muted-foreground">{sublabel}</p>
            </div>
          </button>
        </Popover.Trigger>

        {/* Hidden input carries the value for the form */}
        <input type="hidden" name={name} value={safeColor} />

        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="start"
            sideOffset={8}
            className="z-[200] rounded-2xl border border-border bg-background shadow-xl p-4 w-[240px] space-y-3 outline-none animate-in fade-in-0 zoom-in-95"
          >
            {/* Picker */}
            <HexColorPicker
              color={safeColor}
              onChange={onChange}
              style={{ width: "100%", height: 160, borderRadius: 12 }}
            />

            {/* Hex input */}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
              <span className="text-xs font-semibold text-muted-foreground">#</span>
              <HexColorInput
                color={safeColor}
                onChange={onChange}
                prefixed={false}
                className="flex-1 bg-transparent text-xs font-mono font-semibold text-foreground uppercase outline-none tracking-widest min-w-0"
              />
            </div>

            {/* Preset swatches */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                Couleurs rapides
              </p>
              <div className="grid grid-cols-6 gap-1.5">
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onChange(preset)}
                    className="h-7 w-7 rounded-lg border-2 transition-all hover:scale-110"
                    style={{
                      backgroundColor: preset,
                      borderColor: safeColor === preset ? "#334155" : "transparent",
                      boxShadow: safeColor === preset ? "0 0 0 2px #fff inset" : undefined,
                    }}
                  />
                ))}
              </div>
            </div>

            <Popover.Arrow className="fill-background" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

export function AgencyBrandingDialog({
  agency,
  companyInitial,
  isAdmin,
}: {
  agency: any;
  companyInitial: string;
  isAdmin: boolean;
}) {
  const [state, formAction] = useActionState(updateAgencyBranding, null);
  const [preview, setPreview] = useState<string | null>(agency?.logo_url || null);
  const [primaryColor, setPrimaryColor] = useState<string>(
    agency?.primary_color || "#0F172A"
  );
  const [secondaryColor, setSecondaryColor] = useState<string>(
    agency?.secondary_color || "#6366F1"
  );
  const [open, setOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
      setPreview(URL.createObjectURL(file));
    }
  };

  const safeSecondary = /^#[0-9A-Fa-f]{6}$/.test(secondaryColor) ? secondaryColor : "#6366F1";
  const safePrimary = /^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : "#0F172A";

  // The logo box shown on the agency page (trigger or static display)
  const LogoBox = (
    <div
      className={`h-20 w-20 shrink-0 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-2xl relative overflow-hidden group ${isAdmin ? "cursor-pointer" : ""}`}
      style={{
        backgroundColor: agency?.primary_color
          ? `${agency.primary_color}80`
          : undefined,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {agency?.logo_url ? (
        <img
          src={agency.logo_url}
          alt={`${agency.name} logo`}
          className="h-full w-full object-contain p-1 relative z-10 transition-transform group-hover:scale-105"
        />
      ) : (
        <span className="text-3xl font-medium text-white relative z-10">
          {companyInitial}
        </span>
      )}

      {isAdmin && (
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center z-20">
          <Camera className="h-6 w-6 text-white mb-1" />
          <span className="text-[9px] font-medium text-white uppercase tracking-wider">
            Modifier
          </span>
        </div>
      )}
    </div>
  );

  if (!isAdmin) return LogoBox;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{LogoBox}</DialogTrigger>

      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">
              Identité visuelle
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Personnalisez le logo et les couleurs de votre agence.
            </p>
          </DialogHeader>
        </div>

        <form action={formAction} className="divide-y divide-border">
          {/* Live brand preview */}
          <div className="px-6 py-5 bg-muted/50">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Aperçu en direct
            </p>
            <div
              className="relative overflow-hidden rounded-xl p-4 flex items-center gap-3 transition-colors duration-300"
              style={{ backgroundColor: safePrimary }}
            >
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(circle at 85% 10%, ${safeSecondary}, transparent 55%)`,
                }}
              />
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 relative z-10 overflow-hidden border border-white/20"
                style={{ backgroundColor: `${safeSecondary}40` }}
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="Logo preview"
                    className="h-full w-full object-contain p-0.5"
                  />
                ) : (
                  <span className="text-sm font-semibold text-white">
                    {companyInitial}
                  </span>
                )}
              </div>
              <div className="relative z-10 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {agency?.name ?? "Votre Agence"}
                </p>
                <div
                  className="mt-0.5 inline-flex items-center gap-1.5 rounded-full border border-white/20 px-2 py-0.5"
                  style={{ backgroundColor: `${safeSecondary}35` }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-medium text-white/80">
                    Système Actif
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Logo upload */}
          <div className="px-6 py-5 space-y-2">
            <p className="text-xs font-semibold text-foreground">
              Logo de l&apos;agence
            </p>
            <div
              className={`relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer ${
                isDragging
                  ? "border-border bg-muted"
                  : "border-border bg-muted/50 hover:border-border/80 hover:bg-muted"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <div className="flex items-center gap-4 p-4">
                <div className="h-14 w-14 rounded-xl border border-border bg-card flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Logo preview"
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <Upload className="h-5 w-5 text-muted-foreground/30" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {preview ? "Changer le logo" : "Ajouter un logo"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    PNG, JPEG, SVG · Max 2 MB
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    Cliquer ou glisser-déposer
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                name="logo"
                accept="image/png, image/jpeg, image/svg+xml"
                onChange={handleFileChange}
                className="sr-only"
              />
            </div>
          </div>

          {/* Color pickers */}
          <div className="px-6 py-5 space-y-3">
            <p className="text-xs font-semibold text-foreground">
              Couleurs de marque
            </p>
            <div className="grid grid-cols-2 gap-3">
              <ColorPicker
                label="Primaire"
                sublabel="Arrière-plan principal"
                color={primaryColor}
                onChange={setPrimaryColor}
                name="primaryColor"
              />
              <ColorPicker
                label="Secondaire"
                sublabel="Accent & badges"
                color={secondaryColor}
                onChange={setSecondaryColor}
                name="secondaryColor"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-muted/50 space-y-3">
            {state?.message && (
              <p
                className={`text-xs text-center font-medium ${
                  state.success ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {state.message}
              </p>
            )}
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
