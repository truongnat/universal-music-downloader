// providers.ts pulls in server-only modules; stub them for unit tests.
jest.mock("server-only", () => ({}));

jest.mock("./invidious", () => ({
  isInvidiousEnabled: jest.fn(() => false),
  resolveInvidiousAudioUrl: jest.fn(async () => null),
}));

jest.mock("./piped", () => ({
  isPipedEnabled: jest.fn(() => false),
  resolvePipedAudioUrl: jest.fn(async () => null),
}));

import { enabledFallbackProviders, resolveFallbackAudio } from "./providers";
import { isInvidiousEnabled, resolveInvidiousAudioUrl } from "./invidious";
import { isPipedEnabled, resolvePipedAudioUrl } from "./piped";

const mockInvEnabled = isInvidiousEnabled as jest.Mock;
const mockPipedEnabled = isPipedEnabled as jest.Mock;
const mockInvResolve = resolveInvidiousAudioUrl as jest.Mock;
const mockPipedResolve = resolvePipedAudioUrl as jest.Mock;

beforeEach(() => {
  jest.spyOn(console, "warn").mockImplementation(() => {});
  mockInvEnabled.mockReturnValue(false);
  mockPipedEnabled.mockReturnValue(false);
  mockInvResolve.mockResolvedValue(null);
  mockPipedResolve.mockResolvedValue(null);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("enabledFallbackProviders", () => {
  it("reports an empty chain when nothing is configured", () => {
    expect(enabledFallbackProviders()).toEqual([]);
  });

  it("lists configured providers in execution order", () => {
    mockInvEnabled.mockReturnValue(true);
    mockPipedEnabled.mockReturnValue(true);
    expect(enabledFallbackProviders()).toEqual(["invidious", "piped"]);
  });
});

describe("resolveFallbackAudio", () => {
  it("returns null when no provider is configured", async () => {
    await expect(resolveFallbackAudio("abc123")).resolves.toBeNull();
    expect(mockInvResolve).not.toHaveBeenCalled();
    expect(mockPipedResolve).not.toHaveBeenCalled();
  });

  it("uses invidious first when it succeeds", async () => {
    mockInvEnabled.mockReturnValue(true);
    mockPipedEnabled.mockReturnValue(true);
    mockInvResolve.mockResolvedValue({
      url: "https://inv/stream",
      itag: 140,
      ext: "m4a",
      bitrate: 128000,
    });

    const result = await resolveFallbackAudio("abc123");
    expect(result).toEqual({
      url: "https://inv/stream",
      ext: "m4a",
      source: "invidious",
      bitrate: 128000,
    });
    // Piped must not be called when Invidious already succeeded.
    expect(mockPipedResolve).not.toHaveBeenCalled();
  });

  it("falls through to piped when invidious fails", async () => {
    mockInvEnabled.mockReturnValue(true);
    mockPipedEnabled.mockReturnValue(true);
    mockInvResolve.mockResolvedValue(null);
    mockPipedResolve.mockResolvedValue({
      url: "https://piped/stream",
      ext: "webm",
      bitrate: 160000,
    });

    const result = await resolveFallbackAudio("abc123");
    expect(result).toMatchObject({ url: "https://piped/stream", source: "piped" });
    expect(mockPipedResolve).toHaveBeenCalledWith("abc123");
  });

  it("returns null when every configured provider fails", async () => {
    mockInvEnabled.mockReturnValue(true);
    mockPipedEnabled.mockReturnValue(true);
    const result = await resolveFallbackAudio("abc123");
    expect(result).toBeNull();
  });
});
