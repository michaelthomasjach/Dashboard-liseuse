import type { Meta, StoryObj } from "@storybook/react";
import { CodeBlock } from "./CodeBlock";

const meta: Meta<typeof CodeBlock> = {
  title: "Primitives/CodeBlock",
  component: CodeBlock,
};
export default meta;
type Story = StoryObj<typeof CodeBlock>;

const SNIPPET = `import { LqThemeProvider, StatCard } from "@michaelthomasjach/liseuse-dashboard-kit";

export function Dashboard() {
  return (
    <LqThemeProvider palette="color" surface="light">
      <StatCard label="Valeur du portefeuille" value="42 380 €" delta={3.4} />
    </LqThemeProvider>
  );
}
`;

export const Default: Story = {
  render: () => (
    <div style={{ maxWidth: 560 }}>
      <CodeBlock code={SNIPPET} filename="Dashboard.tsx" showLineNumbers />
    </div>
  ),
};

export const WithoutLineNumbers: Story = {
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <CodeBlock code={`npm install @michaelthomasjach/liseuse-dashboard-kit`} language="Shell" />
    </div>
  ),
};
