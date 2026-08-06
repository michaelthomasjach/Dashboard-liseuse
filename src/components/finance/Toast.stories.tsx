import type { Meta, StoryObj } from "@storybook/react";
import { ToastProvider, useToast } from "./Toast";
import { Button } from "../primitives/Button";

const meta: Meta = {
  title: "Finance/Toast",
};
export default meta;
type Story = StoryObj;

function Demo() {
  const { show } = useToast();
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Button onClick={() => show({ title: "Ordre exécuté", description: "12 AAPL @ 226,34 €", tone: "success" })}>
        Succès
      </Button>
      <Button onClick={() => show({ title: "Échec du virement", description: "Solde insuffisant", tone: "error" })}>Erreur</Button>
      <Button onClick={() => show({ title: "Marge d'appel proche", tone: "warning" })}>Avertissement</Button>
      <Button onClick={() => show({ description: "Synchronisation terminée", tone: "info", duration: 2000 })}>Info</Button>
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <ToastProvider>
      <Demo />
    </ToastProvider>
  ),
};
