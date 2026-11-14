import type { Metadata } from "next";
import Link from "next/link";
import LegalDoc from "@/components/LegalDoc";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = { title: "Regulamin" };

const TOC = [
  { id: "s1", label: "Postanowienia ogólne" },
  { id: "s2", label: "Definicje" },
  { id: "s3", label: "Wymagania techniczne" },
  { id: "s4", label: "Konto" },
  { id: "s5", label: "Rola Warstwy" },
  { id: "s6", label: "Składanie zamówień" },
  { id: "s7", label: "Oferty i wybór Drukarza" },
  { id: "s8", label: "Realizacja i akceptacja etapów" },
  { id: "s9", label: "Pomoc innego Drukarza" },
  { id: "s10", label: "Płatności i dostawa" },
  { id: "s11", label: "Prawa konsumenta" },
  { id: "s12", label: "Obowiązki Drukarzy" },
  { id: "s13", label: "Treści i pliki" },
  { id: "s14", label: "Treści zabronione" },
  { id: "s15", label: "Opinie i oceny" },
  { id: "s16", label: "Dopasowanie (best fit) i kolejność" },
  { id: "s17", label: "Zgłoszenia nielegalnych treści" },
  { id: "s18", label: "Reklamacje dotyczące Serwisu" },
  { id: "s19", label: "Odpowiedzialność" },
  { id: "s20", label: "Zmiany Regulaminu i postanowienia końcowe" },
];

