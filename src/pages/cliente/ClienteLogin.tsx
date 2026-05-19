import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useClienteAuth } from "@/hooks/useClienteAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
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
    if (!dataNascimento) {
      setDateError("Data de nascimento inválida.");
      return;
    }
    setLoading(true);
    const { error } = await login(cpf.replace(/\D/g, ''), dataNascimento);
    setLoading(false);
    if (error) { toast.error(error); return; }
    navigate('/cliente');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary mx-auto mb-3">
            <Building2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="font-heading text-xl">Domma Vistorias</CardTitle>
          <p className="text-sm text-muted-foreground">Portal do Cliente — Acesse com seu CPF e data de nascimento</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input
                value={cpf}
                onChange={e => setCpf(formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
                inputMode="numeric"
                className="text-base h-12"
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Nascimento</Label>
              <div className="flex gap-2">
                <div className="flex flex-col flex-1">
                  <label className="text-xs text-muted-foreground mb-1">Dia</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="DD"
                    min={1}
                    max={31}
                    value={dia}
                    onChange={(e) => {
                      const v = e.target.value.slice(0, 2);
                      setDia(v);
                      setDateError("");
                      if (v.length === 2) mesRef.current?.focus();
                    }}
                    className="text-base h-12 text-center"
                  />
                </div>
                <div className="flex flex-col flex-1">
                  <label className="text-xs text-muted-foreground mb-1">Mês</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="MM"
                    min={1}
                    max={12}
                    ref={mesRef}
                    value={mes}
                    onChange={(e) => {
                      const v = e.target.value.slice(0, 2);
                      setMes(v);
                      setDateError("");
                      if (v.length === 2) anoRef.current?.focus();
                    }}
                    className="text-base h-12 text-center"
                  />
                </div>
                <div className="flex flex-col flex-[1.5]">
                  <label className="text-xs text-muted-foreground mb-1">Ano</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="AAAA"
                    min={1900}
                    max={new Date().getFullYear()}
                    ref={anoRef}
                    value={ano}
                    onChange={(e) => {
                      setAno(e.target.value.slice(0, 4));
                      setDateError("");
                    }}
                    className="text-base h-12 text-center"
                  />
                </div>
              </div>
              {dateError && <p className="text-xs text-destructive">{dateError}</p>}
            </div>
            <Button className="w-full h-12 text-base rounded-xl" type="submit" disabled={loading}>
              {loading ? "Acessando..." : "Acessar Portal"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Problemas com acesso? Entre em contato com a construtora.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
