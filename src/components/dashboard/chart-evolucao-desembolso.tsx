"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

interface ChartEvolucaoDesembolsoProps {
  monthlyEvolution: {
    month: string;
    totalPaid: number;
  }[];
}

export function ChartEvolucaoDesembolso({
  monthlyEvolution,
}: ChartEvolucaoDesembolsoProps) {
  return (
    <Card className="p-6">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-base font-semibold">
          Evolução de Desembolso Mensal
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyEvolution}>
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tickFormatter={(v: number) => formatCurrency(v)}
              tick={{ fontSize: 11 }}
              width={120}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), "Pago"]}
              contentStyle={{ fontSize: 13 }}
            />
            <Bar
              dataKey="totalPaid"
              name="Valor Pago"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
