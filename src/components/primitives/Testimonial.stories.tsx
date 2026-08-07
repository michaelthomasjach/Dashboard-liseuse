import type { Meta, StoryObj } from "@storybook/react";
import { Testimonial } from "./Testimonial";

const meta: Meta<typeof Testimonial> = {
  title: "Primitives/Testimonial",
  component: Testimonial,
};
export default meta;
type Story = StoryObj<typeof Testimonial>;

export const Default: Story = {
  render: () => (
    <Testimonial
      quote="Le tableau de bord m'a fait gagner un temps fou pour suivre mes positions — les graphiques sont enfin lisibles sur ma liseuse."
      name="Camille Berthier"
      role="Investisseuse particulière"
      rating={5}
    />
  ),
};

export const WithoutRating: Story = {
  render: () => (
    <Testimonial
      quote="Simple à intégrer, et le mode e-ink est vraiment pensé pour l'écran, pas juste du noir et blanc appliqué après coup."
      name="Julien Roche"
      role="CTO, Fintech Studio"
    />
  ),
};
