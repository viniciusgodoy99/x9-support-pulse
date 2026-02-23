
# Auto-selecionar instância única na página de Testes

## Mudança

Quando houver apenas uma instância WhatsApp cadastrada, ela será automaticamente selecionada no campo "Instância WhatsApp", evitando que o usuário precise clicar no select manualmente.

## Detalhes Técnicos

### Arquivo: `src/pages/settings/Tests.tsx`

Adicionar um `useEffect` que observa o array `instances` e, quando ele tiver exatamente 1 item e `drInstance` ainda estiver vazio, define `drInstance` com o `id` dessa instância:

```typescript
useEffect(() => {
  if (instances.length === 1 && !drInstance) {
    setDrInstance(instances[0].id);
  }
}, [instances]);
```

Esse efeito roda após o carregamento das instâncias e só atua se houver exatamente uma disponível.
