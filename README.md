# typesafe-pi

TypeSafe System One for [Pi](https://pi.dev): a structured judgment tool plus a skill for building TypeSafe-powered software.

## Install

```bash
pi install https://github.com/gvkhosla/typesafe-pi
```

Get an API key from [console.typesafe.ai](https://console.typesafe.ai), then set it before starting Pi:

```bash
export TYPESAFE_API_KEY="your-key"
pi
```

Inside Pi:

```text
/typesafe enable
/typesafe test
```

The package is disabled by default and asks for confirmation before agent-initiated requests.

## Use

Ask Pi for a narrow semantic judgment:

> Use TypeSafe to classify these support tickets by department and flag uncertain answers for review.

Or use the bundled skill to build an integration:

> Add TypeSafe to route incoming feedback, with human review when confidence is low.

The package provides:

- `typesafe_judge` — batches Choice, Score, and Noul questions in one request.
- `/typesafe status|enable|disable|test` — consent, status, and a smoke test.
- `typesafe` skill — current-doc discovery, question design, implementation, and verification guidance.

## Privacy and limits

Only the state and questions passed to `typesafe_judge` are sent to `api.typesafe.ai`. The package does not automatically collect files or conversation history.

- 32 questions per request
- 64 KiB serialized request
- 20 requests per Pi session
- Choice: 2–255 options
- Score: 2–10 levels

For headless Pi, explicitly set `PI_TYPESAFE_ENABLED=1`. Results are model judgments—not proof or authorization.

## Development

```bash
npm install
npm run check
pi -e .
```

Tests are offline and inject their own `fetch` implementation.

## Credits

Built by [Geet Khosla](https://github.com/gvkhosla).

This project is an independent Pi-native adaptation inspired by TypeSafe AI's MIT-licensed [official agent skill](https://github.com/typesafe-ai/skills), and uses the official [`@typesafe-ai/sdk`](https://github.com/typesafe-ai/typesafe-sdk-js). TypeSafe, System One, and Jev are the work of [TypeSafe AI](https://typesafe.ai). Pi is maintained by the [Pi project](https://github.com/earendil-works/pi).

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for attribution. This project is not affiliated with TypeSafe AI or the Pi authors.

## License

MIT
