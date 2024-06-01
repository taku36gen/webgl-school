"use client";

import ThreeApp from "./ThreeApp";
import { useEffect, useRef } from "react";
import React from "react";
import styles from "./page.module.css";

export default function Page() {
  const threeAppRef = useRef<ThreeApp | null>(null);
  const yoo = 0;

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
        threeAppRef.current = app;
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

  const handleGatherButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    if (threeAppRef.current) {
      threeAppRef.current.resetDogsPosition();
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <div id="webgl"></div>
      <div
        className={styles["darumadrop-one-regular"]}
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          color: "#a0b966",
          // backgroundColor: "rgba(0, 0, 0, 0.5)",
          padding: "5px",
          zIndex: 1,
        }}
      >
        Press the space key to make 101 puppies run!
      </div>
      <button
        className={styles.gatherButton}
        onMouseDown={handleGatherButtonClick}
      >
        Come!
      </button>
    </div>
  );
}
