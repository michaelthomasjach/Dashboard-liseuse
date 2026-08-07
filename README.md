# @michaelthomasjach/liseuse-dashboard-kit

Bibliothèque de composants React pour construire des tableaux de bord — domotique façon liseuse e-ink (BOOX, Kindle…) ou tablette, et applications finance (graphiques D3 interactifs, formulaires, layouts, pages). Chaque composant supporte nativement :

- **Palette** — `eink` (monochrome, hairlines, sans ombre ni dégradé) ou `color` (tablette couleur, avec accents).
- **Surface** — `light` (Clair) ou `dark` (Sombre).
- **Typo** — `space-grotesk`, `manrope`, ou `sora`.

Les quatre combinaisons palette × surface sont pilotées par variables CSS ; aucune classe conditionnelle à gérer côté consommateur.

## Installation

Le package est publié sur **GitHub Packages**, pas sur npmjs.org. Il faut donc router le scope `@michaelthomasjach` vers le registre GitHub.

Dans le projet consommateur, ajoute un fichier `.npmrc` :

```
@michaelthomasjach:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

`GITHUB_TOKEN` doit être un token GitHub avec le scope `read:packages` (variable d'env locale, ou secret CI).

```bash
npm install @michaelthomasjach/liseuse-dashboard-kit d3
```

`react`, `react-dom` et `d3` sont des **peerDependencies** (non bundlées) — installe-les dans le projet consommateur si ce n'est pas déjà fait. `d3` n'est nécessaire que si tu utilises les graphiques (`components/charts`) ; le reste de la lib fonctionne sans.

## Usage

```tsx
import {
  LqThemeProvider,
  ClockWidget,
  WeatherWidget,
  ShuttersWidget,
  DashboardGrid,
  DashboardGridItem,
} from "@michaelthomasjach/liseuse-dashboard-kit";
import "@michaelthomasjach/liseuse-dashboard-kit/style.css";

function App() {
  return (
    <LqThemeProvider palette="eink" surface="dark" font="sora">
      <DashboardGrid columns="1.1fr 1fr 1fr">
        <DashboardGridItem>
          <ClockWidget time="20:14" date="samedi 7 juin" />
          <WeatherWidget icon={<SunIcon />} temperature="16" condition="Partiellement nuageux" />
        </DashboardGridItem>
        <DashboardGridItem>
          <ShuttersWidget
            meta="2 ouverts"
            shutters={[
              { id: "salon", label: "Salon TV", on: true, level: 51, statusText: "51 %", onToggle: (on) => {} },
            ]}
          />
        </DashboardGridItem>
      </DashboardGrid>
    </LqThemeProvider>
  );
}
```

Un seul `<LqThemeProvider>` suffit pour toute l'app ; on peut aussi en imbriquer plusieurs pour prévisualiser deux modes côte à côte.

### Basculer le thème depuis l'app

```tsx
import { useLqTheme } from "@michaelthomasjach/liseuse-dashboard-kit";

function ThemeSettings() {
  const { palette, surface, setPalette, setSurface } = useLqTheme();
  // ex: brancher sur un <SegmentedControl /> fourni par la lib
}
```

### Polices

La lib ne bundle pas les fonts (pour rester légère et éviter les conflits de licence) : elle expose seulement les piles de police. Charge Space Grotesk / Manrope / Sora depuis Google Fonts (ou en self-hosted) dans l'app consommatrice :

```html
<link
  href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=Sora:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

## Composants

**Thème**
- `LqThemeProvider`, `useLqTheme`

**Primitives** — brique de base réutilisable dans n'importe quel écran
- `Panel`, `PanelRow` — carte de section avec titre/meta et lignes label/valeur
- `Toggle` — interrupteur on/off
- `LevelGauge` — jauge segmentée (niveau volet, luminosité, volume, batterie…)
- `Button`, `IconButton` — actions discrètes / boutons carrés à icône
- `ColorSwatchButton` — case à cocher couleur (dégradée en gris sous la palette e-ink)
- `Modal` — panneau de détail centré
- `FieldGroup` — label + rangée de contrôles
- `SegmentedControl` — sélecteur exclusif (ex: le switch Palette/Surface/Typo de la maquette)
- `Tabs` — navigation par onglets, horizontale ou verticale (`orientation`)
- `Jumbotron` — bannière promo/hero (eyebrow, titre, description, actions, media ou image de fond avec `imageFilter="grayscale"`)
- `TreeView` — arbre expand/collapse récursif, avec glisser-déposer optionnel (`onMove`) pour réorganiser/reparenter — voir l'utilitaire `moveTreeNode`
- `ExpandableCard` — carte qui se déplie verticalement (animation CSS pure, pas de mesure JS)
- `TabbedCard` — carte dont le corps est découpé en onglets (`orientation="horizontal"|"vertical"`)

