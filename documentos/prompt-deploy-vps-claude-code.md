# Contexto

Você está rodando localmente nesta VPS, que já hospeda o n8n via Easypanel
(acessível em `artefinal-n8n.gumtcw.easypanel.host`). O objetivo agora é
colocar em produção o backend do "Sistema de Ponto" (NestJS + Prisma), cujo
repositório já foi clonado nesta pasta.

**Importante: este backend não precisa necessariamente ficar exposto
publicamente na internet.** Quem vai consumi-lo primeiro é o próprio n8n,
rodando nesta mesma VPS — se ambos os containers ficarem na mesma rede
Docker, o n8n pode chamar o backend direto pelo nome do container (ex.:
`http://ponto-backend:3000`), sem precisar de domínio público, HTTPS nem
proxy reverso configurado à mão. Um front-end web para o RH será
construído depois — esse sim provavelmente vai precisar de acesso externo,
mas isso é uma decisão para quando chegarmos lá, não agora.

# Passo 1 — Investigar a infraestrutura existente ANTES de agir

Esta VPS já roda produção (o n8n está em uso). Não presuma nada sobre como
o Easypanel está organizado — investigue primeiro:

- `docker ps` — veja quais containers já rodam, incluindo o do n8n e
  qualquer container de sistema do Easypanel (proxy reverso, etc.).
- `docker network ls` e `docker inspect <container_do_n8n>` — descubra em
  qual(is) rede(s) Docker o container do n8n está conectado.
- Verifique se existe alguma forma de gerenciar apps via linha de comando
  ou API do Easypanel (procure um binário `easypanel`, arquivos de config
  em `/etc/easypanel` ou similar, ou documentação local). Se existir e for
  simples de usar, prefira criar o backend como um "App" gerenciado pelo
  Easypanel em vez de subir um container solto — fica consistente com o
  que já existe (restart automático, logs centralizados, etc.).
- Veja o que já está escutando nas portas 80/443 (`docker ps` +
  `netstat -tlnp` ou equivalente) para não criar conflito.

Reporte o que encontrou antes de prosseguir para o passo 2, especialmente
se algo parecer arriscado ou ambíguo — esta VPS já tem um serviço em
produção rodando, então cautela aqui vale mais que velocidade.

# Passo 2 — Escolher a abordagem de deploy

Com base no que encontrar no Passo 1:

- **Se houver um jeito de criar o serviço via Easypanel** (CLI/API):
  prefira esse caminho, mesmo que signifique o backend ganhar um domínio
  público do Easypanel — não tem problema, mas nesse caso garanta que os
  endpoints administrativos continuam exigindo JWT e que o endpoint
  `/extracoes-pendentes` (chamado pelo n8n) exige a API key
  (`N8N_WEBHOOK_SECRET`).
- **Caso contrário**: suba o backend como um container Docker simples,
  **conectado à mesma rede Docker do container do n8n** (descoberta no
  Passo 1), com nome fixo (ex.: `ponto-backend`) e
  `--restart unless-stopped`, para sobreviver a reinícios da VPS.

# Passo 3 — Projeto já clonado

O repositório já foi clonado nesta VPS (pasta já criada, código já
presente) — **não clone de novo**. Trabalhe diretamente nessa pasta onde
você está rodando agora. Só confirme que está na pasta certa (`pwd`, `ls`,
`git remote -v` para conferir que é o repositório certo) antes de
prosseguir.

Se o projeto não tiver um `Dockerfile`, crie um multi-stage padrão para
aplicação NestJS (build + runtime enxuto), incluindo a geração do Prisma
Client no build.

# Passo 4 — Banco de dados

Decida entre SQLite (mais simples, precisa de volume Docker persistente
para o arquivo `.db` sobreviver a rebuilds do container) ou Postgres
(mais robusto — só vale a pena se for fácil provisionar um Postgres nesta
mesma VPS/Easypanel sem grande esforço extra). Fica a seu critério, mas
documente no resumo final qual escolheu e por quê, já que envolve dados
sensíveis de folha de pagamento.

# Passo 5 — Variáveis de ambiente

Configure no container (nunca commitadas no repositório):
- `DATABASE_URL`
- `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` — gere um par de chaves RS256 se
  ainda não existir nenhuma (ex.: via `openssl`), e informe ao usuário que
  foram geradas novas (isso invalida qualquer JWT emitido anteriormente
  em ambiente local, o que é esperado).
- `ANTHROPIC_API_KEY` — peça ao usuário para fornecer o valor com
  segurança (ele já tem essa chave de outros projetos); não a gere nem
  invente.
- `N8N_WEBHOOK_SECRET` — gere um valor aleatório forte (ex.:
  `openssl rand -hex 32`) e **devolva esse valor no resumo final**, pois
  precisa ser configurado como credencial no node do n8n que chama
  `/extracoes-pendentes`.
- `PORT` (ex.: 3000).

# Passo 6 — Build, migrations e subida

- Rode o build da imagem.
- Rode `npx prisma migrate deploy` contra o banco de produção antes de (ou
  como parte de) subir o container.
- Suba o container e confirme, via `docker logs`, que a aplicação iniciou
  sem erros.
- Teste localmente na própria VPS (ex.: `curl http://localhost:3000/docs`
  ou o endpoint de health, se existir).

# Passo 7 — Confirmar que o n8n consegue alcançar o backend

Rode um teste de dentro do próprio container do n8n, por exemplo:
```
docker exec <container_do_n8n> curl -s http://ponto-backend:3000/docs
```
(ajuste a URL conforme o nome real do container/rede escolhidos). Isso
confirma que a resolução de nome interna do Docker está funcionando antes
de mexer na configuração do workflow no n8n.

# Passo 8 — Resumo final (obrigatório)

Ao terminar, apresente um resumo claro com:
1. A URL interna a ser usada como `BACKEND_URL` no n8n (ex.:
   `http://ponto-backend:3000`).
2. O valor gerado de `N8N_WEBHOOK_SECRET`, para configurar no n8n.
3. Qual banco de dados foi escolhido e por quê.
4. Se o backend acabou ficando público (via Easypanel) ou só acessível
   internamente, e por quê.
5. Qualquer coisa que precise de ação manual do usuário (ex.: configurar
   a variável no painel do n8n, adicionar a credencial do
   `N8N_WEBHOOK_SECRET` no node HTTP Request correspondente).

# Regra geral

Esta é uma VPS de produção com outro serviço já rodando (n8n). Em caso de
dúvida sobre qualquer ação que possa afetar o n8n existente (reiniciar o
proxy reverso, mexer em redes Docker compartilhadas, alterar portas em
uso), pare e pergunte antes de agir.
