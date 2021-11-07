namespace NodeJS {
  interface ProcessEnv extends NodeJS.ProcessEnv {
    NEXT_PUBLIC_TWITTER_PROFILE: string
    NEXT_PUBLIC_INSTAGRAM_PROFILE: string
    NEXT_PUBLIC_FACEBOOK_PROFILE: string
    NEXT_PUBLIC_LINKEDIN_PROFILE: string
    NEXT_PUBLIC_GITHUB_PROFILE: string
    DATABASE_URL: string
    CAT_API_KEY: string
  }
}
