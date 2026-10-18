# AI-assisted service translations

Service names, descriptions, and categories remain master-authored content. In
the service editor, the master chooses the source language, asks AI for drafts
in the other supported languages, reviews or edits each result, and saves the
approved translations with the service. The public booking page displays the
translation matching the client's selected language and falls back to the
master-authored text when a translation is missing.

AI is only called after the master presses the translation action. The booking
page never calls the AI provider. The edge function checks the user session and
workspace membership, limits source fields to the service editor's maximum
lengths, and allows at most 100 requests per workspace member in a rolling
24-hour window. Service name, description, and category are sent to OpenAI for
generation. Usage records contain only workspace, user, and request time; they
do not contain service text.

## Provider setup

The edge function uses the OpenAI Chat Completions API. Configure these secrets
in the Supabase project before deploying the function:

```sh
supabase secrets set OPENAI_API_KEY=...
```

`OPENAI_TRANSLATION_MODEL` is optional and defaults to `gpt-4o-mini`. The API
key is used only by the server-side edge function. Calls are pay-as-you-go under
the OpenAI account configured for this key; review that account's current
pricing and usage limits before enabling production requests. Without the key,
the function returns a service-unavailable response and the app displays a
localized retry message.

For local Supabase, add the key to a private environment file and serve the
function with that file. Do not commit the key or expose it through an
`EXPO_PUBLIC_*` variable.
