import { useDecisionStream } from "../../hooks/useDecisionStream";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LiveFeed() {
  const { events, connected } = useDecisionStream();

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Live Decision Feed</CardTitle>
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`}
          />
          <span className="text-xs text-muted-foreground">{connected ? "Live" : "Disconnected"}</span>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {connected ? "Waiting for decisions…" : "Connect to stream to see live events."}
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {events.slice(0, 20).map((ev, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      ev.verdict === "approved"
                        ? "default"
                        : ev.verdict === "rejected"
                          ? "destructive"
                          : "secondary"
                    }
                    className="capitalize text-xs"
                  >
                    {ev.verdict ?? "unknown"}
                  </Badge>
                  <span className="text-muted-foreground font-mono text-xs truncate max-w-[120px]">
                    {ev.decision_id ?? ev.job_id ?? "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {ev.trust_score !== undefined && (
                    <span>{(ev.trust_score * 100).toFixed(0)}%</span>
                  )}
                  <span>{new Date(ev.created_at ?? Date.now()).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
