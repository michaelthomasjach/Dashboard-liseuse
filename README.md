# @michaelthomasjach/liseuse-dashboard-kit

Bibliothèque de composants React pour construire des tableaux de bord domotiques façon liseuse e-ink (BOOX, Kindle…) ou tablette. Chaque composant supporte nativement :

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
npm install @michaelthomasjach/liseuse-dashboard-kit
```

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
