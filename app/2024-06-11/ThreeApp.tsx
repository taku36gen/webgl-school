"use client";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GlitchPass } from "three/examples/jsm/postprocessing/GlitchPass.js";

export default class ThreeApp {
  /**
   * シーン共通パラメータ（クラス定義）
   */
  static CAMERA_PARAM = {
    fovy: 60,
    aspect: 0, // window定義後にコンストラクタで再代入
    near: 0.1,
    far: 120.0,
    position: new THREE.Vector3(0, 0, 20),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  static RENDERER_PARAM = {
    clearColor: "#F9F8E5",
    width: 0, // コンストラクタにてwindowサイズに応じて初期化
    height: 0, // コンストラクタにてwindowサイズに応じて初期化
  };
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xe58fe7,
    intensity: 3.0,
    position: new THREE.Vector3(-30, 30, 10),
  };
  static AMBIENT_LIGHT_PARAM = {
    color: 0x21f2e8,
    intensity: 1.0,
  };
  /**
   * 飛行機オブジェクトパラメータ
   */
  static PLANE_GEOM_PARAM = {
    radiusTop: 0,
    radiusBottom: 1,
    height: 2,
  };
  static PLANE_MAT_PARAM = {
    color: "#acff09",
  };
  static DISTANDE_FROM_SPHERE = 12;
  /**
   * 球体オブジェクトパラメータ
   */
  static SPHER_GEOM_PARAM = {
    radius: 9,
    widthSegments: 64,
    heightSegments: 32,
  };
  static SPHER_MAT_PARAM = {
    color: 0xffffff,
    shininess: 100,
  };
  /**
   * フォグの定義のための定数 @@@
   */
  static FOG_PARAM = {
    color: 0xffffff, // フォグの色
    near: 11.0, // フォグの掛かり始めるカメラからの距離
    far: 30.0, // フォグが完全に掛かるカメラからの距離
  };

