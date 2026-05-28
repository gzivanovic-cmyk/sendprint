# customer-install/ — interne uitleg

> Dit mapje is wat je naar een nieuwe klant stuurt. **Deze README is voor jou**,
> niet voor de klant — die krijgt alleen `Installatie.md` (of de PDF-versie).

## Wat zit erin?

| Bestand | Voor wie | Wat doet het? |
|---|---|---|
| `install.bat` | Klant | Eerste installatie — vraagt wachtwoord, start containers, opent browser |
| `start.bat` | Klant | Handmatig starten (zelden nodig, restart-policy doet dit normaal vanzelf) |
| `stop.bat` | Klant | Tijdelijk stoppen |
| `update.bat` | Klant | Forceer update (anders gebeurt het 's nachts automatisch) |
| `uninstall.bat` | Klant | Verwijder containers + image (data blijft) |
| `docker-compose.yml` | Klant (Docker) | Bridge + Watchtower service-definitie |
| `.env.example` | Voorbeeld | Wordt door `install.bat` gekopieerd naar `.env` |
| `Installatie.md` | **Klant** | De enige handleiding die je naar de klant stuurt |
| `dashboard-screenshot.png` | Klant | Placeholder — vervang met echte screenshot van het login-scherm |
| `README.md` | **Jij** | Dit bestand |

## Voor je het opstuurt

**Belangrijk: vervang `OWNER/REPO` in `.env.example`** door de echte
GitHub-repo-naam (bv. `acme/sendprint`). Het hele image-adres wordt dan
bijvoorbeeld `ghcr.io/acme/sendprint:latest`. `install.bat` weigert te
starten zolang die placeholder er nog in staat, dus je krijgt het er nooit
per ongeluk doorheen.

> Je hoeft `docker-compose.yml` zelf **niet** aan te passen — die leest
> `SENDPRINT_IMAGE` uit `.env` (dat door `install.bat` uit `.env.example`
> wordt gegenereerd).

Check ook eenmalig:
- De image is publiek op GHCR (zo niet: `docker login ghcr.io` werkt voor de klant ook niet).
  Maak 'm publiek in GitHub → Packages → Package settings → Change visibility → Public.
- Er is minstens één release-tag gepusht (bv. `v1.0.0`) zodat `:latest` ook echt iets oppakt.

## Verspreiden naar een klant

1. Open `customer-install/` in Verkenner.
2. Selecteer alle bestanden → rechtsklik → *Verzenden naar* → *Zip-bestand*.
3. Mail het zip-bestand naar de klant met deze tekst:

   > Bijgaand het installatiepakket voor SendPrint.
   > Pak het uit op de PC die met de Zebra-printer praat, open
   > `Installatie.md` (of `Installatie.pdf`) en volg de stappen.
   > Het kost ongeveer 5 minuten.

4. (Optioneel) Sla per klant ergens op: wachtwoord, API-key, printer-IP.
   Handig voor support.

## Updates uitrollen naar alle klanten

1. Push een nieuwe versie naar GitHub (`git tag v1.2.3 && git push --tags`).
2. De release-workflow bouwt en publiceert de image (zie `.github/workflows/release.yml`).
3. **Klaar.** Watchtower bij elke klant pakt 'm de volgende nacht op.

Wil je een klant *nu* updaten? Vraag ze `update.bat` te draaien.

## Per-klant aanpassingen

Wil je per klant iets aanpassen (andere poort, vaste versie i.p.v. `:latest`,
wachtwoord-policy)? Pas dat aan in het `.env`-bestand bij de klant. De
`docker-compose.yml` zelf hoef je nooit te wijzigen.
