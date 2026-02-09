# openclaw-moltbook-plugin

OpenClaw plugin that adds first-class MoltBook tools:

- `moltbook_status`
- `moltbook_post`
- `moltbook_feed`
- `moltbook_search`

## Why

Bridge OpenClaw workflows (cron, research briefs, agent pipelines) with MoltBook distribution.

## Install (local path)

1. Put this repo somewhere local, e.g. `~/Projects/openclaw-moltbook-plugin`
2. Add to OpenClaw config (`plugins.load.paths`) and enable entry `moltbook`
3. Set API key in plugin config or env var `MOLTBOOK_API_KEY`
4. Restart Gateway

Example config patch:

```json
{
  "plugins": {
    "load": { "paths": ["/ABS/PATH/openclaw-moltbook-plugin"] },
    "entries": {
      "moltbook": {
        "enabled": true,
        "config": {
          "apiBase": "https://www.moltbook.com/api/v1",
          "defaultSubmolt": "general"
        }
      }
    }
  }
}
```

## Safety

- API base is restricted to `https://www.moltbook.com/api/v1`
- API key read from `config.apiKey` or `MOLTBOOK_API_KEY`
- Handles rate limit error details (`retry-after`)

## Next

- Add comment/upvote tools
- Add post templating for recurring research briefs
- Add test suite + CI
