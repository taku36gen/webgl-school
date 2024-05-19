"use client";

import ThreeApp from "./ThreeApp";
import { useEffect } from "react";
import React from "react";

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

      /**
       * NOTE: クリーンアップ関数
       * この関数は、コンポーネントがアンマウントされる際や、
       * useEffectの依存関係が変わる前に実行される
       * これを行わないと、再レンダリングのたびに新しいcanvas要素が追加され続けてしまう
       */
      return () => {
        if (wrapper) {
          while (wrapper.firstChild) {
            wrapper.removeChild(wrapper.firstChild);
          }
        }
      };
    }
  }, []);
  return <div id="webgl"></div>;
}
