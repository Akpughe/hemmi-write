This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

### Required API Keys
- `EXA_API_KEY` - Exa search API key
- `PERPLEXITY_API_KEY` - Perplexity AI API key
- `MISTRAL_API_KEY` - Mistral AI API key for content extraction
- `GROQ_API_KEY` - Groq API key for AI generation
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

### Optional Metadata Enrichment API Keys
These are optional but recommended for better academic reference quality:

- `CROSSREF_API_EMAIL` - Email for CrossRef API (required for polite requests, defaults to dev@hemmi.com)
- `OPENALEX_API_EMAIL` - Email for OpenAlex API (optional but recommended, defaults to dev@hemmi.com)
- `SEMANTIC_SCHOLAR_API_KEY` - Semantic Scholar API key (optional, increases rate limits)
- `UNPAYWALL_EMAIL` - Email for Unpaywall API (required, defaults to dev@hemmi.com)

Note: All metadata enrichment APIs (CrossRef, OpenAlex, Semantic Scholar, Unpaywall) are FREE and don't require API keys, but providing email addresses ensures polite API usage and higher rate limits.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
