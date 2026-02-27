import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";
import logo from "@/assets/logo-arttico.webp";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({
        title: "Erro ao entrar",
        description: "Email ou senha inválidos.",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "A senha e a confirmação precisam ser iguais.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha precisa ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      toast({
        title: "Erro ao criar conta",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSignupSuccess(true);
    }

    setLoading(false);
  };

  const switchMode = (newMode: "login" | "signup") => {
    setMode(newMode);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setSignupSuccess(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <img src={logo} alt="Arttico" className="h-12 object-contain" />
          </div>
          <CardTitle className="text-xl">Support Pulse</CardTitle>
          <CardDescription>
            {mode === "login" ? "Entre com sua conta para continuar" : "Crie sua conta de acesso"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {signupSuccess ? (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <strong>Conta criada com sucesso!</strong>
                  <p className="mt-2 text-sm">
                    Para acessar o sistema, peça ao administrador para rodar o seguinte SQL no backend:
                  </p>
                  <pre className="mt-2 bg-muted rounded p-2 text-xs overflow-auto whitespace-pre-wrap break-all">
                    {`INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = '${email}';`}
                  </pre>
                </AlertDescription>
              </Alert>
              <Button variant="outline" className="w-full" onClick={() => switchMode("login")}>
                Ir para o login
              </Button>
            </div>
          ) : (
            <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </div>
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? mode === "login"
                    ? "Entrando..."
                    : "Criando conta..."
                  : mode === "login"
                    ? "Entrar"
                    : "Criar conta"}
              </Button>
              <div className="text-center">
                {mode === "login" ? (
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
                  >
                    Não tem conta? Criar agora
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
                  >
                    Já tem conta? Fazer login
                  </button>
                )}
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
