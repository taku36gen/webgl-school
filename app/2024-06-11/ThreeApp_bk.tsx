"use client";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

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
    color: 0xffffff,
    intensity: 1.0,
    position: new THREE.Vector3(0, 100, 0),
  };
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 1.0,
  };
  /**
   * 飛行機オブジェクトパラメータ
   */
  static PLANE_GEOM_PARAM = {
    radiusTop: 0,
    radiusBottom: 2,
    height: 4,
  };
  static PLANE_MAT_PARAM = {
    color: 0xffffff,
  };
  static DISTANDE_FROM_SPHERE = 6;
  /**
   * 球体オブジェクトパラメータ
   */
  static SPHER_GEOM_PARAM = {
    radius: 5,
    widthSegments: 64,
    heightSegments: 32,
  };
  static SPHER_MAT_PARAM = {
    color: 0xffffff,
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
  // 飛行機とカメラを一体として扱うためのグループ
  planeCameraGroup: THREE.Group | undefined;
  startAngle: number | undefined;
  rotationAngle: number = 0;
  rotationSpeed: number = 0.5;
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

      // アンビエントライト（環境光）
      this.ambientLight = new THREE.AmbientLight(
        ThreeApp.AMBIENT_LIGHT_PARAM.color,
        ThreeApp.AMBIENT_LIGHT_PARAM.intensity
      );
      this.scene.add(this.ambientLight);

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
      this.planeMesh.position.set(0, 0, 0); // グループ内での相対位置
      this.addAxesHelper(this.planeMesh, 5);
      // カメラの位置を飛行機のz軸後方に設定したい
      this.camera.position.set(0, 0, 10); // 飛行機より後ろ、少し上に
      // this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);
      // this.scene.add(this.planeMesh);
      // カメラとグループ化する
      this.planeCameraGroup = new THREE.Group();
      this.planeCameraGroup.add(this.planeMesh);
      this.planeCameraGroup.add(this.camera);
      // グループの初期位置を設定
      this.planeCameraGroup.position.set(0, 0, ThreeApp.DISTANDE_FROM_SPHERE);
      this.scene.add(this.planeCameraGroup);
      this.addAxesHelper(this.planeCameraGroup, 100);

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
      const earthPath = "/tex/earth.jpg";
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
      const axesBarLength = 100.0;
      this.axesHelper = new THREE.AxesHelper(axesBarLength);
      this.scene.add(this.axesHelper);

      // コントロール
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);

      // Clock オブジェクトの生成 @@@
      if (this.planeCameraGroup) {
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
      this.planeCameraGroup &&
      this.planeMesh
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
      // console.log(this.rotationAngle);

      //新しい位置を計算（初期位置が(0, 0, DISTANCE)であることを考慮）
      const y = Math.sin(this.rotationAngle) * ThreeApp.DISTANDE_FROM_SPHERE;
      const z = Math.cos(this.rotationAngle) * ThreeApp.DISTANDE_FROM_SPHERE;
      // console.log(y, z);
      // console.log(this.planeMesh.position);
      // console.log(this.camera.position);

      //planeCameraGroupの位置を更新
      // this.planeCameraGroup.position.set(0, 5, 5);

      // ジェット機の向きを中心に向ける
      this.planeCameraGroup.lookAt(0, 0, 0);
      // this.camera.lookAt(0, 0, 0);

      console.log(
        "Camera Position:",
        "x:",
        this.camera.position.x,
        "y:",
        this.camera.position.y,
        "z:",
        this.camera.position.z
      );
      let direction = new THREE.Vector3();
      this.camera.getWorldDirection(direction);
      console.log(
        "Camera Direction:",
        "x:",
        direction.x,
        "y:",
        direction.y,
        "z:",
        direction.z
      );

      direction = new THREE.Vector3();
      this.planeCameraGroup.getWorldDirection(direction);
      console.log(
        "Group Direction:",
        "x:",
        direction.x,
        "y:",
        direction.y,
        "z:",
        direction.z
      );

      // 上方向を設定（進行方向を維持）
      //　this.planeCameraGroup.up.set(1, 0, 0);

      // レンダラーで描画
      this.renderer.render(this.scene, this.camera);
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
}
