# Projeto: App Web de Acompanhamento de Glicemia

> Documento de premissas do projeto. Criado em 2026-10-20 a partir da entrevista inicial.
> Serve de referência para decisões de produto e desenvolvimento.

## 1. Visão geral

App web **de uso pessoal** para acompanhar a glicemia de uma pessoa com **diabetes tipo 1** que usa o sensor **FreeStyle Libre**.
O app puxa automaticamente as leituras do sensor, permite registrar insulina, refeições, exercícios e eventos, e gera análises e relatórios para o acompanhamento médico.

Precisa funcionar bem em **computador e celular, em qualquer tamanho de tela** (layout responsivo).

## 2. Público e perfil

| Item | Decisão |
|---|---|
| Usuários | Apenas um usuário (o dono do app) |
| Perfil clínico | Diabetes tipo 1 (insulina basal + bolus, contagem de carboidratos) |
| Unidade | mg/dL (apenas) |
| Faixa alvo | 70–180 mg/dL por padrão, **configurável** nas configurações |

## 3. Fonte dos dados

- **Sensor:** FreeStyle Libre (CGM).
- **Integração:** via **LibreLinkUp** (API não oficial, a mesma usada pelo app de seguidores da Abbott).
  - Exige uma conta LibreLinkUp conectada à conta LibreLink do usuário.
  - ⚠️ **Risco:** a API não é oficial e pode mudar ou ser bloqueada sem aviso. O app deve aguentar falhas de sincronização (mostrar a hora da última leitura e o status da conexão).
  - Alternativa/plano B: usar Nightscout como intermediário, ou importar um CSV do LibreView.
- **Frequência:** quase em tempo real. Sincronizar **a cada ~1–5 minutos** e mostrar o valor atual com a seta de tendência.

## 4. Registros manuais

Além da glicemia vinda do sensor, o usuário registra:

- **Insulina:** tipo (rápida/bolus ou basal), unidades e horário.
- **Carboidratos/refeições:** gramas de carboidrato, tipo de refeição (café, almoço, lanche, jantar…) e uma descrição opcional.
- **Exercícios:** tipo, duração e intensidade.
- **Notas/eventos:** doença, estresse, troca de sensor, hipo tratada etc.

Todos os registros aparecem sobre o gráfico de glicemia, na linha do tempo.

## 5. Visualizações e análises

1. **Painel principal:** glicemia atual em destaque, seta de tendência, hora da última leitura e a curva das últimas horas (3h/6h/12h/24h), com os registros manuais marcados.
2. **Tempo no alvo (TIR):** % do tempo abaixo de 54, de 54–69, de 70–180, de 181–250 e acima de 250 mg/dL, por período (1, 7, 14, 30 e 90 dias).
3. **AGP / padrões:** perfil ambulatorial de glicose (mediana e faixas de percentis por hora do dia, em 14 dias ou mais).
4. **Métricas:** glicemia média, GMI (indicador de gestão da glicose), desvio padrão, coeficiente de variação e número de hipoglicemias.
5. **Relatório para o médico:** exportar **PDF** (resumo, TIR, AGP, métricas) e **CSV** (dados brutos) de um período escolhido.

## 6. Escopo da primeira versão (MVP)

### Dentro
- Login com Google
- Sincronização com o FreeStyle Libre (LibreLinkUp)
- Painel com a glicemia atual e o gráfico
- Registros de insulina, carboidratos, exercícios e notas
- TIR, AGP e métricas
- Relatório em PDF e exportação em CSV
- Configurações (faixa alvo, credenciais do LibreLinkUp)
- **Tema claro e escuro** (com opção de seguir o sistema)
- Base de alimentos para consultar carboidratos *(prioridade baixa: pode ficar para o fim do MVP)*

### Fora (versões futuras)
- Calculadora de bolus (sugestão de dose; risco clínico)
- Compartilhar dados com médico ou familiares
- Alertas e notificações de hipo/hiper (o app oficial do sensor já faz isso)
- Funcionamento offline
- PWA/instalação como app (por ora, só site responsivo no navegador)
- Suporte a mmol/L e a vários usuários

## 7. Requisitos não funcionais

