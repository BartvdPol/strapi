# Strapi Project - Algemene Opstarthandleiding

Dit document beschrijft het algemene opstarten van dit project.

## 1. Eerste installatie

```powershell
.\install.cmd
```

Wat dit doet:

- Installeert npm dependencies.
- Zet de lokale runtime klaar voor dit project.

## 2. Development starten

```powershell
.\develop.cmd
```

Na succesvolle start:

- App: http://localhost:1337
- Admin: http://localhost:1337/admin

## 3. Productie build en start

Build:

```powershell
.\build.cmd
```

Start:

```powershell
.\start.cmd
```

## 4. Tests draaien

```powershell
.\test.cmd
```

## 5. Belangrijke projectpaden

- Plugin server code: src/plugins/temporal-relations/server
- Plugin admin code: src/plugins/temporal-relations/admin
- Config: config
- Database (sqlite): .tmp/data.db
- Extra documentatie: README_add_link.md
- GUI quickstart: README_GUI_ONLY_QUICKSTART.md

## 6. Handige checks

Controleer tabellen en links:

```powershell
.\.tools\node\node.exe .\_check_db.js
```

Lijst tabellen:

```powershell
.\.tools\node\node.exe .\_list_tables.js
```

## 7. Troubleshooting

Als admin of plugin wijzigingen niet zichtbaar zijn:

1. Stop de draaiende Strapi instance.
2. Start opnieuw met develop.cmd.
3. Hard refresh in browser (Ctrl+F5).
4. Controleer of poort 1337 in gebruik is door de juiste node-process.
