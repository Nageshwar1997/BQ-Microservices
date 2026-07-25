import { generateHtmlFromMarkdown } from '@beautinique/shared-markdown-to-html';

generateHtmlFromMarkdown({
  markdownPath: 'README.md',
  outputPath: 'public/index.html',
  title: 'Organization Service',
});
