"use client";

import App from "./App";
import { useEffect, useRef, useState } from "react";

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const appRef = useRef<App | null>(null); // クラスの参照を保持
  const [polyValue, setPolyValue] = useState(5); // 初期値を5に設定
  const [sizeValue, setSizeValue] = useState(0.5); // 初期値を0.5に設定

  useEffect(() => {
    if (canvasRef.current && !appRef.current) {
      //OK console.log("check canvasRef");
      // const app = new App();
      appRef.current = new App();
    }
  }, [canvasRef]);

  /**
   * useEffectの第二引数に[polyValue, sizeValue]を入れることで、これらの変更をキャッチする
   */
  useEffect(() => {
    if (appRef.current) {
      appRef.current.updatePolyValue(polyValue);
      appRef.current.updateSizeValue(sizeValue);
    }
  }, [polyValue, sizeValue]);

  const handlePolyChange = (event: any) => {
    setPolyValue(event.target.value);
  };
  const handleSizeChange = (event: any) => {
    setSizeValue(event.target.value);
  };

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
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          left: "30%",
          right: "30%",
          zIndex: 1,
        }}
      >
        <label
          htmlFor="slider"
          style={{ display: "block", marginBottom: "5px", fontSize: "14px" }}
        >
          角の数を調整
        </label>
        <input
          id="slider"
          type="range"
          min="0"
          max="100"
          value={polyValue}
          onChange={handlePolyChange}
          style={{ width: "100%", fontSize: 10 }}
        />
        <label
          htmlFor="slider"
          style={{ display: "block", marginBottom: "5px", fontSize: "14px" }}
        >
          大きさを調整
        </label>
        <input
          id="slider"
          type="range"
          min="0"
          max="1"
          step="0.1" // これで0.１刻みになる
          value={sizeValue}
          onChange={handleSizeChange}
          style={{ width: "100%", fontSize: 10 }}
        />
      </div>
    </div>
  );
}
