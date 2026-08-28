# Isa Closet — Loja estática + Supabase

Frontend em **HTML + CSS + JavaScript puro**, preparado para publicação no **GitHub Pages** e com dados compartilhados entre clientes por meio do **Supabase**.

A identidade visual foi preservada: tons creme/rosé, marrom suave, tipografia editorial, bastante espaço em branco e linguagem de boutique. O layout foi revisado para mobile, com menu hambúrguer e navegação lateral.

## Recursos

- Loja pública responsiva para mobile, tablet e desktop.
- Hero com vídeo aleatório entre `001.mp4` e `005.mp4`.
- Catálogo público vindo do banco de dados.
- Categorias e filtros.
- Página/modal de produto com galeria, descrição, preços e tamanhos.
- Sacola local do cliente.
- Pedido pronto para WhatsApp.
- Painel administrativo protegido por **Supabase Auth**.
- Cadastro, edição, exclusão e ativação/desativação de produtos.
- Upload múltiplo de fotos para o **Supabase Storage**.
- Compressão das fotos no navegador para WebP antes do envio.
- Configuração do nome da loja e WhatsApp pelo painel.
- Recuperação de senha por e-mail.
- RLS no Postgres e políticas de Storage.
- Sem Node.js e sem backend próprio.

## Estrutura

```text
isa-closet/
├─ index.html
├─ admin.html
├─ README.md
├─ css/
│  ├─ style.css
│  └─ admin.css
├─ js/
│  ├─ config.js
│  ├─ store.js
│  └─ admin.js
├─ supabase/
│  └─ setup.sql
└─ assets/
   ├─ branding/
   │  └─ logo.webp
   ├─ demo/
   │  ├─ look-verde.webp
   │  └─ look-conforto.webp
   └─ videos/
      ├─ 001.mp4
      ├─ 002.mp4
      ├─ 003.mp4
      ├─ 004.mp4
      └─ 005.mp4
```

## Configuração única antes de publicar

O GitHub Pages é somente hospedagem estática. Para ter catálogo e administração compartilhados, o projeto usa Supabase como banco/auth/storage.

### 1. Criar o projeto no Supabase

Crie um projeto no Supabase e abra **SQL Editor**.

Cole e execute o arquivo:

```text
supabase/setup.sql
```

Ele cria as tabelas, índices, função de administração, RLS, bucket de imagens e políticas de acesso.

### 2. Criar o administrador

No Supabase, abra **Authentication → Users** e crie o usuário que será o administrador, com e-mail e senha.

Depois volte ao SQL Editor e execute, trocando o e-mail:

```sql
insert into public.admin_users (user_id, email)
select id, email
from auth.users
where lower(email) = lower('admin@seudominio.com')
on conflict (user_id) do nothing;
```

O frontend não possui senha administrativa fixa. A autenticação é feita pelo Supabase Auth.

### 3. Configurar o frontend

Abra:

```text
js/config.js
```

Preencha:

```js
window.ISA_CONFIG = Object.freeze({
  SUPABASE_URL: 'https://SEU-PROJETO.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'SUA_CHAVE_PUBLICA'
});
```

Use a **publishable/anon key pública**, nunca a `service_role` no navegador.

### 4. Configurar URL do site para recuperação de senha

No Supabase, em Authentication → URL Configuration, cadastre a URL final do seu GitHub Pages como Site URL/Redirect URL.

Exemplo:

```text
https://SEU_USUARIO.github.io/SEU_REPOSITORIO/admin.html
```

Se usar domínio próprio, use o domínio real.

### 5. Adicionar os vídeos

Coloque os vídeos na pasta:

```text
assets/videos/
```

com estes nomes:

```text
001.mp4
002.mp4
003.mp4
004.mp4
005.mp4
```

O site sorteia um vídeo e, ao terminar, sorteia outro.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie o conteúdo desta pasta para a raiz do repositório.
3. Em **Settings → Pages**, selecione o branch principal e `/ (root)`.
4. Acesse a URL gerada pelo GitHub.

Não é necessário `npm install`, Node.js, build ou servidor próprio.

## Modelo de segurança

O navegador usa apenas a chave pública do Supabase. O acesso de escrita é protegido por **Supabase Auth + Row Level Security**.

- Visitantes podem ler somente produtos ativos.
- Administradores autenticados podem criar, editar e excluir produtos.
- Visitantes podem visualizar as imagens públicas do catálogo.
- Somente administradores autenticados podem enviar, substituir e excluir imagens.
- As credenciais privilegiadas do Supabase não são usadas no frontend.

## Observação importante sobre produção

Mesmo sendo uma aplicação 100% estática no frontend, o catálogo não fica preso ao navegador: produtos e imagens são salvos no Supabase. Assim, uma alteração feita pelo administrador passa a valer para todos os clientes.

O único passo que não pode ser automatizado dentro de um ZIP é a criação da sua própria conta/projeto Supabase e o preenchimento das credenciais públicas desse projeto, porque elas são exclusivas da sua conta.

## Configuração obrigatória antes do deploy

O arquivo `js/config.js` usa a URL e a Publishable Key do seu próprio projeto Supabase. Não coloque `service_role` no frontend. Depois de configurar esses dois valores e executar `supabase/setup.sql`, publique a pasta no GitHub Pages.
