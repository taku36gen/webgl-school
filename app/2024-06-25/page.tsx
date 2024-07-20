"use client";

import ThreeApp from "./ThreeApp";
import { useEffect, useRef, useState } from "react";
import React from "react";
import InfoPanel from "./InfoPanel";
import styles from "./page.module.css";

export default function Page() {
  const threeAppRef = useRef<ThreeApp | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const wrapper = document.querySelector("#webgl");
      if (wrapper) {
        const app = new ThreeApp(wrapper, (index) => {
          setSelectedIndex(index);
        });
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
      <InfoPanel selectedIndex={selectedIndex} isLandscape={true} />
    </div>
  );
}
