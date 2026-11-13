import type { ElementId } from '@/types'

export const CRITERIA = [
  { key: 'dificuldade', label: 'Dificuldade', hint: '5 = muito fácil' },
  { key: 'materiais', label: 'Materiais', hint: '5 = quase nenhum — a avaliar no caderno' },
  { key: 'tempo', label: 'Tempo', hint: '5 = muito rápido — a avaliar no caderno' },
  { key: 'resultado', label: 'Resultado', hint: 'Views e desempenho que costuma entregar' },
  {
    key: 'reaproveitamento',
    label: 'Reaproveitamento',
    hint: 'Quanto usa capacete e desenhos prontos e gera material para outros formatos',
  },
  { key: 'validacao', label: 'Validação', hint: '5 = entrega toda vez — a avaliar no caderno' },
] as const

export const DIAGNOSIS_ROWS = [
  {
    id: 'apv',
    symptom: 'APV abaixo de 50%',
    diagnosis: 'Hook falhou — primeiros 3s perderam o viewer',
    solution: 'Reconstruir a abertura',
  },
  {
    id: 'thumb',
    symptom: 'Muitas impressões, poucas views',
    diagnosis: 'Thumbnail não converte',
    solution: 'Redesenhar thumbnail',
  },
  {
    id: 'subs',
    symptom: 'Muitas views, poucos inscritos',
    diagnosis: 'Conteúdo não fideliza',
    solution: 'Criar série ou personagem fixo',
  },
  {
    id: 'flat',
    symptom: 'Flatline antes de 24-36h',
    diagnosis: 'Sinais iniciais fracos no pool de teste',
    solution: 'Revisar os 6 elementos do próximo vídeo',
  },
  {
    id: 'search',
    symptom: 'Tráfego de busca < 30%',
    diagnosis: 'Título/descrição fracos em keywords',
    solution: 'Reescrever com keyword + personagem',
  },
] as const

export const METRIC_ROWS = [
  { metric: 'AVD / APV (% assistido)', indicates: 'Quanto do vídeo foi assistido', goal: '70%+' },
  { metric: 'Viewed vs Swiped Away', indicates: 'Ficou vs pulou imediatamente', goal: '80%+ é excelente' },
  { metric: 'APV acima de 100%', indicates: 'Vídeo assistido mais de uma vez (loop)', goal: 'Quanto maior, melhor' },
  { metric: 'CTR (impressões → views)', indicates: 'Thumbnail convertendo cliques', goal: '7%+' },
  { metric: 'Inscritos ganhos', indicates: 'Views convertidas em seguidores', goal: '0,5%+ por 1.000 views' },
  { metric: 'Fonte de tráfego', indicates: 'Feed vs Busca', goal: 'Busca 30%+' },
  { metric: 'Retenção sub-30s', indicates: 'Passar do pool de teste', goal: '65%+' },
  { metric: 'Retenção 30-60s', indicates: 'Passar do pool de teste', goal: '50%+' },
] as const

export const PHASES = [
  {
    id: 'declare',
    title: 'Declare',
    text: 'Declaração do que vai acontecer',
    example: 'Ex.: “Vou desenhar Poppy Playtime só com círculos” (visual, sem fala)',
  },
  { id: 'assessment', title: 'Assessment', text: 'Avaliação/preparação. Mostrar material, medir, preparar', example: '' },
  { id: 'isolate', title: 'Isolate', text: 'Processo passo a passo. Cada traço, cada corte do papel machê', example: '' },
  { id: 'process', title: 'Process', text: 'Time-lapse do trabalho intenso. Construção da máscara ou desenho', example: '' },
  { id: 'build', title: 'Build', text: 'Tudo se encaixando. Detalhes finais, pintura, acabamento', example: '' },
  { id: 'reveal', title: 'Reveal', text: 'Resultado final. Transformação completa — antes e depois', example: '' },
] as const

export const ELEMENTS: {
  id: ElementId
  title: string
  text: string
  note: string
}[] = [
  {
    id: 'segundos',
    title: 'Os 6 segundos',
    text: 'Duração ideal na base de julho; força loop de rewatch automático.',
    note: 'Novembro prevalece: 6s para revelação em loop (transformações); 15–30s para narrativa (Dr. Harlow, Níveis). Raramente passa de 30s.',
  },
  {
    id: 'personagem',
    title: 'Personagem em alta',
    text: 'Assunto com demanda comprovada nos últimos 7–28 dias.',
    note: 'A lista Em Alta da base é de julho/2026. Validar antes, no Modo 4.',
  },
  {
    id: 'musica',
    title: 'Música em alta',
    text: 'Som que o algoritmo já está distribuindo.',
    note: '',
  },
  {
    id: 'frames',
    title: 'Frames chamativos',
    text: 'Todo corte precisa prender: ângulo, ação ou expressão forte.',
    note: '',
  },
  {
    id: 'capa',
    title: 'Capa atrativa',
    text: 'Thumbnail que para o scroll.',
    note: 'Novembro prevalece: capa e CTR pesam menos em Shorts. A prioridade é o gancho dos 3 primeiros segundos.',
  },
  {
    id: 'parada',
    title: 'Parada de intenção',
    text: 'Momento que faz o viewer parar, rever ou comentar.',
    note: '',
  },
]

export const KEYWORD_GROUPS = [
  { category: 'Animation, Drawing, Sketch, Art', words: ['Animation', 'Drawing', 'Sketch', 'Art'] },
  { category: 'Game, Gaming, Roblox', words: ['Game', 'Gaming', 'Roblox'] },
  { category: 'Painting, Modeling, Fan Art', words: ['Painting', 'Modeling', 'Fan Art'] },
  { category: 'Fun, Funny, Cute', words: ['Fun', 'Funny', 'Cute'] },
  { category: 'Cartoon, Animated, Character', words: ['Cartoon', 'Animated', 'Character'] },
  { category: 'Food, Cooking, Yummy', words: ['Food', 'Cooking', 'Yummy'] },
  { category: 'ASMR, Relaxing, Satisfying', words: ['ASMR', 'Relaxing', 'Satisfying'] },
  { category: 'Color, Rainbow, Colorful', words: ['Color', 'Rainbow', 'Colorful'] },
  { category: 'Jesus, Bible Story, Faith (evergreen)', words: ['Jesus', 'Bible Story', 'Faith'] },
] as const

export const HOOKS = [
  { name: 'O Vidente', text: 'Presente vs futuro: personagem em situação normal → algo vai mudar.' },
  { name: 'O Experimentador', text: 'Demonstração: personagem testa algo inesperado visualmente.' },
  { name: 'O Mágico', text: 'Algo impossível nos primeiros frames.' },
  { name: 'O Investigador', text: 'Personagem descobre algo escondido.' },
  { name: 'O Contrário', text: 'Contradiz o óbvio: Rico vs Pobre invertido, Fraco vence Forte.' },
  { name: 'O Professor', text: 'Ensina algo: how to draw, dica rápida.' },
] as const

export const TEST_HOWTO =
  'Como testar: 2–3 testes por semana; formato novo com personagem e capacete já validados (uma variável por vez); 2–3 vídeos antes de julgar.'

export const FORMULA =
  'Personagem em alta + Arte visual simples + Sem fala = Alcance global com baixo custo de produção.'
