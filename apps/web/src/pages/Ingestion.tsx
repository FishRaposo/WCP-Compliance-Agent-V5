import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Ingestion() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ingestion</h1>
        <p className="text-sm text-muted-foreground">
          Bulk import payroll and contract data.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Bulk Ingestion</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Bulk ingestion interface will be implemented in Phase 3.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
