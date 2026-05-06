import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  value: string;
  subtitle?: string;
  pct?: number | null;
  icon?: React.ReactNode;
}

export default function KpiCard({ title, value, subtitle, pct, icon }: Props) {
  const hasPct = pct !== null && pct !== undefined;
  const isUp = hasPct && pct > 0;
  const isDown = hasPct && pct < 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono">{value}</div>
        {(subtitle ?? hasPct) && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            {hasPct && (
              <span
                className={cn(
                  "flex items-center gap-0.5 font-medium",
                  isUp && "text-green-600",
                  isDown && "text-red-500"
                )}
              >
                {isUp ? <TrendingUp className="h-3 w-3" /> : isDown ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {Math.abs(pct!).toFixed(1)}%
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
