import type { Meta, StoryObj } from "@storybook/react";
import { Tag } from "./Tag";

const meta: Meta<typeof Tag> = {
  title: "Forms/Tag",
  component: Tag,
};
export default meta;
type Story = StoryObj<typeof Tag>;

export const Removable: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 6 }}>
      <Tag onRemove={() => {}}>AAPL</Tag>
      <Tag onRemove={() => {}}>TSLA</Tag>
      <Tag onRemove={() => {}}>NVDA</Tag>
    </div>
  ),
};

export const Plain: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 6 }}>
      <Tag>Technologie</Tag>
      <Tag>Large cap</Tag>
    </div>
  ),
};
