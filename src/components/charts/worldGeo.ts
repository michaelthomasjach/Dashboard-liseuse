export type Continent = "america" | "europe" | "eurasia" | "asia" | "middle-east" | "africa" | "oceania";

export const CONTINENT_LABELS: Record<Continent, string> = {
  america: "Amérique",
  europe: "Europe",
  eurasia: "Eurasie",
  asia: "Asie",
  "middle-east": "Moyen-Orient",
  africa: "Afrique",
  oceania: "Océanie",
};

export const CONTINENTS: Continent[] = ["america", "europe", "eurasia", "asia", "middle-east", "africa", "oceania"];

/** Every `world-atlas` `countries-110m.json` country, by its own ISO 3166-1 numeric `id` (as a
 *  string, matching the topology's own `properties.id`), to one of the seven regions above — a
 *  geopolitical/market-style split (North + South America merged into one "Amérique", the former
 *  Soviet space carved out of Europe/Asia into its own "Eurasie", the Middle East carved out of
 *  Asia into its own bucket) rather than strict continents, since this exists to color a
 *  *portfolio exposure* map. Region membership is still a stable-enough fact for the library to
 *  own outright rather than needing a runtime dependency for it — three entries in the topology
 *  (Kosovo, N. Cyprus, Somaliland) carry no numeric id at all and are simply absent here, same as
 *  any country a caller's own data names that isn't in this list: `WorldExposureMap` renders them
 *  with no data rather than guessing. */
export const COUNTRY_CONTINENT: Record<string, Continent> = {
  "004": "asia", // Afghanistan
  "008": "europe", // Albania
  "012": "africa", // Algeria
  "024": "africa", // Angola
  "032": "america", // Argentina
  "051": "eurasia", // Armenia
  "036": "oceania", // Australia
  "040": "europe", // Austria
  "031": "eurasia", // Azerbaijan
  "044": "america", // Bahamas
  "050": "asia", // Bangladesh
  "112": "eurasia", // Belarus
  "056": "europe", // Belgium
  "084": "america", // Belize
  "204": "africa", // Benin
  "064": "asia", // Bhutan
  "068": "america", // Bolivia
  "070": "europe", // Bosnia and Herz.
  "072": "africa", // Botswana
  "076": "america", // Brazil
  "096": "asia", // Brunei
  "100": "europe", // Bulgaria
  "854": "africa", // Burkina Faso
  "108": "africa", // Burundi
  "116": "asia", // Cambodia
  "120": "africa", // Cameroon
  "124": "america", // Canada
  "140": "africa", // Central African Rep.
  "148": "africa", // Chad
  "152": "america", // Chile
  "156": "asia", // China
  "170": "america", // Colombia
  "178": "africa", // Congo
  "188": "america", // Costa Rica
  "384": "africa", // Côte d'Ivoire
  "191": "europe", // Croatia
  "192": "america", // Cuba
  "196": "europe", // Cyprus
  "203": "europe", // Czechia
  "180": "africa", // Dem. Rep. Congo
  "208": "europe", // Denmark
  "262": "africa", // Djibouti
  "214": "america", // Dominican Rep.
  "218": "america", // Ecuador
  "818": "africa", // Egypt
  "222": "america", // El Salvador
  "226": "africa", // Eq. Guinea
  "232": "africa", // Eritrea
  "233": "europe", // Estonia
  "748": "africa", // eSwatini
  "231": "africa", // Ethiopia
  "238": "america", // Falkland Is.
  "242": "oceania", // Fiji
  "246": "europe", // Finland
  "260": "africa", // Fr. S. Antarctic Lands
  "250": "europe", // France
  "266": "africa", // Gabon
  "270": "africa", // Gambia
  "268": "eurasia", // Georgia
  "276": "europe", // Germany
  "288": "africa", // Ghana
  "300": "europe", // Greece
  "304": "america", // Greenland
  "320": "america", // Guatemala
  "324": "africa", // Guinea
  "624": "africa", // Guinea-Bissau
  "328": "america", // Guyana
  "332": "america", // Haiti
  "340": "america", // Honduras
  "348": "europe", // Hungary
  "352": "europe", // Iceland
  "356": "asia", // India
  "360": "asia", // Indonesia
  "364": "middle-east", // Iran
  "368": "middle-east", // Iraq
  "372": "europe", // Ireland
  "376": "middle-east", // Israel
  "380": "europe", // Italy
  "388": "america", // Jamaica
  "392": "asia", // Japan
  "400": "middle-east", // Jordan
  "398": "eurasia", // Kazakhstan
  "404": "africa", // Kenya
  "414": "middle-east", // Kuwait
  "417": "eurasia", // Kyrgyzstan
  "418": "asia", // Laos
  "428": "europe", // Latvia
  "422": "middle-east", // Lebanon
  "426": "africa", // Lesotho
  "430": "africa", // Liberia
  "434": "africa", // Libya
  "440": "europe", // Lithuania
  "442": "europe", // Luxembourg
  "807": "europe", // Macedonia
  "450": "africa", // Madagascar
  "454": "africa", // Malawi
  "458": "asia", // Malaysia
  "466": "africa", // Mali
  "478": "africa", // Mauritania
  "484": "america", // Mexico
  "498": "eurasia", // Moldova
  "496": "asia", // Mongolia
  "499": "europe", // Montenegro
  "504": "africa", // Morocco
  "508": "africa", // Mozambique
  "104": "asia", // Myanmar
  "516": "africa", // Namibia
  "524": "asia", // Nepal
  "528": "europe", // Netherlands
  "540": "oceania", // New Caledonia
  "554": "oceania", // New Zealand
  "558": "america", // Nicaragua
  "562": "africa", // Niger
  "566": "africa", // Nigeria
  "408": "asia", // North Korea
  "578": "europe", // Norway
  "512": "middle-east", // Oman
  "586": "asia", // Pakistan
  "275": "middle-east", // Palestine
  "591": "america", // Panama
  "598": "oceania", // Papua New Guinea
  "600": "america", // Paraguay
  "604": "america", // Peru
  "608": "asia", // Philippines
  "616": "europe", // Poland
  "620": "europe", // Portugal
  "630": "america", // Puerto Rico
  "634": "middle-east", // Qatar
  "642": "europe", // Romania
  "643": "eurasia", // Russia
  "646": "africa", // Rwanda
  "728": "africa", // S. Sudan
  "682": "middle-east", // Saudi Arabia
  "686": "africa", // Senegal
  "688": "europe", // Serbia
  "694": "africa", // Sierra Leone
  "703": "europe", // Slovakia
  "705": "europe", // Slovenia
  "090": "oceania", // Solomon Is.
  "706": "africa", // Somalia
  "710": "africa", // South Africa
  "410": "asia", // South Korea
  "724": "europe", // Spain
  "144": "asia", // Sri Lanka
  "729": "africa", // Sudan
  "740": "america", // Suriname
  "752": "europe", // Sweden
  "756": "europe", // Switzerland
  "760": "middle-east", // Syria
  "158": "asia", // Taiwan
  "762": "eurasia", // Tajikistan
  "834": "africa", // Tanzania
  "764": "asia", // Thailand
  "626": "asia", // Timor-Leste
  "768": "africa", // Togo
  "780": "america", // Trinidad and Tobago
  "788": "africa", // Tunisia
  "792": "europe", // Turkey
  "795": "eurasia", // Turkmenistan
  "800": "africa", // Uganda
  "804": "eurasia", // Ukraine
  "784": "middle-east", // United Arab Emirates
  "826": "europe", // United Kingdom
  "840": "america", // United States of America
  "858": "america", // Uruguay
  "860": "eurasia", // Uzbekistan
  "548": "oceania", // Vanuatu
  "862": "america", // Venezuela
  "704": "asia", // Vietnam
  "732": "africa", // W. Sahara
  "887": "middle-east", // Yemen
  "894": "africa", // Zambia
  "716": "africa", // Zimbabwe
};

