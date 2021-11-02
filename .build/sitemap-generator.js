import { configureSitemap } from '@sergeymyssak/nextjs-sitemap' // for typescript

import path from 'path' // utility for generating sitemap

const Sitemap = configureSitemap({
  domains: [
    {
      domain: 'copt.dev',
      defaultLocale: 'en',
      http: false
    }
  ],
  exclude: ['/api/*'],
  // excludeIndex: true,
  // pagesConfig: {
  //   '/projects/*': {
  //     priority: '0.5',
  //     changefreq: 'daily',
  //   },
  // },
  trailingSlash: false,
  targetDirectory: path.resolve(process.cwd(), 'public'),
  pagesDirectory: path.resolve(process.cwd(), 'pages')
})
Sitemap.generateSitemap().catch(e => {
  console.error(e)
})
