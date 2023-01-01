namespace NodeJS {
  interface ProcessEnv extends NodeJS.ProcessEnv {
    NEXT_PUBLIC_TWITTER_PROFILE: string
    NEXT_PUBLIC_INSTAGRAM_PROFILE: string
    NEXT_PUBLIC_FACEBOOK_PROFILE: string
    NEXT_PUBLIC_LINKEDIN_PROFILE: string
    NEXT_PUBLIC_GITHUB_PROFILE: string
    NEXT_PUBLIC_POLYWORK_PROFILE: string
    NEXT_PUBLIC_SPOTIFY_USER_ID: string
    NEXT_PUBLIC_HOST: string
    DATABASE_URL: string
    CAT_API_KEY: string
    SPOTIFY_CLIENT_ID: string
    SPOTIFY_CLIENT_SECRET: string
    SPOTIFY_CLIENT_CODE: string
    SILLY_SECRET: string
    STATE_SECRET: string
  }
}
