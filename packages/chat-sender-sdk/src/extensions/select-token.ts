import { Node, mergeAttributes } from "@tiptap/core";
import { VueNodeViewRenderer } from "@tiptap/vue-3";
import SelectTokenView from "../nodeviews/SelectTokenView.vue";

export const SelectToken = Node.create({
  name: "selectToken",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      id: { default: "" },
      value: { default: "" },
      label: { default: "" },
      options: { default: [] },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-select-token='true']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-select-token": "true" }), 0];
  },

  addNodeView() {
    return VueNodeViewRenderer(SelectTokenView as any);
  },
});
