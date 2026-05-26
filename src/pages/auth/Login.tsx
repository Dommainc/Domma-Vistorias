import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, Eye, EyeOff, ShieldCheck, CalendarCheck, ClipboardList } from "lucide-react";

const features = [
  { icon: CalendarCheck, text: "Agendamentos inteligentes de vistorias" },
  { icon: ClipboardList, text: "Acompanhamento completo por unidade" },
  { icon: ShieldCheck, text: "Dados seguros e acessíveis a qualquer hora" },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error("Credenciais inválidas. Verifique seu e-mail e senha.");
    } else {
      navigate("/");
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel — brand ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: "linear-gradient(145deg, #0d1829 0%, #1a2744 60%, #1e3a5f 100%)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/20">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="font-heading text-xl font-bold text-white tracking-tight">
            Domma Vistorias
          </span>
        </div>

        {/* Headline */}
        <div className="space-y-6 animate-slide-up">
          <div>
            <h1 className="font-heading text-4xl font-bold text-white leading-tight">
              Gestão completa de vistorias para construtoras
            </h1>
            <p className="mt-4 text-base text-blue-200 leading-relaxed max-w-sm">
              Controle agendamentos, unidades e clientes com eficiência e clareza em um só lugar.
            </p>
          </div>
          <div className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 flex-shrink-0">
                  <Icon className="h-4 w-4 text-blue-300" />
                </div>
                <p className="text-sm text-blue-100">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-blue-400">© {new Date().getFullYear()} Domma Inc. Todos os direitos reservados.</p>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile logo */}
          <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Domma Vistorias</h1>
          </div>

          <div className="mb-8">
            <h2 className="font-heading text-2xl font-bold text-foreground">Bem-vindo de volta</h2>
            <p className="mt-1 text-sm text-muted-foreground">Entre com suas credenciais para acessar o painel</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold shadow-md"
              style={{ background: "linear-gradient(135deg, #1a2744 0%, #1e3a5f 100%)" }}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Entrando...
                </span>
              ) : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
