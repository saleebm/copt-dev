import type { CatData } from 'lib/models/cats'
import { NextSeo } from 'next-seo'
import { KittyComponent } from 'components/Kitty'
import { GetStaticProps } from 'next'
import { fetchKitty } from 'lib/cats'

interface Props {
  catData: CatData | null
}

function FourOhFourPage({ catData }: Props) {
  //todo make this appealing, add something to help someone fine their kitty er way out
  return (
    <>
      <NextSeo title={'404'} noindex />
      <section className='section-fluid'>
        <div className='container'>
          <h1 className='text-center'>404</h1>
          <h2 className='text-center'>
            <i>Look, kitty!</i>&nbsp;
            <span role='img' aria-label='cat'>
              🐱
            </span>
          </h2>
          <KittyComponent meowData={catData} />
        </div>
      </section>
    </>
  )
}

export const getStaticProps: GetStaticProps<Props> = async () => {
  try {
    const catData = await fetchKitty()
    return {
      props: {
        catData: catData
      },
      // revalidate every 24 hours
      revalidate: 86400
    }
  } catch (e) {
    console.error(e)
    return {
      props: {
        catData: null
      }
    }
  }
}

export default FourOhFourPage
