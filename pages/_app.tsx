import 'styles/main.scss'
import type { AppProps } from 'next/app'
import { ThemeProvider } from 'next-themes'
import { DefaultSeo } from 'next-seo'
import { AnimatePresence } from 'framer-motion'
import { AppLayout } from 'layouts/AppLayout'
import { ErrorBoundary } from 'components/ErrorBoundary'
import { nextSeoConfig } from 'next-seo.config'

function MyApp({ Component, pageProps, router }: AppProps) {
  return (
    <ErrorBoundary>
      <DefaultSeo {...nextSeoConfig} />
      <ThemeProvider disableTransitionOnChange attribute='class'>
        <AnimatePresence mode='wait'>
          <AppLayout key={router.route}>
            <Component {...pageProps} />
          </AppLayout>
        </AnimatePresence>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
export default MyApp
