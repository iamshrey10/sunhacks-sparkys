# Demo script (about 2.5 minutes)

Two speakers works well: one talks, one drives the phone. Rehearse twice.
Check the numbers on screen match the ones below before presenting; if the
shade data or route changed, update this file.

## Before you go on

- Laptop awake, plugged in, on Wi-Fi. API running and the HTTPS tunnel up.
- Phone: app installed and showing "API: online". Screen brightness up.
- Backup: screenshots or a short screen recording of each step, in case Wi-Fi fails.
- Demo trip: **Memorial Union to Tempe Beach Park, 3:00 PM**.

## Script

**1. The problem (20 s)**
"Arizona heat kills hundreds of people a year. Maricopa County recorded 430 heat
deaths in 2025, 18 of them in Tempe, and most happen outdoors. But every map app
gives you the shortest walk. It has no idea where the shade is."

**2. What we built (15 s)**
"Cool Route finds the coolest walking route, not the fastest. Google Maps finds
the fastest way to walk. We find the coolest."

**3. Live demo (75 s)**
1. Open the app. "This is a real Android app talking to our backend."
2. Set Memorial Union to Tempe Beach Park, 3:00 PM, and find the route.
3. Point at the two routes. "Fastest is grey. Coolest is blue. The coolest route is
   38% shaded against 7%, and it cuts time in direct sun from 24.8 to 17.2 minutes,
   that is 7.6 minutes less sun for about a minute more walking."
4. Drag the shade slider. "This blends speed and shade."
5. Type "3 PM, avoid stairs" in the plain-English box and tap Fill form. "Gemini
   turns this into settings and explains the route, using only numbers from our
   result."
6. Tap Help now. "Nearest water and cooling spots. Where we can't verify opening
   hours, we say hours unknown. We never guess."

**4. How it works (30 s)**
"We downloaded OpenStreetMap streets, buildings and trees, computed where
buildings cast shadows for each hour of the day, and gave every street a shade
score. The route finder weighs distance against sun exposure. TinyFish reads
official City of Tempe pages for hours, and flags anything that changes. Gemini
handles the plain-English side, and our code checks its output so it can't make
up numbers."

**5. Honesty and impact (20 s)**
"This is an estimate from map data, not a temperature measurement, and it covers
the ASU Tempe corridor today. It can't fix indoor heat deaths. But for students,
older adults and outdoor workers walking in the afternoon, it turns a map into a
heat-safety tool."

**6. Close (5 s)**
"Cool Route: Google Maps finds the fastest way to walk. We find the coolest."

## If something breaks

- **App says API: offline:** say "our server runs on a laptop for the demo", restart
  the tunnel, or switch to the screenshots.
- **Gemini is slow:** the form and route still work without it. Say so and move on.
- **No route difference:** use the 3:00 PM Memorial Union to Tempe Beach Park trip.
  Short trips show little difference, and the app says so honestly.

## Likely questions

- *Is the shade real?* It is modelled from building footprints and sun position, with
  default heights where OpenStreetMap has none. We validated structure, not temperature.
- *Why only Tempe?* Time. The pipeline works for any area OpenStreetMap covers.
- *Does Gemini decide the route?* No. Routing is plain code. Gemini only parses
  text and phrases the explanation, and code checks it.
