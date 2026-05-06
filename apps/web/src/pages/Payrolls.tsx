import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Payrolls() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Payrolls</h1>
        <p className="text-sm text-muted-foreground">
          View and manage payroll records.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Payroll Records</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Payroll management interface will be implemented in Phase 3.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
