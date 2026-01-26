import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  QrCode,
  Trash2,
  Star,
  User,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { WhatsAppInstance } from '@/hooks/useWhatsAppInstances';

interface InstanceCardProps {
  instance: WhatsAppInstance;
  onConnect: (instance: WhatsAppInstance) => void;
  onDisconnect: (instance: WhatsAppInstance) => void;
  onDelete: (instance: WhatsAppInstance) => void;
  onRefresh: (instance: WhatsAppInstance) => void;
  isConnecting?: boolean;
  isDisconnecting?: boolean;
}

export function InstanceCard({
  instance,
  onConnect,
  onDisconnect,
  onDelete,
  onRefresh,
  isConnecting,
  isDisconnecting,
}: InstanceCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getStatusBadge = () => {
    switch (instance.status) {
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
            Aguardando
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
    <Card className="relative">
      {instance.is_default && (
        <div className="absolute -top-2 -right-2">
          <Badge className="bg-primary text-primary-foreground">
            <Star className="h-3 w-3 mr-1" />
            Padrão
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{instance.name}</CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {instance.status === 'connected' && (
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              {instance.profile_picture_url ? (
                <AvatarImage src={instance.profile_picture_url} alt={instance.profile_name || ''} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary">
                {instance.profile_name ? (
                  instance.profile_name.charAt(0).toUpperCase()
                ) : (
                  <User className="h-5 w-5" />
                )}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {instance.profile_name || 'WhatsApp Conectado'}
              </p>
              {instance.phone_number && (
                <p className="text-sm text-muted-foreground truncate">
                  {instance.phone_number}
                </p>
              )}
            </div>
          </div>
        )}

        {instance.status !== 'connected' && (
          <p className="text-sm text-muted-foreground">
            Clique em "Conectar" para gerar o QR Code
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {instance.status === 'connected' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRefresh(instance)}
                disabled={isConnecting}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Atualizar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDisconnect(instance)}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4 mr-1" />
                )}
                Desconectar
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => onConnect(instance)}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <QrCode className="h-4 w-4 mr-1" />
              )}
              Conectar
            </Button>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover instância?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. A instância "{instance.name}" será removida
                        permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          onDelete(instance);
                          setShowDeleteDialog(false);
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Remover instância</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}
