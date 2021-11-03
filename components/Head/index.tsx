import type { MetaTag, OpenGraphMedia } from 'next-seo/lib/types'
import { LogoJsonLd, NextSeo, SocialProfileJsonLd } from 'next-seo'
import {
  facebookProfile,
  instagramProfile,
  linkedinProfile,
  twitterProfile
} from 'config/social-profiles'
import goldenLightEye from 'public/static/images/logo/golden_light_eye1200px.png'
import myNameImg from 'public/static/images/logo/mina-saleeb.svg'

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
          title: `Mina Saleeb ☥ ${props.title}`,
          images: [
            {
              url: goldenLightEye.src,
              height: goldenLightEye.height,
              width: goldenLightEye.width,
              alt: 'Golden Light Egyptian Eye'
            },
            {
              url: myNameImg.src,
              height: myNameImg.height,
              width: myNameImg.width,
              alt: 'Mina Saleeb'
            },
            ...(props.images || [])
          ],
          site_name: 'copt'
        }}
        additionalMetaTags={props.additionalMetaTags}
      />
      <SocialProfileJsonLd
        type='Person'
        name='Mina Saleeb'
        url='http://www.copt.dev'
        sameAs={[facebookProfile, instagramProfile, linkedinProfile, twitterProfile]}
      />
      <LogoJsonLd logo={goldenLightEye.src} url='https://www.copt.dev' />
    </>
  )
}
