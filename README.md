# TrackIt

A habit, task and personal-metrics tracker. Live at https://trackit.sauravdev.in.

| Folder | What it is | Stack |
| --- | --- | --- |
| [`frontend/`](frontend) | Web app | Next.js, TypeScript, Tailwind CSS |
| [`backend/`](backend) | REST + realtime API | Node.js, Express, TypeScript, MongoDB, Socket.io |

## Getting started

### Backend

```bash
cd backend
cp .env.example .env.dev   # fill in your own values
npm install
npm run dev
```

The backend expects MongoDB, an S3 bucket, Google OAuth, web-push (VAPID) keys, Razorpay and a Gemini API key. See `backend/.env.example` for every variable.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. Optional: set `NEXT_PUBLIC_SITE_URL` for SEO metadata.

## Contributing

Issues and pull requests are welcome. Never commit `.env` files or credentials.

## License

[MIT](LICENSE)
