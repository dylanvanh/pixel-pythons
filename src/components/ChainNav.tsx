import { Link } from "@tanstack/react-router";

export function ChainNav({ current }: { current: "robinhood" | "bitcoin" }) {
  return (
    <nav className="chain-nav" aria-label="Collection chain">
      <Link to="/" aria-current={current === "robinhood" ? "true" : undefined}>
        Robinhood
      </Link>
      <Link to="/bitcoin" aria-current={current === "bitcoin" ? "true" : undefined}>
        Bitcoin
      </Link>
    </nav>
  );
}
