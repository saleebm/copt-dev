import { NextSeo } from 'next-seo'
import { GetStaticProps } from 'next'
import { motion } from 'framer-motion'
import { floatInOut } from 'utilities/animations/variants'
import { transitionChildren } from 'utilities/animations/transitions'
import { fetchKitty } from 'lib/cats'
import type { CatData } from 'lib/models/cats'
import { KittyComponent } from 'components/Kitty'

interface Props {
  catData: CatData | null
}

function FourOhFourPage({ catData }: Props) {
  //todo make this appealing, add something to help someone fine their kitty er way out
  return (
    <>
      <NextSeo title={'404'} noindex />
      <section className='section-fluid'>
        <motion.div
          variants={floatInOut}
          transition={transitionChildren}
          className='container gutter-x gutter-y'
        >
          <h1 className='text-center'>404</h1>
          <h2 className='text-center'>
            <i>Look, kitty!</i>&nbsp;
            <span role='img' aria-label='cat'>
              🐱
            </span>
          </h2>
          <div className={'kitty'}>
            <KittyComponent meowData={catData} />
          </div>
        </motion.div>
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
      // don't re-generate the page
      revalidate: false
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
