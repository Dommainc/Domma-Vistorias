import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClienteAuth } from "@/hooks/useClienteAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Building2, KeyRound } from "lucide-react";
import { formatCPF } from "@/lib/cpf";
import { toast } from "sonner";

export default function ClienteLogin() {
  const navigate = useNavigate();
  const { login } = useClienteAuth();
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpf) { toast.error("Preencha o CPF"); return; }
    if (!email || !/\S+@\S+\.\S+/.test(email)) { toast.error("E-mail inválido"); return; }
    setLoading(true);
    const { error } = await login(cpf.replace(/\D/g, ''), email.trim().toLowerCase());
    setLoading(false);
    if (error) { toast.error(error); return; }
    navigate('/cliente');
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      {/* Foto de fundo borrada */}
      <div
        className="absolute inset-0 scale-110"
        style={{
          backgroundImage: "url('/login-novo-fundo.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(6px)',
        }}
      />
      {/* Overlay escuro para legibilidade */}
      <div className="absolute inset-0 bg-black/55" />
      <div className="relative z-10 w-full max-w-md animate-slide-up">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 border border-white/20 mb-4">
            <img src="/logo-domma.png" alt="Domma" className="h-12 w-12 object-contain" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-white drop-shadow-lg">Domma Vistorias</h1>
          <p className="text-sm text-white/70 mt-1">Portal do Cliente</p>
        </div>

        <div className="rounded-2xl bg-[#0f1e38]/80 border border-white/10 backdrop-blur-xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <KeyRound className="h-4 w-4 text-blue-400" />
            <p className="text-sm text-blue-300 font-medium">Acesse com seu CPF e e-mail</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-white text-sm font-medium">CPF</Label>
              <Input
                value={cpf}
                onChange={e => setCpf(formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
                inputMode="numeric"
                className="h-13 text-base bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-blue-400 focus:ring-blue-400"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white text-sm font-medium">E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                inputMode="email"
                autoComplete="email"
                className="h-13 text-base bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-blue-400 focus:ring-blue-400"
              />
            </div>

            <Button
              className="w-full h-13 text-base font-semibold rounded-xl bg-white text-[#1a2744] hover:bg-blue-50 transition-colors mt-2"
              type="submit"
              disabled={loading}
            >
              {loading ? "Acessando..." : "Acessar Portal"}
            </Button>
          </form>

          <p className="text-xs text-white/40 text-center mt-6">
            Problemas com acesso? Entre em contato com a construtora.
          </p>
        </div>
      </div>
    </div>
  );
}
