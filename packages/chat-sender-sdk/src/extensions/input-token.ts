import { Node, mergeAttributes } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import InputTokenView from "../nodeviews/InputTokenView.vue";

export const InputToken = Node.create({
  name: "inputToken",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      id: { default: "" },
      value: { default: "" },
      label: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-input-token='true']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-input-token": "true" }), 0];
  },

  addNodeView() {
    return VueNodeViewRenderer(InputTokenView as any);
  },
});
