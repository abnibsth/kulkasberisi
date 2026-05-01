"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ModerationRecipe = {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  instructions: string[];
  source?: string;
  status: "pending" | "approved" | "rejected" | string;
  rejectedReason?: string;
  createdAt: string;
};

const REJECT_PRESETS = [
  "Konten tidak sesuai (SARA, kekerasan)",
  "Resep tidak valid/tidak masuk akal",
  "Spam/promosi",
  "Duplicate recipe",
] as const;

export function RecipeApprovalCard(props: {
  recipe: ModerationRecipe;
  selected?: boolean;
  onSelectedChange?: (next: boolean) => void;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [rejectPreset, setRejectPreset] = useState<string>("");
  const [customReason, setCustomReason] = useState("");

  const reason = useMemo(() => {
    const preset = rejectPreset.trim();
    const custom = customReason.trim();
    if (preset && preset !== "__custom__") return preset;
    return custom;
  }, [customReason, rejectPreset]);

  return (
    <Card className={cn(props.recipe.status === "rejected" ? "border-destructive/30" : "")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{props.recipe.name}</CardTitle>
            <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-2">
              <span className="px-2 py-0.5 rounded-full bg-muted">
                Status: <span className="font-medium">{props.recipe.status}</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-muted">
                Source: <span className="font-medium">{props.recipe.source ?? "unknown"}</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-muted">
                {new Date(props.recipe.createdAt).toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {typeof props.selected === "boolean" ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={props.selected}
                  onChange={(e) => props.onSelectedChange?.(e.target.checked)}
                  disabled={props.disabled}
                />
                Pilih
              </label>
            ) : null}
            <Button variant="outline" onClick={() => setOpen((v) => !v)} disabled={props.disabled}>
              {open ? "Tutup" : "Preview"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">{props.recipe.description}</div>

        {open ? (
          <div className="grid md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              {props.recipe.imageUrl ? (
                <Image
                  alt={props.recipe.name}
                  src={props.recipe.imageUrl}
                  width={640}
                  height={320}
                  className="w-full h-40 object-cover rounded-lg border"
                  unoptimized
                />
              ) : (
                <div className="w-full h-40 rounded-lg border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  Tidak ada gambar
                </div>
              )}
            </div>
            <div className="md:col-span-3">
              <div className="text-sm font-medium">Langkah</div>
              <ol className="mt-2 space-y-1 text-sm list-decimal pl-4">
                {props.recipe.instructions?.slice(0, 12).map((step, idx) => (
                  <li key={idx} className="text-muted-foreground">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : null}

        {props.recipe.status === "rejected" && props.recipe.rejectedReason ? (
          <div className="text-sm text-destructive">
            Rejected: <span className="font-medium">{props.recipe.rejectedReason}</span>
          </div>
        ) : null}

        <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <Select value={rejectPreset} onValueChange={setRejectPreset} disabled={props.disabled}>
              <SelectTrigger className="w-full md:w-72">
                <SelectValue placeholder="Alasan reject..." />
              </SelectTrigger>
              <SelectContent>
                {REJECT_PRESETS.map((x) => (
                  <SelectItem key={x} value={x}>
                    {x}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">Custom</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Custom reason (optional)"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              disabled={props.disabled || rejectPreset !== "__custom__"}
              className="w-full md:w-72"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={() => props.onApprove?.()} disabled={props.disabled}>
              Approve
            </Button>
            <Button
              variant="destructive"
              onClick={() => props.onReject?.(reason)}
              disabled={props.disabled || !reason.trim()}
            >
              Reject
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