export default function Regulamin() {
  const o = OPERATOR;
  return (
    <LegalDoc title="Regulamin" lead="Zasady korzystania z serwisu Warstwa — sieci drukarzy 3D." toc={TOC}>
      <h2 id="s1">§1. Postanowienia ogólne</h2>
      <ol>
        <li>Regulamin określa zasady korzystania z serwisu internetowego Warstwa dostępnego pod adresem {o.site} (dalej: „Serwis”).</li>
        <li>
          Operatorem Serwisu jest {o.name}, {o.address}, NIP {o.nip}, REGON {o.regon}, wpisany do {o.register} (dalej: „Operator”).
          Kontakt: {o.email}.
        </li>
        <li>Regulamin jest regulaminem, o którym mowa w art. 8 ustawy z dnia 18 lipca 2002 r. o świadczeniu usług drogą elektroniczną. Jest udostępniany nieodpłatnie w sposób umożliwiający jego pobranie, utrwalenie i wydrukowanie.</li>
        <li>Zasady przetwarzania danych osobowych opisuje <Link href="/polityka-prywatnosci">Polityka prywatności</Link>.</li>
        <li>Korzystanie z Serwisu jest obecnie bezpłatne zarówno dla Zamawiających, jak i Drukarzy. Wprowadzenie opłat wymaga zmiany Regulaminu zgodnie z §20.</li>
      </ol>

      <h2 id="s2">§2. Definicje</h2>
      <dl>
        <dt>Użytkownik</dt><dd>osoba fizyczna, osoba prawna lub jednostka organizacyjna korzystająca z Serwisu; osoba fizyczna musi mieć pełną zdolność do czynności prawnych.</dd>
        <dt>Zamawiający</dt><dd>Użytkownik, który składa Zamówienie na wydruk 3D.</dd>
        <dt>Drukarz</dt><dd>Użytkownik, który uzupełnił profil drukarza i oferuje wykonanie wydruków 3D.</dd>
        <dt>Zamówienie (Zlecenie)</dt><dd>opis wydruku przygotowany przez Zamawiającego — pliki, pomysł lub wynik z Kalkulatora — wraz z parametrami, terminem i budżetem.</dd>
        <dt>Giełda</dt><dd>zakładka „Zlecenia”, na której publikowane są Zamówienia (karty widzi każdy, szczegóły i pliki — zalogowani Użytkownicy), a Drukarze mogą składać Oferty.</dd>
        <dt>Oferta</dt><dd>propozycja Drukarza zawierająca cenę, termin oraz — opcjonalnie — liczbę sztuk, które Drukarz wykona.</dd>
        <dt>Umowa o wykonanie wydruku</dt><dd>umowa zawierana bezpośrednio między Zamawiającym a Drukarzem w chwili przyjęcia Oferty lub akceptacji wyceny.</dd>
        <dt>Kalkulator</dt><dd>narzędzie „Slicer”, które szacuje czas druku, zużycie materiału i podpory na podstawie wgranego modelu.</dd>
      </dl>

      <h2 id="s3">§3. Wymagania techniczne</h2>
      <ol>
        <li>Do korzystania z Serwisu potrzebne jest urządzenie z dostępem do internetu, aktualna przeglądarka z włączoną obsługą JavaScript i plików cookies oraz aktywny adres e-mail.</li>
        <li>Kalkulator przetwarza model w przeglądarce Użytkownika; do jego działania potrzebna jest obsługa WebGL. Plik trafia na serwer dopiero po kliknięciu „Dodaj do zamówienia”.</li>
        <li>Operator informuje, że korzystanie z usług świadczonych drogą elektroniczną wiąże się z typowymi zagrożeniami sieci internet (np. złośliwe oprogramowanie, przechwycenie danych). Użytkownik powinien chronić swoje hasło i urządzenie.</li>
      </ol>

      <h2 id="s4">§4. Konto</h2>
      <ol>
        <li>Rejestracja wymaga podania imienia i nazwiska (lub nazwy), adresu e-mail, hasła oraz akceptacji Regulaminu. Podanie miasta jest dobrowolne.</li>
        <li>Umowa o świadczenie usług drogą elektroniczną (prowadzenie konta) zostaje zawarta z chwilą założenia konta, na czas nieoznaczony.</li>
        <li>Użytkownik zobowiązuje się podawać prawdziwe dane i nie udostępniać konta osobom trzecim. Jedna osoba może posiadać jedno konto.</li>
        <li>Użytkownik może w każdej chwili zmienić hasło, wylogować się ze wszystkich urządzeń oraz usunąć konto w Profilu (sekcja „Bezpieczeństwo”). Usunięcie konta jest możliwe, gdy Użytkownik nie ma zleceń w realizacji; szkice i zlecenia oczekujące na oferty zostają anulowane, a oferty — wycofane. Usunięcie konta nie wpływa na Umowy o wykonanie wydruku wykonane wcześniej.</li>
        <li>Operator może zawiesić lub usunąć konto Użytkownika, który rażąco narusza Regulamin lub prawo, po uprzednim wezwaniu do zaprzestania naruszeń (chyba że naruszenie jest rażące lub niezgodne z prawem). Operator informuje Użytkownika o decyzji wraz z uzasadnieniem.</li>
      </ol>

      <h2 id="s5">§5. Rola Warstwy</h2>
      <ol>
        <li>Serwis jest platformą łączącą Zamawiających z Drukarzami. <b>Operator nie jest stroną Umowy o wykonanie wydruku</b>, nie wykonuje wydruków, nie sprzedaje ich i nie pośredniczy w płatnościach.</li>
        <li>Za wykonanie wydruku, jego jakość, termin, wysyłkę oraz rozliczenia odpowiada Drukarz wobec Zamawiającego, a za podanie prawidłowych informacji i plików — Zamawiający.</li>
        <li>Przy każdej Ofercie i na profilu Drukarza widoczne są dane Drukarza. Jeżeli Drukarz działa jako przedsiębiorca, powinien to wskazać w profilu; jeżeli nie — Umowa o wykonanie wydruku jest umową między osobami prywatnymi i nie mają do niej zastosowania przepisy o prawach konsumenta (§11).</li>
      </ol>

      <h2 id="s6">§6. Składanie zamówień</h2>
      <ol>
        <li>Zamawiający rozpoczyna Zamówienie na jeden z trzech sposobów: wgrywając pliki (np. STL, 3MF, STEP, OBJ, zdjęcia, PDF), opisując pomysł albo dodając model z Kalkulatora.</li>
        <li>Zamówienie jest zapisywane jako szkic widoczny tylko dla Zamawiającego. Po kliknięciu „Wyślij zlecenie do drukarzy” jest publikowane na Giełdzie.</li>
        <li>Wyniki Kalkulatora są szacunkiem (zwykle ±20–30%) i nie stanowią wyceny. Wiążąca jest wyłącznie cena z Oferty lub wyceny Drukarza.</li>
        <li>Zamawiający może edytować lub anulować Zamówienie do chwili przyjęcia Oferty.</li>
        <li>Zamawiający może też wysłać zapytanie bezpośrednio do wybranego Drukarza z jego profilu.</li>
      </ol>

      <h2 id="s7">§7. Oferty i wybór Drukarza</h2>
      <ol>
        <li>Drukarze składają Oferty na Giełdzie. Ceny Ofert innych Drukarzy są dla Drukarza niewidoczne.</li>
        <li>Oferta może obejmować część sztuk. Zamawiający może przyjąć jedną lub kilka Ofert i rozdzielić między nie sztuki — wtedy z każdym wybranym Drukarzem zawierana jest odrębna Umowa o wykonanie wydruku na przydzieloną część, a cena jest proporcjonalna do liczby sztuk.</li>
        <li>Przyjęcie Oferty przez Zamawiającego oznacza zawarcie Umowy o wykonanie wydruku między Zamawiającym a Drukarzem. Pozostałe Oferty wygasają, a ich autorzy otrzymują o tym informację.</li>
        <li>Drukarz może zmienić lub wycofać Ofertę do chwili jej przyjęcia.</li>
      </ol>

      <h2 id="s8">§8. Realizacja i akceptacja etapów</h2>
      <ol>
        <li>Każdy etap realizacji — wycenę (przy zapytaniu bezpośrednim), rozpoczęcie druku oraz wysyłkę — Drukarz zgłasza w Serwisie, a Zamawiający go akceptuje albo odrzuca z komentarzem.</li>
        <li>Po otrzymaniu wydruku Zamawiający potwierdza odbiór w Serwisie. Potwierdzenie odbioru nie pozbawia Zamawiającego uprawnień z tytułu niezgodności wydruku z umową.</li>
        <li>Strony komunikują się przez czat Zlecenia; mogą w nim przesyłać zdjęcia. Ustalenia z czatu (np. adres dostawy) są częścią Umowy o wykonanie wydruku.</li>
      </ol>

      <h2 id="s9">§9. Pomoc innego Drukarza</h2>
      <ol>
        <li>Drukarz może poprosić innego Drukarza o wykonanie części Zamówienia. Pomocnik zgłasza swoją wycenę, a <b>udział pomocnika wymaga akceptacji Zamawiającego</b>.</li>
        <li>Po akceptacji pomocnik wysyła swoją część bezpośrednio do Zamawiającego. Zamawiający potwierdza jej odbiór i może wystawić pomocnikowi opinię.</li>
        <li>Zamawiający, który nie zaakceptuje pomocnika, nie jest związany jego wyceną.</li>
      </ol>

      <h2 id="s10">§10. Płatności i dostawa</h2>
      <ol>
        <li>Serwis nie obsługuje płatności. Sposób i termin zapłaty oraz sposób dostawy (wysyłka lub odbiór osobisty) Zamawiający i Drukarz ustalają między sobą.</li>
        <li>Operator rekomenduje płatność po akceptacji wyceny i przed wysyłką lub za pobraniem oraz nieprzekazywanie danych płatniczych w czacie.</li>
      </ol>

      <h2 id="s11">§11. Prawa konsumenta</h2>
      <ol>
        <li>Jeżeli Drukarz jest przedsiębiorcą, a Zamawiający konsumentem (lub przedsiębiorcą na prawach konsumenta), do Umowy o wykonanie wydruku stosuje się ustawę z dnia 30 maja 2014 r. o prawach konsumenta oraz przepisy Kodeksu cywilnego o niezgodności towaru z umową.</li>
        <li>Prawo odstąpienia od umowy zawartej na odległość nie przysługuje co do rzeczy wyprodukowanej według specyfikacji konsumenta lub służącej zaspokojeniu jego zindywidualizowanych potrzeb (art. 38 ust. 1 pkt 3 ustawy o prawach konsumenta) — dotyczy to większości wydruków wykonywanych z pliku Zamawiającego.</li>
        <li>Konsument może skorzystać z pozasądowych sposobów rozpatrywania sporów, m.in. pomocy miejskiego lub powiatowego rzecznika konsumentów oraz Inspekcji Handlowej.</li>
      </ol>

      <h2 id="s12">§12. Obowiązki Drukarzy</h2>
      <ol>
        <li>Drukarz rzetelnie opisuje w profilu posiadane maszyny, materiały, pole robocze i typowy czas realizacji oraz aktualizuje swoją dostępność.</li>
        <li>Drukarz odpowiada za zgodność swojej działalności z prawem, w tym za obowiązki podatkowe i — jeżeli działa jako przedsiębiorca — za obowiązki wobec konsumentów.</li>
        <li>Drukarz wykorzystuje pliki i dane Zamawiającego wyłącznie w celu wykonania Zamówienia i nie udostępnia ich osobom trzecim, z wyjątkiem pomocnika zaakceptowanego przez Zamawiającego.</li>
        <li>Drukarz może odmówić wykonania wydruku, w szczególności gdy model narusza prawo lub prawa osób trzecich (§14).</li>
      </ol>

      <h2 id="s13">§13. Treści i pliki</h2>
      <ol>
        <li>Użytkownik oświadcza, że ma prawa do plików, zdjęć i opisów, które zamieszcza w Serwisie, oraz że ich wydrukowanie nie narusza praw osób trzecich (np. praw autorskich, wzorów przemysłowych, znaków towarowych).</li>
        <li>Użytkownik udziela Operatorowi niewyłącznej, nieodpłatnej licencji na przechowywanie i wyświetlanie zamieszczonych treści w zakresie niezbędnym do działania Serwisu. Drukarzowi, który wykonuje Zamówienie, Zamawiający udziela licencji na korzystanie z plików w celu wykonania wydruku.</li>
        <li>Pliki zamieszczane w Zamówieniach są przechowywane pod losowymi, trudnymi do odgadnięcia adresami; każda osoba, która zna adres pliku, może go pobrać. Nie należy zamieszczać plików poufnych bez odrębnych ustaleń z Drukarzem.</li>
        <li>Zdjęcia w galerii realizacji Drukarz zamieszcza wyłącznie za zgodą Zamawiającego, jeżeli przedstawiają jego projekt.</li>
      </ol>

      <h2 id="s14">§14. Treści zabronione</h2>
      <p>Zabronione jest zamieszczanie oraz zamawianie wydruków:</p>
      <ul>
        <li>broni palnej, jej istotnych części i amunicji oraz przedmiotów, których posiadanie wymaga zezwolenia;</li>
        <li>przedmiotów naruszających prawa własności intelektualnej osób trzecich, w tym podróbek;</li>
        <li>treści o charakterze bezprawnym, nawołujących do przemocy, nienawiści lub promujących ustroje totalitarne;</li>
        <li>przedmiotów służących do popełnienia przestępstwa (np. narzędzi do włamań, skimmerów);</li>
        <li>danych osobowych osób trzecich bez podstawy prawnej oraz spamu i treści reklamowych niezwiązanych ze Zleceniem.</li>
      </ul>

      <h2 id="s15">§15. Opinie i oceny</h2>
      <ol>
        <li>Opinię o Drukarzu może wystawić <b>wyłącznie Zamawiający, który potwierdził odbiór</b> danego wydruku — raz dla każdego zrealizowanego Zlecenia (lub jego części). Opinie są więc powiązane z rzeczywistymi zamówieniami.</li>
        <li>Opinia obejmuje oceny 1–5 za jakość wydruku, kontakt i terminowość, opcjonalny opis i zdjęcia. Ocena Drukarza jest średnią wszystkich jego ocen.</li>
        <li>Operator nie zmienia treści opinii i nie ukrywa opinii negatywnych. Opinie zawierające treści zabronione (§14) mogą zostać usunięte.</li>
        <li>Przykładowe profile i opinie oznaczone jako demonstracyjne służą prezentacji działania Serwisu.</li>
      </ol>

      <h2 id="s16">§16. Dopasowanie (best fit) i kolejność</h2>
      <ol>
        <li>Po publikacji Zamówienia Serwis automatycznie wylicza dopasowanie Drukarzy (0–100%), a trzech najlepiej dopasowanych otrzymuje zaproszenie („Polecane dla Ciebie”). Zamówienie widzą także wszyscy pozostali Drukarze.</li>
        <li>Główne parametry dopasowania to: obsługa wymaganych materiałów, możliwość druku wielokolorowego, wielkość pola roboczego względem wymiarów modelu, możliwość dotrzymania terminu, dostępność Drukarza, typowy czas realizacji, liczba maszyn przy dużych seriach oraz średnia ocen i liczba zrealizowanych zleceń.</li>
        <li>Nie istnieje możliwość wykupienia wyższej pozycji. Domyślną kolejność na Giełdzie i w katalogu Użytkownik może zmienić filtrami i sortowaniem.</li>
      </ol>

      <h2 id="s17">§17. Zgłoszenia nielegalnych treści</h2>
      <ol>
        <li>Każdy może zgłosić treść, którą uważa za nielegalną lub niezgodną z Regulaminem, pisząc na {o.email}. Zgłoszenie powinno zawierać adres (link) treści, uzasadnienie oraz dane kontaktowe zgłaszającego.</li>
        <li>Operator rozpatruje zgłoszenia bez zbędnej zwłoki, w sposób niearbitralny i obiektywny, informuje zgłaszającego o decyzji, a autora usuniętej treści — o decyzji wraz z uzasadnieniem i możliwością odwołania.</li>
        <li>Pojedynczym punktem kontaktowym dla organów państw członkowskich, Komisji Europejskiej i Użytkowników w rozumieniu aktu o usługach cyfrowych (DSA) jest adres {o.email}; korespondencja może być prowadzona w języku polskim lub angielskim.</li>
      </ol>

      <h2 id="s18">§18. Reklamacje dotyczące Serwisu</h2>
      <ol>
        <li>Reklamacje dotyczące działania Serwisu można składać na {o.email}, opisując problem i wskazując e-mail konta.</li>
        <li>Operator odpowiada na reklamację w terminie 14 dni od jej otrzymania.</li>
        <li>Reklamacje dotyczące samego wydruku (jakość, termin, wysyłka) Zamawiający kieruje do Drukarza, z którym zawarł Umowę o wykonanie wydruku.</li>
      </ol>

      <h2 id="s19">§19. Odpowiedzialność</h2>
      <ol>
        <li>Operator dokłada starań, by Serwis działał nieprzerwanie, jednak może przeprowadzać prace techniczne i nie gwarantuje stałej dostępności.</li>
        <li>Operator nie odpowiada za wykonanie Umów o wykonanie wydruku, treści zamieszczane przez Użytkowników ani za szkody wynikłe z naruszenia Regulaminu przez Użytkowników — w granicach dopuszczalnych przez prawo. Ograniczenie to nie dotyczy szkód wyrządzonych umyślnie oraz nie wyłącza praw konsumentów.</li>
      </ol>

      <h2 id="s20">§20. Zmiany Regulaminu i postanowienia końcowe</h2>
      <ol>
        <li>Operator może zmienić Regulamin z ważnych przyczyn (zmiana prawa, zmiana funkcji Serwisu, względy bezpieczeństwa). O zmianie Użytkownicy zostaną poinformowani w Serwisie lub e-mailem co najmniej 14 dni przed jej wejściem w życie (co najmniej 15 dni dla Drukarzy działających jako przedsiębiorcy). Użytkownik, który nie akceptuje zmian, może usunąć konto.</li>
        <li>W sprawach nieuregulowanych stosuje się prawo polskie, w szczególności Kodeks cywilny, ustawę o świadczeniu usług drogą elektroniczną, ustawę o prawach konsumenta oraz rozporządzenie (UE) 2022/2065 (akt o usługach cyfrowych).</li>
        <li>Spory z konsumentami rozstrzyga sąd właściwy według przepisów ogólnych.</li>
      </ol>
    </LegalDoc>
  );
}
