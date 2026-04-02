import { Node, mergeAttributes } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import MediaTokenView from "../nodeviews/MediaTokenView.vue";

export const MediaToken = Node.create({
  name: "mediaToken",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      id: { default: "" },
      url: { default: "" },
      name: { default: "参考图" },
      mime: { default: "image/png" },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-media-token='true']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-media-token": "true" }), 0];
  },

  addNodeView() {
    return VueNodeViewRenderer(MediaTokenView as any);
  },
});
