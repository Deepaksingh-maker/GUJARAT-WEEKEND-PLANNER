# Render deployment

This repository deploys as two Render web services:

- `gujarat-weekend-backend`: FastAPI API on the Render-provided `PORT`
- `gujarat-weekend-frontend`: Next.js website on the Render-provided `PORT`

## Deploy from GitHub

1. Push the repository to GitHub, including `render.yaml`.
2. In Render, choose **New > Blueprint** and select the repository.
3. For the backend service, set these secret environment variables when prompted:
   - `SECRET_KEY`: a long random value
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
4. Deploy the backend first and copy its public URL.
5. In the frontend service environment, set:
   `NEXT_PUBLIC_API_URL=https://<backend-url>/api`
6. Redeploy the frontend after saving the environment variable.

The website will then be available at the frontend service's Render URL. The API
health check is available at `https://<backend-url>/api/health`.

## Data persistence

The initial deployment uses SQLite and local uploads. Render's default filesystem
is ephemeral, so database changes and uploaded files can be lost when the backend
restarts or redeploys. For real bookings, attach a persistent disk to the backend
or migrate the database and uploads to managed persistent services.

## Local Docker test

With Docker Desktop running:

```powershell
docker compose up --build
```

Open `http://localhost:3000`.
