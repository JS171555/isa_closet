# ✦ Isa Closet

> E-commerce front-end responsivo para uma boutique de moda feminina, com catálogo dinâmico, sacola de compras, integração com WhatsApp e painel administrativo conectado ao Supabase.

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-ready-222222?style=for-the-badge&logo=github)](https://pages.github.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?style=for-the-badge&logo=javascript&logoColor=111111)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Supabase](https://img.shields.io/badge/Supabase-backend-3ECF8E?style=for-the-badge&logo=supabase&logoColor=111111)](https://supabase.com/)
[![GSAP](https://img.shields.io/badge/GSAP-animations-88CE02?style=for-the-badge&logo=greensock&logoColor=111111)](https://gsap.com/)

---

## 📌 Sobre o projeto

O **Isa Closet** foi desenvolvido para transformar uma vitrine de moda em uma experiência de compra simples, elegante e funcional.

A aplicação utiliza um front-end **100% estático**, publicado no GitHub Pages, enquanto o **Supabase** fornece os recursos necessários para persistência de dados, autenticação e armazenamento de imagens.

O projeto foi pensado com foco em:

- experiência de navegação em dispositivos móveis e desktop;
- catálogo administrável sem editar o código-fonte;
- apresentação visual inspirada em boutiques de moda;
- fluxo de compra rápido, com finalização via WhatsApp;
- organização de produtos, preços, promoções, tamanhos e imagens;
- controle de acesso para operações administrativas.

---

## ✨ Principais funcionalidades

### 🛍️ Loja pública

- Catálogo carregado dinamicamente do Supabase.
- Filtro de produtos por categoria.
- Destaques dos produtos.
- Modal de detalhes com galeria de imagens.
- Seleção de tamanho antes de adicionar à sacola.
- Exibição de preço normal e promocional.
- Indicador de promoção.
- Sacola persistida no `localStorage`.
- Controle de quantidade dos itens.
- Cálculo automático do total.
- Checkout gerando mensagem pronta para o WhatsApp.
- Menu mobile com navegação lateral.
- Hero com vídeos aleatórios.
- Fallback automático para imagens indisponíveis.
- Suporte a `prefers-reduced-motion`.

### 🔐 Painel administrativo

- Login utilizando **Supabase Auth**.
- Validação de acesso administrativo.
- Dashboard com indicadores do catálogo.
- Cadastro de produtos.
- Edição de produtos existentes.
- Exclusão de produtos.
- Ativação e desativação de produtos.
- Pesquisa no catálogo administrativo.
- Definição da ordem de exibição.
- Cadastro de tamanhos disponíveis.
- Upload de múltiplas imagens.
- Compressão das imagens no navegador antes do upload.
- Armazenamento das imagens no Supabase Storage.
- Atualização do nome da loja.
- Configuração do WhatsApp.
- Recuperação de senha por e-mail.

---

## 🧱 Stack utilizada

| Tecnologia | Utilização |
|---|---|
| **HTML5** | Estrutura semântica das páginas |
| **CSS3** | Layout, responsividade e identidade visual |
| **JavaScript ES6+** | Lógica da aplicação e interações |
| **Supabase** | Banco de dados, autenticação e storage |
| **PostgreSQL** | Persistência dos produtos e configurações |
| **Supabase Auth** | Autenticação do painel administrativo |
| **Supabase Storage** | Armazenamento das imagens dos produtos |
| **Row Level Security (RLS)** | Controle de acesso aos dados |
| **GSAP** | Animações e transições |
| **localStorage** | Persistência local da sacola |
| **WhatsApp API (`wa.me`)** | Finalização do pedido |

---

## 🏗️ Arquitetura

```text
┌─────────────────────────────┐
│        GitHub Pages         │
│     HTML + CSS + JavaScript │
└──────────────┬──────────────┘
               │
               ▼
      ┌───────────────────┐
      │     Supabase      │
      ├───────────────────┤
      │ PostgreSQL        │
      │ Authentication    │
      │ Storage           │
      │ RLS Policies      │
      └─────────┬─────────┘
                │
                ▼
       ┌──────────────────┐
       │ Painel Admin     │
       │ CRUD de produtos │
       └──────────────────┘

Cliente ──► Catálogo ──► Sacola ──► WhatsApp
```

A proposta elimina a necessidade de um servidor Node.js ou de uma API própria para o funcionamento do catálogo.

---

## 📂 Estrutura do projeto

```text
isa_closet/
├── index.html
├── admin.html
│
├── css/
│   ├── style.css
│   └── admin.css
│
├── js/
│   ├── config.js
│   ├── store.js
│   └── admin.js
│
├── assets/
│   ├── branding/
│   │   └── logo.webp
│   ├── demo/
│   │   ├── look-verde.webp
│   │   └── look-conforto.webp
│   └── videos/
│       ├── 001.mp4
│       ├── 002.mp4
│       ├── 003.mp4
│       ├── 004.mp4
│       └── 005.mp4
│
└── supabase/
    └── setup.sql
```

---

## 🗃️ Modelo de dados

O banco utiliza três tabelas principais:

### `products`

Responsável pelo catálogo.

Principais campos:

```text
id
name
category
description
price
promo
sizes
images
display_order
active
created_at
updated_at
```

### `store_settings`

Armazena as configurações básicas da loja:

```text
id
store_name
whatsapp
updated_at
```

### `admin_users`

Relaciona usuários autenticados ao acesso administrativo:

```text
user_id
email
created_at
```

Além disso, o projeto cria o bucket `product-images` no Supabase Storage para os arquivos das imagens.

---

## 🔒 Segurança

A aplicação utiliza **Supabase Auth + Row Level Security (RLS)** para separar operações públicas das administrativas.

### Visitantes

Podem:

- consultar produtos ativos;
- consultar as configurações públicas da loja;
- visualizar imagens do catálogo.

### Administradores autenticados

Podem:

- cadastrar produtos;
- editar produtos;
- excluir produtos;
- ativar ou ocultar produtos;
- enviar imagens;
- alterar configurações da loja.

### Regra importante

O navegador deve utilizar somente a **Publishable/Anon Key** do Supabase.

> Nunca coloque uma chave `service_role` no código do front-end.

As políticas de acesso e a configuração do banco estão documentadas em:

```text
supabase/setup.sql
```

---

## ⚙️ Configuração

### 1. Criar o projeto no Supabase

Crie um projeto em:

https://supabase.com/

Depois abra o **SQL Editor** e execute:

```text
supabase/setup.sql
```

Esse script cria:

- tabelas;
- índices;
- função de verificação administrativa;
- políticas RLS;
- bucket de imagens;
- políticas do Storage;
- triggers de atualização.

---

### 2. Criar o usuário administrador

No Supabase:

```text
Authentication → Users
```

Crie o usuário administrativo.

Depois associe o usuário à tabela `admin_users`:

```sql
insert into public.admin_users (user_id, email)
select id, email
from auth.users
where lower(email) = lower('admin@seudominio.com')
on conflict (user_id) do nothing;
```

Substitua o e-mail pelo usuário real.

---

### 3. Configurar o Supabase no front-end

Edite:

```text
js/config.js
```

Exemplo:

```js
window.ISA_CONFIG = Object.freeze({
  SUPABASE_URL: 'https://SEU-PROJETO.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'SUA_CHAVE_PUBLICA'
});
```

Use somente a chave pública do projeto.

---

### 4. Configurar recuperação de senha

No Supabase, configure:

```text
Authentication
→ URL Configuration
```

Cadastre a URL final do `admin.html`.

Exemplo:

```text
https://seuusuario.github.io/seu-repositorio/admin.html
```

Com domínio próprio:

```text
https://seudominio.com.br/admin.html
```

---

## 🚀 Deploy no GitHub Pages

O projeto não possui etapa de build.

Não é necessário:

```bash
npm install
```

Nem:

```bash
npm run build
```

Nem Node.js para servir o front-end.

### Publicação

1. Envie os arquivos do projeto para o repositório.
2. Abra **Settings → Pages**.
3. Selecione o branch principal.
4. Escolha `/(root)`.
5. Salve a configuração.
6. Aguarde a publicação do GitHub Pages.

A arquitetura fica:

```text
GitHub Pages
      +
   Supabase
      =
Loja funcional
```

---

## 📸 Fluxo da aplicação

### Cliente

```text
Home
  ↓
Catálogo
  ↓
Filtro por categoria
  ↓
Detalhes do produto
  ↓
Escolha do tamanho
  ↓
Adicionar à sacola
  ↓
Revisar pedido
  ↓
WhatsApp
```

### Administrador

```text
Login
  ↓
Dashboard
  ↓
Produtos
  ├── Criar
  ├── Editar
  ├── Excluir
  └── Ativar / Ocultar
  ↓
Configurações
  ├── Nome da loja
  └── WhatsApp
```

---

## 🎨 Interface e experiência

O projeto utiliza uma identidade visual editorial inspirada em boutiques de moda, combinando:

- tipografia serifada para títulos;
- tipografia sans-serif para informações;
- bastante espaço negativo;
- composição minimalista;
- cartões de produto;
- navegação adaptada para mobile;
- microinterações e transições com GSAP.

A interface foi estruturada para manter a experiência visual consistente entre telas grandes e pequenas.

---

## 🧠 Decisões técnicas

### Por que GitHub Pages?

O front-end não depende de renderização no servidor, permitindo hospedagem simples, rápida e de baixo custo.

### Por que Supabase?

O projeto precisava de:

- banco de dados;
- autenticação;
- armazenamento de imagens;
- regras de acesso;
- atualização centralizada do catálogo.

O Supabase permite atender essas necessidades sem criar e manter um backend próprio.

### Por que localStorage?

A sacola pode ser mantida no navegador sem exigir persistência de pedido no banco. O checkout é convertido em uma mensagem pronta para WhatsApp.

---

## 🛠️ Melhorias futuras

Algumas evoluções planejadas para o projeto:

- [ ] Controle de estoque por produto/tamanho.
- [ ] Histórico de pedidos.
- [ ] Integração com gateway de pagamento.
- [ ] Dashboard com métricas de vendas.
- [ ] SEO avançado por produto.
- [ ] PWA e suporte offline parcial.
- [ ] Gestão de cupons.
- [ ] Ordenação avançada do catálogo.
- [ ] Analytics de conversão.
- [ ] Separação de ambientes de desenvolvimento e produção.

---

## 📋 Requisitos

Para executar o projeto localmente, basta utilizar um servidor HTTP estático.

Exemplos:

```bash
python -m http.server 8000
```

ou utilizar uma extensão como **Live Server** no VS Code.

> Abrir diretamente via `file://` pode causar problemas com recursos externos e autenticação.

---

## 📄 Licença

Este projeto foi desenvolvido para fins de portfólio e/ou uso comercial específico da **Isa Closet**.

A licença de uso pode ser adaptada conforme a necessidade do projeto.

---

## 👨‍💻 Autor

**Junior Santos**

Desenvolvedor Web focado em:

`JavaScript` · `Node.js` · `Python` · `Frontend` · `Sistemas Web`

GitHub:

https://github.com/JS171555

---

## ⭐ Projeto

Desenvolvido com foco em transformar requisitos de negócio em uma aplicação web funcional, responsiva e administrável.

**Isa Closet — moda, catálogo e operação em uma única aplicação.**
