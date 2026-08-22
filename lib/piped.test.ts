// piped.ts guards server usage with "server-only", which throws outside RSC.
jest.mock("server-only", () => ({}));

import {
  pickBestPipedAudio,
  isPipedEnabled,
  resolvePipedAudioUrl,
} from "./piped";

describe("pickBestPipedAudio", () => {
  it("returns null for missing or empty stream lists", () => {
    expect(pickBestPipedAudio(undefined)).toBeNull();
    expect(pickBestPipedAudio([])).toBeNull();
  });

  it("ignores entries without urls", () => {
    expect(pickBestPipedAudio([{ bitrate: 128000 }])).toBeNull();
  });

  it("prefers m4a over higher-bitrate webm for browser compatibility", () => {
    const result = pickBestPipedAudio([
      { url: "https://x/opus", mimeType: "audio/webm", bitrate: 160000 },
      { url: "https://x/aac", mimeType: "audio/mp4", bitrate: 128000 },
    ]);
    expect(result).toEqual({
      url: "https://x/aac",
      ext: "m4a",
      bitrate: 128000,
    });
  });

  it("picks the highest-bitrate m4a among m4a streams", () => {
    const result = pickBestPipedAudio([
      { url: "https://x/low", mimeType: "audio/mp4", bitrate: 48000 },
      { url: "https://x/high", mimeType: "audio/mp4", bitrate: 128000 },
    ]);
    expect(result?.url).toBe("https://x/high");
  });

  it("falls back to the best webm when no m4a exists", () => {
    const result = pickBestPipedAudio([
      { url: "https://x/op1", mimeType: "audio/webm", codec: "opus", bitrate: 96000 },
      { url: "https://x/op2", mimeType: "audio/webm", codec: "opus", bitrate: 160000 },
    ]);
    expect(result).toMatchObject({ url: "https://x/op2", ext: "webm" });
  });
});

describe("isPipedEnabled / resolvePipedAudioUrl", () => {
  const originalEnv = process.env.PIPED_BASE_URL;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.PIPED_BASE_URL;
    } else {
      process.env.PIPED_BASE_URL = originalEnv;
    }
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("is disabled without PIPED_BASE_URL and never touches the network", async () => {
    delete process.env.PIPED_BASE_URL;
    expect(isPipedEnabled()).toBe(false);
    const fetchSpy = jest.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    await expect(resolvePipedAudioUrl("dQw4w9WgXcQ")).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("resolves the best audio stream from the instance", async () => {
    process.env.PIPED_BASE_URL = "https://piped.example.com/";
    globalThis.fetch = jest.fn(async () =>
      ({
        ok: true,
        json: async () => ({
          audioStreams: [
            { url: "https://x/opus", mimeType: "audio/webm", bitrate: 160000 },
            { url: "https://x/aac", mimeType: "audio/mp4", bitrate: 128000 },
          ],
        }),
      }) as unknown as Response
    );

    const result = await resolvePipedAudioUrl("dQw4w9WgXcQ");
    expect(result).toMatchObject({ url: "https://x/aac", ext: "m4a" });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://piped.example.com/streams/dQw4w9WgXcQ",
      expect.objectContaining({ headers: { Accept: "application/json" } })
    );
  });

  it("returns null on non-ok responses", async () => {
    process.env.PIPED_BASE_URL = "https://piped.example.com";
    globalThis.fetch = jest.fn(async () =>
      ({ ok: false, status: 502 }) as unknown as Response
    );
    await expect(resolvePipedAudioUrl("x")).resolves.toBeNull();
  });

  it("returns null when fetch throws (timeout, DNS, …)", async () => {
    process.env.PIPED_BASE_URL = "https://piped.example.com";
    globalThis.fetch = jest.fn(async () => {
      throw new Error("network down");
    });
    await expect(resolvePipedAudioUrl("x")).resolves.toBeNull();
  });
});