// Common ways a caller's own freeform region label (see ChartWorkspaceWatchlistRow.region) might
// spell out one of the seven regions above — normalized (lowercased, accents stripped) before
// matching. Deliberately short: broad enough to catch "US"/"USA"/"Europe"/"EU" (the labels this
// library's own demo data already uses) without trying to guess every possible caller
// convention — anything not recognized here just renders as unmatched, same as a `region` value
// the donut charts already bucket under "Autre".
const REGION_ALIASES: Record<string, Continent> = {
  us: "america",
  usa: "america",
  "united states": "america",
  "north america": "america",
  "south america": "america",
  "amerique du nord": "america",
  "amerique du sud": "america",
  "amerique latine": "america",
  "latin america": "america",
  latam: "america",
  amerique: "america",
  canada: "america",
  mexique: "america",
  mexico: "america",
  eu: "europe",
  europe: "europe",
  "european union": "europe",
  "union europeenne": "europe",
  uk: "europe",
  "royaume-uni": "europe",
  eurasia: "eurasia",
  eurasie: "eurasia",
  russia: "eurasia",
  russie: "eurasia",
  cis: "eurasia",
  cei: "eurasia",
  asia: "asia",
  asie: "asia",
  apac: "asia",
  "asia-pacific": "asia",
  "asie-pacifique": "asia",
  "middle east": "middle-east",
  "moyen-orient": "middle-east",
  "moyen orient": "middle-east",
  mena: "middle-east",
  africa: "africa",
  afrique: "africa",
  oceania: "oceania",
  oceanie: "oceania",
  australia: "oceania",
  australie: "oceania",
};

function normalizeLabel(label: string): string {
  return label
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

/** Resolves a caller's own freeform region label to one of the seven regions above, or `null`
 *  when it doesn't recognize it (e.g. "Global" — nothing coherent to highlight on a map for
 *  "everywhere at once" — or a label too specific/unusual to have an alias here). Case- and
 *  accent-insensitive. */
export function matchContinent(label: string): Continent | null {
  const normalized = normalizeLabel(label);
  return REGION_ALIASES[normalized] ?? null;
}
