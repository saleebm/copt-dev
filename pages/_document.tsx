import Document, { Head, Html, Main, NextScript } from 'next/document'

class MyDocument extends Document {
  render() {
    return (
      <Html className='text-gray-900 leading-tight' lang='en'>
        <Head>
          <meta charSet='utf-8' />
          <meta content={'#b24c81'} name={'msapplication-TileColor'} />
          <meta
            content={'/static/images/favicons/browserconfig.xml'}
            name={'msapplication-config'}
          />
          <meta content={'#b24c81'} name={'theme-color'} />
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
            color={'#999999'}
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
        <body className='bg-white dark:bg-black text-white dark:text-black'>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
