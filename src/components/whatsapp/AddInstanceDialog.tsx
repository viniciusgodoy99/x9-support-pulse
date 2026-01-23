import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus } from 'lucide-react';
import { CreateInstanceData } from '@/hooks/useWhatsAppInstances';

interface AddInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateInstanceData) => Promise<boolean>;
}

export function AddInstanceDialog({ open, onOpenChange, onSubmit }: AddInstanceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateInstanceData>({
    name: '',
    api_url: '',
    api_token: '',
    instance_name: '',
    is_default: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const success = await onSubmit(formData);
    
    if (success) {
      setFormData({
        name: '',
        api_url: '',
        api_token: '',
        instance_name: '',
        is_default: false,
      });
      onOpenChange(false);
    }
    
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nova Instância WhatsApp
          </DialogTitle>
          <DialogDescription>
            Adicione uma nova instância da UAZAPI para conectar outro número
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Instância *</Label>
            <Input
              id="name"
              placeholder="Ex: Suporte Principal"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api_url">URL da API *</Label>
            <Input
              id="api_url"
              placeholder="Ex: https://climb.uazapi.com"
              value={formData.api_url}
              onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api_token">Token da Instância *</Label>
            <Input
              id="api_token"
              type="password"
              placeholder="Token de autenticação"
              value={formData.api_token}
              onChange={(e) => setFormData({ ...formData, api_token: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instance_name">Nome na UAZAPI (opcional)</Label>
            <Input
              id="instance_name"
              placeholder="Nome da instância na UAZAPI"
              value={formData.instance_name}
              onChange={(e) => setFormData({ ...formData, instance_name: e.target.value })}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_default"
              checked={formData.is_default}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, is_default: checked === true })
              }
            />
            <Label htmlFor="is_default" className="text-sm font-normal">
              Definir como instância padrão
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Adicionar Instância'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
