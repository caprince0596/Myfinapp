

declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_API_KEY?: string;
    [key: string]: string | undefined;
  }
}
