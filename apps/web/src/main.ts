import { createApp } from "vue";
import "ant-design-vue/dist/reset.css";
import "virtual:uno.css";
import "./style.css";
import App from "./App.vue";
import { router } from "./router";

createApp(App).use(router).mount("#app");
