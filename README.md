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

A pasta `dist` é o site pronto. Dá para subir na Netlify, Cloudflare Pages, GitHub Pages ou qualquer hospedagem de arquivo estático. Não precisa de servidor.

Para ver essa versão na sua máquina:

```bash
npm run preview
```

No celular, abra o endereço publicado no Chrome ou Safari e use **Adicionar à tela de início**. A primeira visita precisa de internet. Depois o app abre sem rede. Os vídeos e as notas continuam só neste aparelho: em Ajustes, exporte o JSON de vez em quando e guarde o arquivo.

## Testes

```bash
npm test
```
