"use client";

import ThreeApp from "./ThreeApp";
import { useEffect, useRef } from "react";
import React from "react";
import styles from "./page.module.css";

export default function Page() {
  const threeAppRef = useRef<ThreeApp | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const wrapper = document.querySelector("#webgl");
      if (wrapper) {
        const app = new ThreeApp(wrapper);
        threeAppRef.current = app;
        app.render();
      }

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

  return (
    <div style={{ position: "relative" }}>
      <div id="webgl"></div>
      <footer
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1,
          fontSize: 10,
        }}
      >
        <p>【月面】NASA&apos;s Scientific Visualization Studio</p>
        <p>
          <a>【背景】</a>
          <a href="https://jp.freepik.com/free-photo/space-background-with-stardust-and-shining-stars-realistic-colorful-cosmos-with-nebula-and-milky-way_38095260.htm#query=universe&position=3&from_view=keyword&track=ais_user&uuid=cc88f4bb-2621-4d1c-b89d-10742371c60d">
            著作者：benzoix
          </a>
          ／出典：Freepik
        </p>
      </footer>
    </div>
  );
}
