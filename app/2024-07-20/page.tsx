"use client";

import App from "./App";
import { useEffect, useRef, useState } from "react";

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const appRef = useRef<App | null>(null); // クラスの参照を保持

  useEffect(() => {
    if (canvasRef.current && !appRef.current) {
      //OK console.log("check canvasRef");
      // const app = new App();
      appRef.current = new App();
    }
  }, [canvasRef]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        display: "flex", // 子要素の設定
        justifyContent: "center", // 子要素の設定
        alignItems: "center", // 子要素の設定
      }}
    >
      <canvas
        id="webgl-canvas"
        ref={canvasRef}
        style={{ position: "absolute" }}
      ></canvas>
    </div>
  );
}
