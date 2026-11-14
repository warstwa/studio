import type { Metadata } from "next";
import Link from "next/link";
import LegalDoc from "@/components/LegalDoc";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = { title: "Polityka prywatności" };

const TOC = [
  { id: "p1", label: "Administrator danych" },
  { id: "p2", label: "Jakie dane przetwarzamy" },
  { id: "p3", label: "Cele i podstawy prawne" },
  { id: "p4", label: "Kto widzi Twoje dane" },
  { id: "p5", label: "Odbiorcy i przekazanie poza EOG" },
  { id: "p6", label: "Jak długo przechowujemy dane" },
  { id: "p7", label: "Cookies i pamięć przeglądarki" },
  { id: "p8", label: "Bezpieczeństwo" },
  { id: "p9", label: "Twoje prawa" },
  { id: "p10", label: "Zmiany polityki" },
];

export default function Polityka() {
  const o = OPERATOR;
  return (
    <LegalDoc title="Polityka prywatności" lead="Jakie dane zbieramy, po co, gdzie je trzymamy i jakie masz prawa." toc={TOC}>
      <h2 id="p1">1. Administrator danych</h2>
      <p>
        Administratorem danych osobowych Użytkowników Serwisu Warstwa jest {o.name}, {o.address}, NIP {o.nip} (dalej: „Administrator”).
        W sprawach danych osobowych napisz na {o.email}.
      </p>
      <p>
        Drukarz, który otrzymuje Twoje dane w związku z Zamówieniem (np. adres dostawy przekazany w czacie), staje się odrębnym
        administratorem tych danych w zakresie wykonania Umowy o wykonanie wydruku.
      </p>

      <h2 id="p2">2. Jakie dane przetwarzamy</h2>
      <table>
        <thead><tr><th>Kategoria</th><th>Dane</th></tr></thead>
        <tbody>
          <tr><td>Konto</td><td>imię i nazwisko (lub nazwa), adres e-mail, hasło w postaci skrótu kryptograficznego (scrypt z solą — samego hasła nie znamy), miasto, opis, zdjęcie profilowe</td></tr>
          <tr><td>Profil Drukarza</td><td>maszyny, materiały, pole robocze, stawka, czas realizacji, dostępność, galeria zdjęć realizacji, oceny i liczba zleceń</td></tr>
          <tr><td>Zamówienia</td><td>opis, parametry druku, termin, budżet, sposób odbioru, miasto, pliki (modele, zdjęcia, PDF), wyniki Kalkulatora</td></tr>
          <tr><td>Realizacja</td><td>oferty, wyceny, zgłoszenia i akceptacje etapów, wiadomości i zdjęcia w czacie Zlecenia, potwierdzenia odbioru</td></tr>
          <tr><td>Opinie</td><td>oceny 1–5, treść opinii, zdjęcia wydruku</td></tr>
          <tr><td>Sesja i bezpieczeństwo</td><td>identyfikator sesji (w bazie tylko jego skrót), typ przeglądarki (user-agent), czas logowania; adres IP — chwilowo, do limitu prób logowania i rejestracji</td></tr>
          <tr><td>Statystyki</td><td>zagregowane, anonimowe statystyki odwiedzin (Vercel Web Analytics — bez plików cookies i bez identyfikowania osób)</td></tr>
        </tbody>
      </table>
      <p>Serwis nie przetwarza danych płatniczych. Pełny adres dostawy nie jest zbierany w formularzach — strony mogą go przekazać sobie w czacie Zlecenia.</p>

      <h2 id="p3">3. Cele i podstawy prawne</h2>
      <ul>
        <li><b>Prowadzenie konta i świadczenie usług Serwisu</b> (giełda, oferty, czat, opinie) — art. 6 ust. 1 lit. b RODO (wykonanie umowy).</li>
        <li><b>Bezpieczeństwo</b> — ochrona przed przejęciem kont i nadużyciami (limity prób logowania, sesje) — art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes).</li>
        <li><b>Dopasowanie Drukarzy (best fit)</b> — automatyczne wyliczenie, którzy Drukarze najlepiej pasują do Zamówienia. Nie wywołuje skutków prawnych ani w podobny sposób istotnie na Ciebie nie wpływa: Zamówienie widzą wszyscy Drukarze, a wybór oferty należy do Zamawiającego — art. 6 ust. 1 lit. b RODO.</li>
        <li><b>Rozpatrywanie reklamacji i zgłoszeń treści</b> — art. 6 ust. 1 lit. c RODO (obowiązki z ustawy o świadczeniu usług drogą elektroniczną i aktu o usługach cyfrowych) oraz lit. f.</li>
        <li><b>Dochodzenie lub obrona roszczeń</b> — art. 6 ust. 1 lit. f RODO.</li>
        <li><b>Statystyki odwiedzin</b> (anonimowe) — art. 6 ust. 1 lit. f RODO (ulepszanie Serwisu).</li>
      </ul>
      <p>Podanie danych jest dobrowolne, ale bez adresu e-mail, imienia i hasła nie można założyć konta.</p>

      <h2 id="p4">4. Kto widzi Twoje dane w Serwisie</h2>
      <ul>
        <li><b>Profil Drukarza</b> (imię i nazwisko, miasto, opis, zdjęcia, oceny, opinie) jest publiczny.</li>
        <li><b>Opublikowane Zamówienie</b>: kartę na Giełdzie (tytuł, fragment opisu, parametry, miasto, pierwsze zdjęcie jako okładka) widzi każdy odwiedzający; pełny opis i pliki — zalogowani Użytkownicy. Imię i nazwisko Zamawiającego nie jest pokazywane na Giełdzie.</li>
        <li><b>Szkic Zamówienia</b> widzi tylko Zamawiający.</li>
        <li><b>Czat, etapy realizacji i historię Zlecenia</b> widzą tylko jego uczestnicy: Zamawiający, Drukarz i zaakceptowani pomocnicy. Ceny Ofert konkurencji są niewidoczne dla Drukarzy.</li>
        <li><b>Opinię</b> (imię autora, tytuł Zlecenia, oceny, treść, zdjęcia) widać publicznie na profilu Drukarza.</li>
        <li>Adres e-mail nie jest pokazywany innym Użytkownikom.</li>
      </ul>

      <h2 id="p5">5. Odbiorcy i przekazanie poza EOG</h2>
      <p>Dane powierzamy dostawcom, którzy przetwarzają je w naszym imieniu na podstawie umów powierzenia:</p>
      <table>
        <thead><tr><th>Dostawca</th><th>Rola</th><th>Lokalizacja</th></tr></thead>
        <tbody>
          <tr><td>Vercel Inc.</td><td>hosting Serwisu, przechowywanie plików (Vercel Blob), anonimowe statystyki</td><td>USA (region iad1)</td></tr>
          <tr><td>Upstash, Inc. (przez Vercel Marketplace)</td><td>baza danych: konta, zamówienia, oferty, czat, opinie, sesje</td><td>USA (region iad1)</td></tr>
          <tr><td>GitHub, Inc.</td><td>repozytorium kodu (bez danych Użytkowników)</td><td>USA</td></tr>
        </tbody>
      </table>
      <p>
        Przekazanie danych do USA odbywa się na podstawie decyzji Komisji Europejskiej stwierdzającej odpowiedni stopień ochrony
        (EU–US Data Privacy Framework) — w zakresie, w jakim dostawca jest nim objęty — albo standardowych klauzul umownych
        zatwierdzonych przez Komisję Europejską. Kopię zabezpieczeń możesz otrzymać, pisząc na {o.email}.
      </p>
      <p>Dane mogą być udostępnione organom publicznym, jeżeli wymaga tego prawo.</p>

      <h2 id="p6">6. Jak długo przechowujemy dane</h2>
      <ul>
        <li><b>Konto i profil</b> — do usunięcia konta. Konto usuniesz sam w <Link href="/profil#bezpieczenstwo">Profilu → Bezpieczeństwo</Link>: usuwamy wtedy imię i nazwisko, e-mail, hasło, opis, zdjęcie profilowe i galerię, a w historii zleceń i opiniach pozostaje oznaczenie „Usunięte konto”.</li>
        <li><b>Zamówienia, czat, oferty, opinie</b> — przez czas posiadania konta, a po jego usunięciu do upływu terminu przedawnienia roszczeń (co do zasady 6 lat, dla roszczeń okresowych i związanych z działalnością gospodarczą — 3 lata).</li>
        <li><b>Sesja logowania</b> — 30 dni lub do wylogowania.</li>
        <li><b>Adres IP do limitu prób</b> — 15 minut (logowanie) lub 1 godzina (rejestracja).</li>
        <li><b>Logi techniczne hostingu</b> — zgodnie z ustawieniami dostawcy, obecnie do 1 godziny.</li>
      </ul>

      <h2 id="p7">7. Cookies i pamięć przeglądarki</h2>
      <ul>
        <li>Serwis używa <b>jednego niezbędnego pliku cookie</b> — <code>warstwa_sid</code> — który utrzymuje zalogowanie (ważny 30 dni, niedostępny dla skryptów, przesyłany tylko przez HTTPS). Nie wymaga on zgody, bo bez niego logowanie nie działa.</li>
        <li>Serwis <b>nie używa cookies reklamowych ani analitycznych</b>. Statystyki Vercel Web Analytics działają bez plików cookies.</li>
        <li>Jeżeli klikniesz „Dodaj do zamówienia” w Kalkulatorze bez zalogowania, model i jego ustawienia są tymczasowo zapisywane w pamięci Twojej przeglądarki (IndexedDB), aby nie przepadły podczas logowania. Usuwamy je po utworzeniu zamówienia; po 24 godzinach nie są już używane. Te dane nie trafiają na nasz serwer, dopóki nie dodasz ich do zamówienia.</li>
        <li>Fonty są serwowane z naszego serwera — przeglądarka nie łączy się w tym celu z serwerami Google.</li>
      </ul>

      <h2 id="p8">8. Bezpieczeństwo</h2>
      <ul>
        <li>Połączenie z Serwisem jest szyfrowane (HTTPS).</li>
        <li>Hasła przechowujemy wyłącznie jako skróty scrypt z indywidualną solą; sesje — jako skróty HMAC, więc wyciek bazy nie ujawnia haseł ani nie pozwala przejąć sesji.</li>
        <li>Stosujemy limity prób logowania i rejestracji. Zmiana hasła wylogowuje ze wszystkich innych urządzeń.</li>
        <li>Pliki Zamówień są dostępne pod losowymi adresami — osoba znająca adres może plik pobrać, dlatego nie zamieszczaj plików ściśle poufnych bez ustaleń z Drukarzem.</li>
      </ul>

      <h2 id="p9">9. Twoje prawa</h2>
      <p>Masz prawo do:</p>
      <ul>
        <li>dostępu do swoich danych i otrzymania ich kopii,</li>
        <li>sprostowania danych (większość możesz zmienić sam w <Link href="/profil">profilu</Link>),</li>
        <li>usunięcia danych („prawo do bycia zapomnianym”) — konto możesz usunąć samodzielnie w Profilu,</li>
        <li>ograniczenia przetwarzania,</li>
        <li>przenoszenia danych,</li>
        <li>sprzeciwu wobec przetwarzania opartego na prawnie uzasadnionym interesie,</li>
        <li>wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa, uodo.gov.pl).</li>
      </ul>
      <p>Aby skorzystać z praw, napisz na {o.email} z adresu e-mail przypisanego do konta. Odpowiemy w ciągu miesiąca.</p>

      <h2 id="p10">10. Zmiany polityki</h2>
      <p>
        O istotnych zmianach Polityki prywatności poinformujemy w Serwisie lub e-mailem. Zasady korzystania z Serwisu opisuje{" "}
        <Link href="/regulamin">Regulamin</Link>.
      </p>
    </LegalDoc>
  );
}
