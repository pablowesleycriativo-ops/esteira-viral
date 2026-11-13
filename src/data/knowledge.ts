import { ELEMENTS, FORMULA, HOOKS, KEYWORD_GROUPS, METRIC_ROWS, PHASES } from '@/data/facts'
import { DIAGNOSIS_ROWS } from '@/data/facts'

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }
  | { type: 'callout'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'rows'; rows: { title: string; lines: string[] }[] }

export type Section = {
  slug: string
  title: string
  lede: string
  blocks: Block[]
  custom?: 'esteira'
}

export const sections: Section[] = [
  {
    slug: 'principio',
    title: 'Princípio',
    lede: 'Direção, não regra. Quando novembro e a base de julho discordam, novembro vale.',
    blocks: [
      { type: 'callout', text: FORMULA },
      {
        type: 'p',
        text: 'Nada neste sistema é regra fixa. Os 6 segundos, os 6 elementos, intervalos de postagem e metas são direção — servem para não se dispersar com ideias novas demais, sem impedir testes. O critério que decide: menos esforço + mais resultado vence qualquer regra.',
      },
      {
        type: 'ul',
        items: [
          'Equilíbrio: a maior parte da semana no que já funciona, uma parte menor em testes.',
          'Em vez de “viola a regra”, dizer “foge do padrão — vale porque X” ou “não compensa porque Y”.',
          'Vídeo bom e barato sai quando estiver pronto. Intervalo entre postagens só pesa quando dois vídeos fortes competem pelo mesmo momento.',
          'Apontar quando a balança pender demais: repetição sem teste, ou novidade demais largando o que funciona.',
        ],
      },
      { type: 'h', text: 'O que vale em novembro de 2026' },
      {
        type: 'ul',
        items: [
          'Equipe: trabalha sozinho. A base de julho falava em 2 pessoas — novembro prevalece.',
          'Ritmo na fase de teste: cerca de 12 vídeos por semana. A base de julho falava em 3–5 — novembro prevalece.',
          'Duração: 6s para revelação em loop (transformações); 15–30s para narrativa (Dr. Harlow, Níveis). Raramente passa de 30s.',
          'Em exploração: Shorts de 30–90s, com meta de retenção 50%+. Vídeos longos (até 20–23 min): começar por compilações dos Shorts vencedores, depois episódios com vilão recorrente.',
          'A lista Em Alta da base é de julho/2026. Sempre validar antes (Modo 4).',
          'Capa e CTR pesam menos em Shorts. A prioridade é o gancho dos 3 primeiros segundos.',
          'Métricas prioritárias: views em 48h e 7 dias, viewed vs swiped away, APV.',
          'Performou = acima da média do canal.',
          'O canal depende 100% de personagens de terceiros. O caminho sugerido é um vilão fixo (candidato: Dr. Harlow).',
        ],
      },
      { type: 'h', text: 'Perfil e habilidades' },
      {
        type: 'ul',
        items: [
          'Plataforma: YouTube Shorts. Nicho na base de julho: animação, arte manual, conteúdo infantil.',
          'Sem fala — alcance internacional sem barreira de idioma. Picos de 20–30M de views.',
          'Capacetes e máscaras de papel machê: arte física + personagem em alta.',
          'Desenhar personagens a partir de formas, letras e números.',
          'Dança: potencial ainda sem formato definido.',
        ],
      },
      {
        type: 'p',
        text: 'Simplicidade de produção: quanto mais simples, mais consistente. A arte é a linguagem. O personagem em alta é o trampolim — a arte é do Pablin, o personagem já tem audiência esperando.',
      },
    ],
  },
  {
    slug: 'esteira',
    title: 'Esteira',
    lede: 'Do personagem em alta até o aprimoramento. O capacete só entra depois da validação.',
    custom: 'esteira',
    blocks: [
      {
        type: 'callout',
        text: 'O capacete custa tempo que poderia virar conteúdo: só se produz capacete de personagem já validado.',
      },
    ],
  },
  {
    slug: 'elementos',
    title: '6 elementos',
    lede: 'Checklist antes de postar. Se faltar algum, a base diz para corrigir. Novembro lembra: é direção.',
    blocks: [
      {
        type: 'rows',
        rows: ELEMENTS.map((element) => ({
          title: element.title,
          lines: [element.text, element.note].filter(Boolean),
        })),
      },
      { type: 'p', text: 'Se faltar qualquer um dos 6, corrigir antes de postar.' },
      { type: 'h', text: 'Estratégia dos 6 segundos' },
      {
        type: 'ul',
        items: [
          '60s assistido 1x = 100% de retenção. 6s assistido 3x = 300%. 6s assistido 5x = 500% — território viral.',
          'Crianças assistem o mesmo vídeo 10–20 vezes seguidas. Cada repetição é watch time real.',
          'Insight externo (Reddit, 7.5M views): zona alternativa de 37–59s para narrativa. Abaixo de 30s exige AVR 90%+ para viralizar. 30–59s exige AVR 70%+.',
        ],
      },
    ],
  },
  {
    slug: 'fases',
    title: '6 fases',
    lede: 'Estrutura validada com 250M+ views. A revelação é a última cena.',
    blocks: [
      {
        type: 'callout',
        text: 'Não pague o tópico cedo demais. A revelação é a última cena. Tensão visual até o último segundo. Nenhuma cena dura mais de 2–3 segundos.',
      },
      {
        type: 'rows',
        rows: PHASES.map((phase) => ({
          title: phase.title,
          lines: [phase.text, phase.example].filter(Boolean),
        })),
      },
    ],
  },
  {
    slug: 'ganchos',
    title: 'Ganchos',
    lede: 'Seis formatos de gancho. O gancho mora nos 3 primeiros segundos. A resposta é a última cena.',
    blocks: [
      {
        type: 'rows',
        rows: HOOKS.map((hook) => ({ title: hook.name, lines: [hook.text] })),
      },
      {
        type: 'p',
        text: 'Estrutura BUT/SO: nunca conectar cenas com “e” — usar “mas” e “então” para criar tensão.',
      },
      { type: 'h', text: 'Formatos que convertem, todos sem fala' },
      {
        type: 'ul',
        items: [
          'Visuais: tela dividida, transições, identificação, dica rápida.',
          'Gatilhos: satisfação, medo/suspense, curiosidade.',
          'Estilos: gamificação, competição, rico vs pobre, forte vs fraco.',
        ],
      },
      { type: 'h', text: 'Para uma ideia nova continuar no caminho' },
      {
        type: 'ul',
        items: [
          'Universalmente relacionável — qualquer pessoa entende.',
          'Gancho emocional — absurdo, surpresa ou admiração.',
          'Completion compulsion — precisa ver o resultado.',
        ],
      },
    ],
  },
  {
    slug: 'ramificacao',
    title: 'Ramificação',
    lede: 'A mesma ideia muda de formato antes de condenar o personagem.',
    blocks: [
      {
        type: 'ol',
        items: [
          'Não performou → mesma ideia (personagem, capacete, desenhos) em outro formato, priorizando os de maior reaproveitamento.',
          'Funcionou em outro → o problema era o formato; esforço recuperado.',
          'Falhou em 3 formatos → provavelmente é o personagem; voltar à pesquisa.',
          'Útil sobretudo quando falta personagem em alta.',
        ],
      },
      {
        type: 'p',
        text: 'Performou = acima da média do canal. O aviso do app aparece no 3º formato que falha.',
      },
    ],
  },
  {
    slug: 'hype',
    title: 'Hype',
    lede: 'Método em teste. São hipóteses: viram regra com 3 ou mais registros.',
    blocks: [
      {
        type: 'ol',
        items: [
          'Usar o que já tem (capacetes e desenhos prontos).',
          'Fazer a versão mais simples da ideia (ex.: Aluno vs Professor simplificado).',
          'Medir quais personagens ganham destaque em 3 a 7 dias.',
          'Avançar se o resultado ficar acima da média do canal.',
        ],
      },
      {
        type: 'p',
        text: 'Exemplo do ciclo: criar capacete (Hello Kitty) → desenho maromba → reaproveita no ciclo → analisa no processo.',
      },
      { type: 'h', text: 'Sem hype aparente' },
      {
        type: 'ul',
        items: [
          'Temas fora da bolha: futebol (Neymar, CR7, Messi), animes, famosos (filmes, grupos musicais, séries), países (bandeiras, idioma), comidas, música.',
          'Algo mais elaborado com o que já tem: Processo Criativo com personagens definitivos (Goku, Sonic, Mickey).',
        ],
      },
    ],
  },
  {
    slug: 'keywords',
    title: 'Keywords',
    lede: 'Título de 4 a 7 palavras, 3 hashtags, sem data.',
    blocks: [
      {
        type: 'rows',
        rows: KEYWORD_GROUPS.map((group) => ({ title: group.category, lines: [group.words.join(', ')] })),
      },
      { type: 'h', text: 'Título' },
      {
        type: 'ul',
        items: [
          'Personagem em alta + ação chamativa + keyword.',
          'Exemplo do caderno: “Poppy Playtime Animation — Funny Moments”.',
          '4 a 7 palavras. Números aumentam CTR. Nunca datas — envelhecem o vídeo.',
        ],
      },
      { type: 'h', text: 'Hashtags' },
      {
        type: 'p',
        text: '3 é o ideal (máximo 5). Misturar amplas e específicas. Mais que isso prejudica em 2026. O caderno não classifica qual keyword é ampla e qual é específica.',
      },
      { type: 'h', text: 'Capa' },
      {
        type: 'callout',
        text: 'Novembro: capa e CTR pesam menos em Shorts. Prioridade é o gancho dos 3 primeiros segundos.',
      },
      {
        type: 'ul',
        items: [
          '41,6% dos maiores canais não usam texto. Quando usam: 1–3 palavras no máximo.',
          'Linguagem neutra (91,6%) — nem “eu” nem “você”, apenas a situação.',
          'Cores: base + destaque — azul (confiança), amarelo (destaque), vermelho (urgência).',
          'Rostos grandes e expressivos ocupando 1/3 da imagem.',
          'Contraste: fundo escuro + elemento claro, ou o contrário.',
          '85% dos Shorts são assistidos sem som — legenda visual quando houver texto.',
        ],
      },
    ],
  },
  {
    slug: 'metricas',
    title: 'Métricas',
    lede: 'Prioridade de novembro: views em 48h e 7 dias, viewed vs swiped away, APV. Performou = acima da média do canal.',
    blocks: [
      {
        type: 'rows',
        rows: METRIC_ROWS.map((row) => ({
          title: row.metric,
          lines: [row.indicates, `Meta: ${row.goal}`],
        })),
      },
      { type: 'p', text: 'Pré-requisito para análise de padrões confiável: 20–30 vídeos publicados.' },
      { type: 'h', text: 'Algoritmo, base de julho' },
      {
        type: 'ul',
        items: [
          'Pool de teste inicial: 50–500 viewers, 70% não inscritos.',
          'Retenção sub-30s: meta 65%+ para distribuição ampla. Retenção 30–60s: 50%+.',
          'Janela viral: 24–36 horas — sinais iniciais definem se estoura.',
          'Frequência citada na base: 1 Short/dia, e não subir o 2º enquanto o 1º está sendo empurrado (esperar 12h+ de flatline). O ritmo do Pablin em novembro, na fase de teste, é cerca de 12 vídeos por semana. Intervalo só pesa quando dois vídeos fortes competem pelo mesmo momento.',
          'Desde jan/2026 a Busca ganhou peso: título e descrição importam mais. Meta: 30%+ do tráfego vindo de busca.',
          'Desde mar/2025: qualquer loop conta como view, mas só engaged views valem para monetização.',
        ],
      },
    ],
  },
  {
    slug: 'diagnostico',
    title: 'Diagnóstico',
    lede: 'Sintoma, diagnóstico e solução. Dado real vence teoria.',
    blocks: [
      {
        type: 'rows',
        rows: DIAGNOSIS_ROWS.map((row) => ({
          title: row.symptom,
          lines: [row.diagnosis, row.solution],
        })),
      },
      {
        type: 'p',
        text: 'No diário, o app aplica sozinho APV abaixo de 50%, busca abaixo de 30% e inscritos abaixo de 0,5% por 1.000 views (quando há pelo menos 1.000 views). Impressões e flatline não entram no formulário, então esses dois sintomas ficam só aqui.',
      },
      { type: 'h', text: 'Protocolo' },
      {
        type: 'ul',
        items: [
          'Registrar o vídeo com formato e personagem. O mais recente fica no topo.',
          'Comparar com as metas e com a média do canal. Diagnosticar. Escrever uma lição em uma frase.',
          'Atualizar o placar e aplicar a ramificação.',
          'Ajustar a nota do formato com 3 ou mais registros. O caderno não define a fórmula — o app mostra quantos passaram da média e deixa a nota de 1 a 5 para ajuste manual.',
          'Dizer o que mudar no próximo vídeo.',
          'Padrões só são confiáveis com 3 ou mais registros na mesma direção. Antes disso, é hipótese.',
          'Se uma lição contradiz o MasterDoc 3 ou mais vezes, vale atualizar o MasterDoc.',
          'A cada 10 registros, revisar o que os dados mostram que funciona e o que não funciona.',
        ],
      },
    ],
  },
  {
    slug: 'em-alta',
    title: 'Em alta (julho)',
    lede: 'Lista de julho/2026. Janela de 7–28 dias. Se estiver desatualizada, validar antes.',
    blocks: [
      {
        type: 'callout',
        text: 'Esta lista é de julho/2026. Novembro manda sempre validar antes, no Modo 4. Ela não é o placar de 12/nov.',
      },
      {
        type: 'rows',
        rows: [
          { title: '1. Digital Circus', lines: ['Animação', 'Sazonal — finale trending #1 em abril, ainda aquecido'] },
          { title: '2. Meccha Chameleon', lines: ['Jogo 2026', 'Sazonal — chamado de game of the year'] },
          { title: '3. Poppy Playtime', lines: ['Jogo/franquia', 'Sazonal — volume alto'] },
          { title: '4. Roblox', lines: ['Jogo/plataforma', 'Evergreen — Hospital de Animais em alta'] },
          { title: '5. Huntrix (Caçadoras de Demônio)', lines: ['Animação Kpop', 'Evergreen'] },
          { title: '6. Gugu Gaga', lines: ['Viral/trend', 'Sazonal'] },
          { title: '7. Invencível', lines: ['Animação', 'Sazonal'] },
        ],
      },
      {
        type: 'p',
        text: 'Evergreen = usar o ano todo. Sazonal = usar dentro da janela de 7–28 dias. Ranquear o jogo ou o personagem específico, não “Roblox”.',
      },
    ],
  },
  {
    slug: 'modos',
    title: 'Modos',
    lede: 'Quatro modos de usar o sistema. O app cobre o dia a dia: ideia, placar, diário e consulta.',
    blocks: [
      {
        type: 'rows',
        rows: [
          {
            title: 'Modo 1 — Analisar roteiro ou ideia',
            lines: [
              'Formato do catálogo e nota.',
              'Scorecard dos 6 elementos.',
              'Diagnóstico em ordem de gravidade.',
              'Roteiro nas 6 fases, cena a cena, revelação na última, cenas de no máximo 2–3s.',
              'Pacote: título (personagem + ação + keyword, 4–7 palavras, sem datas), 3 hashtags, descrição com keywords, direção de capa.',
              'Previsão de risco por métrica.',
            ],
          },
          {
            title: 'Modo 2 — Gerar ideias',
            lines: [
              'Passam nos 6 elementos, usam capacetes prontos e personagens do topo do placar.',
              'A maioria em formatos que rodam, 1–2 de teste.',
              'Cada ideia com personagem, formato, gancho, gatilho emocional e esboço em 6 fases.',
            ],
          },
          {
            title: 'Modo 3 — Registrar resultados',
            lines: [
              'Comparar com metas e média do canal, diagnosticar, atualizar o placar, aplicar ramificação e ajustar a nota do formato com 3 ou mais registros.',
            ],
          },
          {
            title: 'Modo 4 — Ranquear personagens',
            lines: [
              'Vale capacete? Notas de sinal externo, sinal interno (ou não testado), janela, encaixe e custo.',
              'Externo alto, sem teste → desenho simples.',
              'Interno acima da média + janela de cerca de 4 semanas ou evergreen + encaixe em 3 ou mais formatos → produzir capacete.',
              'Capacete pronto e resultado caindo → ramificação.',
              'Falhou em 3 formatos ou janela acabando → arquivar.',
            ],
          },
        ],
      },
    ],
  },
]

export function sectionBySlug(slug: string): Section | undefined {
  return sections.find((section) => section.slug === slug)
}