  /**
   * プロパティ
   */
  // 共通
  renderer: THREE.WebGLRenderer | undefined;
  scene: THREE.Scene | undefined;
  camera: THREE.PerspectiveCamera | undefined;
  previousPosition = new THREE.Vector3();
  directionalLight: THREE.DirectionalLight | undefined;
  ambientLight: THREE.AmbientLight | undefined;
  controls: OrbitControls | undefined;
  axesHelper: THREE.AxesHelper | undefined;
  initialPositions: [number, number, number][] | undefined;
  models: THREE.Object3D[] = [];
  clock: THREE.Clock | undefined;
  // 飛行機
  planeMaterial: THREE.MeshPhongMaterial | undefined;
  planeGeometry: THREE.BufferGeometry | undefined;
  planeMesh: THREE.Mesh | undefined;
  planePreviousDirection: THREE.Vector3 | undefined;
  planeCurrentDirection: THREE.Vector3 | undefined;
  planeArrowHelper: THREE.ArrowHelper | undefined;
  // 飛行機とカメラを一体として扱うためのグループ
  planeCameraGroup: THREE.Group | undefined;
  startAngle: number | undefined;
  rotationAngle: number = 0;
  rotationSpeed: number = 0.5;
  // lookAtではなくクオータニォンで制御するための変数
  groupPreviousPosition: THREE.Vector3 | undefined;
  groupNextPosition: THREE.Vector3 | undefined;
  groupPreviousDirection: THREE.Vector3 | undefined;
  groupCurrentDirection: THREE.Vector3 | undefined;
  // 飛行機の位置制御のための値
  // planePrevPos:THREE.Vector3 | undefined;
  // 球体
  sphereMaterial: THREE.MeshPhongMaterial | undefined;
  sphereGeometry: THREE.BufferGeometry | undefined;
  sphereMesh: THREE.Mesh | undefined;
  earthTexture: THREE.Texture | undefined;

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   */
  constructor(wrapper: any) {
    if (typeof window !== "undefined") {
      // window定義後に定義が必要な部分のみ、クラス定数の定義をクライアントサイドで行う
      /**
       * window定義後に定義が必要なシーン共通パラメータの定義
       */
      ThreeApp.CAMERA_PARAM.aspect = window.innerWidth / window.innerHeight;
      ThreeApp.RENDERER_PARAM.width = window.innerWidth;
      ThreeApp.RENDERER_PARAM.height = window.innerHeight;

      // レンダラー
      const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
      this.renderer = new THREE.WebGLRenderer();
      this.renderer.setClearColor(color);
      this.renderer.setSize(
        ThreeApp.RENDERER_PARAM.width,
        ThreeApp.RENDERER_PARAM.height
      );
      wrapper.appendChild(this.renderer.domElement);

      // シーン
      this.scene = new THREE.Scene();

      // カメラ
      this.camera = new THREE.PerspectiveCamera(
        ThreeApp.CAMERA_PARAM.fovy,
        ThreeApp.CAMERA_PARAM.aspect,
        ThreeApp.CAMERA_PARAM.near,
        ThreeApp.CAMERA_PARAM.far
      );
      this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);

      // ディレクショナルライト（平行光源）
      this.directionalLight = new THREE.DirectionalLight(
        ThreeApp.DIRECTIONAL_LIGHT_PARAM.color,
        ThreeApp.DIRECTIONAL_LIGHT_PARAM.intensity
      );
      this.directionalLight.position.copy(
        ThreeApp.DIRECTIONAL_LIGHT_PARAM.position
      );
      this.scene.add(this.directionalLight);
      const bgTexture = new THREE.TextureLoader().load(
        "/2024-06-11/space-background-with-stardust-and-shining-stars-realistic-colorful-cosmos-with-nebula-and-milky-way.jpg"
      );
      this.scene.background = bgTexture;

      // アンビエントライト（環境光）
      this.ambientLight = new THREE.AmbientLight(
        ThreeApp.AMBIENT_LIGHT_PARAM.color,
        ThreeApp.AMBIENT_LIGHT_PARAM.intensity
      );
      this.scene.add(this.ambientLight);

      // fog
      this.scene.fog = new THREE.Fog(
        ThreeApp.FOG_PARAM.color,
        ThreeApp.FOG_PARAM.near,
        ThreeApp.FOG_PARAM.far
      );

      /**
       * 飛行機の作成
       */
      // ジオメトリ
      this.planeGeometry = new THREE.CylinderGeometry(
        ThreeApp.PLANE_GEOM_PARAM.radiusTop,
        ThreeApp.PLANE_GEOM_PARAM.radiusBottom,
        ThreeApp.PLANE_GEOM_PARAM.height
      );
      // マテリアル
      this.planeMaterial = new THREE.MeshPhongMaterial(
        ThreeApp.PLANE_MAT_PARAM
      );
      this.planeMesh = new THREE.Mesh(this.planeGeometry, this.planeMaterial);
      // グループ化
      // 飛行機の初期位置を設定
      this.planeMesh.position.set(0, 0, ThreeApp.DISTANDE_FROM_SPHERE); // グループ内での相対位置
      // 飛行機の向き
      this.planeMesh.rotation.x = -Math.PI * 0;
      // this.addAxesHelper(this.planeMesh, 5);
      this.planeCurrentDirection = new THREE.Vector3(0.0, 1.0, 0).normalize();
      // 飛行機の向きベクトルデバッグ用
      this.planeArrowHelper = new THREE.ArrowHelper(
        this.planeCurrentDirection,
        this.planeMesh.position,
        5,
        0xff0029
      );
      // this.scene.add(this.planeArrowHelper);
      // ★飛行機に対するカメラの位置
      this.camera.position.set(0, 0, 12); // 飛行機より後ろ、少し上に
      this.scene.add(this.planeMesh);
      this.scene.add(this.camera);

      /**
       * 球体の作成
       */
      // 球体のジオメトリを生成
      this.sphereGeometry = new THREE.SphereGeometry(
        ThreeApp.SPHER_GEOM_PARAM.radius,
        ThreeApp.SPHER_GEOM_PARAM.widthSegments,
        ThreeApp.SPHER_GEOM_PARAM.heightSegments
      );
      // 地球のマテリアルとメッシュ
      this.sphereMaterial = new THREE.MeshPhongMaterial(
        ThreeApp.SPHER_MAT_PARAM
      );
      const textureLoader = new THREE.TextureLoader();
      const earthPath = "/2024-06-11/lroc_color_poles_1k.jpg";
      textureLoader.load(earthPath, (earthTexture) => {
        if (this.sphereMaterial && this.scene) {
          // 地球用
          this.earthTexture = earthTexture;
          this.sphereMaterial.map = this.earthTexture;
          this.sphereMesh = new THREE.Mesh(
            this.sphereGeometry,
            this.sphereMaterial
          );
          this.scene.add(this.sphereMesh);
        }
      });

      // 軸ヘルパー
      const worldAxes = this.createCustomWorldAxesHelper(15, 5);
      // this.scene.add(worldAxes);

      // コントロール
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);

