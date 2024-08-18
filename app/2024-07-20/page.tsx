"use client";

import AppVert from "./App_vert";
import AppFrag from "./App_frag";
import { useEffect, useRef, useState } from "react";

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const appVertRef = useRef<AppVert | null>(null); // クラスの参照を保持
  const appFragRef = useRef<AppFrag | null>(null); // クラスの参照を保持

  useEffect(() => {
    if (canvasRef.current && !appVertRef.current && !appFragRef.current) {
      //OK console.log("check canvasRef");
      // const app = new App();
      appVertRef.current = new AppVert();
      appFragRef.current = new AppFrag();
    }
  }, [canvasRef]);

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        display: "flex", // 子要素の設定
      }}
    >
      <canvas
        id="webgl-canvas-vert"
        ref={canvasRef}
        style={{ width: "50%" }}
      ></canvas>
      <canvas
        id="webgl-canvas-frag"
        ref={canvasRef}
        style={{ width: "50%" }}
      ></canvas>
    </div>
  );
}
