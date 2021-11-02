import type { MetaTag, OpenGraphMedia } from 'next-seo/lib/types'
import { NextSeo } from 'next-seo'
import goldenLightEye from 'public/static/images/logo/golden_light_eye1200px.png'

export interface HeadProps {
  title: string
  description: string
  images?: ReadonlyArray<OpenGraphMedia>
  additionalMetaTags?: ReadonlyArray<MetaTag>
}

export function Head(props: HeadProps) {
  return (
    <>
      <NextSeo
        description={props.description}
        title={props.title}
        openGraph={{
          type: 'WebPage',
          description: props.description,
          title: `copt | ${props.title}`,
          images: [
            {
              url: goldenLightEye.src,
              height: goldenLightEye.height,
              width: goldenLightEye.width,
              alt: 'Golden Light Egyptian Eye'
            },
            ...(props.images || [])
          ]
        }}
        additionalMetaTags={props.additionalMetaTags}
      />
    </>
  )
}
