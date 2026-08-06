import type { Meta, StoryObj } from "@storybook/react";
import { NotFoundPage } from "./NotFoundPage";

const meta: Meta<typeof NotFoundPage> = {
  title: "Pages/NotFoundPage",
  component: NotFoundPage,
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj<typeof NotFoundPage>;

export const Default: Story = {
  render: () => <NotFoundPage />,
};

export const CustomMessage: Story = {
  render: () => (
    <NotFoundPage
      title="Marché introuvable"
      message="Ce symbole n'existe pas ou n'est plus coté."
      actionLabel="Retour au portefeuille"
      actionHref="/portfolio"
    />
  ),
};
