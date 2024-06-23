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

  const handlePowerButtonClick = (
    event:
      | React.MouseEvent<HTMLButtonElement>
      | React.TouchEvent<HTMLButtonElement>
      | React.KeyboardEvent<HTMLButtonElement>
  ) => {
    if (threeAppRef.current) {
      threeAppRef.current.changeSwitch();
    }
  };

  const handleSpeedButtonClick =
    (speed: "low" | "medium" | "high") =>
    (
      event:
        | React.MouseEvent<HTMLButtonElement>
        | React.TouchEvent<HTMLButtonElement>
        | React.KeyboardEvent<HTMLButtonElement>
    ) => {
      if (threeAppRef.current) {
        threeAppRef.current.changeSpeed(speed);
      }
    };

  const resizeContoroller = () => {
    const controller = document.querySelector(".controller");
    const buttons = document.querySelectorAll(".button");
    const wrapper = document.querySelector(`.${styles.controllerWrapper}`);
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // コントローラーのサイズ調整
    let controllerWidth = windowWidth * 0.3; // 30vw
    let controllerHeight = windowHeight * 0.1; // 10vh
    let controllerPadding = Math.max(10, controllerHeight * 0.15); // パディングを動的に計算

    // 最小・最大サイズの制限
    controllerWidth = Math.max(280, Math.min(controllerWidth, 500));
    controllerHeight = Math.max(80, Math.min(controllerHeight, 150));

    document.documentElement.style.setProperty(
      "--controller-width",
      `${controllerWidth}px`
    );
    document.documentElement.style.setProperty(
      "--controller-height",
      `${controllerHeight}px`
    );

    // ボタンのサイズ調整
    let buttonSize = Math.min(controllerWidth * 0.2, controllerHeight * 0.8);
    document.documentElement.style.setProperty(
      "--button-size",
      `${buttonSize}px`
    );

    document.documentElement.style.setProperty(
      "--controller-padding",
      `${controllerPadding}px`
    );

    // フォントサイズの調整
    let fontSize = Math.min(controllerWidth * 0.06, controllerHeight * 0.2);
    document.documentElement.style.setProperty("--font-size", `${fontSize}px`);
  };

  return (
    <div style={{ position: "relative" }}>
      <div id="webgl"></div>
      <div className={styles.controllerWrapper}>
        <div className={styles.controller}>
          <div className={styles.buttonRow}>
            <button
              className={`${styles.button} ${styles.power}`}
              onClick={handlePowerButtonClick}
            >
              運転
            </button>
            <button
              className={styles.button}
              onClick={handleSpeedButtonClick("low")}
            >
              弱
            </button>
            <button
              className={styles.button}
              onClick={handleSpeedButtonClick("medium")}
            >
              中
            </button>
            <button
              className={styles.button}
              onClick={handleSpeedButtonClick("high")}
            >
              強
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
