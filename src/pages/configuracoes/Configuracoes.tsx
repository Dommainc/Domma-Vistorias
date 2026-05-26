import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, UserCog } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import ConfiguracoesAgendamento from './ConfiguracoesAgendamento'
import Usuarios from '@/pages/usuarios/Usuarios'

export default function Configuracoes() {
  const { profile } = useAuth()
  const isAdmin = profile?.perfil === 'admin'

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie as configurações do sistema
        </p>
      </div>

      <Tabs defaultValue="agendamentos">
        <TabsList>
          <TabsTrigger value="agendamentos" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" /> Agendamentos
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="usuarios" className="gap-1.5">
              <UserCog className="h-3.5 w-3.5" /> Usuários
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="agendamentos" className="mt-5">
          <ConfiguracoesAgendamento embedded />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="usuarios" className="mt-5">
            <Usuarios embedded />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
