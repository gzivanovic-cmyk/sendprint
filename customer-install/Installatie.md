# SendPrint Bridge — Installatie

Korte handleiding voor de PC bij u op kantoor die met de Zebra-printer praat.
Inschatting: 5 minuten werk de eerste keer.

---

## 1. Wat heeft u nodig?

- Een Windows-PC bij u op kantoor die altijd aan staat
- Die PC moet in hetzelfde netwerk zitten als de Zebra-printer
- **Docker Desktop** geïnstalleerd → gratis te downloaden via
  <https://www.docker.com/products/docker-desktop/>
  (eenmalig installeren, daarna start het vanzelf op met de PC)
- Het IP-adres van uw Zebra-printer (bv. `192.168.1.100`)

> **Tip**: weet u het IP-adres niet? Print een netwerk-configuratielabel
> op de printer zelf (knop ingedrukt houden tot er een label uit komt) —
> het IP staat erop.

---

## 2. Installeren

1. Pak de map `customer-install` uit op een vaste plek, bv. `C:\SendPrint\`.
2. Controleer rechts onder in de taakbalk of het **Docker-icoontje groen** is.
3. **Dubbelklik op `install.bat`**.
4. Krijgt u een Windows-waarschuwing ("Windows heeft uw pc beschermd")?
   Klik op *Meer informatie* → *Toch uitvoeren*. Dit komt omdat de scripts
   geen Microsoft-handtekening hebben — ze zijn veilig.
5. Het script vraagt om een **admin-wachtwoord**. Kies er een en onthoud hem
   (later kunt u hem via het dashboard wijzigen).
6. Wacht 1-2 minuten. De browser opent automatisch op het dashboard.

![Eerste keer inloggen](dashboard-screenshot.png)

---

## 3. Eerste keer configureren

In het dashboard:

1. **Log in** met het wachtwoord dat u net heeft gekozen.
2. Ga naar **Configuration** (linker menu).
3. Vul bij **Printer IP Address** het IP van uw Zebra-printer in.
4. Laat **Printer Port** op `9100` staan (standaard voor Zebra).
5. Klik **Save Configuration**.
6. Ga naar **Dashboard** → klik **Send test print**. Er hoort een leeg
   testlabel uit de printer te komen.

### Promesse koppelen

Op de Configuration-pagina ziet u rechts een blokje **Integration Snippet**.
Daar staan twee dingen die u in Promesse moet invoeren:

- **Endpoint URL**: `http://<naam-van-deze-pc>:8080/api/print`
  (vervang `<naam-van-deze-pc>` door bv. `printbridge.kantoor.local` of
  het lokale IP-adres van de PC waar dit script op draait)
- **API Key (X-API-Key header)**: kopieer met het kopieer-icoontje

Vul die twee waarden in op de Promesse-instellingenpagina voor printen,
sla op, en print een testorder vanuit Promesse.

---

## 4. Updates

De bridge **update zichzelf automatisch** elke nacht om 03:00.
U hoeft niets te doen — als er een nieuwe versie is, draait die de volgende
ochtend al.

Wilt u niet wachten? Dubbelklik **`update.bat`**.

---

## 5. Wat als het niet werkt?

| Probleem | Oplossing |
|---|---|
| Browser opent niet automatisch | Open zelf: <http://localhost:8080> |
| "Printer offline" op het dashboard | Controleer dat de printer aan staat en in hetzelfde netwerk zit. Ping het IP vanaf deze PC: `ping 192.168.1.100`. |
| Het script doet niets / sluit direct | Docker Desktop draait niet. Start Docker Desktop, wacht tot het icoontje groen is, en probeer opnieuw. |
| Wachtwoord vergeten | Open `.env` in Kladblok, wijzig de regel `ADMIN_PASSWORD=...`, en draai `update.bat`. Het wachtwoord wordt overschreven met de nieuwe waarde. |
| Andere fout | Bel of mail uw contactpersoon en stuur een screenshot van het foutscherm mee. |

---

## 6. Stoppen / verwijderen

- **Tijdelijk stoppen**: dubbelklik `stop.bat`. Gebruik `start.bat` om weer aan te zetten.
- **Helemaal verwijderen**: dubbelklik `uninstall.bat`. Containers en image gaan weg,
  uw data (printer-config, API-key, log-historie) blijft bewaard tenzij u
  expliciet `docker volume rm sendprint-data` uitvoert.
