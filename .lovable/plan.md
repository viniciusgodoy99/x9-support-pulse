

# Adicionar Novas Funcoes de Membro da Equipe

## Resumo

Adicionar 4 novas opcoes de funcao no painel de equipe:
- Gestor de Performance
- Gestor de CRM/IFOOD
- Social Media
- Equipe Cliente

## Alteracoes Necessarias

### 1. Banco de Dados - Alterar Enum `team_role`

Adicionar os novos valores ao enum existente:

```sql
ALTER TYPE team_role ADD VALUE 'PerformanceManager';
ALTER TYPE team_role ADD VALUE 'CRMManager';
ALTER TYPE team_role ADD VALUE 'SocialMedia';
ALTER TYPE team_role ADD VALUE 'ClientTeam';
```

### 2. Hook - `src/hooks/useTeamMembers.tsx`

Atualizar o tipo `TeamMember["role"]` para incluir os novos valores:

```typescript
role: "CS" | "Manager" | "Support" | "Admin" | "PerformanceManager" | "CRMManager" | "SocialMedia" | "ClientTeam";
```

### 3. Componente - `src/pages/settings/Team.tsx`

**Atualizar o objeto `roleLabels`:**

| Valor no DB | Label Exibido |
|-------------|---------------|
| CS | Customer Success |
| Manager | Gerente |
| Support | Suporte |
| Admin | Administrador |
| PerformanceManager | Gestor de Performance |
| CRMManager | Gestor de CRM/IFOOD |
| SocialMedia | Social Media |
| ClientTeam | Equipe Cliente |

**Atualizar o Select com as novas opcoes:**

Adicionar 4 novos `<SelectItem>` no dropdown de funcao.

## Fluxo de Implementacao

```text
1. Executar migracao SQL para adicionar valores ao enum
2. Atualizar tipo TypeScript no hook
3. Atualizar labels e opcoes do Select no componente
```

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Adicionar valores ao enum `team_role` |
| `src/hooks/useTeamMembers.tsx` | Atualizar tipo `role` |
| `src/pages/settings/Team.tsx` | Atualizar `roleLabels` e opcoes do Select |

## Resultado Esperado

O dropdown de funcao no formulario de membro da equipe tera 8 opcoes:
1. Customer Success
2. Suporte
3. Gerente
4. Administrador
5. Gestor de Performance
6. Gestor de CRM/IFOOD
7. Social Media
8. Equipe Cliente

