# Cool Route: Devpost draft

Draft for the Devpost submission. Every fact and number here comes from README.md;
check the README before changing one.

**Google Maps finds the fastest way to walk. We find the coolest.**

## Inspiration

Extreme heat is a leading cause of weather-related death in Arizona, and most of it
happens outdoors. Maricopa County recorded 430 heat-related deaths in 2025,
including 18 in Tempe (City of Tempe heat relief page). In mid-August 2026, about
68% of that season's heat deaths in the county had happened outdoors (City of
Phoenix weekly heat response report; preliminary figure).

Yet navigation apps default to the shortest route. They do not know which streets
have shade, and they treat a sunny mile at 3 PM the same as the same mile at night.
We wanted a walking app that does know.

## What it does

Cool Route is a mobile-first app (Android APK plus web) for walking across the ASU
Tempe campus and Mill Ave.

- **Cool Route:** shows the fastest and the coolest route side by side, with shade %,
  walking time, and minutes spent in direct sun. A slider blends speed and shade.
- **Plain English:** type something like "3 PM, avoid stairs" and Gemini fills in
  the settings, then writes a short explanation of the route using only numbers
  from the result.
- **Help now:** finds the nearest water points, libraries and City of Tempe
  heat-relief sites, each marked open, closed or **hours unknown**. We never guess
  hours.
- **Saved preferences** stay on the phone. No account, no database.

For example, from the Memorial Union to Tempe Beach Park at 3:00 PM (real model
output):

| | Distance | Walk | Shade | Time in sun |
|---|---|---|---|---|
| Fastest | 2,161 m | 26.7 min | 7% | 24.8 min |
| Coolest | 2,243 m | 27.7 min | 38% | 17.2 min |

That is 7.6 minutes (31%) less direct sun for about a minute more walking. The
benefit depends on the trip and the hour: the same trip at noon saves 15%, and a
short trip from the Student Pavilion to Mill Ave saves 9%. When the coolest route is
not meaningfully cooler, the app says so.

## How we built it

1. **Shade model (offline).** OSMnx downloads the walking network, buildings and
   trees from OpenStreetMap. pvlib gives the sun position for each hour from 06:00
   to 19:00, Shapely projects building shadows, and each street segment gets a
   shade fraction.
2. **Route finder.** A shortest-path search where each segment costs its distance
   plus a penalty for sun exposure. The slider and the walker's heat sensitivity
   change the penalty.
3. **Resources.** OpenStreetMap water points and libraries, plus six City of Tempe
   heat-relief sites with structured hours. TinyFish reads the official page, and a
   refresh script marks a listing stale if the page no longer matches, so the API
   reports hours as unknown instead of guessing.
4. **Gemini.** Turns free text into route settings with structured output and
   re-checks every field. It also writes the route explanation, and code rejects any
   reply that cites a number not in the route result, is cut off, or copies field
   names; those fall back to fixed wording. API keys stay on the server.

**Tech stack:**
- **App:** React, TypeScript, Vite, Tailwind, Leaflet, Capacitor (Android)
- **Backend:** Python 3.12, FastAPI, Pydantic
- **Map and shade:** OpenStreetMap, OSMnx, NetworkX, Shapely, pvlib
- **AI and live data:** Gemini API, TinyFish
- **Cloud:** AWS Lambda with a Function URL, running the same FastAPI app through Mangum
- **Planning:** Kiro (architecture spec), GitHub pull requests

**Team:**
- **Shreyas:** API and shared contract, resources and live hours, Android app, integration
- **Rohan:** shade model and route finder
- **Bhavisha:** mobile interface (route form, map, comparison, Help now, saved preferences)
- **Shravani:** Gemini request parsing and route explanations, with tests

## Challenges we ran into

- **Shade data is incomplete.** Most buildings in OpenStreetMap have no height, so
  many shadows rest on default heights. Covered walkways are limited to those tagged
  in OpenStreetMap plus a few we labelled by hand.
- **Opening hours are not always knowable.** The City of Tempe heat-relief sites are
  listed as open May 1 to Sept 30, so outside that season the app shows "hours
  unknown". OpenStreetMap hours are labelled "not verified". Pages can also change,
  which is why the refresh script marks a listing stale when the official page no
  longer matches.
- **Keeping AI text honest.** Gemini replies had to be checked in code: a reply that
  cites a number not in the route result, is cut off, or copies internal field names
  is replaced with fixed wording.
- **Running inside an Android app.** The app runs from `https://localhost` inside the
  APK, so the API has to be reachable over HTTPS.

## Accomplishments that we're proud of

- A working comparison of the fastest and coolest routes from real model output,
  with walking time, shade and minutes in direct sun.
- Honest results: when the coolest route is not meaningfully cooler, the app says so.
- We never guess opening hours. Unknown hours are shown as unknown.
- AI explanations that only use numbers from the route result, checked in code.
- A full stack from offline shade model to Android app, with the API deployed on AWS
  Lambda.

## What we learned

- Map data can estimate shade, but its gaps matter: missing building heights and
  untagged covered walkways limit how accurate it can be.
- The benefit of a cooler route depends on the trip and the hour, so the app has to
  report the trade-off honestly instead of always recommending the cooler route.
- AI output needs checks in code. Structured output, re-checking every field, and
  falling back to fixed wording kept the text trustworthy.
- "Unknown" is a valid answer. Showing it is better than guessing.

## Limits

- Shade is an **estimate from map data** (building shadows from sun position,
  OpenStreetMap trees, covered walkways). It is not a measurement, and we do not
  measure temperature. Shade layers are computed for a mid-July day.
- Coverage is the ASU Tempe campus and Mill Ave (about 2 km x 2 km). Points outside
  it are rejected with a clear message.
- Outside the May 1 to Sept 30 season, heat-relief site hours show as "hours unknown".
- Cool Route lowers sun exposure on a walk. It does not address indoor heat deaths or
  homelessness. It is aimed at pedestrians, older adults, students and outdoor
  workers. The app gives general information, not medical advice.

## What's next for Cool Route

- More accurate shade: building heights, tree canopy data, more hand-labelled covered
  walkways, and shade layers by season.
- Wider coverage than the ASU Tempe corridor.
- A hosted web version (S3 and CloudFront), so the app can be opened without
  installing the APK, and a persistent store for usage-based rate limits (today they
  are in memory per Lambda container).
- Live temperature and UV from a weather service, and verified hours for more sites.
- Spanish and other languages.
