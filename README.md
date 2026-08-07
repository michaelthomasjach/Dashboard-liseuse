# @michaelthomasjach/liseuse-dashboard-kit

Bibliothèque de composants React pour construire des tableaux de bord — domotique façon liseuse e-ink (BOOX, Kindle…) ou tablette, et applications finance (graphiques D3 interactifs, formulaires, layouts, pages). Chaque composant supporte nativement :

- **Palette** — `eink` (monochrome, hairlines, sans ombre ni dégradé) ou `color` (tablette couleur, accents pastel).
- **Surface** — `light` (Clair) ou `dark` (Sombre).
- **Typo** — `space-grotesk`, `manrope`, ou `sora`.

Les quatre combinaisons palette × surface sont pilotées par variables CSS ; aucune classe conditionnelle à gérer côté consommateur. Les deux palettes partagent la **même géométrie** — coins carrés partout (`--lq-radius-*` vaut `0px` dans les deux cas), `color` n'est qu'une variante *colorée* du même langage visuel qu'`eink`, pas un style différent. Les couleurs de `color` sont volontairement **pastel/dusty** (désaturées) plutôt que des teintes UI-kit brutes, pour rester cohérentes avec la sobriété d'`eink`.

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

### Scrollbars

Toute zone scrollable sous `.lq-root` reçoit automatiquement un ascenseur fin et discret (`scrollbar-width`/`scrollbar-color` sur Firefox, `::-webkit-scrollbar` ailleurs), avec une opacité faible au repos qui augmente au survol **et** pendant un scroll actif (classe `.lq-scrolling`, posée/retirée par un unique listener `scroll` global — voir `theme/scrollActivity.ts`, importé une seule fois par `LqThemeProvider` quel que soit le nombre d'instances montées).

## Composants

**Thème**
- `LqThemeProvider`, `useLqTheme`

**Icônes**
- Set d'icônes SVG (`SunIcon`, `MoonIcon`, `PartlyCloudyIcon`, `CloudRainIcon`, `WindIcon`, `CloudIcon`, etc.) — voir la story "Foundations/Animated Icons"
- Certaines icônes météo acceptent une prop `animated` (boucle idle discrète) : soleil qui tourne lentement, lune qui respire (échelle/opacité), petit soleil du "partiellement nuageux" qui tourne (le nuage reste fixe), gouttes de pluie qui tombent en cascade décalée, vent qui ondule légèrement. Désactivé automatiquement sous la palette e-ink et `prefers-reduced-motion` (comme les autres animations décoratives)

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
- `Testimonial` — carte témoignage (citation, avatar/initiales, nom, rôle, note en étoiles)
- `CodeBlock` — bloc de code monospace avec bouton copier ; pas de coloration syntaxique (pas de dépendance lourde), numéros de ligne optionnels
- `Heading`, `Text` — typographie du système (h1-h6, tailles xs→xl, graisses, variante atténuée) — voir la story "Foundations/Typography"

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

**Charts** — SVG piloté par React, D3 pour les maths (scales/zoom/shapes) uniquement ; remplissent 100% de la largeur du conteneur par défaut. Exception : `CandlestickChart` dessine les bougies/volume/crosshair/lignes de dessin sur un `<canvas>` superposé (un seul élément quel que soit le nombre de bougies, au lieu d'un nœud SVG par bougie) pour de meilleures performances avec de gros historiques ; les axes, la barre d'outils et les zones interactives (zoom/pan/drag d'axe/poignées de dessin) restent en SVG par-dessus, donc l'API et les interactions ne changent pas. Le canvas relit les tokens CSS (couleurs) à chaque redessin et se resynchronise automatiquement au changement de thème. Tous les graphiques cartésiens (`LineAreaChart`, `BarChart`, `CandlestickChart`, `DeltaChart`) partagent le même moteur de zoom/pan que le candlestick : molette/pincement + glisser dans le graphe pour zoomer/naviguer sur l'axe principal, glisser **ou molette** sur l'axe vertical pour rescale cet axe, glisser **ou molette** sur l'axe horizontal pour rescale celui-là — indépendamment l'un de l'autre, **double-clic sur un axe pour réinitialiser uniquement le zoom de cet axe**. `BarChart`/`DeltaChart` traitent leur axe catégoriel comme un axe continu (position par index) pour pouvoir zoomer/naviguer parmi de nombreuses barres/étapes, avec un nombre d'étiquettes affichées qui s'adapte au niveau de zoom. Les tracés sont clippés à la zone du graphe (jamais par-dessus les axes). Bouton plein écran dans la barre d'outils (`fullscreenToggle`, overlay CSS `position:fixed` plein viewport — fonctionne partout, y compris dans un iframe sandboxé comme celui de Storybook, contrairement à l'API Fullscreen native). Zoom désactivable via `zoomable={false}` sur chacun.
- `LineAreaChart` — courbe/aire multi-séries, zoom + pan + rescale par axe, tooltip avec crosshair, légende cliquable (masquer une série)
- `BarChart` — barres verticales/horizontales, zoom + pan + rescale par axe (axe catégoriel en index continu), tri par valeur (`colorByValue` pour vert/rouge automatique)
- `CandlestickChart` — chandeliers OHLC + volume, zoom + pan + rescale par axe ; convention creux/plein en palette e-ink (le monochrome ne peut pas coder la hausse/baisse par la teinte). Tient à l'aise sur des dizaines de milliers de bougies grâce au rendu canvas (voir plus haut) ; le zoom horizontal va jusqu'à n'afficher qu'une seule bougie, quelle que soit la taille du jeu de données. Glisser dans le graphe pan simultanément les deux axes (utile pour retrouver des bougies sorties de l'écran après un rescale vertical). Pas d'infobulle flottante : le prix et la date exacts sous le curseur s'affichent directement en badge sur l'axe des prix et l'axe des dates. Outils de dessin optionnels (`drawingTools`) : une vraie colonne verticale réservée à droite du graphe (pas des boutons superposés — l'axe/le tracé ne dessinent jamais dessous, et elle reste visible en plein écran), actuellement un outil "ligne de tendance" — 1er clic = point de départ (la ligne suit ensuite le curseur), 2ème clic = point d'arrivée ; Échap ou re-clic sur l'outil annule le point en cours et désélectionne l'outil ; un clic en dehors du graphe ne fait rien. Les lignes sont ancrées en coordonnées date/prix (`onDrawingsChange`) donc elles suivent le zoom/déplacement ; survoler une ligne dessinée affiche des poignées à ses extrémités (à glisser pour la redéfinir), et glisser directement sur la ligne la déplace entièrement.
- `DeltaChart` — graphique en cascade (waterfall/bridge) : ajouts/retraits signés qui construisent un ou plusieurs totaux, avec connecteurs pointillés (ex. structure du capital : capitalisation + dette + intérêts minoritaires − trésorerie = valeur d'entreprise) ; zoom + pan + rescale par axe comme les autres graphiques. Les barres apparaissent avec une animation de croissance échelonnée au chargement (désactivée en palette e-ink / `prefers-reduced-motion`)
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
- `DateRangePicker` — même calendrier, pour choisir une plage (date A → date B, comme une réservation) : 1er clic = début, survol = aperçu de la plage jusqu'au curseur, 2ème clic = fin (inversée automatiquement si elle précède le début) ; `value`/`onChange` prennent `{ start, end }`
- `DateTimePicker` — même calendrier + un panneau heure/minute à droite (steppers), composant à part entière (le `DatePicker` sans heure reste inchangé) ; choisir un jour ne ferme pas le popup, le bouton "Valider" confirme date + heure ; `minuteStep` pour le pas des minutes
- `RangeSlider` — double curseur (plage de prix, de dates…) ; glisser le segment central pour décaler toute la plage sans changer sa largeur ; `centerZero` pour une plage bipolaire (négatif à gauche, positif à droite, avec repère au 0)
- `Dropzone` — zone de dépôt de fichiers (drag & drop + sélection au clic), liste de fichiers avec suppression, validation de taille
- `Checkbox` — case à cocher avec coche animée au tracé (SVG `stroke-dashoffset`), état indéterminé pour les groupes
- `CheckboxButton` — case à cocher qui a l'apparence d'un `Button` : coché → ton actif + icône coché animée, décoché → bouton neutre, sans icône (filtres sous forme de puces)
- `Tag` — puce supprimable (croix optionnelle)
- `TagInput` — saisie de tags libres : virgule/Entrée pour ajouter, Retour arrière (champ vide) ou croix pour retirer

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
