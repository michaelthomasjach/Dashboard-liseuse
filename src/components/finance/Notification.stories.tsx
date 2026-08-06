import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Notification, NotificationProvider, useNotification, type NotificationCorner } from "./Notification";
import { Button } from "../primitives/Button";

const meta: Meta = {
  title: "Finance/Notification",
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj;

export const CornerStandalone: Story = {
  name: "Popin de coin (autonome, sans provider)",
  render: () => {
    const [open, setOpen] = useState(true);
    const [corner, setCorner] = useState<NotificationCorner>("bottom-right");
    return (
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["top-left", "top-right", "bottom-left", "bottom-right"] as NotificationCorner[]).map((c) => (
            <Button key={c} selected={c === corner} onClick={() => setCorner(c)}>
              {c}
            </Button>
          ))}
          <Button onClick={() => setOpen(true)}>Réafficher</Button>
        </div>
        <Notification
          open={open}
          onClose={() => setOpen(false)}
          variant="corner"
          corner={corner}
          tone="success"
          title="Virement reçu"
          description="1 200,00 € crédités sur votre compte courant."
          autoDismissMs={6000}
        />
      </div>
    );
  },
};

export const StickyBar: Story = {
  name: "Barre sticky (haut/bas), sans auto-dismiss",
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div style={{ padding: 24 }}>
        <Button onClick={() => setOpen(true)}>Réafficher la barre</Button>
        <Notification
          open={open}
          onClose={() => setOpen(false)}
          variant="bar"
          barPosition="top"
          tone="warning"
          title="Maintenance planifiée"
          description="Les marchés seront indisponibles dimanche de 2h à 4h."
          dismissible
        />
      </div>
    );
  },
};

export const ModalVariant: Story = {
  name: "Modale, fermeture manuelle uniquement",
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ padding: 24 }}>
        <Button onClick={() => setOpen(true)}>Ouvrir la notification modale</Button>
        <Notification
          open={open}
          onClose={() => setOpen(false)}
          variant="modal"
          tone="error"
          title="Échec de l'ordre"
          description="Solde insuffisant pour exécuter cet ordre au marché."
          dismissible
          actions={
            <>
              <Button selected onClick={() => setOpen(false)}>
                Compris
              </Button>
            </>
          }
        />
      </div>
    );
  },
};

function ProviderDemo() {
  const { notify } = useNotification();
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Button
        onClick={() =>
          notify({ tone: "success", title: "Ordre exécuté", description: "12 AAPL @ 226,34 €", corner: "bottom-right" })
        }
      >
        Coin bas-droit
      </Button>
      <Button
        onClick={() =>
          notify({ tone: "info", title: "Nouveau relevé disponible", corner: "top-left", autoDismissMs: 5000 })
        }
      >
        Coin haut-gauche
      </Button>
      <Button
        onClick={() =>
          notify({
            variant: "bar",
            barPosition: "top",
            tone: "warning",
            title: "Marché fermé",
            description: "Les NYSE rouvrent lundi 9h30.",
            autoDismissMs: 0,
          })
        }
      >
        Barre sticky
      </Button>
      <Button
        onClick={() =>
          notify({
            variant: "modal",
            tone: "error",
            title: "Session expirée",
            description: "Reconnectez-vous pour continuer.",
            autoDismissMs: 0,
          })
        }
      >
        Modale
      </Button>
    </div>
  );
}

export const QueuedViaProvider: Story = {
  name: "File d'attente (NotificationProvider + useNotification)",
  render: () => (
    <NotificationProvider>
      <div style={{ padding: 24 }}>
        <ProviderDemo />
      </div>
    </NotificationProvider>
  ),
};
