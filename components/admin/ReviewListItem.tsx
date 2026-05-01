"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ModerationReview = {
  id: string;
  userId: string;
  displayName: string;
  rating: number;
  message: string;
  isPublic: boolean;
  isHidden: boolean;
  createdAt: string;
};

export function ReviewListItem(props: {
  review: ModerationReview;
  onToggleHidden?: (next: boolean) => void;
  onTogglePublic?: (next: boolean) => void;
  onDelete?: () => void;
  disabled?: boolean;
}) {
  const r = props.review;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{r.displayName}</CardTitle>
            <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-2">
              <span className="px-2 py-0.5 rounded-full bg-muted">
                Rating: <span className="font-medium">{r.rating}</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-muted">
                Public: <span className="font-medium">{r.isPublic ? "true" : "false"}</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-muted">
                Hidden: <span className="font-medium">{r.isHidden ? "true" : "false"}</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-muted">{new Date(r.createdAt).toLocaleString("id-ID")}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => props.onTogglePublic?.(!r.isPublic)}
              disabled={props.disabled}
            >
              {r.isPublic ? "Set Private" : "Set Public"}
            </Button>
            <Button
              variant="outline"
              onClick={() => props.onToggleHidden?.(!r.isHidden)}
              disabled={props.disabled}
            >
              {r.isHidden ? "Unhide" : "Hide"}
            </Button>
            <Button variant="destructive" onClick={() => props.onDelete?.()} disabled={props.disabled}>
              Delete
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">{r.message}</CardContent>
    </Card>
  );
}