      // Clock オブジェクトの生成 @@@
      if (this.planeMesh) {
        this.clock = new THREE.Clock();
      }

      // this のバインド
      this.render = this.render.bind(this);

      // ウィンドウのリサイズを検出できるようにする
      window.addEventListener(
        "resize",
        () => {
          if (this.renderer && this.camera) {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
          }
        },
        false
      );
    }
  }

  /**
   * 描画処理
   */
  render() {
    if (
      this.renderer &&
      this.scene &&
      this.camera &&
      this.controls &&
      this.clock &&
      this.planeMesh &&
      this.planeCurrentDirection &&
      this.planeArrowHelper
    ) {
      // 恒常ループの設定
      requestAnimationFrame(this.render);

      // this.displayCameraInfo();

      // コントロールを更新
      this.controls.update();

      // 経過時間の取得
      const deltaTime = this.clock.getDelta();

      // 回転角度を更新
      this.rotationAngle += this.rotationSpeed * deltaTime;

      // 現在の位置を保存
      const previousPosition = this.planeMesh.position.clone();
      const previousDirection = this.planeCurrentDirection.clone();
      previousDirection.normalize();

      // 新しい位置を計算（球面上の点）
      const newPosition = this.calculatePlanePosition(this.rotationAngle, "3");

      // 移動ベクトルを計算
      const moveVector = new THREE.Vector3().subVectors(
        newPosition,
        previousPosition
      );
      moveVector.multiplyScalar(10); // スケールを調整

      // 現在の進行方向を更新
      this.planeCurrentDirection.copy(moveVector);
      this.planeCurrentDirection.normalize();

      // 新しい位置に移動
      this.planeMesh.position.copy(newPosition);
      // (C) 変換前と変換後の２つのベクトルから外積で法線ベクトルを求める @@@
      const normalAxis = new THREE.Vector3().crossVectors(
        this.planeMesh.up,
        this.planeCurrentDirection
      );
      normalAxis.normalize();
      // (D) 変換前と変換後のふたつのベクトルから内積でコサインを取り出す
      const cos = this.planeMesh.up.dot(this.planeCurrentDirection);
      // (D) コサインをラジアンに戻す
      const radians = Math.acos(cos);
      let degree = radians * (180 / Math.PI);

      // 求めた法線ベクトルとラジアンからクォータニオンを定義
      const qtn = new THREE.Quaternion().setFromAxisAngle(normalAxis, radians);
      this.planeMesh.quaternion.copy(qtn);
      // 人工衛星の現在のクォータニオンに乗算する
      // console.log(this.planeMesh.quaternion);
      // this.planeMesh.quaternion.premultiply(qtn);
      // // console.log(this.planeMesh.up);
      // this.planeMesh.up.set(
      //   this.planeCurrentDirection.x,
      //   this.planeCurrentDirection.y,
      //   this.planeCurrentDirection.z
      // );
      // console.log(this.planeMesh.up);

      // 飛行機の向きベクトルデバッグ用
      // planeArrowHelperの更新
      this.planeArrowHelper.position.copy(this.planeMesh.position);
      this.planeArrowHelper.setDirection(this.planeCurrentDirection);

      /**
       * カメラの位置も更新する
       */
      const cameraPosition = this.planeMesh.position
        .clone()
        .multiplyScalar(1.8);
      this.camera.position.copy(cameraPosition);
      this.camera.lookAt(this.planeMesh.position);
      this.camera.up.set(
        this.planeCurrentDirection.x,
        this.planeCurrentDirection.y,
        this.planeCurrentDirection.z
      );

      // レンダラーで描画
      this.renderer.render(this.scene, this.camera);
    }
  }

  calculatePlanePosition(rotationAngle: number, mode: string): THREE.Vector3 {
    if (mode == "1") {
      const newPosition = new THREE.Vector3(
        Math.sin(rotationAngle) * ThreeApp.DISTANDE_FROM_SPHERE,
        Math.sin(rotationAngle / 2) * ThreeApp.DISTANDE_FROM_SPHERE,
        Math.cos(rotationAngle) * ThreeApp.DISTANDE_FROM_SPHERE
      );
      return newPosition;
    } else if (mode == "2") {
      const newPosition = new THREE.Vector3(
        0,
        Math.sin(rotationAngle) * ThreeApp.DISTANDE_FROM_SPHERE,
        Math.cos(rotationAngle) * ThreeApp.DISTANDE_FROM_SPHERE
      );
      return newPosition;
    } else if (mode == "3") {
      const phi = rotationAngle;
      const theta = rotationAngle / 2;
      const newPosition = new THREE.Vector3(
        Math.sin(theta) * Math.cos(phi) * ThreeApp.DISTANDE_FROM_SPHERE,
        Math.sin(theta) * Math.sin(phi) * ThreeApp.DISTANDE_FROM_SPHERE,
        Math.cos(theta) * ThreeApp.DISTANDE_FROM_SPHERE
      );
      return newPosition;
    } else {
      return new THREE.Vector3(0, 0, 0);
    }
  }

  // カメラの位置と向きを表示する関数
  displayCameraInfo() {
    if (this.camera && this.controls) {
      const currentPosition = new THREE.Vector3();
      this.camera.getWorldPosition(currentPosition);

      if (!currentPosition.equals(this.previousPosition)) {
        const target = this.controls.target;

        console.log("Camera Position:");
        console.log("  x:", currentPosition.x);
        console.log("  y:", currentPosition.y);
        console.log("  z:", currentPosition.z);

        console.log("Camera LookAt:");
        console.log("  x:", target.x);
        console.log("  y:", target.y);
        console.log("  z:", target.z);

        this.previousPosition.copy(currentPosition);
      }
    }
  }

  resetCameraPosition() {
    if (this.planeCameraGroup) {
      this.camera?.position.set(
        this.planeCameraGroup.position.x,
        this.planeCameraGroup.position.y,
        this.planeCameraGroup.position.z
      );
    }
  }

  addAxesHelper(object: THREE.Object3D, size = 1) {
    const axesHelper = new THREE.AxesHelper(size);
    object.add(axesHelper);
  }

  createCustomWorldAxesHelper(size = 10, lineWidth = 3) {
    const axes = new THREE.Object3D();

    const materials = [
      new THREE.LineBasicMaterial({ color: 0xff00d8, linewidth: lineWidth }), // X軸 (赤)
      new THREE.LineBasicMaterial({ color: 0x009600, linewidth: lineWidth }), // Y軸 (緑)
      new THREE.LineBasicMaterial({ color: 0x00ebf6, linewidth: lineWidth }), // Z軸 (青)
    ];

    const geometries = [
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(size, 0, 0),
      ]),
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, size, 0),
      ]),
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, size),
      ]),
    ];

    for (let i = 0; i < 3; i++) {
      const line = new THREE.Line(geometries[i], materials[i]);
      axes.add(line);
    }

    // 軸ラベルの追加
    const labels = ["X", "Y", "Z"];
    const labelColor = 0x000; // 白色

    for (let i = 0; i < 3; i++) {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = 64;
      canvas.height = 64;
      context!.fillStyle = `#${labelColor.toString(16).padStart(6, "0")}`;
      context!.font = "48px Arial";
      context!.textAlign = "center";
      context!.textBaseline = "middle";
      context!.fillText(labels[i], 32, 32);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(2, 2, 1);
      sprite.position.setComponent(i, size + 1);
      axes.add(sprite);
    }

    return axes;
  }
}
