import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWhatsAppConnection } from "@/hooks/useWhatsAppConnection";
import { Smartphone, RefreshCw, CheckCircle2, XCircle, Loader2, QrCode, LogOut } from "lucide-react";

export default function WhatsAppConnect() {
  const { status, qrCode, loading, error, fetchQrCode, checkStatus, disconnect } = useWhatsAppConnection();

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-primary/20 text-primary border-primary/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Conectado
          </Badge>
        );
      case 'waiting':
        return (
          <Badge className="bg-accent text-accent-foreground border-accent">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Aguardando scan
          </Badge>
        );
      case 'loading':
        return (
          <Badge variant="secondary">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Verificando...
          </Badge>
        );
      default:
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Desconectado
          </Badge>
        );
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Smartphone className="h-8 w-8 text-primary" />
            Conectar WhatsApp
          </h1>
          <p className="text-muted-foreground mt-1">
            Conecte sua instância do WhatsApp para monitorar grupos
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  QR Code de Conexão
                </CardTitle>
                <CardDescription>
                  Escaneie o QR Code com seu WhatsApp para conectar
                </CardDescription>
              </div>
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {status === 'connected' ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold">WhatsApp Conectado!</h3>
                  <p className="text-muted-foreground text-sm">
                    Sua instância está ativa e monitorando grupos
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={checkStatus} disabled={loading}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Verificar Status
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={disconnect}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Desconectando...
                      </>
                    ) : (
                      <>
                        <LogOut className="h-4 w-4 mr-2" />
                        Desconectar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-6">
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
                    <div className="text-center text-muted-foreground">
                      <QrCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Clique no botão abaixo<br />para gerar o QR Code</p>
                    </div>
                  </div>
                )}

                {error && (
                  <p className="text-destructive text-sm text-center">{error}</p>
                )}

                <div className="flex gap-2">
                  <Button onClick={fetchQrCode} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {qrCode ? 'Atualizar QR Code' : 'Gerar QR Code'}
                      </>
                    )}
                  </Button>
                  
                  {status === 'waiting' && (
                    <Button variant="outline" onClick={checkStatus}>
                      Verificar Conexão
                    </Button>
                  )}
                </div>

                {status === 'waiting' && (
                  <div className="text-center text-sm text-muted-foreground">
                    <p>Abra o WhatsApp no seu celular</p>
                    <p>Vá em <strong>Configurações → Dispositivos conectados</strong></p>
                    <p>Toque em <strong>Conectar dispositivo</strong> e escaneie o código</p>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="bg-muted rounded-full p-1">ℹ️</span>
                <div>
                  <p>O QR Code expira em aproximadamente 60 segundos.</p>
                  <p>Se expirar, clique em "Atualizar QR Code" para gerar um novo.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
