# Production Deployment

## Live application

[https://travel-diary-wed-g5.onrender.com/](https://travel-diary-wed-g5.onrender.com/)

## Architecture

Production runs as one Render web service:

- Render installs the backend and frontend dependencies.
- Vite builds the React application into `frontend/dist`.
- Express serves the built frontend and the `/api` routes from the same origin.
- MongoDB Atlas stores production users, trips, and diary entries.
- Render terminates HTTPS and provides the public `onrender.com` URL.

The single origin means the production frontend calls `/api` directly and does not need a separate public API URL. In local development, Vite proxies `/api` to `http://localhost:3001`.

## Create the Render service

1. Merge the deployment pull request into `main`.
2. Sign in to [Render](https://dashboard.render.com/) with an account that can access this private GitHub repository.
3. Select **New**, then **Blueprint**.
4. Connect the project repository and select the root `render.yaml` file.
5. Enter the production MongoDB Atlas connection string when Render prompts for `MONGODB_URI`.
6. Create the Blueprint. Render generates `JWT_SECRET`, installs both applications, builds the frontend, and starts Express.
7. Wait for the deploy and `/api/health` health check to pass.

Do not paste `MONGODB_URI` into a tracked file, pull request, issue, screenshot, or frontend environment variable.

## MongoDB Atlas configuration

Create or select an Atlas database user with access to the deployment database. Use its connection string as `MONGODB_URI` in Render. Atlas must allow connections from Render. For a course deployment, Atlas can temporarily allow `0.0.0.0/0`; use a strong database password and restrict access further if the hosting provider supplies stable outbound addresses.

The connection string should select a dedicated database, for example:

```text
mongodb+srv://USERNAME:PASSWORD@CLUSTER/travel_diary?retryWrites=true&w=majority
```

Render stores this value as a secret environment variable. The Blueprint generates a separate random `JWT_SECRET` and sets `NODE_ENV=production`.

## Rate limits and the hosting proxy

Sign-in and registration are rate limited per client address. Render forwards requests through a proxy, so in production the backend reads the client address from the `X-Forwarded-For` header and trusts one proxy hop by default.

If the limits ever appear to be shared between unrelated visitors, the service is behind more proxies than expected. Set the `TRUST_PROXY` environment variable in Render to the number of proxies in front of the application and redeploy. Do not set it higher than the real number, because that would let a client forge its address and avoid the limits.

## Build and run process

Render reads these commands from `render.yaml`:

```sh
npm ci --prefix backend
npm ci --prefix frontend --include=dev
npm run build --prefix frontend
npm start --prefix backend
```

The server listens on Render's `PORT` environment variable. Render checks `GET /api/health` and only routes traffic to a healthy deployment.

## CI/CD

GitHub Actions runs backend lint/tests and frontend lint/tests/build for every pull request into `main`. After the Render Blueprint is connected, pushes to `main` trigger an automatic production build and deploy. Merge only after the GitHub checks pass.

## Production verification

After the first deployment, verify all of the following against the public URL:

1. Open `/` and refresh the page.
2. Open `/login` directly and refresh it to confirm the SPA fallback works.
3. Open `/api/health` and confirm it returns `{ "status": "ok" }`.
4. Create the assessor account using the credentials required by the submission form.
5. Sign out and sign back in.
6. Create, edit, and delete a trip.
7. Create, edit, and delete a diary entry.
8. Delete a trip containing an entry and confirm the entry is also removed.
9. Check the layout on a mobile-width browser.
10. Open a trip with mapped entries and confirm that the map tiles and photos load, and that place search returns results. The browser console must show no content security policy errors.

Record the final live URL in this file, the root README, and the course submission form only after these checks pass.

## Operations and limitations

Render's free web service can spin down after 15 minutes without incoming traffic. The first request after that may take about one minute while the service starts. Visit the live URL shortly before the assessed demonstration, or move the service to an always-on paid plan. A free uptime monitor that requests `/api/health` every 10 minutes also keeps the service awake; because the frontend is served by the same service, nothing can be shown to a visitor while it is still starting.

The service filesystem is temporary. Application data remains safe because it is stored in MongoDB Atlas rather than local files.

To diagnose a failed deployment, check the Render build and runtime logs without copying secret values. Common causes are an incorrect `MONGODB_URI`, Atlas network access rules, or a database password containing characters that were not URL-encoded.
