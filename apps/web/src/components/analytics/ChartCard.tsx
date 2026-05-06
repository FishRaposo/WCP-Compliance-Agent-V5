import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  loading?: boolean;
  children: ReactNode;
}

export default function ChartCard({ title, subtitle, loading, children }: ChartCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-48 w-full" /> : children}
      </CardContent>
    </Card>
  );
}
