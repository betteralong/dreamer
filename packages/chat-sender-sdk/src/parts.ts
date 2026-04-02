import type { JSONContent } from "@tiptap/core";
import type {
  InputPlaceholder,
  MediaPart,
  Part,
  RawPart,
  SelectPlaceholder,
  TextPart,
} from "./types";

let partCounter = 0;

function createPartId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  partCounter += 1;
  return `chat_part_${partCounter}`;
}

export function isInputPart(part: Part): part is TextPart & { extra: { placeholder: InputPlaceholder } } {
  return part.type === "text" && part.extra?.placeholder?.type === "input";
}

export function isSelectPart(part: Part): part is TextPart & { extra: { placeholder: SelectPlaceholder } } {
  return part.type === "text" && part.extra?.placeholder?.type === "select";
}

export function isMediaPart(part: Part): part is MediaPart {
  return part.type === "media";
}

export function toRuntimePart(part: RawPart): Part {
  if (part.type === "media") {
    return {
      ...part,
      $id: part.$id ?? createPartId(),
      url: part.url ?? "",
      value: part.value ?? part.url ?? "",
      name: part.name ?? part.extra?.placeholder?.label ?? "参考图",
    };
  }

  return {
    ...part,
    $id: part.$id ?? createPartId(),
    content: part.content ?? "",
    value: part.value ?? "",
  };
}

export function normalizeParts(parts: RawPart[]): Part[] {
  return parts.map(toRuntimePart);
}

export function partsToPromptText(parts: Part[]) {
  return parts
    .map((part) => {
      if (isMediaPart(part)) {
        return part.name || part.extra?.placeholder?.label || "[参考图]";
      }
      if (isInputPart(part)) {
        return (part.value || "").trim() || part.extra.placeholder.label || "";
      }
      if (isSelectPart(part)) {
        return (part.value || "").trim() || part.extra.placeholder.label || "";
      }
      return part.content ?? "";
    })
    .join("")
    .trim();
}

function partToNode(part: Part): JSONContent {
  if (isMediaPart(part)) {
    return {
      type: "mediaToken",
      attrs: {
        id: part.$id,
        url: part.url,
        name: part.name || "",
        mime: part.mime || "",
      },
    };
  }

  if (isInputPart(part)) {
    return {
      type: "inputToken",
      attrs: {
        id: part.$id,
        value: part.value || "",
        label: part.extra.placeholder.label || "",
      },
    };
  }

  if (isSelectPart(part)) {
    return {
      type: "selectToken",
      attrs: {
        id: part.$id,
        value: part.value || "",
        label: part.extra.placeholder.label || "",
        options: part.extra.placeholder.options || [],
      },
    };
  }

  return {
    type: "text",
    text: part.content ?? "",
  };
}

export function partsToDoc(parts: Part[]): JSONContent {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: parts.map(partToNode),
      },
    ],
  };
}

function collectParts(content: JSONContent[] | undefined, result: Part[]) {
  if (!content) return;
  for (const node of content) {
    if (node.type === "text") {
      result.push(
        toRuntimePart({
          type: "text",
          content: node.text ?? "",
        }),
      );
      continue;
    }

    if (node.type === "inputToken") {
      result.push(
        toRuntimePart({
          type: "text",
          content: "",
          value: String(node.attrs?.value ?? ""),
          extra: {
            placeholder: {
              type: "input",
              label: String(node.attrs?.label ?? ""),
              removable: true,
            },
          },
          $id: String(node.attrs?.id ?? ""),
        }),
      );
      continue;
    }

    if (node.type === "selectToken") {
      result.push(
        toRuntimePart({
          type: "text",
          content: "",
          value: String(node.attrs?.value ?? ""),
          extra: {
            placeholder: {
              type: "select",
              label: String(node.attrs?.label ?? ""),
              removable: true,
              options: Array.isArray(node.attrs?.options) ? node.attrs?.options : [],
            },
          },
          $id: String(node.attrs?.id ?? ""),
        }),
      );
      continue;
    }

    if (node.type === "mediaToken") {
      result.push(
        toRuntimePart({
          type: "media",
          url: String(node.attrs?.url ?? ""),
          value: String(node.attrs?.url ?? ""),
          mime: String(node.attrs?.mime ?? "image/png"),
          name: String(node.attrs?.name ?? "参考图"),
          $id: String(node.attrs?.id ?? ""),
          extra: {
            placeholder: {
              type: "image",
              label: String(node.attrs?.name ?? "参考图"),
              removable: true,
            },
          },
        }),
      );
      continue;
    }

    if (node.content?.length) {
      collectParts(node.content, result);
    }
  }
}

export function docToParts(doc: JSONContent): Part[] {
  const result: Part[] = [];
  collectParts(doc.content, result);
  return result;
}
