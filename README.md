# Lab 6 Product Manager Frontend

React frontend for Laboratory Exercise 6. It calls the LavaLust JSON API at the URL in `.env.production`.

## Local development

Run `npm ci` and `npm run dev`, then open `http://localhost:5173/`. The default local API URL is `http://localhost:3000`; copy `.env.example` to `.env` if you need a different local URL.

## Render Static Site

Connect this repository as a Render Static Site using branch `main`, build command `npm ci && npm run build`, and publish directory `dist`. The API URL is embedded during the Vite build, so changing `VITE_API_URL` requires a new deploy.

The API must allow the final frontend origin through its `FRONTEND_ORIGIN` environment variable. Never put Aiven database credentials in this repository.
