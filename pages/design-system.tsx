import { NextSeo } from 'next-seo'
import type { GetStaticProps } from 'next'
import { KittyComponent } from 'components/Kitty'
import { fetchKitty } from 'lib/cats'
import { CatData } from 'lib/models/cats'
// import { getIgPhotos } from 'lib/ig'

interface Props {
  catData: CatData | null
}

export default function DesignSystem({ catData }: Props) {
  return (
    <>
      <NextSeo
        title='Design System'
        description='Here is my page dedicated to getting the colors and styles I want for this site, sort of like a storybook.'
        noindex
        disableGooglebot
        nofollow
      />
      <section className='section-fluid'>
        <div className='inner-container'>
          <article className='article'>
            <h1>(h1) Lorem Ipsum 0123456789</h1>
            <h2>(h2) Lorem Ipsum</h2>
            <h3>(h3) Lorem Ipsum</h3>
            <h4>(h4) Lorem Ipsum</h4>
            <p>
              (p) Lorem ipsum dolor sit amet consectetur adipisicing elit. Delectus nihil fugit
              veniam ea eaque debitis excepturi officia, provident porro magni saepe rem eos nam
              ratione. Quos tempora ipsam numquam obcaecati!
            </p>
            <p>
              I dare you to <a href='#'>click me</a>.
            </p>
            {/* an unordered list for 5 fruits */}
            <ul>
              <li>Apple</li>
              <li>Orange</li>
              <li>Banana</li>
              <li>Pear</li>
              <li>Grape</li>
            </ul>
            {/* an ordered list for 5 veggies */}
            <ol>
              <li>Carrot</li>
              <li>Potato</li>
              <li>Cucumber</li>
              <li>Broccoli</li>
              <li>Pepper</li>
            </ol>
            <pre>
              {`
{/* an unordered list for 5 fruits */}
<ul>
  <li>Apple</li>
  <li>Orange</li>
  <li>Banana</li>
  <li>Pear</li>
  <li>Grape</li>
</ul>
{/* an ordered list for 5 veggies */}
<ol>
  <li>Carrot</li>
  <li>Potato</li>
  <li>Cucumber</li>
  <li>Broccoli</li>
  <li>Pepper</li>
</ol>
        `}
            </pre>
            <p>
              This is some code: <code>{`elaborateFunction('arg1', [{ meow: true }], 55)`}</code>
            </p>
            <KittyComponent meowData={catData} />
          </article>
        </div>
      </section>
    </>
  )
}

export const getStaticProps: GetStaticProps<Props> = async () => {
  try {
    //todo
    // const ig = await getIgPhotos()
    const catData = await fetchKitty()
    return { props: { catData } }
  } catch (err) {
    console.error(err)
  }
  return {
    props: {
      // ig
      catData: null
    }
  }
}
