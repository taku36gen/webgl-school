"use client";

import ThreeApp from "./ThreeApp";

export default function page() {
  window.addEventListener(
    "DOMContentLoaded",
    () => {
      const wrapper = document.querySelector("#webgl");
      const app = new ThreeApp(wrapper);
      app.render();
    },
    false
  );
  return <div id="webgl">page</div>;
}
