import { GetStaticProps } from 'next'
import { Head } from 'components/Head'
// import { getIgPhotos } from 'lib/ig'

// interface Props {}

export default function Home() {
  return (
    <>
      <Head
        title='Welcome'
        description="Hi, I'm Mina, a cat/web developer based in Orlando, FL. This is my www for showing what I am up to."
      />
      <section className='section-fluid'>
        <div className='inner-container'></div>
      </section>
    </>
  )
}

export const getStaticProps: GetStaticProps = async () => {
  try {
    //todo
    // const ig = await getIgPhotos()
    return { props: {} }
  } catch (err) {
    console.error(err)
  }
  return {
    props: {
      // ig
    }
  }
}
