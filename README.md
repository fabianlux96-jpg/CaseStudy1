# Legalhero Prototype - One-Click Drafting

Ein einfacher Next.js-Prototyp für ein Legal-Tech-Produkt, das aus strukturierten Falldaten mit einem Klick ein juristisches Forderungsschreiben erzeugt und als PDF exportiert.

## Projektstruktur

```text
.
|-- .env.example
|-- .gitignore
|-- README.md
|-- package.json
|-- pages
|   |-- _app.js
|   |-- index.js
|   `-- api
|       |-- generate.js
|       `-- generate-pdf.js
`-- styles
    `-- globals.css
```

## Voraussetzungen

- Node.js 18 oder neuer
- Ein gültiger OpenAI API Key in `OPENAI_API_KEY`

## Lokales Starten

1. Abhängigkeiten installieren:

```bash
npm install
```

2. Umgebungsdatei anlegen:

```bash
cp .env.example .env.local
```

Unter Windows alternativ den Inhalt aus `.env.example` in eine neue Datei `.env.local` kopieren.

3. API Key in `.env.local` setzen:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5
```

4. Entwicklungsserver starten:

```bash
npm run dev
```

5. App im Browser öffnen:

```text
http://localhost:3000
```

## Ablauf im Prototype

1. Die Falldaten werden als gemocktes JSON im UI angezeigt.
2. Mit `Entwurf erstellen` wird die OpenAI-API-Route aufgerufen und ein deutsches Forderungsschreiben erzeugt.
3. Der Text erscheint in einem editierbaren Textfeld.
4. Mit `Download as PDF` wird der bearbeitete Inhalt serverseitig in ein juristisch formatiertes PDF umgewandelt und heruntergeladen.

## Hinweise

- Es gibt keine Datenbank; die Falldaten sind hart im Frontend hinterlegt.
- Die PDF-Erstellung läuft direkt in Node.js über `pdf-lib` und benötigt kein installiertes Chrome.
- Dadurch ist der Export einfacher auf Plattformen wie Vercel deploybar.
- Der Prototyp ist auf Demo-Wirkung fur Juristinnen und Juristen ausgelegt, nicht auf Produktionsreife.

## GitHub Push

Bevor du das Projekt pushst, stelle sicher, dass dein echter API-Key nicht in `.env.local` oder an anderer Stelle eingecheckt wird. Falls ein Key bereits offengelegt wurde, sollte er vor dem Push im OpenAI-Dashboard widerrufen und neu erstellt werden.

Wenn Git installiert ist, kannst du das Projekt so initialisieren und pushen:

```bash
git init
git add .
git commit -m "Initial prototype for One-Click Drafting"
git branch -M main
git remote add origin <DEIN_GITHUB_REPO_URL>
git push -u origin main
```
