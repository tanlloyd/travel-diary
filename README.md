# Travel Diary

[![CI](https://github.com/tanlloyd/travel-diary/actions/workflows/ci.yml/badge.svg)](https://github.com/tanlloyd/travel-diary/actions/workflows/ci.yml)

Travel Diary is a full-stack group project built with React, Express, and MongoDB. Users can create accounts, manage private trips and diary entries, explore their journey on a map, save local weather and photos, replay memories chronologically, and share selected trips through read-only public links.

## Live Application

[Open the live Travel Diary application](https://travel-diary-wed-g5.onrender.com/). See [DEPLOYMENT.md](DEPLOYMENT.md) for the production architecture, environment variables, CI/CD process, and verification checklist.

## Technology Stack

- Frontend: React, Vite, React Router, React Leaflet, and Leaflet
- Backend: Node.js and Express, with Helmet and express-rate-limit
- Database: MongoDB with Mongoose
- Language: JavaScript with ES modules
- External services: OpenStreetMap map tiles, and Open-Meteo for weather and place search
- Testing: Node's test runner with Supertest, Vitest with Testing Library, and Playwright
- Development tools: npm, ESLint, and GitHub Actions

## Project Structure

```text
.
|-- frontend/    React client application
`-- backend/     Express server application
```

The frontend and backend have separate dependencies and npm scripts.

## Prerequisites

- Node.js 24 LTS
- npm
- Git
- A running local MongoDB server or a MongoDB Atlas database

## Frontend Setup

From the repository root:

```sh
cd frontend
npm install
npm run dev
```

Open the local address shown by Vite.

The frontend sends requests to `/api`. During local development, Vite proxies these requests to `http://localhost:3001`. To use a different backend URL, copy `frontend/.env.example` to `frontend/.env` and change `VITE_API_URL`. Restart Vite after changing environment variables. Frontend environment variables are public; never put MongoDB credentials there.

## Backend Setup

From the repository root:

```sh
cd backend
npm install
```

Create `backend/.env` from the provided example before starting the server:

```powershell
Copy-Item .env.example .env
```

For macOS or Linux, use `cp .env.example .env` instead. The example configures the backend to use port `3001` and a local MongoDB database:

```dotenv
PORT=3001
MONGODB_URI=mongodb://127.0.0.1:27017/travel_diary
JWT_SECRET=replace-with-a-long-random-secret
```

Start your local MongoDB server before starting the backend. If using Atlas, put your connection string in `backend/.env` as `MONGODB_URI` and allow your development machine to connect in Atlas. Replace `JWT_SECRET` with a long, unpredictable value used to sign login tokens. Keep real credentials only in the ignored `.env` file or your deployment environment. `.env.example` must contain example values only.

Start the backend in development mode:

```sh
npm run dev
```

To run it normally without automatic restarts, use `npm start`.

The backend connects to MongoDB before accepting requests. If the connection fails or `MONGODB_URI` is missing, it reports a startup error without printing the connection string.

## Accounts and Authentication

Create an account or sign in before using the trips pages. Passwords are hashed before storage, and successful registration or login returns a signed token that expires after seven days. The frontend keeps this token in local storage and sends it in the `Authorization` header for trip and diary-entry requests.

| Endpoint | Result |
| --- | --- |
| `POST /api/auth/register` | `201` with the new user and token. Requires `name`, `email`, and a password of 8–72 characters. |
| `POST /api/auth/login` | `200` with the user and token when the credentials are correct. |
| `GET /api/auth/me` | `200` with the signed-in user when a valid bearer token is supplied. |
| `PUT /api/auth/account/password` | `200` with the user and a new token. Requires `currentPassword` and a `newPassword` of 8–72 characters. A wrong current password returns `403`. |
| `DELETE /api/auth/account` | `200` after deleting the account, its trips, and their diary entries. Requires `password`. A wrong password returns `403`. |

Signed-in users can open **Account** in the navigation to see their details, change their password, or delete their account. Changing the password signs out every other device: each token records the account's token version, the version increases when the password changes, and the backend rejects tokens from an earlier version. The device that made the change receives a new token and stays signed in. Deleting an account asks for the password and a confirmation, then permanently removes the account with all of its trips, diary entries, and photos; its tokens and sharing links stop working immediately.

Because tokens are checked against the account on every request, a token for a deleted account is refused even though its signature is still valid.

Sign-in and registration are rate limited per client address. Twenty failed sign-in attempts within 15 minutes, or 30 new accounts within an hour, return `429` with an explanation until the window passes. Successful sign-ins do not count towards the limit. Incorrect passwords on the account page are limited in the same way.

Every `/api/trips` endpoint requires `Authorization: Bearer TOKEN`. Trip queries are scoped to the signed-in user, so one account cannot view, update, or delete another account's trips or diary entries. The separate public sharing endpoint is read-only and only returns trips whose owner has explicitly made them public. Records created before authentication was introduced have no owner and are not shown inside user accounts.

## Security Headers and Request Limits

The backend uses Helmet to send security headers with every response. Its content security policy only allows scripts and styles from the application itself, map tiles from OpenStreetMap, photos embedded as data URLs, and place-search requests to Open-Meteo. Add any new third-party origin to the policy in `backend/src/app.js`, or the browser will block it in production.

Sign-in and registration requests are limited to 100 KB. Only authenticated trip and diary-entry requests may be larger, up to 10 MB, because they carry photos.

## Trip Management

With both servers running, select **Trips** in the navigation or open `/trips`. Enter a trip name, destination, start date, and end date. The description is optional. Trips are private by default; select **Make this trip public** to enable a read-only sharing link. Saved trips appear newest first and remain available after refreshing the page.

Once an account has more than one trip, the trips page shows a search box and a sort menu. Search matches every word typed against each trip's name, destination, and description, ignoring case. Trips can be sorted by when they were added, by start date in either direction, or by name. Searching and sorting happen in the browser on the trips already loaded, so they respond immediately and need no extra requests.

| Endpoint | Result |
| --- | --- |
| `GET /api/trips` | `200` with an array of trips, or `[]` when empty. |
| `POST /api/trips` | `201` with the saved trip. Invalid input returns `400` with `{ "error": "..." }`. |
| `GET /api/trips/:tripId` | `200` with the trip details. |
| `PUT /api/trips/:tripId` | `200` with the updated trip. All trip fields are validated. |
| `DELETE /api/trips/:tripId` | `200` after deleting the trip and its diary entries. |

Example request from macOS or Linux:

```sh
curl -i http://localhost:3001/api/trips \
  -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Weekend away","destination":"Penang","startDate":"2026-10-10","endDate":"2026-10-12","description":"Explore the city."}'

curl -i http://localhost:3001/api/trips \
  -H 'Authorization: Bearer TOKEN'
```

Dates must use `YYYY-MM-DD` and the end date must be on or after the start date. Names and destinations cannot be blank. `isPublic` must be a Boolean when provided and defaults to `false`. Limits are 100 characters for the name, 150 for the destination, and 2,000 for the description. MongoDB assigns each trip an `_id`; the API also returns creation and update timestamps and dates as ISO strings. The trip details page lets you edit a trip or delete it after confirmation. Deleting a trip also deletes every diary entry associated with it.

## Public Trip Sharing

An owner can make a trip public while creating or editing it. The private owner page then displays a sharing link in the form `/shared/trips/:shareToken`, where the token is a random 32-character value that cannot be guessed from the trip or account. Visitors can open that page without an account to view the trip overview, journey map, photos, saved weather, and diary entries in date order. The public page has no create, edit, delete, or weather-refresh controls.

| Endpoint | Result |
| --- | --- |
| `GET /api/public/trips/:shareToken` | `200` with a public trip and its entries, without owner or trip-reference IDs. Returns `404` for a private trip, a replaced link, or a missing trip. |
| `POST /api/trips/:tripId/share-link` | `200` with the trip and a new `shareToken`. Requires the owner's token and a public trip. The previous link stops working. |

The public response omits the owner's account ID. Switching the trip back to private immediately disables its sharing link, and making it public again restores the same link. To withdraw a link without hiding the trip, the owner selects **Create new link**, which replaces the token. There is no public trip directory, so public trips are available only to people who receive the link.

Trips that were shared before sharing tokens were introduced keep their original `/shared/trips/:tripId` link until the owner creates a new one. A trip ID never works as a sharing link for a trip that has a token.

## Diary Entries

Select **View trip** on a trip card to open `/trips/:tripId`. The page shows trip details, a labelled entry form, and that trip's saved entries. Entries are ordered by entry date from oldest to newest, then by creation time for entries on the same date.

Each entry stores a required `trip` ObjectId referencing the Trip model, indexed together with the entry date so a trip's diary loads without scanning other trips' entries, plus:

| Field | Rules |
| --- | --- |
| `title` | Required text, up to 120 characters. |
| `content` | Required text, up to 10,000 characters. |
| `entryDate` | Required real calendar date in `YYYY-MM-DD` format. |
| `locationName` | Optional text, up to 150 characters. |
| `latitude` | Optional number from -90 to 90. |
| `longitude` | Optional number from -180 to 180. |
| `weather` | Saved local conditions, temperature range, and precipitation when coordinates and weather data are available. |
| `photos` | Up to 3 embedded JPEG, PNG, or WebP images, each no larger than 2 MB once resized, with optional descriptions. |

Text is trimmed and required text cannot be blank. Provide both coordinates or omit both (both may also be `null`). Zero is a valid coordinate. The form accepts coordinates manually and leaves them empty by default. The API returns dates as ISO strings and includes `_id`, `createdAt`, and `updatedAt`.

| Endpoint | Result |
| --- | --- |
| `GET /api/trips/:tripId/entries` | `200` with that trip's entries, or `[]` when empty. |
| `POST /api/trips/:tripId/entries` | `201` with the saved entry. The trip association comes from the URL. |
| `PUT /api/trips/:tripId/entries/:entryId` | `200` with the updated entry. All entry fields are validated. |
| `POST /api/trips/:tripId/entries/:entryId/weather` | `200` with the entry after retrieving and saving its local weather. |
| `DELETE /api/trips/:tripId/entries/:entryId` | `200` with the deleted entry. |

Trip endpoints return `400` for a malformed trip ID and `404` when a valid ID does not match a trip. Update and delete also return `400` for a malformed entry ID and `404` when the entry does not exist on that trip. Invalid entry fields return `400`. Errors use `{ "error": "..." }`.

Replace `TRIP_ID` with an `_id` returned by the trips API:

```sh
curl -i http://localhost:3001/api/trips/TRIP_ID \
  -H 'Authorization: Bearer TOKEN'

curl -i http://localhost:3001/api/trips/TRIP_ID/entries \
  -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"title":"First day","content":"Explored the old town.","entryDate":"2026-10-10","locationName":"George Town","latitude":5.4141,"longitude":100.3288}'

curl -i http://localhost:3001/api/trips/TRIP_ID/entries \
  -H 'Authorization: Bearer TOKEN'
```

The page shows loading and empty states and lets you retry failed loads. While saving, the form is disabled. If the chosen entry date falls outside the trip's dates, the form points this out but still allows the entry to be saved, so a note written the day before departure is not rejected. Successful saves clear the form and place the new entry in date order; failed saves keep your input and show an error so you can retry. Each saved entry can also be edited or deleted. Deletion requires confirmation. Dates display without shifting to the previous day in another time zone.

## Entry Photos

The create and edit forms accept up to three JPEG, PNG, or WebP photos per diary entry. Selected photos are previewed before saving and can have a short description for accessibility and context. Users can remove a selected or previously saved photo while editing an entry.

Before a photo is saved, the browser resizes it so its longest side is at most 1,600 pixels and re-encodes it as a JPEG. A multi-megabyte phone photo typically shrinks to well under 1 MB, which keeps uploads quick and stops diary pages from downloading full-size originals. Originals up to 20 MB can be selected; the saved photo must be 2 MB or smaller. If a browser cannot resize images, the original is used when it already fits that limit.

Photos are stored as validated data URLs inside the private diary entry in MongoDB. This keeps photo access under the same account and trip ownership checks as the rest of the entry. Deleting an entry, or deleting its trip, also deletes the embedded photos. The backend accepts request bodies up to 10 MB to accommodate three encoded photos while keeping each individual photo and the total count constrained.

## Interactive Journey Map

The trip details page displays diary entries with saved coordinates on an interactive OpenStreetMap map. Each location appears as a marker with the entry title, date, and location name. When a trip has multiple mapped entries, the map connects them in diary date order and automatically adjusts its view to show the full route. A text list beneath the map presents the same places without requiring map interaction.

Entries without coordinates still appear normally in the diary. Add both latitude and longitude when creating or editing an entry to include it on the map. The map uses OpenStreetMap tiles through React Leaflet and does not require an API key. The map library is loaded only when a trip page is opened, so the home, sign-in, and trip-list pages stay small.

## Journey Replay

Trip owners and visitors to public shared trips can replay the diary from its earliest entry to its latest. The replay reveals mapped locations one at a time and focuses the active marker while showing that entry's date, location, text, photos, and saved weather. Entries without coordinates still appear in the replay, while the map keeps the route accumulated so far.

Replay controls let the user play or pause automatic progression, move to the previous or next memory, and restart from the beginning. Playback only begins after the user selects **Play replay**, and the interface announces the current memory number for assistive technology.

## Current Location

The place search panel in the create and edit forms includes **Use my current location**. When selected, the browser asks for permission and fills the latitude and longitude fields, rounded to five decimal places (about one metre). The location name is left as typed, and nothing is stored until the entry is saved. If permission is refused or the position cannot be found, the form explains this and the place search and manual coordinate fields remain available. The button is hidden in browsers without location support, and browsers only offer location on HTTPS pages or `localhost`.

## Automatic Weather

When an entry has a date, latitude, and longitude, the backend retrieves daily local weather from Open-Meteo and saves it with the entry. Saved weather includes the WMO condition, maximum and minimum temperature in Celsius, and precipitation in millimetres. The entry card displays these details and provides a refresh button, so a temporary weather-service failure does not prevent the diary entry from being saved.

The Forecast API supplies today and the following 15 days, for a 16-day window. Earlier dates use Open-Meteo's Historical Weather API. Dates beyond the forecast range remain available as normal diary entries and can retrieve weather later. Open-Meteo does not require an API key.

## Exporting a Trip

The trip page offers two ways to take a diary out of the application:

- **Download as JSON** saves the trip and all of its entries, including coordinates, saved weather, and photos, as one file named after the trip. Database IDs, the owner, and the sharing token are left out. The file is built in the browser from the data already on the page.
- **Print or save as PDF** opens the browser's print dialog. A print stylesheet hides navigation, forms, buttons, the interactive map, and the replay, leaving the trip overview, the list of mapped places, and every entry with its photos. Printed pages always use the light colours.

## Light and Dark Themes

The interface follows the visitor's system colour setting through the `prefers-color-scheme` media query. Text, surface, border, and accent colours in `frontend/src/index.css` come from custom properties declared on `:root`, and the dark theme overrides those properties in one place. The illustration on the home page keeps its own fixed colours. Accent colours are lightened in the dark theme so text and controls keep a readable contrast, and text placed on an accent background switches from white to dark. Map tiles come from OpenStreetMap and stay in their standard light style.

## Code Checks

Run the frontend checks from `frontend/`:

```sh
npm run lint
npm test
npm run build
```

Run the backend checks from `backend/`:

```sh
npm run lint
npm test
```

In either folder, `npm run test:coverage` runs the same tests and reports how much of the source they exercise. The frontend also writes a browsable report to `frontend/coverage/`.

Run the browser tests from `frontend/`. The first run needs `npx playwright install chromium`:

```sh
npm run test:e2e
```

Backend tests run the Express API against an isolated in-memory MongoDB database. They cover accounts and tokens, ownership of trips and entries, public sharing and replaced links, weather, photos, password changes, account deletion, security headers, rate limits, and request size limits.

Frontend tests use Vitest and Testing Library to exercise protected navigation, registration, saved-session restoration, public read-only sharing, searching and sorting trips, editing and deleting trips and entries, replacing a sharing link, the account page, place search, current location, photo resizing, trip export, Journey Replay controls, and saved entry display.

Browser tests use Playwright to drive the real frontend and backend together against an in-memory database. They cover the main journey from registration to a shared, replayable diary, and three safeguards: a signed-out visitor is sent to sign in, a replaced or private sharing link stops working for other visitors, and a changed password replaces the old one. Test data never touches the configured development database.

GitHub Actions runs these checks automatically for every pull request targeting `main` and every push to `main`. The backend, frontend, and browser tests run as separate jobs so failures are easy to identify, and the backend and frontend jobs print a coverage summary. The workflow uses Node.js 24 and does not require repository secrets.

## Team Workflow

1. Create or select a GitHub Issue for the work.
2. Create a feature branch for that issue.
3. Make the changes and test them locally.
4. Use clear commit messages.
5. Push the feature branch.
6. Open a pull request.
7. Ask a teammate to review the pull request.
8. Merge after approval.

## Current Status

Account registration and login are implemented, and users can change their password or delete their account. Trips and diary entries remain private to their owners and support creation, listing, searching, sorting, editing, deletion, and export, with MongoDB persistence, form validation, loading states, and error messages. Owners can make selected trips public and share a read-only page through a random link that they can replace at any time, without exposing account IDs or editing controls. Diary entries can include responsive photo galleries with accessible descriptions; photos are resized in the browser before upload. Entries with coordinates, entered by hand, found through place search, or taken from the device's current location, are displayed as markers on an interactive journey map and save local weather for their entry date when data is available. Journey Replay presents each entry in date order while progressively rebuilding the mapped route. The interface follows the system light or dark theme, and the backend sends security headers and rate limits sign-in attempts.
