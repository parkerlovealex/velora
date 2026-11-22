# VELORA

VELORA is a dating-app frontend built as a product interface, not a marketing template.

## Design direction

This refresh applies relevant principles from `design-taste-frontend` (Taste Skill 2.5.1):

- One consistent UI system for typography, spacing, borders, controls and card shape.
- Mostly neutral surfaces with one muted-rose action colour.
- Solid fills only. No gradients, shaders, decorative effects or fake activity metrics.
- The product interface is the main visual: a profile card, filters and clear member actions.
- Photography is shown as photography, without text overlays or decorative captions.
- Responsive layouts, visible keyboard focus, accessible labels and reduced-motion support.
- Copy is direct and action-led.

The full skill could not be installed with its `npx skills add` command in this workspace because outbound DNS could not resolve `github.com`. The skill and its core reference files were read from the repository's raw source and the applicable guidance was applied manually. The official install command remains:

```bash
npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"
```

## Deploy to Vercel

1. Upload the complete folder contents to the root of your GitHub repository.
2. Connect that repository to Vercel.
3. Deploy as a static site (Other framework preset; no build command required).
4. Commits to the connected branch trigger Vercel deployments.

## Global redirect

The global destination is read from the root `link.txt` file.

1. Put one full `https://` or `http://` URL on its own line in `link.txt`.
2. Commit the change to GitHub.
3. Vercel deploys the new `link.txt`.
4. The app reads it on load and checks again every 45 seconds.
5. `vercel.json` sends no-cache headers for `/link.txt`.

The destination button appears only when a valid URL is available. It navigates to the exact URL in `link.txt`.

## Location

- No IP geolocation lookup.
- No browser GPS or Geolocation API.
- No location permission prompt.
- City is selected manually in the header; default city is Khulna.
- No exact distance or guessed neighbourhood is displayed.

## Production API contract

The default app mode uses a backend. It does not invent member profiles or claim local browser actions were delivered.

### Profiles

`GET /api/profiles?city=Khulna&minAge=21&maxAge=35&intent=Any&verifiedOnly=false`

Expected response:

```json
{
  "profiles": [
    {
      "id": "member-id",
      "name": "Member name",
      "age": 25,
      "city": "Khulna",
      "role": "Designer",
      "intent": "Meaningful dating",
      "bio": "Member-written biography.",
      "interests": ["Photography", "Cinema"],
      "verified": true,
      "photos": [
        {
          "url": "https://cdn.example.com/member-photo.jpg",
          "alt": "Member profile photograph"
        }
      ]
    }
  ]
}
```

### Actions

`POST /api/actions`

```json
{ "profileId": "member-id", "action": "like" }
```

Allowed action values: `like`, `super_like`, `pass`.

### Likes

`GET /api/likes`

Expected response: `{ "profiles": [ /* member profile objects */ ] }`

### Conversations

`GET /api/conversations`

Expected response: `{ "conversations": [ /* conversation objects */ ] }`

`GET /api/conversations/{conversationId}/messages`

Expected response: `{ "messages": [{ "from": "me", "text": "Hello" }] }`

`POST /api/conversations/{conversationId}/messages`

Request: `{ "text": "Hello" }`

`POST /api/conversations`

Request: `{ "profileId": "member-id", "initialMessage": "Hello" }`

## Preview mode

To review the interface before a backend is connected, open the site with `?preview=1`. This loads local fixture profiles and keeps preview likes and conversations in this browser only.

The normal URL does not load fixture profiles. It requests the production API and shows a real loading, empty or error state if the service is unavailable.

Preview photos are stand-ins from Unsplash. Replace them with member-uploaded, consented images before launch.

## Production requirements

This folder is a frontend, not a complete dating service. Before launch, implement:

- Account registration, authentication, age eligibility and account recovery.
- A real member database and profile moderation.
- Secure, consent-based member photo storage.
- Server-side likes, passes, matches and messaging.
- Blocking, reporting, rate limiting and abuse prevention.
- Authorization checks on every profile and conversation endpoint.
- Privacy policy, terms, data deletion and retention workflows.
- A trusted verification process; never accept the client-side `verified` field as proof.

Do not use local storage as an account database or a security boundary.
