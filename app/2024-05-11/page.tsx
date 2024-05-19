"use client";

import ThreeApp from "./ThreeApp";
import { useEffect } from "react";

export default function Page() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      //  useEffect内は既にDOMのロードが完了しているため、
      //  この位置のDOMContentLoadedは呼び出されない
      //   window.addEventListener(
      //     // "DOMContentLoaded",
      //     // () => {
      const wrapper = document.querySelector("#webgl");
      if (wrapper) {
        const app = new ThreeApp(wrapper);
        app.render();
      }

      // },
      //     false
      //   );
    }
  }, []);
  return <div id="webgl"></div>;
}
