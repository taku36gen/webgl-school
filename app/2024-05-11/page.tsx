"use client";

import ThreeApp from "./ThreeApp";
import { useEffect } from "react";

export default function Page() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.addEventListener(
        "DOMContentLoaded",
        () => {
          const wrapper = document.querySelector("#webgl");
          const app = new ThreeApp(wrapper);
          app.render();
        },
        false
      );
    }
  }, []);
  return <div id="webgl"></div>;
}
