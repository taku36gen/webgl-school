"use client";
import { useEffect, useRef } from "react";
import React from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current });

      const loader = new GLTFLoader();
      loader.load(
        "models/DogRobot.glb",
        (gltf) => {
          scene.add(gltf.scene);
        },
        (progress) => {
          console.log(`Loading: ${(progress.loaded / progress.total) * 100}%`);
        },
        (error) => {
          console.error("Error loading model:", error);
        }
      );

      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(1, 1, 1);
      scene.add(light);

      const controls = new OrbitControls(camera, renderer.domElement);
      camera.position.z = 5;

      const animate = () => {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };

      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };

      window.addEventListener("resize", handleResize);

      animate();

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }
  }, []);

  return <canvas ref={canvasRef} />;
}
