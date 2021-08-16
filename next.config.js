// @ts-check

/**
 * //@type {import('next').NextConfig}
 **/
const config = {
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  experimental: {
    stats: true
  },
  eslint: {
    dirs: ['pages', 'components', 'lib'] // Only run ESLint on these directories during production builds (next build)
  }
}

module.exports = config
