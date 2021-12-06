import { NextSeo } from 'next-seo'

export default function Portfolio() {
  // todo: add projects, update seo, use nested routes for each project
  return (
    <>
      <NextSeo title='Portfolio' description='todo' noindex disableGooglebot nofollow />
      <div>
        <h1>Portfolio</h1>
        <p>some work I&apos;ve been responsible for...</p>
      </div>
    </>
  )
}
