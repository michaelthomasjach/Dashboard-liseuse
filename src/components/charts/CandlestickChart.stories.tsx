import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { CandlestickChart, type TimeframeEntry, type Indicator, type ChartEvent, type SymbolSearchResult } from "./CandlestickChart";
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

// Taller than the `height` prop's own default (380) — a more realistic size for these demos,
// which otherwise felt cramped compared to how the chart gets used in a real dashboard.
const STORY_HEIGHT = 640;

const TIMEFRAMES: TimeframeEntry[] = [
  { group: "Minutes", options: [{ label: "1 minute", value: "1m" }, { label: "5 minutes", value: "5m" }, { label: "15 minutes", value: "15m" }] },
  { group: "Heures", options: [{ label: "1 heure", value: "1h" }, { label: "4 heures", value: "4h" }] },
  { group: "Jours", options: [{ label: "1 jour", value: "1d" }, { label: "1 semaine", value: "1w" }, { label: "1 mois", value: "1M" }] },
];

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
      <CandlestickChart data={generateCandles(220, 180, 11)} height={STORY_HEIGHT} />
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
        onglets — <strong>Coordonnées</strong>, <strong>Texte</strong> (taille, gras/italique, alignement avec la
        ligne, alignement vertical/horizontal, couleur de fond) et <strong>Style</strong> (épaisseur, couleur,
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
        remplissage de sa propre couleur), <strong>flèche coudée</strong> (ligne brisée à nombre de points libre —
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
        jours, delta de prix en points) ; un 3ème clic démarre directement une nouvelle mesure, Échap ou changer
        d'outil l'efface (ce n'est pas un dessin persistant comme les autres). Le bouton <strong>aimant</strong>{" "}
        (à droite des catégories) est un interrupteur, pas un outil : une fois activé, tout nouveau point placé
        par n'importe quel outil s'accroche à l'open/high/low/close le plus proche de la bougie visée, au lieu du
        prix exact sous le curseur — reste actif tant qu'on ne le désactive pas. Une ligne de tendance classique
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
        (légende en haut à gauche, séparée par un simple trait, sans fond tant qu'elle n'est pas survolée ; survoler
        une entrée fait apparaître œil/corbeille/roue crantée, <strong>double-clic</strong> ouvre directement les
        paramètres) ; Bollinger se dessine en bande (ligne médiane pleine, bornes fines, remplissage translucide) au
        lieu d'une simple ligne. <strong>RSI/CHOP/MACD ont chacun leur propre panneau</strong> en dessous du
        graphe, comme le volume — même en-tête (nom, réduire/agrandir, supprimer, roue crantée pour les
        paramètres), et <strong>chaque panneau (volume compris) se redimensionne</strong> en glissant le fin
        liseré au-dessus de son en-tête.
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
        pour montrer les deux états d'un coup — cliquer son bouton ▲ le rouvre. RSI/CHOP sont bornés 0-100 par
        définition (lignes de référence 30/70 et 38.2/61.8 en pointillés) ; MACD recadre son échelle en continu sur
        ce qui est visible (histogramme + ligne MACD + ligne de signal). Glisser le fin liseré juste au-dessus d'un
        en-tête de panneau (volume compris) redimensionne ce panneau.
      </p>
      <CandlestickChart data={MEDIUM_DATASET} showIndicators defaultIndicators={SUB_PANE_INDICATORS} timeframes={TIMEFRAMES} timeframe="1d" height={STORY_HEIGHT} />
    </div>
  ),
};

const SYMBOL_DATASET = generateCandles(260, 180, 99);
const SYMBOL_EVENTS: ChartEvent[] = [
  { date: SYMBOL_DATASET[40].date, kind: "earnings", label: "Résultats T1 : BPA 1.24€ (attendu 1.10€)" },
  { date: SYMBOL_DATASET[95].date, kind: "earnings", label: "Résultats T2 : BPA 1.31€ (attendu 1.28€)" },
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
        sa date et son libellé en infobulle.
      </p>
      <CandlestickChart data={SYMBOL_DATASET} symbol="ACME" events={SYMBOL_EVENTS} showIndicators height={STORY_HEIGHT} />
    </div>
  ),
};

// A tiny mock "database" standing in for whatever real symbol search API an app would call —
// the component itself never ships one (it has no opinion on where symbols come from), it only
// renders whatever `symbolSearchResults` the app currently hands it.
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

export const WithSymbolSearch: Story = {
  name: "Recherche de symbole",
  render: () => {
    const [favorites, setFavorites] = useState<string[]>(["nvda"]);
    const [results, setResults] = useState<SymbolSearchResult[]>(MOCK_SYMBOL_DB);
    const [currentSymbol, setCurrentSymbol] = useState("NVDA");

    // Stands in for a real search API call — filters the same mock list this story owns by
    // query/category, exactly the kind of work `onSymbolSearchChange` hands off to the app.
    function handleSearchChange(query: string, category: string) {
      const q = query.trim().toLowerCase();
      setResults(
        MOCK_SYMBOL_DB.filter((r) => {
          if (category === "favorites") return favorites.includes(r.id);
          if (category !== "all" && r.category !== category) return false;
          if (!q) return true;
          return r.ticker.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
        })
      );
    }

    return (
      <div style={{ padding: 24 }}>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
          `symbol` devient sa propre zone survolable/cliquable une fois `symbolSearch` activé (fond au survol,
          séparée du libellé du mode d'affichage juste à côté, qui garde son propre fond au survol et son
          double-clic vers les paramètres) — cliquer dessus ouvre la modale <strong>"Symbol search"</strong> :
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
          onSymbolSearchChange={handleSearchChange}
          onSymbolSelect={(r) => setCurrentSymbol(r.ticker)}
          defaultFavoriteSymbolIds={favorites}
          onFavoriteSymbolIdsChange={setFavorites}
          height={STORY_HEIGHT}
        />
      </div>
    );
  },
};

export const AllFeatures: Story = {
  name: "Toutes les options",
  render: () => {
    const [timeframe, setTimeframe] = useState("1d");
    const [showVolume, setShowVolume] = useState(true);
    const [yAutoScaling, setYAutoScaling] = useState(false);
    return (
      <div style={{ padding: 24 }}>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
          Tout combiné : outils de dessin (`drawingTools`), indicateurs techniques (`showIndicators` — bouton dans
          l'en-tête, liste des indicateurs actifs en haut à gauche du graphe), plein écran (`fullscreenToggle`),
          sélecteur d'intervalle (`timeframes`), zoom/pan (`zoomable`), volume masquable (`showVolume`) et rescale
          automatique de l'axe Y (`YAutoScaling`), tous les deux cochables ci-dessous.
        </p>
        <div style={{ marginBottom: 12, display: "flex", gap: 16 }}>
          <Checkbox checked={showVolume} onChange={setShowVolume} label="Afficher le volume" />
          <Checkbox checked={yAutoScaling} onChange={setYAutoScaling} label="YAutoScaling" />
        </div>
        <CandlestickChart
          data={ALL_FEATURES_DATASET}
          drawingTools
          showIndicators
          fullscreenToggle
          zoomable
          showVolume={showVolume}
          YAutoScaling={yAutoScaling}
          timeframes={TIMEFRAMES}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
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
      <CandlestickChart data={MEDIUM_DATASET} drawingTools timeframes={TIMEFRAMES} timeframe="1d" height={STORY_HEIGHT} />
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
