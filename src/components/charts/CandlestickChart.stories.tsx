import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  CandlestickChart,
  type TimeframeEntry,
  type Indicator,
  type ChartEvent,
  type FundamentalDataPoint,
  type SymbolSearchResult,
  type Candle,
} from "./CandlestickChart";
import { Checkbox } from "../forms/Checkbox";
import { generateCandles } from "../../test-data/financeSampleData";

const meta: Meta<typeof CandlestickChart> = {
  title: "Charts/CandlestickChart",
  component: CandlestickChart,
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj<typeof CandlestickChart>;

// Generated once at module load (not inside `render`, which re-runs on every interaction) —
// a real app would memoize its own data the same way rather than regenerate it per render.
const MEDIUM_DATASET = generateCandles(2_500, 180, 44);
const ALL_FEATURES_DATASET = generateCandles(600, 180, 66);
const ALL_FEATURES_EVENTS: ChartEvent[] = [
  { date: ALL_FEATURES_DATASET[80].date, kind: "earnings", label: "Résultats T1 : BPA 1.42$ (attendu 1.35$)" },
  { date: ALL_FEATURES_DATASET[180].date, kind: "earnings", label: "Résultats T2 : BPA 1.51$ (attendu 1.48$)" },
  // Same date as the T2 earnings above, on purpose — two events sharing a candle index render as
  // a single "stack" marker instead of overlapping (see WithSymbolAndEvents for details).
  { date: ALL_FEATURES_DATASET[180].date, kind: "news", label: "Annonce d'un partenariat stratégique" },
  { date: ALL_FEATURES_DATASET[280].date, kind: "dividend", label: "Dividende détaché : 0.62$/action" },
  { date: ALL_FEATURES_DATASET[420].date, kind: "earnings", label: "Résultats T3 : BPA 1.58$ (attendu 1.50$)" },
  { date: ALL_FEATURES_DATASET[520].date, kind: "update", label: "Lancement de la nouvelle gamme de produits" },
];

// Taller than the `height` prop's own default (380) — a more realistic size for these demos,
// which otherwise felt cramped compared to how the chart gets used in a real dashboard.
const STORY_HEIGHT = 640;

const TIMEFRAMES: TimeframeEntry[] = [
  { group: "Minutes", options: [{ label: "1 minute", value: "1m" }, { label: "5 minutes", value: "5m" }, { label: "15 minutes", value: "15m" }] },
  { group: "Heures", options: [{ label: "1 heure", value: "1h" }, { label: "4 heures", value: "4h" }] },
  { group: "Jours", options: [{ label: "1 jour", value: "1d" }, { label: "1 semaine", value: "1w" }, { label: "1 mois", value: "1M" }] },
];

// A tiny mock "database" standing in for whatever real symbol search API an app would call —
// the component itself never ships one (it has no opinion on where symbols come from), it only
// renders whatever `symbolSearchResults` the app currently hands it. Shared by every story that
// enables `symbolSearch`.
const MOCK_SYMBOL_DB: SymbolSearchResult[] = [
  { id: "nvda", ticker: "NVDA", name: "NVIDIA Corporation", category: "stocks", source: "NASDAQ", logoColor: "#76b900" },
  { id: "aapl", ticker: "AAPL", name: "Apple Inc.", category: "stocks", source: "NASDAQ", logoColor: "#555" },
  { id: "msft", ticker: "MSFT", name: "Microsoft Corporation", category: "stocks", source: "NASDAQ", logoColor: "#00a4ef" },
  { id: "spx", ticker: "SPX", name: "S&P 500 Index", category: "indices", source: "SP" },
  { id: "eu50", ticker: "EU50", name: "Eurostoxx 50, Daily", category: "indices", source: "SPREADEX" },
  { id: "btcusd", ticker: "BTCUSD", name: "Bitcoin / Dollar américain", category: "crypto", source: "COINBASE" },
  { id: "ethusd", ticker: "ETHUSD", name: "Ethereum / Dollar américain", category: "crypto", source: "COINBASE" },
  { id: "eurusd", ticker: "EURUSD", name: "Euro / Dollar américain", category: "forex", source: "OANDA" },
  { id: "xauusd", ticker: "XAUUSD", name: "Gold", category: "forex", source: "OANDA" },
  { id: "wti", ticker: "WTI", name: "West Texas Intermediate Crude Oil cash", category: "futures", source: "BLACKBULL" },
  { id: "fib1", ticker: "FIB1!", name: "FTSE MIB Index Futures", category: "futures", source: "EURONEXT" },
  { id: "de10y", ticker: "DE10Y", name: "Germany 10 Year Government Bonds Yield", category: "bonds", source: "TVC" },
  { id: "fr10y", ticker: "FR10Y", name: "France 10 Year Government Bonds Yield", category: "bonds", source: "TVC" },
  { id: "gdp", ticker: "USGDP", name: "United States GDP Growth Rate", category: "economy", source: "ECONOMICS" },
  { id: "orbx", ticker: "ORBX", name: "Global X Space Tech ETF", category: "options", source: "NASDAQ" },
];

// Stands in for a real search API call — filters `MOCK_SYMBOL_DB` by query/category, exactly the
// kind of work `onSymbolSearchChange` hands off to the app.
function filterMockSymbols(query: string, category: string, favorites: string[]): SymbolSearchResult[] {
  const q = query.trim().toLowerCase();
  return MOCK_SYMBOL_DB.filter((r) => {
    if (category === "favorites") return favorites.includes(r.id);
    if (category !== "all" && r.category !== category) return false;
    if (!q) return true;
    return r.ticker.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
  });
}

export const AllFeatures: Story = {
  name: "Toutes les options",
  render: () => {
    const [timeframe, setTimeframe] = useState("1d");
    const [favorites, setFavorites] = useState<string[]>(["msft"]);
    const [results, setResults] = useState<SymbolSearchResult[]>(MOCK_SYMBOL_DB);
    const [currentSymbol, setCurrentSymbol] = useState("MSFT");
    return (
      <div style={{ padding: 24 }}>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
          Tout combiné : outils de dessin (`drawingTools`), indicateurs techniques (`showIndicators` — bouton dans
          l'en-tête, liste des indicateurs actifs en haut à gauche du graphe), plein écran (`fullscreenToggle`),
          sélecteur d'intervalle (`timeframes`), recherche de symbole (`symbolSearch` — <strong>double-clic</strong>{" "}
          sur "MSFT" ouvre la modale), zoom/pan (`zoomable`) et évènements (`events` — bulles en bas du tracé des
          prix, deux d'entre elles partageant une même date pour montrer la bulle "stack" ; les <strong>cliquer</strong>{" "}
          ouvre une tooltip détaillée, le bouton œil dans l'en-tête masque/affiche toutes les bulles d'un coup).
        </p>
        <CandlestickChart
          data={ALL_FEATURES_DATASET}
          symbol={currentSymbol}
          events={ALL_FEATURES_EVENTS}
          drawingTools
          showIndicators
          fullscreenToggle
          zoomable
          timeframes={TIMEFRAMES}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          symbolSearch
          symbolSearchResults={results}
          onSymbolSearchChange={(query, category) => setResults(filterMockSymbols(query, category, favorites))}
          onSymbolSelect={(r) => setCurrentSymbol(r.ticker)}
          defaultFavoriteSymbolIds={favorites}
          onFavoriteSymbolIdsChange={setFavorites}
          height={STORY_HEIGHT}
        />
      </div>
    );
  },
};

export const Default: Story = {
  render: () => (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
        Molette pour zoomer, glisser dans le graphe pour naviguer (glisser pan aussi bien l'axe des prix que l'axe des
        dates à la fois — utile une fois rescalé verticalement pour retrouver des bougies sorties de l'écran). Glisser
        sur l'axe des prix (droite) rescale verticalement, glisser sur l'axe des dates (bas) rescale horizontalement —
        jusqu'à n'afficher qu'une seule bougie, sans jamais faire chevaucher les bougies entre elles. Survoler le
        graphe affiche le prix et la date exacts directement sur les axes, au lieu d'une infobulle flottante. Glisser
        au-delà de la première/dernière bougie révèle un espace vide ("passé"/"futur") au lieu de rester bloqué sur
        les bords — jusqu'à 50% de la largeur actuellement visible de chaque côté, quel que soit le niveau de zoom.
        <strong>Double-clic sur le graphe</strong> réinitialise le zoom (comme le bouton dédié) — sauf sur une ligne
        dessinée, où ça ouvre plutôt sa modale d'édition. Survoler le panneau volume fait apparaître, en haut à
        droite, un bouton pour le réduire à un simple bandeau (nom + bouton pour l'agrandir de nouveau) et un pour le
        supprimer entièrement.
      </p>
      <CandlestickChart data={generateCandles(220, 180, 11)} symbol="AAPL" height={STORY_HEIGHT} />
    </div>
  ),
};

export const WithoutVolume: Story = {
  render: () => (
    <div style={{ padding: 24 }}>
      <CandlestickChart data={generateCandles(120, 90, 22)} showVolume={false} height={320} />
    </div>
  ),
};

export const CustomSize: Story = {
  name: "Dimensions personnalisées",
  render: () => (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
        `width`/`height` (px) : par défaut le graphe remplit 100% de son conteneur en largeur et fait 380px de haut —
        passe l'un ou l'autre pour fixer une taille explicite à la place (ignorés en plein écran, qui remplit
        toujours le viewport).
      </p>
      <CandlestickChart data={generateCandles(180, 140, 88)} width={640} height={480} />
    </div>
  ),
};

export const WithDrawingTools: Story = {
  name: "Outils de dessin",
  render: () => (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
        Catégories d'outils empilées dans la colonne à gauche du graphe (une vraie zone réservée, pas des
        boutons superposés — elle reste visible en plein écran), chacune avec son propre bouton + chevron + menu
        (voir la story "Formes, mesure et aimant" pour les deux dernières) :{" "}
        <strong>Lignes</strong> (tendance, <strong>étendue</strong> — mêmes 2 points qu'une ligne de tendance mais le
        tracé continue jusqu'aux bords du graphe —, <strong>canal</strong> — 2 lignes parallèles, 2 clics pour la
        première comme une ligne de tendance puis un 3ème pour l'écart de la seconde —,{" "}
        <strong>canal disjoint</strong> — même flux à 3 clics que le canal, mais la 2ème ligne est le{" "}
        <strong>miroir</strong> de la 1ère par rapport au point 2 (pente opposée) plutôt qu'une copie parallèle,
        chaque point restant ensuite déplaçable indépendamment —, horizontale,{" "}
        <strong>horizontale à partir d'une date</strong> — "ray", démarre à la date cliquée au lieu de couvrir tout
        l'historique — et verticale), <strong>Fibonacci</strong> (<strong>retracement</strong> — mêmes 2 points
        qu'une ligne de tendance, 0%/100%, découpés en niveaux 23.6/38.2/50/61.8/78.6% — et{" "}
        <strong>extension</strong> — 3 points A/B/C, niveaux 38.2/61.8/138.2/161.8/261.8% projetés depuis C selon
        l'ampleur du mouvement A→B) et <strong>Vagues d'Elliott</strong> (<strong>impulsive</strong> — 6 points
        labellisés 0-1-2-3-4-5 — et <strong>correctrice</strong> — 4 points labellisés 0-A-B-C — en ligne brisée
        connectée). <strong>Choisir un outil dans un menu l'active directement</strong>, prêt à dessiner dès ce
        clic — cliquer ensuite le bouton d'une catégorie (re)bascule ce même outil actif/inactif. 1er/2ème clic =
        les deux premiers points de n'importe quel outil à plusieurs points (la ligne suit le curseur entre les
        deux) ; canal/extension/vagues d'Elliott continuent au-delà avec un ou plusieurs clics de plus, chacun
        prévisualisé en direct ; les outils à un seul point n'en demandent qu'un. Échap ou re-clic sur l'outil
        annule. Survoler une ligne dessinée fait apparaître ses poignées (une par point placé, plus celle de canal
        pour son écart) — glisser une poignée pour redéfinir ce point, ou glisser directement sur la ligne pour
        déplacer tous ses points ensemble. <strong>Double-clic sur une ligne</strong> pour l'éditer dans une modale à trois
        onglets — <strong>Coordonnées</strong>, <strong>Texte</strong> (taille, sa propre couleur, gras/italique,
        alignement avec la ligne, alignement vertical/horizontal, couleur de fond — changer cette dernière réécrit
        automatiquement la couleur du texte en noir ou blanc, celui des deux qui contraste le mieux, librement
        modifiable ensuite à la main) et <strong>Style</strong> (épaisseur, couleur,
        style de trait continu/tirets/pointillés/tiret-point, extension aucune/droite/gauche/des deux côtés) —{" "}
        <strong>double-clic ailleurs sur le graphe</strong> réinitialise le zoom à la place. Les lignes sont ancrées
        en coordonnées date/prix : elles suivent le zoom et le déplacement du graphe.{" "}
        <strong>Horizontale</strong>/<strong>horizontale à partir d'une date</strong> affichent en permanence leur
        propre prix sur l'axe Y (même badge que celui du survol) ; en plus, une{" "}
        <strong>horizontale à partir d'une date</strong> affiche sa date de départ sur l'axe X, mais seulement tant
        que sa ligne est survolée (contrairement au badge de prix, toujours visible). Survoler un dessin puis
        appuyer sur <strong>Suppr</strong>/<strong>Retour arrière</strong> le supprime directement, sans passer par
        sa modale.
      </p>
      <CandlestickChart data={generateCandles(220, 180, 33)} drawingTools height={STORY_HEIGHT} />
    </div>
  ),
};

export const WithShapesAndMeasure: Story = {
  name: "Formes, mesure et aimant",
  render: () => (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
        Catégorie <strong>Formes</strong> : <strong>rectangle</strong> (2 clics, coins opposés — tracé plus léger
        remplissage de sa propre couleur), <strong>zones (positif/neutre/négatif)</strong> (mêmes 2 clics qu'un
        rectangle, mais sépare le panneau des prix en trois bandes horizontales au lieu d'une seule zone remplie —
        au-dessus de la frontière haute : positive, en-dessous de la basse : négative, entre les deux : neutre,
        chacune dans sa propre couleur configurable, les bandes positive/négative s'étendant jusqu'aux bords du
        panneau ; seules les deux frontières horizontales se tracent par défaut, les bords gauche/droit du
        rectangle sont masqués tant qu'on ne les active pas dans l'onglet Style), <strong>flèche coudée</strong>{" "}
        (ligne brisée à nombre de points libre —
        chaque clic ajoute un sommet et l'outil <em>reste actif</em>, contrairement à tous les autres qui se
        désélectionnent après leur dernier clic ; <strong>Échap</strong> finalise le tracé tel qu'il est — au
        moins 2 points — avec une seule pointe de flèche à l'arrivée du dernier segment ; chaque sommet reste
        ensuite une poignée indépendante, comme une vague d'Elliott), <strong>pinceau</strong> (glisser au lieu de
        cliquer — le seul outil de la colonne qui se dessine ainsi, un point échantillonné tous les ~3px de
        mouvement ; se déplace uniquement en bloc, pas de poignée par point, contrairement à la flèche coudée),{" "}
        <strong>flèche haut</strong>/
        <strong>flèche bas</strong> (1 clic — petit triangle ancré juste à côté du point, pas dessus) et{" "}
        <strong>ligne fléchée</strong> (une ligne de tendance ordinaire avec une pointe de flèche à son 2ème point).
        Catégorie <strong>Mesure</strong> : 1er clic = départ, 2ème clic = arrivée — affiche une zone
        semi-transparente (verte/rouge selon le sens) plus un encadré à 4 valeurs (%, nombre de barres, nombre de
        jours, delta de prix en points), puis se désélectionne automatiquement (contrairement aux autres outils) —
        la mesure reste affichée, chacun de ses deux points redevient déplaçable par sa propre poignée pour la
        repositionner (l'encadré recalcule en direct), recliquer le bouton en démarre une nouvelle, Échap l'efface
        (ce n'est pas un dessin persistant comme les autres). Un fin trait sépare la catégorie{" "}
        <strong>Formes</strong> de <strong>Mesure</strong> dans la colonne, dont l'outil a désormais une icône de
        règle. Le bouton <strong>aimant</strong>{" "}
        (à droite des catégories) est un interrupteur, pas un outil : une fois activé, tout nouveau point placé
        par n'importe quel outil s'accroche à l'open/high/low/close le plus proche de la bougie visée, au lieu du
        prix exact sous le curseur — reste actif tant qu'on ne le désactive pas. Juste en dessous, un bouton{" "}
        <strong>œil</strong> masque/affiche tous les dessins d'un coup, sans les supprimer — les rebasculer
        visibles les retrouve exactement tels quels. Encore en dessous, un bouton <strong>cadenas</strong>{" "}
        verrouille tous les dessins existants : toujours sélectionnable/supprimable, et{" "}
        <strong>double-clic</strong> ouvre toujours sa modale de paramètres — seul le glisser (poignée ou corps
        entier) est bloqué. Le chevron d'une catégorie n'apparaît que si elle a plus d'un
        outil : <strong>Mesure</strong> (un seul aujourd'hui) n'en a donc pas. Une ligne de tendance classique
        (pas "étendue") peut aussi recevoir une <strong>flèche à gauche</strong>/<strong>à droite</strong> depuis
        l'onglet Style de sa modale, une fois son "Extension" réglée sur "Ne pas étendre".
      </p>
      <CandlestickChart data={generateCandles(220, 180, 44)} drawingTools height={STORY_HEIGHT} />
    </div>
  ),
};

export const WithTimeframeHeader: Story = {
  name: "Sélecteur d'intervalle",
  render: () => {
    const [timeframe, setTimeframe] = useState("1d");
    return (
      <div style={{ padding: 24 }}>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
          Barre d'en-tête (pas flottante — un vrai bandeau qui prend sa propre place) avec un sélecteur d'intervalle
          groupé, à côté des boutons zoom/plein écran. Le composant se contente d'afficher la sélection et de
          remonter `onTimeframeChange` — c'est à l'app de rééchantillonner `data` dans le nouvel intervalle.
        </p>
        <CandlestickChart
          data={generateCandles(220, 180, 55)}
          timeframes={TIMEFRAMES}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          height={STORY_HEIGHT}
        />
      </div>
    );
  },
};

export const WithDisplayModes: Story = {
  name: "Modes d'affichage",
  render: () => {
    const [mode, setMode] = useState<
      "candle" | "line" | "heikinAshi" | "renko" | "lineBreak" | "tpo"
    >("heikinAshi");
    return (
      <div style={{ padding: 24 }}>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
          Bouton dans l'en-tête, juste à côté du sélecteur d'intervalle (icône du mode courant, ouvre un menu des six
          modes) : <strong>Bougies</strong> (défaut), <strong>Ligne de clôture</strong>, <strong>Heikin Ashi</strong>{" "}
          (bougies lissées — même OHLC transformé selon la formule standard, réindexé 1:1 sur les mêmes dates, donc
          zoom/pan/indicateurs/dessins restent inchangés), <strong>Renko</strong> (briques de taille fixe — ATR sur{" "}
          <code>renkoAtrPeriod</code> candles, défaut 14 — une nouvelle brique par mouvement de clôture franchissant
          ce seuil), <strong>Line Break</strong> (3-line break : une nouvelle ligne sur un nouveau plus haut/bas, un
          renversement seulement si la clôture dépasse l'extrême des 3 dernières lignes) et{" "}
          <strong>Time Price Opportunities</strong> (bougies classiques + un histogramme de distribution des prix
          ancré à droite du graphe, recalculé sur la plage visible, plus trois lignes VAH/POC/VAL — le point de
          contrôle, et la zone de valeur à 70% autour de lui). Renko/Line Break restent positionnées sur l'échelle
          d'index existante (chaque brique couvre exactement les bougies qu'il a fallu pour la former) plutôt qu'une
          échelle dédiée, donc elles zooment/pannent en phase avec tout le reste au prix d'une largeur de brique
          irrégulière.
        </p>
        <CandlestickChart
          data={generateCandles(400, 180, 91)}
          symbol="TSLA"
          timeframes={TIMEFRAMES}
          timeframe="1d"
          defaultChartDisplayMode={mode}
          onChartDisplayModeChange={setMode}
          height={STORY_HEIGHT}
        />
      </div>
    );
  },
};

export const WithIndicators: Story = {
  name: "Indicateurs techniques",
  render: () => (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
        Bouton dans l'en-tête (icône activité) ouvre une modale listant les indicateurs disponibles, groupés par
        catégorie avec une barre de recherche pour filtrer : "Moyennes mobiles" (SMA, EMA, WMA, VWAP — les 3
        premiers calculés en interne), "Volatilité" (<strong>bandes de Bollinger</strong>, <strong>CHOP</strong>) et{" "}
        <strong>Momentum</strong> (<strong>RSI</strong>, <strong>MACD</strong>) — Bollinger/RSI/CHOP/MACD calculés
        via la librairie npm{" "}
        <a href="https://www.npmjs.com/package/technicalindicators" target="_blank" rel="noreferrer">
          technicalindicators
        </a>{" "}
        (CHOP n'y existe pas, calculé à la main). "Volume" apparaît aussi dans cette même modale (si `showVolume`)
        pour re-afficher le panneau volume s'il a été réduit ou supprimé. Cliquer une entrée l'ajoute au graphe, la
        modale reste ouverte pour en ajouter plusieurs. SMA/EMA/WMA/VWAP/Bollinger se superposent au tracé des prix
        (légende en haut à gauche, sans fond tant qu'elle n'est pas survolée, plus de trait entre les entrées ;
        survoler une entrée fait apparaître œil/corbeille/roue crantée (une vraie roue à dents, plus lisible en
        petit qu'avant), <strong>double-clic</strong> ouvre directement les
        paramètres, et <strong>Ctrl/Cmd+C</strong> en la survolant la copie — <strong>Ctrl/Cmd+V</strong> colle
        alors un doublon à la fin de la liste, même type/période/couleur, nouvel id) ; Bollinger se dessine en
        bande (ligne médiane pleine, bornes fines, remplissage translucide) au lieu d'une simple ligne. Chaque
        indicateur superposé affiche aussi sa dernière valeur en badge sur l'axe Y, fond coloré dans sa propre
        teinte.{" "}
        <strong>RSI/CHOP/MACD ont chacun leur propre panneau</strong> en dessous du
        graphe, comme le volume — même en-tête (nom, réduire/agrandir, supprimer, roue crantée pour les
        paramètres, ces deux dernières juste à droite du nom), et <strong>chaque panneau (volume compris) se
        redimensionne</strong> en glissant le fin liseré au-dessus de son en-tête.
      </p>
      <CandlestickChart data={generateCandles(220, 180, 77)} showIndicators height={STORY_HEIGHT} />
    </div>
  ),
};

const SUB_PANE_INDICATORS: Indicator[] = [
  { id: "story-rsi", kind: "rsi", period: 14 },
  { id: "story-macd", kind: "macd", period: 0, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
  { id: "story-chop", kind: "chop", period: 14, paneCollapsed: true },
];

export const WithSubPaneIndicators: Story = {
  name: "Indicateurs en sous-panneau (RSI/MACD/CHOP)",
  render: () => (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
        RSI et MACD pré-ajoutés (`defaultIndicators`), CHOP aussi mais réduit à son bandeau (`paneCollapsed: true`)
        pour montrer les deux états d'un coup — cliquer son bouton ▲ ou <strong>double-clic sur son nom</strong>{" "}
        le rouvre (double-clic sur le nom d'un panneau déjà ouvert ouvre plutôt ses paramètres — <strong>Volume
        aussi</strong>, ses seuls paramètres étant les couleurs de ses barres haussières/baissières). Juste à côté
        du nom, un résumé de la valeur survolée (l'équivalent de l'OHLC du prix pour ce panneau — volume, valeur
        RSI/CHOP, ou MACD/Signal/Histogramme). RSI/CHOP sont bornés 0-100 par définition (lignes de référence
        30/70 et 38.2/61.8 en pointillés) ; MACD recadre son échelle en continu sur ce qui est visible
        (histogramme + ligne MACD + ligne de signal). Le chevron réduire/agrandir est <strong>juste après la
        poignée de réordonnancement, avant le nom</strong> (plus à l'extrême droite) ; la roue crantée
        (paramètres) et la corbeille (suppression) restent juste après le nom. Glisser le fin liseré juste
        au-dessus d'un en-tête de panneau (volume compris) redimensionne ce panneau ; glisser (ou double-clic
        pour réinitialiser) son propre axe Y le rescale verticalement, indépendamment des autres. La{" "}
        <strong>poignée à 6 points</strong> tout à gauche de chaque panneau (Volume compris) glisse pour les
        réordonner entre eux (l'échange se déclenche dès que le curseur franchit la moitié de la hauteur d'un
        panneau voisin, pas besoin d'atteindre son bord) — Volume n'est plus fixé juste sous le prix, il peut se
        glisser n'importe où parmi RSI/MACD/CHOP comme n'importe lequel d'entre eux. Le dernier bouton de la
        colonne d'outils, tout en bas, ouvre <strong>"Dessins et indicateurs"</strong> : trois groupes — dessins
        actuellement sur le graphe, indicateurs superposés au prix, indicateurs en sous-panneau (Volume compris)
        — chacun avec un badge identifiant son type et sa propre roue crantée/corbeille. Les outils{" "}
        <strong>Ligne horizontale</strong> et <strong>Ligne horizontale à partir d'une date</strong> se
        dessinent aussi directement sur RSI/MACD/CHOP (pas seulement sur les prix ou le volume) : cliquer dans
        un panneau y ancre la ligne dans son échelle propre.
      </p>
      <CandlestickChart
        data={MEDIUM_DATASET}
        drawingTools
        showIndicators
        defaultIndicators={SUB_PANE_INDICATORS}
        timeframes={TIMEFRAMES}
        timeframe="1d"
        height={STORY_HEIGHT}
      />
    </div>
  ),
};

const SYMBOL_DATASET = generateCandles(260, 180, 99);
const SYMBOL_EVENTS: ChartEvent[] = [
  { date: SYMBOL_DATASET[40].date, kind: "earnings", label: "Résultats T1 : BPA 1.24€ (attendu 1.10€)" },
  { date: SYMBOL_DATASET[95].date, kind: "earnings", label: "Résultats T2 : BPA 1.31€ (attendu 1.28€)" },
  // Same date as the T2 earnings above, on purpose — two events sharing a candle index render as
  // a single "stack" marker (see WithSymbolAndEvents' own description) instead of overlapping.
  { date: SYMBOL_DATASET[95].date, kind: "news", label: "Rumeur de rachat d'un concurrent régional" },
  { date: SYMBOL_DATASET[60].date, kind: "dividend", label: "Dividende détaché : 0.42€/action" },
  { date: SYMBOL_DATASET[150].date, kind: "dividend", label: "Dividende détaché : 0.45€/action" },
  { date: SYMBOL_DATASET[200].date, kind: "update", label: "Mise à jour produit : lancement de la gamme X200" },
];

export const WithSymbolAndEvents: Story = {
  name: "Symbole, OHLC et évènements",
  render: () => (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
        En haut à gauche du tracé des prix (`symbol`) : le nom de l'instrument suivi du mode d'affichage courant —{" "}
        <strong>double-clic dessus</strong> ouvre la modale "Paramètres du graphique" (couleurs des bougies
        haussières/baissières, rescale automatique de l'axe des prix — `YAutoScaling`/`onYAutoScalingChange` —, et
        la visibilité de chaque type d'évènement présent dans `events`) — puis, juste à côté, l'<strong>OHLC</strong>{" "}
        et la variation en % de la bougie survolée (la plus récente par défaut, tant que rien n'est survolé),
        calculée par rapport à la clôture de la bougie précédente. En bas du tracé des prix, une petite bulle par
        évènement (`events: ChartEvent[]` — `kind` libre définie par l'app, ex. "earnings"/"dividend"/"update", pas
        une énumération fixée par le composant) avec un connecteur pointillé vers l'axe ; survoler une bulle affiche
        sa date et son libellé en infobulle native, la <strong>cliquer</strong> ouvre une tooltip détaillée
        (`ChartEventTooltip`, exportée séparément pour qui veut la réutiliser ailleurs) centrée sur la bulle,
        glissée à gauche/droite selon la place disponible, plafonnée à 350px de haut avec son propre ascenseur
        au-delà. Plusieurs évènements à la même date (les deux du 95ème jour ci-dessous) partagent une seule bulle
        "stack" (le nombre au lieu d'une lettre) listant tout dans la même tooltip. Une icône en haut à droite de la
        tooltip l'agrandit en modale occupant tout le graphe (en-tête, outils compris) ; cliquer en dehors de la
        tooltip/modale, ou sa croix pour la modale, la referme — refermer la modale ne fait pas réapparaître la
        tooltip en dessous.
      </p>
      <CandlestickChart data={SYMBOL_DATASET} symbol="ACME" events={SYMBOL_EVENTS} showIndicators height={STORY_HEIGHT} />
    </div>
  ),
};

// Four quarterly reports spread across SYMBOL_DATASET's own date range — sparse on purpose (real
// fundamentals are reported quarterly/annually, never daily like `data` itself).
const FUNDAMENTALS_DATASET: FundamentalDataPoint[] = [
  {
    date: SYMBOL_DATASET[0].date,
    totalRevenue: 4_200_000_000,
    netIncome: 620_000_000,
    freeCashFlow: 540_000_000,
    netMargin: 14.8,
    grossMargin: 41.2,
    peRatio: 22.4,
    eps: 1.18,
    debtToEquity: 0.62,
  },
  {
    date: SYMBOL_DATASET[65].date,
    totalRevenue: 4_450_000_000,
    netIncome: 690_000_000,
    freeCashFlow: 610_000_000,
    netMargin: 15.5,
    grossMargin: 42.0,
    peRatio: 21.1,
    eps: 1.29,
    debtToEquity: 0.58,
  },
  {
    date: SYMBOL_DATASET[130].date,
    totalRevenue: 4_680_000_000,
    netIncome: 705_000_000,
    freeCashFlow: 590_000_000,
    netMargin: 15.1,
    grossMargin: 41.6,
    peRatio: 23.8,
    eps: 1.32,
    debtToEquity: 0.55,
  },
  {
    date: SYMBOL_DATASET[195].date,
    totalRevenue: 4_920_000_000,
    netIncome: 760_000_000,
    freeCashFlow: 655_000_000,
    netMargin: 15.4,
    grossMargin: 42.5,
    peRatio: 24.6,
    eps: 1.41,
    debtToEquity: 0.51,
  },
];

export const WithFundamentals: Story = {
  name: "Indicateurs fondamentaux",
  render: () => (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
        `fundamentals: FundamentalDataPoint[]` — Free Cash Flow, Net Income, Total Revenue, Net Margin, Gross
        Margin, P/E (`peRatio`), EPS et Debt/Equity : huit métriques de santé financière, chacune de type "pane"
        (sa propre catégorie "Fondamentaux" dans la modale "Ajouter un indicateur", son propre sous-panneau une
        fois ajoutée — mêmes réordonnancement/redimensionnement/rescale d'axe/repli que RSI/CHOP/MACD/Volume, sans
        code dédié en plus). Les valeurs sont des rapports ponctuels (trimestriels ici) et non une série
        quotidienne comme `data` — le graphe les <strong>tient constantes</strong> (fonction en escalier) entre
        deux rapports plutôt que de les interpoler, jusqu'au rapport suivant. Chaque métrique choisit son propre
        format d'affichage (axe et survol) selon sa nature — montant compact avec `$` pour FCF/Net Income/Revenue,
        pourcentage à une décimale pour les marges, ratio à deux décimales pour P/E et Debt/Equity, `$` à deux
        décimales pour l'EPS — pas de niveaux de référence fixes comme RSI/CHOP (rien d'universel ne fait sens
        d'une métrique/entreprise à l'autre), son échelle se recadre en continu sur ce qui est visible comme MACD.
        Free Cash Flow est pré-ajouté ci-dessous ; ouvre "Ajouter un indicateur" pour les sept autres.
      </p>
      <CandlestickChart
        data={SYMBOL_DATASET}
        symbol="ACME"
        showIndicators
        fundamentals={FUNDAMENTALS_DATASET}
        defaultIndicators={[{ id: "story-fcf", kind: "freeCashFlow", period: 0 }]}
        height={STORY_HEIGHT}
      />
    </div>
  ),
};

export const WithSymbolSearch: Story = {
  name: "Recherche de symbole",
  render: () => {
    const [favorites, setFavorites] = useState<string[]>(["nvda"]);
    const [results, setResults] = useState<SymbolSearchResult[]>(MOCK_SYMBOL_DB);
    const [currentSymbol, setCurrentSymbol] = useState("NVDA");

    return (
      <div style={{ padding: 24 }}>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
          `symbol` devient sa propre zone survolable une fois `symbolSearch` activé (fond au survol, séparée du
          libellé du mode d'affichage juste à côté, qui garde son propre fond au survol et son double-clic vers les
          paramètres) — <strong>double-clic</strong> dessus (pas simple clic : le fond plein écran de la modale se
          ferme lui-même au clic, donc un simple clic en plus aurait laissé le 2ème clic du double-clic retomber
          dessus et la refermer aussitôt) ouvre la modale <strong>"Symbol search"</strong> :
          champ de recherche, pastilles de catégorie à sélection unique (<strong>All</strong>/Stocks/Futures/
          Forex/Crypto/Indices/Bonds/Economy/Options/<strong>Favoris</strong>) et une liste de résultats — icône
          carrée (ou pastille de couleur avec les initiales du ticker si `logoUrl` est absent), ticker, nom
          complet, source, puis une <strong>étoile</strong> tout à droite (invisible sauf survol de la ligne, ou
          en permanence si déjà en favori) pour l'ajouter/retirer des favoris. Recherche et filtrage sont
          entièrement à la charge de l'app : `onSymbolSearchChange(query, category)` remonte la requête à chaque
          changement (y compris à l'ouverture), `symbolSearchResults` est tel quel ce qui s'affiche — cette story
          filtre une petite liste locale pour simuler un vrai appel API. `onSymbolSelect` remonte la ligne
          cliquée (ferme la modale) ; les favoris sont non contrôlés comme `drawings`/`indicators`
          (`defaultFavoriteSymbolIds`/`onFavoriteSymbolIdsChange`).
        </p>
        <CandlestickChart
          data={SYMBOL_DATASET}
          symbol={currentSymbol}
          symbolSearch
          symbolSearchResults={results}
          onSymbolSearchChange={(query, category) => setResults(filterMockSymbols(query, category, favorites))}
          onSymbolSelect={(r) => setCurrentSymbol(r.ticker)}
          defaultFavoriteSymbolIds={favorites}
          onFavoriteSymbolIdsChange={setFavorites}
          height={STORY_HEIGHT}
        />
      </div>
    );
  },
};

// A small in-memory "quote database" of daily closes per ticker, keyed the same as
// MOCK_SYMBOL_DB — stands in for a real quote API the same way MOCK_SYMBOL_DB stands in for a
// real symbol-search one. A different seed/base per ticker so trajectories actually diverge
// instead of moving in lockstep, aligned to SYMBOL_DATASET's own dates (a real overlay wouldn't
// need to be — see the story's own description — this just keeps the mock data simple).
const OVERLAY_SEED_BY_TICKER: Record<string, number> = {
  NVDA: 15,
  AAPL: 27,
  MSFT: 44,
  SPX: 3,
  BTCUSD: 61,
  ETHUSD: 52,
};
function generateOverlaySeries(ticker: string): { date: Date; value: number }[] {
  const seed = OVERLAY_SEED_BY_TICKER[ticker] ?? 7;
  return generateCandles(SYMBOL_DATASET.length, 100 + seed * 3, seed).map((c, i) => ({ date: SYMBOL_DATASET[i].date, value: c.close }));
}

export const WithSymbolOverlay: Story = {
  name: "Overlay de comparaison de symboles",
  render: () => {
    const [favorites, setFavorites] = useState<string[]>([]);
    const [results, setResults] = useState<SymbolSearchResult[]>(MOCK_SYMBOL_DB);
    const [currentSymbol, setCurrentSymbol] = useState("MSFT");
    return (
      <div style={{ padding: 24 }}>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
          Depuis la modale de recherche (`symbolSearch`), chaque résultat a maintenant un bouton <strong>+</strong>{" "}
          à côté de son nom (survol, comme l'étoile favoris) — <strong>double-clic sur un résultat</strong> garde
          son comportement habituel (changer le symbole principal), <strong>cliquer +</strong> l'ajoute en overlay
          de comparaison sans fermer la modale (essaie "AAPL"). Dès qu'au moins un overlay est présent, l'axe des
          prix passe en <strong>%</strong>, recalculé depuis le <strong>premier point visible</strong> de chaque
          série (glisse/zoome pour voir la référence bouger) — chaque symbole compare sa propre performance depuis
          ce point, indépendamment de son prix réel (`overlayProjections` : la série de l'overlay est rebasée sur
          sa propre référence puis reprojetée sur le prix de la série principale, plutôt que de changer l'échelle
          elle-même — bougies, indicateurs et dessins ancrés au prix restent donc inchangés, seul le libellé de
          l'axe se relit différemment). Le symbole ajouté apparaît en haut à gauche du graphe, dans la même légende
          que les indicateurs superposés au prix (survol → œil masque/affiche, corbeille supprime, roue crantée
          ouvre ses réglages) : chaque overlay est un vrai <code>TrendLineDrawing</code>{" "}
          (<code>lineType: "symbolOverlay"</code>), pas un mécanisme séparé — même infrastructure d'édition
          (couleur, épaisseur, style de trait) que n'importe quel autre dessin, sélectionnable/supprimable (Suppr)
          en survolant sa ligne sur le graphe comme n'importe quel autre. Reclique <strong>+</strong> (devenu une
          coche) pour retirer un overlay ; l'axe revient en prix une fois le dernier retiré. `onAddSymbolOverlay`
          (async, un léger délai simulé ici pour montrer le petit indicateur de chargement sur le bouton) renvoie
          la série de comparaison — la bibliothèque n'a pas de source de données à elle, comme
          `symbolSearchResults`/`fundamentals`.
        </p>
        <CandlestickChart
          data={SYMBOL_DATASET}
          symbol={currentSymbol}
          symbolSearch
          symbolSearchResults={results}
          onSymbolSearchChange={(query, category) => setResults(filterMockSymbols(query, category, favorites))}
          onSymbolSelect={(r) => setCurrentSymbol(r.ticker)}
          defaultFavoriteSymbolIds={favorites}
          onFavoriteSymbolIdsChange={setFavorites}
          onAddSymbolOverlay={async (result) => {
            await new Promise((resolve) => setTimeout(resolve, 600));
            return generateOverlaySeries(result.ticker);
          }}
          height={STORY_HEIGHT}
        />
      </div>
    );
  },
};

export const LargeDataset: Story = {
  name: "Grand volume de données (2 500 bougies)",
  render: () => (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
        2 500 bougies (~10 ans de séance). Les bougies, le volume, le crosshair et les lignes de dessin sont rendus
        sur un seul <code>canvas</code> plutôt qu'un nœud SVG par bougie — zoom/pan/dessin restent fluides à cette
        échelle. Molette ou glisser pour naviguer dans l'historique. S'ouvre sur les 500 dernières bougies par défaut
        (`initialVisibleCandles`, appliqué une seule fois au montage) plutôt que tout l'historique dézoomé — clic sur
        "Réinitialiser le zoom" pour voir les 2 500.
      </p>
      <CandlestickChart data={MEDIUM_DATASET} symbol="GOOGL" drawingTools timeframes={TIMEFRAMES} timeframe="1d" height={STORY_HEIGHT} />
    </div>
  ),
};

export const WithYAutoScaling: Story = {
  name: "Rescale automatique de l'axe Y",
  render: () => {
    const [yAutoScaling, setYAutoScaling] = useState(true);
    return (
      <div style={{ padding: 24 }}>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
          `YAutoScaling` : l'axe des prix se recadre en continu sur le min/max des bougies actuellement visibles
          (recalculé à chaque pan/zoom horizontal), au lieu d'une échelle figée sur tout l'historique — utile en
          particulier avec `initialVisibleCandles` (2 500 bougies ici, ouvert sur les 500 dernières). Dès que tu
          zoomes/glisses **sur l'axe des prix lui-même** (molette ou glisser dessus, ou glisser verticalement dans le
          graphe), ce recadrage automatique s'arrête pour ne pas écraser ton réglage — "Réinitialiser le zoom" le
          réactive.
        </p>
        <div style={{ marginBottom: 12 }}>
          <Checkbox checked={yAutoScaling} onChange={setYAutoScaling} label="YAutoScaling" />
        </div>
        <CandlestickChart data={MEDIUM_DATASET} YAutoScaling={yAutoScaling} timeframes={TIMEFRAMES} timeframe="1d" height={STORY_HEIGHT} />
      </div>
    );
  },
};

// 15 real seconds per candle (not a genuine "1m"/"5m" interval) purely so the countdown-to-
// next-candle and a real new candle forming are both watchable within a normal Storybook
// session instead of requiring several real minutes of patience.
const LIVE_INTERVAL_MS = 15_000;

function generateLiveSeed(count: number, start: number): Candle[] {
  const candles: Candle[] = [];
  let close = start;
  const now = Date.now();
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now - i * LIVE_INTERVAL_MS);
    const open = close;
    const change = (Math.random() - 0.5) * (start * 0.006);
    close = Math.max(1, open + change);
    const high = Math.max(open, close) + Math.random() * (start * 0.002);
    const low = Math.min(open, close) - Math.random() * (start * 0.002);
    candles.push({ date, open, high, low, close, volume: Math.round(Math.random() * 50_000) });
  }
  return candles;
}

export const LiveMarket: Story = {
  name: "Marché ouvert (simulation)",
  render: () => {
    const [data, setData] = useState<Candle[]>(() => generateLiveSeed(120, 180));

    // Every real second: either nudges the still-forming last candle's close (extending its
    // high/low if this tick pushed past either), or — once LIVE_INTERVAL_MS has actually
    // elapsed since it opened — closes it and starts a brand new one. This is the *story*
    // simulating a live feed; the component itself has no polling/simulation of its own, it
    // only ever renders whatever `data` it's given.
    useEffect(() => {
      const id = setInterval(() => {
        setData((prev) => {
          const last = prev[prev.length - 1];
          const change = (Math.random() - 0.5) * (last.close * 0.004);
          if (Date.now() - last.date.getTime() >= LIVE_INTERVAL_MS) {
            const open = last.close;
            const close = Math.max(1, open + change);
            const next: Candle = {
              date: new Date(last.date.getTime() + LIVE_INTERVAL_MS),
              open,
              close,
              high: Math.max(open, close),
              low: Math.min(open, close),
              volume: Math.round(Math.random() * 50_000),
            };
            return [...prev, next];
          }
          const close = Math.max(1, last.close + change);
          const updated: Candle = {
            ...last,
            close,
            high: Math.max(last.high, close),
            low: Math.min(last.low, close),
            volume: (last.volume ?? 0) + Math.round(Math.random() * 500),
          };
          return [...prev.slice(0, -1), updated];
        });
      }, 1000);
      return () => clearInterval(id);
    }, []);

    return (
      <div style={{ padding: 24 }}>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
          `data` change toutes les secondes ici, uniquement pour la démo — la bibliothèque elle-même ne simule
          rien, elle se contente d'afficher ce qu'on lui passe. `livePrice` affiche une ligne pointillée sur le
          close de la dernière bougie, sa valeur sur l'axe Y (verte/rouge selon le sens depuis la clôture
          précédente) et, juste en dessous, un <strong>compte à rebours</strong> vers la prochaine bougie —
          l'intervalle est déduit de l'écart entre les deux dernières bougies (pas une prop séparée) : à 5 minutes
          il compterait de 05:00 à 00:00, ici (15 secondes par bougie, pour rester regardable) de 00:15 à 00:00,
          avant qu'une vraie nouvelle bougie apparaisse.
        </p>
        <CandlestickChart data={data} symbol="LIVE" livePrice showVolume height={STORY_HEIGHT} />
      </div>
    );
  },
};
