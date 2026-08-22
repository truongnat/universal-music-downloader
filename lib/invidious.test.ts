// invidious.ts guards server usage with "server-only", which throws outside RSC.
jest.mock("server-only", () => ({}));

import {
  extractYouTubeVideoId,
  pickBestAudioFormat,
  isInvidiousEnabled,
  resolveInvidiousAudioUrl,
} from "./invidious";

describe("extractYouTubeVideoId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtube.com/watch?v=dQw4w9WgXcQ&t=30s", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/live/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("extracts the id from %s", (input, expected) => {
    expect(extractYouTubeVideoId(input)).toBe(expected);
  });

  it.each([
    ["https://soundcloud.com/artist/track"],
    ["not a url"],
    [""],
    // 10-char id fails validation
    ["https://www.youtube.com/watch?v=short_id1"],
    // no video id anywhere
    ["https://www.youtube.com/playlist?list=PL1234567890a"],
  ])("returns null for %s", (input) => {
    expect(extractYouTubeVideoId(input)).toBeNull();
  });
});

describe("pickBestAudioFormat", () => {
  it("returns null for missing or empty format lists", () => {
    expect(pickBestAudioFormat(undefined)).toBeNull();
    expect(pickBestAudioFormat([])).toBeNull();
  });

  it("ignores formats without urls or non-audio types", () => {
    const result = pickBestAudioFormat([
      { itag: 18, type: "video/mp4" },
      { itag: 140 }, // audio itag but no url
      { url: "", type: "audio/mp4" },
    ]);
    expect(result).toBeNull();
  });

  it("prefers itag 140 (m4a) over higher-bitrate opus", () => {
    const result = pickBestAudioFormat([
      { itag: 251, url: "https://x/251", type: "audio/webm", bitrate: 160000 },
      { itag: 140, url: "https://x/140", type: "audio/mp4", bitrate: 128000 },
    ]);
    expect(result).toMatchObject({ itag: 140, ext: "m4a" });
  });

  it("falls back through preferred itags in order", () => {
    const result = pickBestAudioFormat([
      { itag: 250, url: "https://x/250", type: "audio/webm", bitrate: 70000 },
      { itag: 251, url: "https://x/251", type: "audio/webm", bitrate: 160000 },
    ]);
    expect(result).toMatchObject({ itag: 251, ext: "webm" });
  });

  it("picks the highest-bitrate stream when no preferred itag exists", () => {
    const result = pickBestAudioFormat([
      { itag: 599, url: "https://x/599", type: "audio/mp4", bitrate: 30000 },
      { itag: 600, url: "https://x/600", type: "audio/webm", bitrate: 35000 },
    ]);
    expect(result).toMatchObject({ itag: 600, ext: "webm" });
  });

  it("skips entries missing a type field instead of crashing", () => {
    const result = pickBestAudioFormat([
      { url: "https://x/y", itag: 999 }, // no MIME type → unusable
      { url: "https://x/z", itag: 998, type: "audio/mp4", bitrate: 50000 },
    ]);
    expect(result).toMatchObject({ url: "https://x/z", itag: 998, ext: "m4a" });
  });

  it("accepts string itags and bitrates from the API", () => {
    const result = pickBestAudioFormat([
      { itag: "140", url: "https://x/140", type: "audio/mp4", bitrate: "129000" },
    ]);
    expect(result).toMatchObject({ itag: 140, ext: "m4a", bitrate: 129000 });
  });
});

describe("isInvidiousEnabled / resolveInvidiousAudioUrl", () => {
  const originalEnv = process.env.INVIDIOUS_BASE_URL;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.INVIDIOUS_BASE_URL;
    } else {
      process.env.INVIDIOUS_BASE_URL = originalEnv;
    }
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("is disabled without INVIDIOUS_BASE_URL", async () => {
    delete process.env.INVIDIOUS_BASE_URL;
    expect(isInvidiousEnabled()).toBe(false);
    // Resolve short-circuits to null without touching the network.
    await expect(resolveInvidiousAudioUrl("dQw4w9WgXcQ")).resolves.toBeNull();
  });

  it("resolves the best audio stream through the instance proxy", async () => {
    process.env.INVIDIOUS_BASE_URL = "https://inv.example.com/";
    expect(isInvidiousEnabled()).toBe(true);

    globalThis.fetch = jest.fn(async () =>
      ({
        ok: true,
        json: async () => ({
          adaptiveFormats: [
            { itag: 251, url: "https://x/251", type: "audio/webm", bitrate: 160000 },
            { itag: 140, url: "https://x/140", type: "audio/mp4", bitrate: 128000 },
          ],
        }),
      }) as unknown as Response,
    );

    const result = await resolveInvidiousAudioUrl("dQw4w9WgXcQ");
    expect(result).toMatchObject({ itag: 140, ext: "m4a" });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://inv.example.com/api/v1/videos/dQw4w9WgXcQ?local=true",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("returns null when the instance responds with an error status", async () => {
    process.env.INVIDIOUS_BASE_URL = "https://inv.example.com";
    globalThis.fetch = jest.fn(async () =>
      ({ ok: false, status: 403 }) as unknown as Response,
    );
    await expect(resolveInvidiousAudioUrl("x")).resolves.toBeNull();
  });

  it("returns null when fetch throws (timeout, DNS, …)", async () => {
    process.env.INVIDIOUS_BASE_URL = "https://inv.example.com";
    globalThis.fetch = jest.fn(async () => {
      throw new Error("network down");
    });
    await expect(resolveInvidiousAudioUrl("x")).resolves.toBeNull();
  });
});
