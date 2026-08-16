import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  CandlestickChart,
  type TimeframeEntry,
  type ChartEvent,
  type FundamentalDataPoint,
  type SymbolSearchResult,
  type Candle,
  type ChartDisplayMode,
  type OverlayDataPoint,
} from "./CandlestickChart";
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
  // a single "stack" marker instead of overlapping.
  { date: ALL_FEATURES_DATASET[180].date, kind: "news", label: "Annonce d'un partenariat stratégique" },
  { date: ALL_FEATURES_DATASET[280].date, kind: "dividend", label: "Dividende détaché : 0.62$/action" },
  { date: ALL_FEATURES_DATASET[420].date, kind: "earnings", label: "Résultats T3 : BPA 1.58$ (attendu 1.50$)" },
  { date: ALL_FEATURES_DATASET[520].date, kind: "update", label: "Lancement de la nouvelle gamme de produits" },
];

// Four quarterly reports spread across ALL_FEATURES_DATASET's own date range — sparse on purpose
// (real fundamentals are reported quarterly/annually, never daily like `data` itself).
const ALL_FEATURES_FUNDAMENTALS: FundamentalDataPoint[] = [
  {
    date: ALL_FEATURES_DATASET[0].date,
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
    date: ALL_FEATURES_DATASET[150].date,
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
    date: ALL_FEATURES_DATASET[300].date,
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
    date: ALL_FEATURES_DATASET[450].date,
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

// A small in-memory "quote database" of daily closes per ticker, keyed the same as
// MOCK_SYMBOL_DB — stands in for a real quote API the same way MOCK_SYMBOL_DB stands in for a
// real symbol-search one. A different seed/base per ticker so trajectories actually diverge
// instead of moving in lockstep, aligned to ALL_FEATURES_DATASET's own dates (a real overlay
// wouldn't need to be — this just keeps the mock data simple).
const OVERLAY_SEED_BY_TICKER: Record<string, number> = {
  NVDA: 15,
  AAPL: 27,
  MSFT: 44,
  SPX: 3,
  BTCUSD: 61,
  ETHUSD: 52,
};
// Full OHLC (not just the close) so the "Mode d'affichage" selector in the edit modal has
// something to offer "Bougies" from — see OverlayDataPoint's own doc.
function generateOverlaySeries(ticker: string): OverlayDataPoint[] {
  const seed = OVERLAY_SEED_BY_TICKER[ticker] ?? 7;
  return generateCandles(ALL_FEATURES_DATASET.length, 100 + seed * 3, seed).map((c, i) => ({
    date: ALL_FEATURES_DATASET[i].date,
    value: c.close,
    open: c.open,
    high: c.high,
    low: c.low,
  }));
}

export const AllFeatures: Story = {
  name: "Toutes les options",
  render: () => {
    const [timeframe, setTimeframe] = useState("1d");
    const [favorites, setFavorites] = useState<string[]>(["msft"]);
    const [results, setResults] = useState<SymbolSearchResult[]>(MOCK_SYMBOL_DB);
    const [currentSymbol, setCurrentSymbol] = useState("MSFT");
    const [displayMode, setDisplayMode] = useState<ChartDisplayMode>("candle");
    return (
      <div style={{ padding: 24 }}>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
          Tout combiné : outils de dessin (`drawingTools` — lignes, Fibonacci, vagues d'Elliott, formes, mesure,
          aimant), indicateurs techniques et fondamentaux (`showIndicators`/`fundamentals` — aucun pré-ajouté, tout
          le catalogue accessible depuis "Ajouter un indicateur"), modes d'affichage
          (`defaultChartDisplayMode`/`onChartDisplayModeChange`), plein écran (`fullscreenToggle`),
          sélecteur d'intervalle (`timeframes`), recherche de symbole (`symbolSearch` — <strong>double-clic</strong>{" "}
          sur "MSFT" ouvre la modale, son bouton "+" ajoute un overlay de comparaison —{" "}
          <code>onAddSymbolOverlay</code>), rescale automatique de l'axe des prix (`YAutoScaling`, activé par défaut —
          bascule dans la modale "Paramètres du graphique"), saisonnalité (`seasonality` — bouton calendrier dans
          l'en-tête), zoom/pan (`zoomable`) et évènements (`events` — bulles en bas du tracé des prix, deux d'entre
          elles partageant une même date pour montrer la bulle "stack" ; les <strong>cliquer</strong> ouvre une
          tooltip détaillée, le bouton œil dans l'en-tête masque/affiche toutes les bulles d'un coup).
        </p>
        <CandlestickChart
          data={ALL_FEATURES_DATASET}
          symbol={currentSymbol}
          events={ALL_FEATURES_EVENTS}
          drawingTools
          showVolume={false}
          showIndicators
          fundamentals={ALL_FEATURES_FUNDAMENTALS}
          fullscreenToggle
          zoomable
          timeframes={TIMEFRAMES}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          defaultChartDisplayMode={displayMode}
          onChartDisplayModeChange={setDisplayMode}
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
          seasonality
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
