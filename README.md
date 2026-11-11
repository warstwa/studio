# Warstwa — marketplace druku 3D

Zamawiający wysyłają zapytania do drukarzy. Drukarz może zapytanie **zaakceptować** (z wyceną i terminem), **odrzucić** (z powodem) albo kliknąć **„Poproś o pomoc”**. Wtedy powstaje drugie zapytanie do innego drukarza, który przejmuje część sztuk. Gdy pomocnik zaakceptuje, zlecenie główne jest przyjmowane automatycznie jako realizacja wspólna.

Stack: Next.js 15 (App Router, Server Actions), TypeScript, czysty CSS, Upstash Redis.

## Jak składa się zamówienie

Zamawiający nie wybiera drukarza. Zaczyna od jednej z trzech dróg na `/zamow`:

1. **Mam plik** — STL / 3MF / STEP / OBJ, zdjęcia, PDF (do 200 MB na plik, Vercel Blob).
2. **Mam pomysł** — opis + opcjonalne szkice i zdjęcia.
3. **Policz w slicerze** — kalkulator `/slicer` → „Dodaj do zamówienia” zapisuje model i wyliczenia
   (czas, filament, kolory). Bez logowania praca czeka w przeglądarce (IndexedDB) i wraca po zalogowaniu.

Każda droga tworzy **szkic** (`/zamow/[id]`), gdzie uzupełnia się termin, budżet, odbiór itd.
„Wyślij zlecenie” publikuje je na **giełdzie** (`/zlecenia`):

- **best fit** (`lib/match.ts`) liczy dopasowanie drukarzy (materiały, wielokolor, rozmiar stołu, termin,
  dostępność, oceny); trzech najlepszych dostaje zaproszenie i widzi zlecenie jako „Polecane dla Ciebie”,
- drukarze składają **oferty** (cena, termin, notatka) — ceny konkurencji są niejawne,
- drukarz może zaoferować tylko część sztuk; zamawiający przyjmuje jedną lub kilka ofert i **od razu dzieli
  sztuki** — każda część ma własny przebieg, odbiór i ocenę.

## Akceptacja kroków

Każdy krok drukarz tylko **zgłasza**, a zamawiający **akceptuje** (albo odrzuca z komentarzem):
wycena → start druku → wysyłka (ze zdjęciami) → odbiór → ocena.
Pomocnik (prośba o pomoc) też wymaga akceptacji zamawiającego, wysyła swoją część **bezpośrednio do
zamawiającego** i to zamawiający potwierdza odbiór i go ocenia.

Zapytanie bezpośrednio do konkretnego drukarza nadal jest możliwe z jego profilu.

## Przepływ statusów

```
draft ──wyślij──▶ open ──przyjęcie oferty──▶ accepted
pending ──akceptuj──▶ accepted ──▶ printing ──▶ ready ──(odbiór)──▶ completed
   │  └─poproś o pomoc─▶ help_requested ──(pomocnik akceptuje)──▶ accepted
   └─odrzuć──▶ rejected ──(zamawiający: wyślij do innego)──▶ pending
```

## Konta i uwierzytelnianie

- Hasła: scrypt (N=2^15) z solą; wymagane min. 8 znaków, litera i cyfra; blokada popularnych haseł.
- Sesje po stronie serwera w Redisie (30 dni). W ciasteczku `warstwa_sid` (httpOnly, SameSite=Lax, Secure) jest losowy token, a w bazie tylko jego HMAC.
- Wylogowanie usuwa sesję z bazy. Zmiana hasła i „Wyloguj ze wszystkich urządzeń” unieważniają wszystkie sesje.
- Limity prób: 8 nieudanych logowań na e-mail i 30 na IP w ciągu 15 minut; 10 rejestracji z IP na godzinę.
- Konta demo (przyciski na stronie logowania) można wyłączyć zmienną `DEMO_LOGIN=0`.

## Lokalnie

```bash
npm install
npm run dev
```

Bez skonfigurowanego Redisa dane są trzymane w pamięci (z kontami demo). Hasło do kont demo: `demo1234`.

## Wdrożenie na Vercel

1. Vercel → **Add New → Project**, potem import tego repozytorium. Framework zostanie wykryty sam.
2. W projekcie: **Storage → Create → Upstash (Redis)**, potem *Connect to project*. Zmienne `KV_REST_API_URL` i `KV_REST_API_TOKEN` dodadzą się automatycznie.
3. **Settings → Environment Variables**: dodaj `SESSION_SECRET` (klucz HMAC tokenów sesji), czyli losowy ciąg co najmniej 32 znaków (`openssl rand -hex 32`).
4. **Storage → Blob** (magazyn plików zamówień) — zmienna `BLOB_READ_WRITE_TOKEN`. Bez niej lokalnie pliki trzymane są w pamięci.
5. Redeploy. Każdy push na `main` wdraża się automatycznie.
