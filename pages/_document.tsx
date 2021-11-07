import Document, { Head, Html, Main, NextScript } from 'next/document'

class MyDocument extends Document {
  render() {
    return (
      <Html lang='en'>
        <Head>
          <meta charSet='utf-8' />
          <meta content={'#692222'} name={'msapplication-TileColor'} />
          <meta
            content={'/static/images/favicons/browserconfig.xml'}
            name={'msapplication-config'}
          />
          <meta content={'#692222'} name={'theme-color'} />
          <meta name='apple-mobile-web-app-title' content='Copt' />
          <meta name='application-name' content='Copt' />
          <link
            href={'/static/images/favicons/apple-touch-icon.png'}
            rel={'apple-touch-icon'}
            sizes={'180x180'}
          />
          <link
            href={'/static/images/favicons/favicon-32x32.png'}
            rel={'icon'}
            sizes={'32x32'}
            type={'image/png'}
          />
          <link
            href={'/static/images/favicons/favicon-16x16.png'}
            rel={'icon'}
            sizes={'16x16'}
            type={'image/png'}
          />
          <link href={'/static/images/favicons/site.webmanifest'} rel={'manifest'} />
          <link
            color={'#fff'}
            href={'/static/images/favicons/safari-pinned-tab.svg'}
            rel={'mask-icon'}
          />
          <link href={'/static/images/favicons/favicon.ico'} rel={'shortcut icon'} />
          <link
            rel='preload'
            href='/static/fonts/Inter-italic.var.woff2'
            as='font'
            type='font/woff2'
            crossOrigin='anonymous'
          />
          <link
            rel='preload'
            href='/static/fonts/Inter-roman.var.woff2'
            as='font'
            type='font/woff2'
            crossOrigin='anonymous'
          />
        </Head>
        <body className='bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100'>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
