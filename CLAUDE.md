# Project Notes

## Production URL
- Domain: `https://predictions.awaywegopodcast.com`
- Leaderboard image (for MailerLite embeds): `https://predictions.awaywegopodcast.com/leaderboard-image.png`
- Top 10 leaderboard image: `https://predictions.awaywegopodcast.com/leaderboard-image.png?limit=10`
- The `?limit=` parameter accepts 1–20 to control how many rows are shown

## Deployment
- Hosted on Railway, which auto-deploys from the `main` branch. Changes go live only after they're merged into `main`.
- Railway posts a commit status on each commit it deploys; no status on the latest `main` commit means it hasn't deployed.
