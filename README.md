# Amigos Secretos 🎁

Amigo secreto do jeito de sempre: nomes escritos à caneta num caderno, papel dobrado, sorteio numa cestinha e um bilhete privado para cada pessoa, enviado pelo WhatsApp.

## Como funciona

1. **Nomes.** Escreva quem participa, um por linha (colar uma lista separada por vírgula ou ponto e vírgula também funciona). Nomes repetidos ganham um risco vermelho na hora.
2. **Exceções.** Diga quem não pode tirar quem, uma pessoa por vez ou um grupo inteiro (um casal, irmãos). O app sugere a regra no sentido contrário e avisa, antes do sorteio, quando as exceções tornam o sorteio impossível.
3. **Combinados.** Data do encontro, valor do presente (faixa, até, a partir de ou por volta de), tema e regras livres. Tudo é salvo automaticamente.
4. **Sorteio.** Os nomes vão dobrados para a cestinha, que é sacudida e virada sobre a lista de bilhetes. O sorteio acontece no servidor.
5. **Envio.** Cada pessoa tem um link próprio. Copie a mensagem ou abra o WhatsApp para escolher o contato.

Enquanto ninguém abriu o bilhete, dá para mudar nomes e exceções e sortear de novo: os links continuam os mesmos, porque pertencem a quem recebe. Depois da primeira abertura, os pares ficam fixos; os combinados continuam editáveis.

A interface está em português, inglês e espanhol, escolhidos pelo idioma do navegador. Na hora de enviar, dá para escolher outro idioma para as mensagens dos bilhetes.

## Rodar localmente

Node.js 24 e o pnpm indicado no `package.json`.

```sh
pnpm install
pnpm dev
```

Abra **http://localhost:3600**. Sem credenciais, os dados ficam em `.data/amigos-secretos.sqlite` (fora do Git) e sobrevivem a reinícios do servidor.

## Produção: Vercel + Cloudflare D1

O app roda na Vercel e guarda os sorteios no Cloudflare D1, acessado pela REST API.

1. Crie um banco D1 e execute `schema.sql`. O schema é idempotente.
2. Crie um API token com permissão **D1 Edit**, restrito à conta.
3. Configure na Vercel:

| Variável                    | Valor                                                 |
| --------------------------- | ----------------------------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID`     | ID da conta Cloudflare                                |
| `CLOUDFLARE_D1_DATABASE_ID` | ID do banco D1                                        |
| `CLOUDFLARE_API_TOKEN`      | Token privado da Cloudflare                           |
| `NEXT_PUBLIC_SITE_URL`      | URL pública, ex.: `https://amigossecretos.vercel.app` |

Na Vercel, sem essas variáveis o app falha em vez de gravar em outro lugar. Use um banco separado para previews. Para usar o D1 localmente, copie `.env.example` para `.env.local`.

## Privacidade

- **Organização:** um cookie `HttpOnly` de um ano identifica quem organiza. Não há conta nem recuperação; limpar os cookies ou trocar de navegador remove o acesso.
- **Bilhetes:** códigos aleatórios de 12 caracteres (cerca de 71 bits). Quem tem o link vê o nome sorteado, então envie só para a pessoa certa. O painel de quem organiza nunca recebe os pares.
- **WhatsApp:** só recebe a mensagem quando você toca em enviar. "Enviado" é uma marcação local, não confirmação de entrega.
- Páginas privadas não são indexadas e não enviam `Referer`.

## Desenvolvimento

```sh
pnpm check        # formatação, lint, tipos e testes
pnpm build        # build de produção
pnpm format       # aplicar formatação (Oxfmt)
pnpm lint         # Oxlint, falha em warnings
pnpm test:unit    # sorteio, exceções, orçamento, textos e traduções
pnpm test:browser # componentes em Chromium real (rode `pnpm exec playwright install chromium` antes)
```

- **Traduções:** os textos ficam no código com um id estável e o texto em inglês, como `t('raffleForm.tab.names', 'Names')`. Português e espanhol vivem em `src/lib/i18n/messages/*.json`, com plurais em ICU. Um teste confere ids ausentes, sobrando ou conflitantes.
- **Sorteio:** um emparelhamento bipartido respeita as exceções; o mesmo código roda no navegador, para avisar de sorteios impossíveis, e no servidor, que faz o sorteio de verdade.
- **Validação:** o servidor repete todas as regras do formulário: limites de tamanho, caracteres permitidos (sem caracteres invisíveis; nomes só com letras, números, pontuação de nome e emoji), datas e valores.

Stack: Next.js 16 (App Router, Server Actions), React 19, TypeScript, Three.js, Motion, Base UI, Tailwind CSS 4, SQLite/D1, Vitest e Oxc.
