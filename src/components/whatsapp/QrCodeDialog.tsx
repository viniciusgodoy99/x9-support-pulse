import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, QrCode, RefreshCw } from 'lucide-react';
import { WhatsAppInstance } from '@/hooks/useWhatsAppInstances';

interface QrCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: WhatsAppInstance | null;
  qrCode: string | null;
  loading: boolean;
  onRefresh: () => void;
  onCheckStatus: () => void;
}

export function QrCodeDialog({
  open,
  onOpenChange,
  instance,
  qrCode,
  loading,
  onRefresh,
  onCheckStatus,
}: QrCodeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Conectar: {instance?.name}
          </DialogTitle>
          <DialogDescription>
            Escaneie o QR Code com seu WhatsApp para conectar
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-4">
          {qrCode ? (
            <div className="p-4 bg-background rounded-lg border">
              <img
                src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                alt="QR Code para conexão do WhatsApp"
                className="w-64 h-64 object-contain"
              />
            </div>
          ) : (
            <div className="w-64 h-64 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
              {loading ? (
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-center text-muted-foreground">
                  <QrCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Gerando QR Code...</p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onRefresh} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar QR Code
            </Button>
            <Button variant="outline" onClick={onCheckStatus} disabled={loading}>
              Verificar Conexão
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>Abra o WhatsApp no seu celular</p>
            <p>
              Vá em <strong>Configurações → Dispositivos conectados</strong>
            </p>
            <p>
              Toque em <strong>Conectar dispositivo</strong> e escaneie o código
            </p>
          </div>

          <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <span>ℹ️</span>
            <p>O QR Code expira em aproximadamente 60 segundos.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
