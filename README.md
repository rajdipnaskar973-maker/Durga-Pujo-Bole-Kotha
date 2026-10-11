# Durga Pujo Bole Kotha

A planner for Kolkata Durga Puja pandals. You pick a starting point and a final destination, choose pandals region by region (South, North, Central, and optionally East), review your list, and get a route with links to Google Maps.

## What is in this folder

- `src/` - the app code
- `public/kolkata_puja_pandals_starter_dataset.json` - the data the app reads
- `data/kolkata_puja_pandals_starter_dataset.csv` - an editable backup copy. The app does NOT read this file.
- `README.md` - this file

## Step 1: Install Node.js (one time)

Go to nodejs.org and download the LTS version. This was tested with Node 22.

## Step 2: Put the folder in the right place

Unzip the downloaded file. Move the folder to `Desktop/Durga Puja Bole Kotha`.

## Step 3: Open a terminal in the folder

- Windows: open the folder, click the address bar, type `cmd`, press Enter.
- Mac: right-click the folder and choose "New Terminal at Folder".

## Step 4: Install the parts the app needs

```
npm install
```

## Step 5: Run the tests

```
npm test
```

You should see all tests pass (55 at the time of writing).

## Step 6: Run the app on your computer

```
npm run dev
```

Open the address it shows (usually http://localhost:5173). Press Ctrl+C in the terminal to stop it.

## Step 7: Build the app for going online

```
npm run build
```

This creates a `dist` folder. If the build fails, it shows the exact error.

## Step 8: Put the app online with Vercel (free)

1. Create a free GitHub account and make a new repository. Upload this project's files to it. Do not upload `node_modules` or `dist`.
2. Go to vercel.com, sign in with GitHub, choose "Add New Project", and select your repository.
3. Click Deploy. Vercel recognises the project as a Vite app, so you usually do not need to change any settings.
4. Vercel gives you a web address. Open it on your Android phone in Chrome.
5. To add it to your home screen, use Chrome's menu and choose "Add to Home screen" (the wording depends on your Chrome version).

## Adding map locations (important)

The route can only calculate distances once a pandal has coordinates. Right now none of the 122 pandals have them.

1. Open Google Maps and search for the pandal.
2. Right-click the exact spot. The first line of the menu shows two numbers, such as `22.5726, 88.3639`. The first is latitude and the second is longitude.
3. In `public/kolkata_puja_pandals_starter_dataset.json`, put the numbers in the `latitude` and `longitude` fields as text, for example `"latitude": "22.5726"`.
4. Change `verification_status` to `"verified"` only after you have checked the location.

After editing the JSON, run `npm run dev` again. The home screen shows any problems the app finds, such as invalid numbers or duplicate IDs.

Keep the CSV backup in step with the JSON by hand. An automatic CSV import is not built yet.

## What the app does today

- Loads the pandal list from the JSON file and checks it. It skips bad records with a clear message.
- Shows counts by region and warnings for missing coordinates and unverified records.
- Guided steps: trip details, first region, tick pandals, Next, add another region or Skip, review, generate route.
- Back and Next keep your ticks. Search by name and filter by area.
- Review screen: reorder or remove stops.
- Route screen: a fixed order (your order), with a walk, transit and cab/auto link for each leg. A "Suggested order" option appears only when every point has coordinates.

## What the app does not do yet

- Saved plans and "mark visited / next stop" tracking.
- Your current location (GPS).
- Real road or walking distances. Straight-line distances are shown only as estimates and labelled that way.
- Bus, metro or train route details. Use the Transit link for those.
- Offline mode and a full installable app (the manifest is in place; offline caching is not).
- A data editor and CSV/JSON import screen.
- Automatic fame rankings or opening hours. Nothing is invented.