- **Responsividade:** mobile-first, usável de ~320px até monitores largos. Os gráficos precisam se adaptar à largura e permitir toque no celular.
- **Plataforma:** site acessado pelo navegador (sem instalação), sempre online.
- **Segurança e privacidade:**
  - Login com Google **restrito ao e-mail do dono** (allowlist).
  - Dados de saúde são sensíveis: HTTPS, credenciais do LibreLinkUp guardadas criptografadas no servidor e nunca expostas ao navegador.
  - O app não deve ser indexado por buscadores.
- **Confiabilidade:** deixar claro quando os dados estão desatualizados (ex.: "última leitura há 25 min").
- **Aviso:** o app é uma ferramenta de acompanhamento pessoal e **não substitui** o app oficial do sensor nem orientação médica.

## 8. Tecnologia e hospedagem

**Decidido em 2026-10-20:**

- **Frontend/app:** **Next.js** (App Router, React, TypeScript), hospedado no **Vercel** (plano gratuito).
- **Backend/dados:** **Supabase**
  - **Banco:** PostgreSQL, com Row Level Security ativado em todas as tabelas.
  - **Auth:** Supabase Auth com provedor Google, restrito ao e-mail do dono.
  - **Segredos:** credenciais do LibreLinkUp e chave secreta do Supabase como variáveis *Sensitive* na Vercel. O segredo do agendamento (`sync_secret`) fica no Supabase Vault.
- **Sincronização com o Libre (implementada em 2026-10-20):** o **`pg_cron` + `pg_net`** do Supabase chama a rota **`/api/sync`** do app na Vercel a cada 5 minutos. A rota busca as leituras das últimas ~12h no LibreLinkUp e grava no banco, sem duplicar.
  - Essa opção substituiu a ideia original de usar Edge Function: todo o código fica no Next.js, e não é preciso usar a CLI do Supabase.
  - A rota se autentica com `Authorization: Bearer <SYNC_SECRET>`. O token do LibreLinkUp fica em cache na tabela `libre_sessions`.
  - Para conferir as execuções: `select * from net._http_response order by created desc limit 5;`
  - Complemento futuro: ao abrir o painel, o app pode disparar uma sincronização sob demanda.
- **Estilo/UI:** Tailwind CSS 4 + `next-themes` (tema claro/escuro/sistema).
- **Gráficos:** a definir. Sugestão: Recharts ou visx.
- **PDF:** a definir. Sugestão: `@react-pdf/renderer`.
- ⚠️ **Limite do plano gratuito do Supabase:** o projeto é pausado após ~7 dias sem atividade. Com o `pg_cron` rodando sempre, isso não deve acontecer, mas vale monitorar.

## 9. Andamento

- [x] **2026-10-20 — Base do projeto:** Next.js 16 + Tailwind, login com Google via Supabase (com allowlist no banco e no app), proxy protegendo as rotas, tema claro/escuro/sistema, esquema inicial do banco com RLS e painel provisório.
- [x] **2026-10-20 — Deploy:** produção em https://glicemia-mu.vercel.app (login testado no computador e no celular).
- [x] **2026-10-20 — Sincronização com o LibreLinkUp:** `pg_cron` → `/api/sync` a cada 5 min, funcionando.
- [x] Glicemia atual no painel (valor, seta de tendência, idade da leitura, aviso de falha de sincronização)
- [x] **2026-10-20 — Primeira versão completa:** gráfico com eventos, registros (insulina, refeições com base de alimentos TACO, exercícios, notas), análises (TIR, GMI, CV, AGP, resumo diário), relatório para PDF (impressão do navegador) e CSV, configurações da faixa alvo.
- [ ] Opcional: ligar a Vercel ao GitHub para deploy automático a cada push (Settings → Git na Vercel).

## 10. Questões em aberto

- [x] Fechar a stack e a hospedagem: Next.js + Supabase + Vercel (ver seção 8).
- [ ] Confirmar as bibliotecas de UI, gráficos e PDF.
- [ ] Validar o acesso ao LibreLinkUp com a conta real e definir o plano B, se falhar.
- [ ] Faixas de TIR personalizadas além do alvo principal?
- [ ] Por quanto tempo guardar o histórico (ex.: indefinidamente)?
- [ ] Base de alimentos: fonte dos dados (ex.: tabela TACO) ou cadastro manual de alimentos favoritos?
