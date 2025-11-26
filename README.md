# @cereon/recharts

A small, focused collection of React chart cards and helpers built on top of Recharts — designed to integrate with the `@cereon/dashboard` framework.

This package exposes a set of chart components and card wrappers (Line, Area, Bar, Pie, Radar, Radial) that can be used standalone or registered as cards inside the `@cereon/dashboard` card registry.

**Contents**

- LineChart
- AreaChart
- BarChart
- PieChart
- RadarChart
- RadialChart
- UI helpers and themes

**Key features**

- Lightweight React components using `recharts` under the hood
- Themed to match `@cereon/dashboard` visuals
- Easy registration of chart cards into `@cereon/dashboard`

## Installation

Install with `pnpm`, `npm` or `yarn` (this repository uses pnpm in the monorepo):

```bash
pnpm add @cereon/recharts
# or
npm install @cereon/recharts
```

This package depends on React and `recharts`. If your project does not already provide them, install matching peer dependencies:

```bash
pnpm add react react-dom recharts
```

## Quick Usage

Use components directly in any React app:

```tsx
import React from "react";
import { LineChart } from "@cereon/recharts";

const data = [
  { x: 1, y: 10 },
  { x: 2, y: 15 },
  { x: 3, y: 8 },
];

export default function Example() {
  return <LineChart data={data} xKey="x" yKey="y" />;
}
```

Props generally follow a consistent pattern across charts: `data`, `xKey`, `yKey` (or `valueKey`), `width`, `height`, and optional theming/options object. See the `src/charts/*.tsx` files for the full prop types.

## Integration with @cereon/dashboard

This package is designed to register chart cards with the `@cereon/dashboard` card registry. The dashboard expects card modules to expose a registration object (a card factory) which it can import and add to its card map.

A minimal, recommended registration pattern looks like this:

```ts
// register-charts.ts
function CardRegistrar() {
  const { registerCard } = useDashboard();

  useEffect(() => {
    registerCard("recharts:line", charts.LineChartCard);
    registerCard("recharts:area", charts.AreaChartCard);
    registerCard("recharts:bar", charts.BarChartCard);
    registerCard("recharts:pie", charts.PieChartCard);
    registerCard("recharts:radar", charts.RadarChartCard);
    registerCard("recharts:radial", charts.RadialChartCard);
  }, []);

  return null;
}
```

How to use the registered card in a dashboard configuration:

```jsonc
{
  "cards": [
    {
      "id": "my-line-card",
      "type": "recharts:line",
      "title": "My Line Chart",
      "data": {
        "source": "inline",
        "payload": [
          { "x": 1, "y": 10 },
          { "x": 2, "y": 20 }
        ]
      },
      "options": { "xKey": "x", "yKey": "y" }
    }
  ]
}
```

If your dashboard uses dynamic module loading, you can expose the registration file as an entry point that the dashboard imports at startup. For example, in your app bootstrap:

```ts
import("./register-charts");
```

### Example with `@cereon/dashboard` API

If `@cereon/dashboard` provides a `Dashboard` or registry context, register on initialization:

```tsx
import React, { useEffect } from "react";
import { useDashboard } from "@cereon/dashboard";
import charts from "@cereon/recharts/cards";

export default function App() {
  const dashboard = useDashboard();

  useEffect(() => {
    Object.entries(charts).forEach(([id, Card]) =>
      dashboard.registerCard(id, Card)
    );
  }, [dashboard]);

  return <Dashboard />;
}
```

## Theming

`@cereon/recharts` includes a small `theme` module that maps `@cereon/dashboard` colors to `recharts` styles. Import and pass the theme to chart components, or rely on automatic theming when used inside a `@cereon/dashboard` theme provider.

```ts
import { theme } from "@cereon/recharts";
<LineChart theme={theme} />;
```

## Development

Repository uses `pnpm`. Run the story/example or build locally:

```bash
pnpm install
pnpm build
pnpm test
```

If you are working inside the monorepo, run `pnpm -w` commands from the repo root as appropriate.

## Publishing

Follow standard npm package publishing flow. Keep `package.json` version in sync with releases. Example:

```bash
pnpm version patch
pnpm publish --access public
```

## License

This project is licensed under the same license as the repository (see `LICENSE`).

## Where to look in the source

- Components: `src/charts/*.tsx`
- Card wrappers: `src/ui/components/*.tsx`
- Theme: `src/charts/theme.ts`
- Entry exports: `src/index.ts`
