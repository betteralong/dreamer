import { describe, expect, it } from "vitest";
import { docToParts, normalizeParts, partsToDoc, partsToPromptText } from "./parts";
import type { RawPart } from "./types";

describe("parts serialization", () => {
  it("serializes mixed parts to prompt text", () => {
    const parts: RawPart[] = [
      { type: "text", content: "基于" },
      {
        type: "media",
        url: "https://example.com/a.png",
        name: "商品参考图",
      },
      { type: "text", content: "，商品为" },
      {
        type: "text",
        content: "",
        value: "单人沙发",
        extra: {
          placeholder: {
            type: "input",
            label: "请输入商品",
          },
        },
      },
    ];
    const runtime = normalizeParts(parts);
    expect(partsToPromptText(runtime)).toContain("商品参考图");
    expect(partsToPromptText(runtime)).toContain("单人沙发");
  });

  it("keeps part structure through doc transform", () => {
    const parts: RawPart[] = [
      { type: "text", content: "适配" },
      {
        type: "text",
        content: "",
        value: "淘宝/天猫",
        extra: {
          placeholder: {
            type: "select",
            label: "平台",
            options: [{ label: "淘宝/天猫", value: "淘宝/天猫" }],
          },
        },
      },
    ];
    const normalized = normalizeParts(parts);
    const doc = partsToDoc(normalized);
    const restored = docToParts(doc);
    expect(restored.length).toBe(2);
    expect(restored[1]?.type).toBe("text");
    expect((restored[1] as any).value).toBe("淘宝/天猫");
  });
});
