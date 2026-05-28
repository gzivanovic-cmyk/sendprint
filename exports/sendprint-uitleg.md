**Onderwerp:** SendPrint — vervanging van het oude print-programma (uitleg & voorstel)

Beste [naam],

Hieronder een korte uitleg van **SendPrint**, het nieuwe doorgeefluikje tussen Promesse en de Zebra-labelprinters in de winkels — als vervanging van het huidige .exe-programma.

---

## Wat het is, in één alinea

SendPrint is een klein doorgeefluikje tussen het bestelsysteem **Promesse** en de **Zebra-labelprinter** in de winkel. Promesse zegt "druk dit label af", SendPrint vangt dat op en stuurt het door naar de juiste printer. Daarnaast is er een mini-website (dashboard) waar je ziet of alles werkt, wat er geprint is, en waar je instellingen kunt aanpassen.

## Vergelijking met de huidige situatie

| | **Huidige versie (.exe)** | **Nieuwe versie (SendPrint)** |
|---|---|---|
| Vorm | Windows-programma op de pc | Modern pakketje, draait overal (Windows, Mac, Linux, mini-pc) |
| Zichtbaarheid | Zwart venstertje — geen idee of het werkt | Dashboard in de browser: status, logboek, instellingen, test-knop |
| Beveiliging | Open poort, geen wachtwoord | Inloggen met wachtwoord, geheime API-sleutel voor Promesse |
| Updates | Nieuwe .exe handmatig installeren | Eén commando: nieuwste versie binnen |
| Foutopsporing | "Het werkt niet" → bellen | Operator ziet zelf in het dashboard wat er misging |

Kortom: hetzelfde doel, maar transparant, veilig en op afstand bij te houden.

## Waar komt het te draaien — belangrijk gegeven

Promesse draait **niet** lokaal in de winkel, maar op een externe server die de medewerkers via een **RDP-sessie** benaderen vanaf hun winkel-pc. De **labelprinter staat fysiek in de winkel zelf**. SendPrint moet die twee aan elkaar koppelen.

**De praktischste oplossing: SendPrint op dezelfde winkel-pc waarop de medewerkers de RDP-sessie naar Promesse openen.** Die pc staat sowieso al aan tijdens openingstijden, staat in hetzelfde netwerk als de printer, en SendPrint gebruikt nauwelijks resources — de medewerker merkt er niets van naast zijn RDP-werk. Geen extra hardware nodig, geen extra apparaat om te beheren.

De Promesse-server stuurt zijn printopdracht over internet naar die winkel-pc, en de pc praat lokaal met de printer. Per winkel één pc, één API-sleutel.

## Wat is er nodig om het te laten draaien

**Bij Promesse:** niets bijzonders — ze sturen hun printopdracht naar één webadres met één geheime sleutel erbij (dezelfde configuratie die ze nu ook al hebben voor de oude .exe).

**Per winkel:**
- De bestaande Windows-pc die voor de RDP-sessie gebruikt wordt — geen nieuwe hardware nodig.
- **Docker Desktop voor Windows** erop installeren (eenmalig, gratis).
- Eén regel in de router van de winkel om poort 8080 door te sturen naar die pc (hetzelfde wat voor de oude .exe ook al ingericht was).
- Het IP-adres van de Zebra-printer.
- Een wachtwoord voor de beheerder.

Geen extra database-server, geen mailserver, geen licenties.

> **Alternatief:** wil je toch een apart apparaat (bijvoorbeeld omdat de winkel-pc 's nachts uitgaat en je ook na sluitingstijd orders wilt kunnen ontvangen), dan kan SendPrint óók op een goedkoop kastje (mini-pc of Raspberry Pi, eenmalig ±€80–€150). Software is identiek, alleen de plek verandert.

## Beheerbaar en veilig houden

- **Inloggen met wachtwoord** — alleen de beheerder komt in het dashboard.
- **Aparte API-sleutel** voor Promesse, op elk moment te vernieuwen.
- **Volledig logboek** van elke printopdracht (wanneer, gelukt/mislukt, foutmelding).
- **Automatische updates** met één commando.
- **Gegevens blijven bewaard** bij updates en herstarts.
- **Backup** is één mapje kopiëren.

## Kosten

**Tijdens de test- en ontwikkelfase — hosten bij Replit (cloud):**
Reserved VM vanaf **±$10/maand** (~€10), plus een Replit Core-abonnement (~$25/maand) voor het ontwikkelen en beheren zelf. Realistisch: **±€35/maand**. Voordeel: snel live, ik kan op afstand meekijken bij problemen. *(Replit-prijzen kunnen wijzigen — actuele tarieven op replit.com/pricing.)*

**Voor productie — op de bestaande winkel-pc:**
**Geen extra hardware-kosten, geen maandelijkse kosten.** Alleen eenmalig Docker Desktop installeren en het commando draaien. Eventueel kastje als alternatief: ±€80–€150 per winkel.

**Wat de ontwikkeling tot nu toe gekost heeft:**
De exacte ontwikkelkosten staan in mijn Replit-account onder *Usage / Billing* (kan ik er apart bij zetten). Qua omvang zijn er zes bouwstappen afgerond — basis-bridge, opslag, inlog-beveiliging, verpakking, en automatische publicatie — een gemiddeld project, geen groot project.

## Samenvatting (niet-technisch)

- **Wat het doet:** Promesse zegt "druk dit label af" → SendPrint stuurt het naar de Zebra-printer → de operator ziet in een dashboard dat het gelukt is.
- **Hoe het werkt:** Promesse stuurt over internet een opdracht naar SendPrint, met een geheime sleutel zodat niemand anders dat kan. SendPrint controleert de sleutel, bewaart de opdracht in een logboek, en stuurt 'm meteen door naar de printer.
- **Wat je nodig hebt per winkel:** de bestaande pc waar Promesse al via RDP op draait, het IP van de printer, een wachtwoord, en de API-sleutel doorgeven aan Promesse.

## Voorstel

1. **Eerst hosten bij Replit** tijdens de test- en eerste-klant-fase (±€35/maand), zodat ik op afstand kan meekijken en problemen snel kan oplossen.
2. **Zodra het stabiel loopt** verhuizen naar de bestaande winkel-pc — geen extra hardware, geen maandkosten, en de printer is direct over het lokale netwerk bereikbaar.
3. **Voor uitrol naar meerdere winkels** is alleen Docker Desktop + één commando per winkel-pc nodig. Updates duwen we centraal door.

Hoor graag of dit duidelijk is, of dat er nog vragen zijn.

Met vriendelijke groet,
[jouw naam]
