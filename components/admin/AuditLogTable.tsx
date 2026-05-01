"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type AuditLogItem = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: unknown | null;
  createdAt: string;
  adminId?: string;
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("id-ID");
}

export function AuditLogTable(props: { title?: string; items: AuditLogItem[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{props.title ?? "Audit Log"}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 text-left font-medium">Waktu</th>
              <th className="py-2 text-left font-medium">Action</th>
              <th className="py-2 text-left font-medium">Target</th>
              <th className="py-2 text-left font-medium">Detail</th>
            </tr>
          </thead>
          <tbody>
            {props.items.length === 0 ? (
              <tr>
                <td className="py-3 text-muted-foreground" colSpan={4}>
                  Belum ada aktivitas.
                </td>
              </tr>
            ) : (
              props.items.map((x) => (
                <tr key={x.id} className="border-b last:border-b-0">
                  <td className="py-2 whitespace-nowrap">{formatWhen(x.createdAt)}</td>
                  <td className="py-2 font-medium">{x.action}</td>
                  <td className="py-2">
                    {x.targetType}
                    {x.targetId ? <span className="text-muted-foreground"> · {x.targetId}</span> : null}
                  </td>
                  <td className="py-2">
                    {x.details ? (
                      <pre className="text-xs whitespace-pre-wrap text-muted-foreground">
                        {JSON.stringify(x.details, null, 2)}
                      </pre>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

