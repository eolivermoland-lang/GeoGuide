# Geo Guide

Norsk kartapp som viser toaletter, restauranter, apotek og treningssenter i nærheten.
Bygget med React + Vite, Leaflet og Kartverkets åpne kart-tjeneste.

## Funksjoner

- Innlogging og registrering (Firebase Auth, faller tilbake til lokal demo-modus uten nøkler)
- Loading-skjerm med ekte fremdrift (posisjon → kartdata → POI-er)
- Kart fra Kartverket (WMTS, gratis, ingen API-nøkkel)
- POI-er fra Photon (Komoot) + Overpass (OpenStreetMap) som backup
- Adressesøk via Nominatim
- Detaljpanel med bilde (fra Wikipedia når tilgjengelig), åpningstider, veibeskrivelse-knapp
- Tospråklig (norsk + engelsk)
- WCAG 2.1 AA-kompatibel
- Responsiv (mobil og PC)

## Komme i gang lokalt

```bash
cd ~/Desktop/geo-guide
npm install
npm run dev
```

Åpner http://localhost:5173

## Deploy til GitHub + Vercel

### 1. Init git og push til GitHub

Først lager du et nytt tomt repo på https://github.com/new (uten README/gitignore — vi har dem allerede).

Deretter i terminalen:

```bash
cd ~/Desktop/geo-guide
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/DITT-BRUKERNAVN/geo-guide.git
git push -u origin main
```

Bytt ut `DITT-BRUKERNAVN` med ditt GitHub-brukernavn.

### 2. Deploy til Vercel

1. Gå til https://vercel.com/new
2. Velg "Import Git Repository" og pek på `geo-guide`-repoet
3. Vercel oppdager automatisk Vite — la alle valgene stå som standard
4. Under **Environment Variables**, legg inn:

   | Navn | Verdi |
   |---|---|
   | `VITE_FIREBASE_API_KEY` | (din nøkkel fra Firebase) |
   | `VITE_FIREBASE_AUTH_DOMAIN` | f.eks. `geoguide-22407.firebaseapp.com` |
   | `VITE_FIREBASE_PROJECT_ID` | f.eks. `geoguide-22407` |
   | `VITE_FIREBASE_APP_ID` | f.eks. `1:917370533848:web:...` |
   | `VITE_FIREBASE_STORAGE_BUCKET` | (valgfri) |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | (valgfri) |

5. Trykk **Deploy**. Etter ~1 min har du en URL som `geo-guide-xxx.vercel.app`.

### 3. Tillat den nye Vercel-domenen i Firebase

For at innlogging skal funke i produksjon:

1. Gå til Firebase Console → Authentication → Settings → **Authorized domains**
2. Klikk **Add domain** og legg til `<din-app>.vercel.app`

### 4. Senere oppdateringer

Hver gang du pusher til `main`-branchen deployer Vercel automatisk.

```bash
git add .
git commit -m "Beskrivelse av endringen"
git push
```

## Hvordan proxy-en fungerer

- **Photon, Kartverket, Wikipedia** kalles direkte fra nettleseren (CORS-aktivert).
- **Nominatim** krever User-Agent header som nettleseren ikke kan sette → kalles via `/api/nominatim`.
- **Overpass** har upålitelig CORS og rate-limit → kalles via `/api/overpass` med automatisk fallback til fire mirrors.

I dev (lokal): Vite-pluginen i `vite.config.js` håndterer `/api/*`.
I prod (Vercel): serverless funksjoner i `api/`-mappen håndterer `/api/*`.

URL-ene er identiske, så koden i `src/services/` trenger ikke vite forskjell.

## Filstruktur

```
api/                Vercel serverless funksjoner (proxy)
  nominatim.js
  overpass.js
public/             Statiske filer
src/
  components/       MapView, Sidebar, PlaceDetails
  context/          Auth, MapData
  hooks/            useGeolocation
  i18n/             Oversettelser (nb + en)
  pages/            AuthPage, LoadingPage, MapPage
  services/         firebase, overpass, nominatim, kartverket, placeDetails
  styles/           CSS
vercel.json         Vercel-konfigurasjon (rewrites for SPA-routing)
vite.config.js      Vite + dev-proxy
```

## Datakilder

- **Kart**: [Kartverket WMTS](https://kartverket.no/api-og-data)
- **POI-er**: [Photon](https://photon.komoot.io/) (Komoot) + [Overpass](https://overpass-api.de/) (OSM)
- **Adressesøk**: [Nominatim](https://nominatim.openstreetmap.org)
- **Bilder**: [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/) + [Wikidata](https://www.wikidata.org/)

Alle datakildene er gratis og krever ikke API-nøkkel.

## WCAG-notater

- `lang`-attributtet på `<html>` oppdateres når brukeren bytter språk.
- Alle interaktive elementer har synlig fokus-ring (gul) og minimum 44×44 px touch-mål.
- Skjemafelt har `<label>` og feilmeldinger har `role="alert"`.
- Fremdriftslinjen bruker `role="progressbar"` med `aria-valuenow`.
- `prefers-reduced-motion` respekteres.
- Skip-link til hovedinnhold.
