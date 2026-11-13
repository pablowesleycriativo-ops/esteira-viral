# Esteira Viral

Painel de produção dos YouTube Shorts do Pablin. Funciona no celular, pode ser instalado e guarda os dados neste aparelho.

Os textos, notas e regras vieram do caderno de 13/nov/2026. O que o caderno não traz fica como **a avaliar**.

## Abrir no computador

```bash
npm install
npm run dev
```

Abra o endereço que o terminal mostrar (porta 4317).

## Gerar o site para publicar

```bash
npm run build
```

A pasta `dist` é o site pronto. Ela funciona na raiz de um domínio e também dentro de uma pasta, por exemplo `https://seuusuario.github.io/esteira-viral/`. Os endereços usam `#`, então atualizar a página não dá erro. Não precisa de servidor: suba o conteúdo de `dist` na Netlify, Cloudflare Pages, GitHub Pages ou qualquer hospedagem de arquivo.

Se a hospedagem exigir um caminho fixo, dá para gerar com ele:

```bash
VITE_BASE=/esteira-viral/ npm run build
```

Sem essa variável, o site se adapta à pasta em que estiver.

Para ver essa versão na sua máquina:

```bash
npm run preview
```

No celular, abra o endereço publicado no Chrome ou Safari e use **Adicionar à tela de início**. A primeira visita precisa de internet. Depois o app abre sem rede. Os vídeos e as notas continuam só neste aparelho: em Ajustes, exporte o JSON de vez em quando e guarde o arquivo.

## Testes

```bash
npm test
```
