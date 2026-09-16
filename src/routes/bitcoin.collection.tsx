import { createFileRoute } from "@tanstack/react-router";
import { getBitcoinCollection } from "../features/bitcoin/collection";
import { BitcoinCollectionPage } from "../features/bitcoin/BitcoinCollectionPage";

export const Route = createFileRoute("/bitcoin/collection")({
  loader: () => getBitcoinCollection(),
  component: () => <BitcoinCollectionPage {...Route.useLoaderData()} />,
});
