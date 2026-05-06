import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Contracts() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Contracts</h1>
        <p className="text-sm text-muted-foreground">
          Manage and view government contracts.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Contracts Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Contract management interface will be implemented in Phase 3.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
