"use client";

import App from "./App";
import { useEffect, useRef } from "react";

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) {
      //OK console.log("check canvasRef");
      const app = new App();
      // クリーンアップ関数
      return () => {
        if (app) {
        }
      };
    }
  }, []);

  return (
    <div>
      <canvas id="webgl-canvas" ref={canvasRef}></canvas>
    </div>
  );
}
