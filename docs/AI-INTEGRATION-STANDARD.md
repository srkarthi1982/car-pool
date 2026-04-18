# AI Integration Standard

## Purpose
This document defines the frozen Ansiversa V1 standard for AI integrations across mini-apps and community-built apps.

## Architecture Rule
- Only the parent app (`web`) talks to OpenAI.
- Mini-apps must never call OpenAI directly.
- Mini-apps call a same-origin local proxy route, and that proxy forwards to the parent AI Gateway.

## Gateway Contract
Parent AI Gateway endpoints:
- `GET /api/ai/ping.json`
- `POST /api/ai/suggest.json`

Request body:
```json
{ "featureKey": "string", "userText": "string" }
```

Success response:
```json
{ "featureKey": "string", "suggestions": ["..."] }
```

Error response:
```json
{ "error": "string", "code": "string" }
```

## FeatureKey Allowlist Policy
- Every `featureKey` must be registered in parent `web/src/lib/ai/featureRegistry.ts`.
- This is mandatory for safety, prompt governance, and cost control.

## UI Standard
- Use `AvAiAssist` from `@ansiversa/components`.
- Default events:
  - `av:ai-append`
  - `av:ai-replace`
- Recommended settings:
  - `minChars: 30`
  - `maxChars: 1500`
- V1 behavior is suggestions-only.

## Mini-App Proxy Pattern
- Add local proxy route: `/api/ai/suggest`.
- Use `resolveParentOrigin()` helper.
- In production, canonicalize parent origin to:
  - `https://www.ansiversa.com`
- Forward incoming cookies to parent gateway request to preserve session continuity.

## V1 Scope Freeze
- Suggestions only.
- No full-document generation.
- No automatic overwrite.
- No AI-related DB schema/data model changes.

## Reference Implementations
- Resume Builder: Summary field AI suggestions.
- Portfolio Creator: Featured Projects → Description AI suggestions.
- Parent web verification page: `/admin/ai-gateway-test`.

## Verification Checklist
- Works in production.
- No CORS errors.
- No redirect hops in gateway path.
- `401` and `429` are handled clearly in UI.
- `suggestions` response is an array of strings.

## Note
Structured Outputs may be used in a later version if strict schema-guaranteed responses are required; V1 remains suggestions-only.
