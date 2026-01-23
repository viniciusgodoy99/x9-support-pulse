import { useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWhatsAppInstances, WhatsAppInstance } from '@/hooks/useWhatsAppInstances';
import { InstanceCard } from '@/components/whatsapp/InstanceCard';
import { AddInstanceDialog } from '@/components/whatsapp/AddInstanceDialog';
import { QrCodeDialog } from '@/components/whatsapp/QrCodeDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Smartphone, Plus, Loader2 } from 'lucide-react';

export default function WhatsAppConnect() {
  const { instances, loading, fetchInstances, createInstance, deleteInstance } = useWhatsAppInstances();
  const { toast } = useToast();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectingInstanceId, setConnectingInstanceId] = useState<string | null>(null);
  const [disconnectingInstanceId, setDisconnectingInstanceId] = useState<string | null>(null);

  const handleConnect = useCallback(async (instance: WhatsAppInstance) => {
    setSelectedInstance(instance);
    setConnectingInstanceId(instance.id);
    setShowQrDialog(true);
    setQrCode(null);

    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-connect', {
        body: { action: 'qr', instanceId: instance.id },
      });

      if (error) throw error;
      setQrCode(data.qrCode);
    } catch (err) {
      console.error('Error fetching QR code:', err);
      toast({
        title: 'Erro ao gerar QR Code',
        description: 'Não foi possível gerar o QR Code.',
        variant: 'destructive',
      });
    } finally {
      setConnectingInstanceId(null);
    }
  }, [toast]);

  const handleRefreshQr = useCallback(async () => {
    if (!selectedInstance) return;
    setConnectingInstanceId(selectedInstance.id);

    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-connect', {
        body: { action: 'qr', instanceId: selectedInstance.id },
      });

      if (error) throw error;
      setQrCode(data.qrCode);
    } catch (err) {
      console.error('Error refreshing QR code:', err);
      toast({
        title: 'Erro ao atualizar QR Code',
        description: 'Não foi possível atualizar o QR Code.',
        variant: 'destructive',
      });
    } finally {
      setConnectingInstanceId(null);
    }
  }, [selectedInstance, toast]);

  const handleCheckStatus = useCallback(async () => {
    if (!selectedInstance) return;

    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-connect', {
        body: { action: 'status', instanceId: selectedInstance.id },
      });

      if (error) throw error;

      if (data.status === 'connected') {
        toast({
          title: 'Conectado!',
          description: `WhatsApp conectado com sucesso${data.profileName ? `: ${data.profileName}` : ''}.`,
        });
        setShowQrDialog(false);
        fetchInstances();
      } else {
        toast({
          title: 'Aguardando conexão',
          description: 'Escaneie o QR Code para conectar.',
        });
      }
    } catch (err) {
      console.error('Error checking status:', err);
      toast({
        title: 'Erro ao verificar status',
        description: 'Não foi possível verificar o status da conexão.',
        variant: 'destructive',
      });
    }
  }, [selectedInstance, toast, fetchInstances]);

  const handleDisconnect = useCallback(async (instance: WhatsAppInstance) => {
    setDisconnectingInstanceId(instance.id);

    try {
      const { error } = await supabase.functions.invoke('whatsapp-connect', {
        body: { action: 'disconnect', instanceId: instance.id },
      });

      if (error) throw error;

      toast({
        title: 'Desconectado',
        description: 'WhatsApp desconectado com sucesso.',
      });
      fetchInstances();
    } catch (err) {
      console.error('Error disconnecting:', err);
      toast({
        title: 'Erro ao desconectar',
        description: 'Não foi possível desconectar o WhatsApp.',
        variant: 'destructive',
      });
    } finally {
      setDisconnectingInstanceId(null);
    }
  }, [toast, fetchInstances]);

  const handleRefreshInstance = useCallback(async (instance: WhatsAppInstance) => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-connect', {
        body: { action: 'status', instanceId: instance.id },
      });

      if (error) throw error;
      fetchInstances();

      toast({
        title: 'Status atualizado',
        description: data.status === 'connected' ? 'Conectado' : 'Desconectado',
      });
    } catch (err) {
      console.error('Error refreshing instance:', err);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive',
      });
    }
  }, [toast, fetchInstances]);

  const handleCreateInstance = async (data: Parameters<typeof createInstance>[0]) => {
    const result = await createInstance(data);
    return result !== null;
  };

  const handleDeleteInstance = async (instance: WhatsAppInstance) => {
    await deleteInstance(instance.id);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Smartphone className="h-8 w-8 text-primary" />
              Conexões WhatsApp
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie suas instâncias do WhatsApp para monitorar grupos
            </p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Instância
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : instances.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Nenhuma instância configurada</CardTitle>
              <CardDescription>
                Adicione uma instância do WhatsApp para começar a monitorar grupos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeira Instância
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {instances.map((instance) => (
              <InstanceCard
                key={instance.id}
                instance={instance}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onDelete={handleDeleteInstance}
                onRefresh={handleRefreshInstance}
                isConnecting={connectingInstanceId === instance.id}
                isDisconnecting={disconnectingInstanceId === instance.id}
              />
            ))}
          </div>
        )}
      </div>

      <AddInstanceDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubmit={handleCreateInstance}
      />

      <QrCodeDialog
        open={showQrDialog}
        onOpenChange={setShowQrDialog}
        instance={selectedInstance}
        qrCode={qrCode}
        loading={connectingInstanceId !== null}
        onRefresh={handleRefreshQr}
        onCheckStatus={handleCheckStatus}
      />
    </MainLayout>
  );
}
