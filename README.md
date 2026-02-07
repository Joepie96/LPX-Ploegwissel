# Ploegwissel Checklist (Melkpoeder)

Kant-en-klare webapp (Vite + React) voor ploegwissel-overdracht in een zuivelfabriek (melkpoeders).

## Lokaal starten
```bash
npm install
npm run dev
```

## Deploy naar Vercel (simpel)
1. Zet deze map in een GitHub repo (upload of `git push`).
2. Ga in Vercel naar **Add New → Project** en selecteer de repo.
3. Framework: **Vite** (automatisch).
4. Build command: `npm run build`
5. Output directory: `dist`
6. Deploy.

## Print/PDF
Print opent een nieuw tabblad met een 'schone' printlayout.  
Als er niets gebeurt: sta **pop-ups** toe voor jouw Vercel domein in Chrome.
