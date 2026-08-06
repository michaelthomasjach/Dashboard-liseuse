import type { Meta, StoryObj } from "@storybook/react";
import { Spinner } from "./Spinner";
import { Skeleton } from "./Skeleton";
import { ProgressBar } from "./ProgressBar";

const meta: Meta = {
  title: "Feedback/Loaders",
};
export default meta;
type Story = StoryObj;

export const AllLoaders: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 320 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <Spinner size={18} />
        <Spinner size={28} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Skeleton circle width={36} height={36} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <Skeleton height={12} width="60%" />
            <Skeleton height={10} width="40%" />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <ProgressBar value={62} label="Import des transactions" />
        <ProgressBar label="Synchronisation…" />
      </div>
    </div>
  ),
};
