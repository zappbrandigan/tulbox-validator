# Tulbox Validator

Chrome Manifest V3 extension that gates a site's `Save`, `Submit`, or `Submit Changes` button behind custom validation rules.

## Watched Fields

- Music Text Relationship: `id="work-tmr"`
- Capacity: every field whose id starts with `writer-capacity-`
- Type: `id="work-type"`
- Genre: `id="work-genre"`
- Button: button text is `Save`, `Submit`, or `Submit Changes`

## Load Locally

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select this project folder.

## Site Scope

The extension is active on:

```json
"matches": ["https://works.global.umusic.net/*"]
```

## Validation Rules

Rules live in `src/content.js` inside the `validate(values)` function.

- If Genre starts with `054` or `050`, Type must start with `CU`.
- If Genre starts with `059`, Type must start with `OG`.
- At least one writer capacity must start with `C` or `CA`.
- If Music Text Relationship starts with `MTX`, at least one writer capacity must start with `CA` or `A`.
- If Music Text Relationship starts with `MUS`, no writer capacity may start with `CA`, `A`, or `SA`.

Available values:

```js
{
  musicTextRelationship: "...",
  type: "...",
  genre: "...",
  capacities: ["..."]
}
```
