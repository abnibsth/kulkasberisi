"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ChartPoint = { label: string; value: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function AnalyticsChart(props: {
  title: string;
  type: "line" | "bar";
  data: ChartPoint[];
}) {
  const w = 640;
  const h = 180;
  const pad = 18;
  const data = props.data;
  const max = Math.max(1, ...data.map((d) => d.value));

  function xAt(i: number) {
    if (data.length <= 1) return pad;
    return pad + (i * (w - pad * 2)) / (data.length - 1);
  }
  function yAt(v: number) {
    const t = v / max;
    return h - pad - t * (h - pad * 2);
  }

  const path =
    data.length === 0
      ? ""
      : data
          .map((d, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(d.value).toFixed(1)}`)
          .join(" ");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{props.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-sm text-muted-foreground">Belum ada data.</div>
        ) : (
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-44">
            <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="currentColor" opacity={0.15} />
            <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="currentColor" opacity={0.15} />

            {props.type === "line" ? (
              <>
                <path d={path} fill="none" stroke="currentColor" strokeWidth={2} opacity={0.9} />
                {data.map((d, i) => (
                  <circle key={d.label + i} cx={xAt(i)} cy={yAt(d.value)} r={3} fill="currentColor" opacity={0.9} />
                ))}
              </>
            ) : (
              data.map((d, i) => {
                const barW = (w - pad * 2) / data.length;
                const x = pad + i * barW + barW * 0.15;
                const bw = barW * 0.7;
                const y = yAt(d.value);
                const bh = clamp(h - pad - y, 0, h);
                return <rect key={d.label + i} x={x} y={y} width={bw} height={bh} fill="currentColor" opacity={0.75} />;
              })
            )}
          </svg>
        )}
      </CardContent>
    </Card>
  );
}

