import { describe, it, expect, vi } from "vitest";
import { TS3Client } from "./client.js";
import type { Logger } from "../logger.js";

const stubLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  child: () => stubLogger,
} as unknown as Logger;

describe("TS3Client connection safety", () => {
  it("rejects gracefully when port is invalid without uncaught exception", async () => {
    const client = new TS3Client(
      {
        host: "127.0.0.1",
        port: 99999, // invalid port > 65535
        queryPort: 10011,
        nickname: "test-bot",
        serverProtocol: "ts3",
      },
      stubLogger
    );

    await expect(client.connect()).rejects.toThrow();
    client.disconnect();
  });

  it("handles embedded port normalization in host string correctly", async () => {
    const client = new TS3Client(
      {
        host: "127.0.0.1:99999",
        port: 9987,
        queryPort: 10011,
        nickname: "test-bot",
        serverProtocol: "ts3",
      },
      stubLogger
    );

    await expect(client.connect()).rejects.toThrow();
    client.disconnect();
  });
});
