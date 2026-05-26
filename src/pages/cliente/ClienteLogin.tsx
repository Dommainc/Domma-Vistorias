import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useClienteAuth } from "@/hooks/useClienteAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Building2, KeyRound } from "lucide-react";
import { formatCPF } from "@/lib/cpf";
import { toast } from "sonner";
import { isValid, parseISO } from "date-fns";

export default function ClienteLogin() {
  const navigate = useNavigate();
  const { login } = useClienteAuth();
  const [cpf, setCpf] = useState("");
  const [dia, setDia] = useState("");
  const [mes, setMes] = useState("");
  const [ano, setAno] = useState("");
  const [loading, setLoading] = useState(false);
  const [dateError, setDateError] = useState("");

  const mesRef = useRef<HTMLInputElement>(null);
  const anoRef = useRef<HTMLInputElement>(null);

  const buildDate = () => {
    if (!dia || !mes || !ano || ano.length < 4) return null;
    const d = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    if (!isValid(parseISO(d))) return null;
    const parsed = parseISO(d);
    if (parsed > new Date()) return null;
    return d;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDateError("");
    if (!cpf) { toast.error("Preencha o CPF"); return; }
    const dataNascimento = buildDate();
    if (!dataNascimento) { setDateError("Data de nascimento inválida."); return; }
    setLoading(true);
    const { error } = await login(cpf.replace(/\D/g, ''), dataNascimento);
    setLoading(false);
    if (error) { toast.error(error); return; }
    navigate('/cliente');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(160deg, #0d1829 0%, #1a2744 50%, #1e3a5f 100%)" }}
    >
      <div className="w-full max-w-sm animate-slide-up">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 border border-white/20 mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-white">Domma Vistorias</h1>
          <p className="text-sm text-blue-200 mt-1">Portal do Cliente</p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-5">
            <KeyRound className="h-4 w-4 text-blue-300" />
            <p className="text-sm text-blue-200 font-medium">Acesse com seu CPF e data de nascimento</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-blue-100 text-sm">CPF</Label>
              <Input
                value={cpf}
                onChange={e => setCpf(formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
                inputMode="numeric"
                className="h-12 text-base bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-blue-400 focus:ring-blue-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-blue-100 text-sm">Data de Nascimento</Label>
              <div className="flex gap-2">
                {[
                  { label: "Dia", placeholder: "DD", max: 2, maxVal: 31, value: dia, onChange: (v: string) => { setDia(v); setDateError(""); if (v.length === 2) mesRef.current?.focus(); } },
                  { label: "Mês", placeholder: "MM", max: 2, maxVal: 12, value: mes, ref: mesRef, onChange: (v: string) => { setMes(v); setDateError(""); if (v.length === 2) anoRef.current?.focus(); } },
                  { label: "Ano", placeholder: "AAAA", max: 4, maxVal: new Date().getFullYear(), value: ano, ref: anoRef, onChange: (v: string) => { setAno(v.slice(0, 4)); setDateError(""); }, flex: "flex-[1.5]" },
                ].map((field, i) => (
                  <div key={i} className={`flex flex-col ${(field as any).flex || 'flex-1'}`}>
                    <label className="text-[11px] text-blue-300 mb-1">{field.label}</label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder={field.placeholder}
                      min={1}
                      max={field.maxVal}
                      ref={(field as any).ref}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value.slice(0, field.max))}
                      className="h-12 text-base text-center bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-blue-400"
                    />
                  </div>
                ))}
              </div>
              {dateError && <p className="text-xs text-red-300 mt-1">{dateError}</p>}
            </div>

            <Button
              className="w-full h-12 text-base font-semibold rounded-xl bg-white text-[#1a2744] hover:bg-blue-50 transition-colors"
              type="submit"
              disabled={loading}
            >
              {loading ? "Acessando..." : "Acessar Portal"}
            </Button>
          </form>

          <p className="text-xs text-blue-400 text-center mt-5">
            Problemas com acesso? Entre em contato com a construtora.
          </p>
        </div>
      </div>
    </div>
  );
}
