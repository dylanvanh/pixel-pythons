import { expect, test } from "vite-plus/test";
import { requireLoopbackUrl } from "./local-chain";

test("local transaction tools accept only HTTP loopback destinations", () => {
  // given
  const allowed = [
    "http://127.0.0.1:8546",
    "http://localhost:3005/api/metadata/1",
    "http://[::1]:8545",
  ];
  const denied = [
    "https://11155111.rpc.thirdweb.com",
    "http://localhost.example.com",
    "http://192.168.1.1:8545",
    "file:///tmp/rpc",
    "http://user:password@localhost:8545",
    "not-a-url",
  ];

  // when
  const hosts = allowed.map((url) => requireLoopbackUrl(url).hostname);

  // then
  expect(hosts).toEqual(["127.0.0.1", "localhost", "[::1]"]);
  for (const url of denied) {
    expect(() => requireLoopbackUrl(url)).toThrow();
  }
});
