"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface ChartEmpenhoLiquidadoProps {
  committedInYear: number;
  settledInYear: number;
  paidInYear: number;
  fiscalYear: number;
}

export function ChartEmpenhoLiquidado({
  committedInYear,
  settledInYear,
  paidInYear,
  fiscalYear,
}: ChartEmpenhoLiquidadoProps) {
  const data = [
    {
      name: String(fiscalYear),
      Empenhado: committedInYear,
      Liquidado: settledInYear,
      Pago: paidInYear,
    },
  ];

  return (
    <Card className="p-6">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-base font-semibold">
          Empenhado / Liquidado / Pago no Exercício
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} barGap={8}>
            <XAxis dataKey="name" tick={{ fontSize: 13 }} />
            <YAxis
              tickFormatter={(v: number) => formatCurrency(v)}
              tick={{ fontSize: 11 }}
              width={120}
            />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
              contentStyle={{ fontSize: 13 }}
            />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Bar dataKey="Empenhado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Liquidado" fill="#eab308" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Pago" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
