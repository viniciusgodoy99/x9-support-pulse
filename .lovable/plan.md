
# Criar Primeiro Usuário Admin

## Situação Atual

- Não existe nenhum usuário cadastrado no sistema
- A tela de Auth só tem login (sem opção de cadastro)
- A tabela `user_roles` está vazia
- A tabela `user_roles` tem RLS: apenas admins podem gerenciar roles, e usuários só veem as próprias

## Objetivo

Permitir que o primeiro usuário se cadastre e seja promovido a admin para que possa gerenciar permissões dentro do app.

## Estratégia

Como não há usuários ainda, a forma mais segura e direta é:

1. Adicionar temporariamente um botão de "Criar conta" na tela de Auth, para o primeiro cadastro
2. Após o cadastro, rodar um SQL no backend para inserir o papel de `admin` na tabela `user_roles` para esse usuário
3. Remover o botão de cadastro (ou deixá-lo oculto para que apenas admins possam convidar novos usuários)

## Mudanças no Código

### 1. Atualizar `src/pages/Auth.tsx`

Adicionar um modo de toggle entre Login e Cadastro na mesma tela:

- Campo de email + senha + confirmação de senha
- Botão "Criar conta" que chama `supabase.auth.signUp()`
- Após cadastro bem-sucedido, exibir mensagem orientando o próximo passo (atribuição de admin)
- Manter o modo login como padrão

### 2. SQL de promoção a Admin (após cadastro)

Após o usuário criar a conta, rodar via backend o seguinte SQL para promovê-lo a admin:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'seu@email.com';
```

Esse SQL será apresentado ao usuário para rodar pelo painel do Lovable Cloud (backend view → Run SQL).

### 3. Tela de Gerenciamento de Usuários (opcional, fase 2)

Uma tela dentro do app para o admin:
- Ver todos os usuários cadastrados
- Atribuir ou remover roles (admin, etc.)
- Convidar novos membros por email

## Fluxo Completo

```text
Usuário acessa /auth
       |
       v
Clica "Criar conta"
       |
       v
Preenche email + senha
       |
       v
Conta criada (auth.users)
       |
       v
Admin roda SQL INSERT INTO user_roles
       |
       v
Usuário agora é admin e tem acesso total
```

## Arquivos a Modificar

- `src/pages/Auth.tsx` — adicionar fluxo de signup com toggle login/cadastro

## Importante

A página de signup será temporária para o primeiro acesso. Após a criação do primeiro admin, o fluxo de convite de novos usuários pode ser controlado dentro do app — evitando que qualquer pessoa crie uma conta livremente.
