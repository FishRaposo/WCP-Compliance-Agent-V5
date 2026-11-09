import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiClient } from "../utils/api-client";
import { ShieldCheck, Lock, Mail, Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const data = await apiClient.post<{ user_id: string; role: string }>(
        "/api/auth/login",
        { email, password }
      );
      // Token is stored in httpOnly cookie by the server; only store user info
      localStorage.setItem("wcp_user", JSON.stringify({
        user_id: data.user_id,
        email,
        role: data.role,
      }));
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0c1410] relative overflow-hidden px-4">
      <Card className="w-full max-w-md bg-glass border-glass shadow-premium relative z-10 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#9a743c]" />

        <CardHeader className="text-center pt-8 pb-6">
          <div className="mx-auto w-12 h-12 rounded-xl bg-ledger-accent flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            WCP Compliance
          </h1>
          <CardDescription className="text-gray-400 mt-1.5">
            Sign in to access the Davis-Bacon audit command center
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="pl-10 bg-[#0c1410] border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20 h-11 rounded-lg transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Password</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pl-10 bg-[#0c1410] border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20 h-11 rounded-lg transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-950/20 p-3.5 border border-red-500/20 animate-in fade-in duration-300">
                <p className="text-xs text-red-400 font-medium leading-relaxed">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-ledger-accent hover:opacity-95 text-white font-medium h-11 rounded-lg shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                "Authenticate Account"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