**Widgets** — composants métier prêts à brancher sur tes données
- `ClockWidget` — heure/date + ligne de présence
- `WeatherWidget` — météo courante, alerte, prévision multi-jours
- `DayTimelineWidget` — jalons de la journée (Matin, Dodo, Départ…)
- `MusicPlayerWidget` — lecteur audio compact
- `MetricListWidget` — liste label/valeur générique (températures des pièces…)
- `ShuttersWidget` — liste de volets (toggle + jauge d'ouverture)
- `LightsWidget` + `LightDetailModal` — liste de lumières + détail (allumage, température, couleur)
- `EnergyWidget` — métriques énergie mixtes (valeur simple ou jauge, ex. batterie)
- `DashboardGrid`, `DashboardGridItem` — grille CSS pour composer la page

Chaque widget est piloté par des props (pas de fetch ni d'état interne caché) : à toi de brancher tes propres données/API.

**Charts** — SVG piloté par React, D3 pour les maths (scales/zoom/shapes) uniquement ; remplissent 100% de la largeur du conteneur par défaut. Sur `LineAreaChart`/`CandlestickChart` : molette/pincement + glisser dans le graphe pour zoomer/naviguer (axe X), glisser sur l'axe vertical pour rescale les prix, glisser sur l'axe horizontal pour rescale le temps — indépendamment l'un de l'autre, **double-clic sur un axe pour réinitialiser uniquement le zoom de cet axe**. Les tracés sont clippés à la zone du graphe (jamais par-dessus les axes). Bouton plein écran dans la barre d'outils (`fullscreenToggle`, overlay CSS `position:fixed` plein viewport — fonctionne partout, y compris dans un iframe sandboxé comme celui de Storybook, contrairement à l'API Fullscreen native).
- `LineAreaChart` — courbe/aire multi-séries, zoom + pan + rescale par axe, tooltip avec crosshair, légende cliquable (masquer une série)
- `BarChart` — barres verticales/horizontales, tri par valeur (`colorByValue` pour vert/rouge automatique)
- `CandlestickChart` — chandeliers OHLC + volume, zoom + pan + rescale par axe ; convention creux/plein en palette e-ink (le monochrome ne peut pas coder la hausse/baisse par la teinte)
- `DeltaChart` — graphique en cascade (waterfall/bridge) : ajouts/retraits signés qui construisent un ou plusieurs totaux, avec connecteurs pointillés (ex. structure du capital : capitalisation + dette + intérêts minoritaires − trésorerie = valeur d'entreprise)
- `GaugeChart` — jauge en arc avec bandes de seuils (ex. score de risque)
- `DonutChart` — répartition (allocation de portefeuille…)
- `Sparkline` — mini-courbe sans axes, pour cellule de tableau ou StatCard
- `ChartTooltip`, `ChartAxis` — primitives exposées si tu construis ton propre graphique par-dessus

**Forms** — dropdowns adaptatifs (collision detection), champs avec état d'erreur
- `Popover` — moteur de positionnement générique (flip vertical bas/haut + décalage horizontal gauche/droite selon l'espace dispo), portalé dans `document.body` **avec réapplication du thème actif** (palette/surface/police) sur le portail, donc stylé correctement même en dehors de l'arbre `.lq-root` ; ferme au clic extérieur/Échap
- `Select` — dropdown construit sur `Popover`
- `TextField` — champ texte de base (label, icônes, erreur, texte d'aide)
- `MaskedInput` — moteur de masque générique (`#` = chiffre, tout le reste est littéral), caractère de masque configurable (`maskChar`)
- `PhoneInput`, `CreditCardInput`, `DateInput` — masques prêts à l'emploi construits sur `MaskedInput`
- `NumberField` — champ numérique avec préfixe/suffixe (€, %) et steppers
- `PasswordField` — champ mot de passe avec bascule afficher/masquer
- `DatePicker` — calendrier en popup (même moteur de positionnement que `Select`). Cliquer sur le libellé "mois année" fait remonter vers une grille de mois, puis une grille d'années (± décennie) — beaucoup plus rapide que de paginer mois par mois pour changer d'année
- `RangeSlider` — double curseur (plage de prix, de dates…) ; glisser le segment central pour décaler toute la plage sans changer sa largeur ; `centerZero` pour une plage bipolaire (négatif à gauche, positif à droite, avec repère au 0)
- `Dropzone` — zone de dépôt de fichiers (drag & drop + sélection au clic), liste de fichiers avec suppression, validation de taille
- `Checkbox` — case à cocher avec coche animée au tracé (SVG `stroke-dashoffset`), état indéterminé pour les groupes

**Feedback**
- `Spinner`, `Skeleton` (effet de balayage), `ProgressBar` (déterminée ou indéterminée) — animations désactivées sous la palette e-ink (l'e-ink réel ne peut pas s'animer proprement)

**Finance** — composants pensés pour un dashboard finance, mais génériques
- `Badge` — pastille de statut (tons neutral/up/down/warning/info)
- `PriceChangeTag` — delta signé avec flèche (variation de cours, P&L)
- `StatCard` — tuile KPI (label, valeur, delta, sparkline)
- `HoldingCard` — carte compacte pour une position (watchlist, liste de titres)
- `ComparisonCard` — deux chiffres côte à côte avec séparateur (portefeuille vs. indice, période vs. période)
- `GaugeCard` — `GaugeChart` dans une carte titrée avec description
- `Avatar` — image ou initiales
- `Breadcrumbs` — fil d'ariane
- `DataTable` — tableau triable, responsive (scroll horizontal)
- `Notification` — popin (4 coins), barre sticky (haut/bas) ou modale ; auto-dismiss avec barre de progression (pause au survol) ou simple croix, selon les props. Utilisable seule (`open`/`onClose`) ou en file d'attente via `NotificationProvider` + `useNotification()` (empile correctement plusieurs popins/barres, thème réappliqué sur le portail comme `Popover`)
- `UserMenu` — avatar + menu déroulant (construit sur `Popover`), items imbriqués via `children` pour des sous-menus en cascade (s'ouvrent à droite, ou à gauche s'il n'y a pas la place ; fermeture différée pour pouvoir traverser vers le sous-menu sans qu'il se ferme)

**Finance Widgets** — blocs composites directement utilisables dans un dashboard
- `PortfolioSummaryWidget` — valeur + delta au-dessus d'un `LineAreaChart` d'historique
- `WatchlistWidget` — carte titrée empilant des `HoldingCard`
- `MarketMoversWidget` — carte à onglets Hausses/Baisses

**Layouts** — responsive, s'effondrent en menu mobile sous ~900px
- `SidebarLayout` — sidebar fixe desktop → tiroir hors-écran (hamburger) sur mobile
- `HeaderLayout` — nav horizontale sticky → tiroir déroulant sur mobile

**Pages**
- `LoginPage` — image plein cadre sur 3/4 de la largeur, panneau de connexion centré verticalement sur le dernier quart (le formulaire est laissé à ta charge via `children`) ; l'image disparaît sous 900px
- `SignUpPage` — même structure que `LoginPage`, avec un emplacement `terms` pour l'acceptation des CGU
- `NotFoundPage` — page 404 centrée, action de retour personnalisable

## Développement

```bash
npm install
npm run storybook   # bac à sable visuel avec toolbar Palette / Surface / Typo
npm run typecheck
npm run build        # build de la lib (dist/) — types + ESM + CJS + CSS
```

## Publication

```bash
npm version <patch|minor|major>
git push --follow-tags
```

Une release GitHub déclenche `.github/workflows/publish.yml`, qui build et publie automatiquement sur `npm.pkg.github.com`. Publication manuelle possible via `workflow_dispatch` ou `npm publish` en local (avec un `GITHUB_TOKEN` ayant le scope `write:packages`).
