# GUI-Only Quickstart (Temporal Relations)

Deze quickstart is voor gebruikers die alles via de Strapi GUI willen doen, zonder API-calls.

## 1. Start de app

```powershell
.\develop.cmd
```

Open daarna:

- Strapi admin: http://localhost:1337/admin
- Plugin pagina: http://localhost:1337/admin/plugins/temporal-relations

## 2. Maak relation type aan

1. Open plugin: Temporal Relations.
2. Ga naar tab: Relation Types.
3. Maak een nieuw type:
- Machine name: bedrijf_winst_ontvangen
- Source UID: api::bedrijf.bedrijf
- Target UID: api::bedrijf.bedrijf
4. Klik op Create.

Resultaat:

- Relation type bestaat in de lijst.
- Fysieke tabel wordt automatisch beheerd door de plugin.

## 3. Voeg links toe via de GUI

1. Open Content Manager.
2. Open een Bedrijf item.
3. Zoek rechts het paneel: Relaties (tijdgebonden).
4. Zoek blok: bedrijf_winst_ontvangen.
5. Gebruik + Toevoegen voor uitgaand of inkomend.
6. Vul de velden in en klik Opslaan.

## 4. Velden voor winst-links

Voor bedrijf_winst_ontvangen kun je typed velden invullen:

- berekendOp (select)
- winstgerechtigdeType (select)
- percentageEersteSchaal
- bedragEersteSchaal
- restantPercentage
- winstgerechtigdenId

Toegestane select-waarden:

- berekendOp: Brutowinst, Nettowinst, Restant winst
- winstgerechtigdeType: Aandeelhouder, Beherend vennoot, Commanditair vennoot

## 5. Bewerken en beheren

Per link-rij heb je:

- Open item
- Bewerk
- Verwijder

Extra gedrag:

- Add-formulieren zijn standaard ingeklapt.
- Blokken kunnen verplaatst worden met pijl omhoog/omlaag.

## 6. Validatie

Server-side validatie staat aan voor winst-links.

- Ongeldige waarde voor berekendOp of winstgerechtigdeType wordt geweigerd.
- API/import antwoordt dan met status 400.

## 7. Troubleshooting

Als je de plugin of panel niet ziet:

1. Hard refresh in browser (Ctrl+F5).
2. Controleer dat develop.cmd draait.
3. Herstart Strapi.
4. Open plugin direct via URL:
- http://localhost:1337/admin/plugins/temporal-relations
