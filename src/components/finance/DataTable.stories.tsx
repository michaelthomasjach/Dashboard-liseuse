import type { Meta, StoryObj } from "@storybook/react";
import { DataTable } from "./DataTable";
import { PriceChangeTag } from "./PriceChangeTag";
import { Sparkline } from "../charts/Sparkline";
import { SAMPLE_HOLDINGS, type SampleHolding } from "../../test-data/financeSampleData";

const meta: Meta<typeof DataTable<SampleHolding>> = {
  title: "Finance/DataTable",
};
export default meta;
type Story = StoryObj<typeof DataTable<SampleHolding>>;

export const Holdings: Story = {
  render: () => (
    <DataTable<SampleHolding>
      rowKey={(row) => row.id}
      rows={SAMPLE_HOLDINGS}
      columns={[
        { id: "symbol", header: "Actif", accessor: (r) => `${r.symbol} · ${r.name}`, sortValue: (r) => r.symbol },
        { id: "qty", header: "Quantité", align: "right", accessor: (r) => r.quantity, sortValue: (r) => r.quantity },
        { id: "price", header: "Cours", align: "right", accessor: (r) => `${r.price.toFixed(2)} €`, sortValue: (r) => r.price },
        {
          id: "change",
          header: "Variation",
          align: "right",
          accessor: (r) => <PriceChangeTag value={r.change} />,
          sortValue: (r) => r.change,
        },
        {
          id: "trend",
          header: "Tendance",
          accessor: () => <Sparkline data={[10, 10.4, 10.1, 10.8, 11.2, 10.9, 11.5]} colorByTrend width={80} height={24} />,
        },
        { id: "value", header: "Valeur", align: "right", accessor: (r) => `${r.value.toLocaleString("fr-FR")} €`, sortValue: (r) => r.value },
      ]}
    />
  ),
};
