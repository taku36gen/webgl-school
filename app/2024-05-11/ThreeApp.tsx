"use client";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

export default class ThreeApp {
  static CAMERA_PARAM:
    | {
        fovy: number;
        aspect: number;
        near: number;
        far: number;
        position: THREE.Vector3;
        lookAt: THREE.Vector3;
      }
    | undefined;

  static RENDERER_PARAM:
    | {
        clearColor: number;
        width: number;
        height: number;
      }
    | undefined;

  static DIRECTIONAL_LIGHT_PARAM:
    | {
        color: number;
        intensity: number;
        position: THREE.Vector3;
      }
    | undefined;

  static AMBIENT_LIGHT_PARAM:
    | {
        color: number;
        intensity: number;
      }
    | undefined;

  static MATERIAL_PARAM:
    | {
        color: number;
      }
    | undefined;

  renderer: THREE.WebGLRenderer | undefined;
  scene: THREE.Scene | undefined;
  camera: THREE.PerspectiveCamera | undefined;
  directionalLight: THREE.DirectionalLight | undefined;
  ambientLight: THREE.AmbientLight | undefined;
  material: THREE.MeshPhongMaterial | undefined;
  Geometry: THREE.BufferGeometry | undefined;
  meshArray: THREE.Mesh[] = [];
  controls: OrbitControls | undefined;
  axesHelper: THREE.AxesHelper | undefined;
  initialPositions: [number, number, number][] | undefined;
  isDown = false;
  models: THREE.Object3D[] = [];

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   */
  constructor(wrapper: any) {
    if (typeof window !== "undefined") {
      // クラス定数の定義をクライアントサイドで行う
      ThreeApp.CAMERA_PARAM = {
        // fovy は Field of View Y のことで、縦方向の視野角を意味する
        fovy: 60,
        aspect: window.innerWidth / window.innerHeight,
        // 描画する空間のニアクリップ面（最近面）
        near: 0.1,
        // 描画する空間のファークリップ面（最遠面）
        far: 20.0,
        position: new THREE.Vector3(0.0, 2.0, 10.0),
        lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
      };
      ThreeApp.RENDERER_PARAM = {
        clearColor: 0x8dedbd,
        width: window.innerWidth,
        height: window.innerHeight,
      };
      ThreeApp.DIRECTIONAL_LIGHT_PARAM = {
        color: 0xffffff,
        intensity: 1.0,
        position: new THREE.Vector3(1.0, 1.0, 1.0),
      };
      ThreeApp.AMBIENT_LIGHT_PARAM = {
        color: 0xffffff,
        intensity: 0.1,
      };
      ThreeApp.MATERIAL_PARAM = {
        color: 0xfae9cd,
      };

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
      this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

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

      // マテリアル
      this.material = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);

      // 共通のジオメトリ、マテリアルから、複数のメッシュインスタンスを作成する @@@
      const meshCount = 125;
      const transformScale = 5.0;
      this.Geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
      this.meshArray = [];
      this.initialPositions = [];

      // メッシュの初期位置を定義
      // 球状に配置するとき
      // const radius = 5;
      // for (let i = 0; i < meshCount; i++) {
      //   const theta = Math.random() * Math.PI * 2;
      //   const phi = Math.acos(2 * Math.random() - 1);

      //   const x = radius * Math.sin(phi) * Math.cos(theta);
      //   const y = radius * Math.sin(phi) * Math.sin(theta);
      //   const z = radius * Math.cos(phi);

      //   this.initialPositions?.push([x, y, z]);
      // }

      // グリッド状に配置
      const gridSize = 5;
      const spacing = 0.2;
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          for (let k = 0; k < gridSize; k++) {
            const x = i * spacing + (Math.random() - 0.5) * spacing;
            const y = j * spacing + (Math.random() - 0.5) * spacing;
            const z = k * spacing + (Math.random() - 0.5) * spacing;
            this.initialPositions?.push([x, y, z]);
          }
        }
      }

      // メッシュを連続生成
      if (this.initialPositions) {
        for (let i = 0; i < meshCount; ++i) {
          // トーラスメッシュのインスタンスを生成
          const torus = new THREE.Mesh(this.Geometry, this.material);
          // 座標をランダムに散らす
          torus.position.x = this.initialPositions[i][0];
          torus.position.y = this.initialPositions[i][1];
          torus.position.z = this.initialPositions[i][2];
          // シーンに追加する
          // this.scene.add(torus);
          // 配列に入れておく
          this.meshArray.push(torus);
        }
      }

      // 軸ヘルパー
      const axesBarLength = 5.0;
      this.axesHelper = new THREE.AxesHelper(axesBarLength);
      this.scene.add(this.axesHelper);

      // コントロール
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);

      // this のバインド
      this.render = this.render.bind(this);

      /*
       * 3Dモデルを読み込む
       *
       *
       */
      // モデル読み込みローダー
      const loader = new GLTFLoader();

      // モデルをロードし、シーンに追加
      loader.load(
        "models/DogRobot.glb",
        (gltf) => {
          const dogNum = 101;
          const range = 30;
          const model = gltf.scene;
          this.models.push(model);
          // モデルのスケールと位置を調整
          model.scale.set(0.2, 0.2, 0.2);
          model.position.set(0, 0, 0);

          for (let i = 1; i <= dogNum; i++) {
            const clone = model.clone();
            const x = Math.random() * range - range / 2;
            const y = Math.random() * range - range / 2;
            const z = Math.random() * range - range / 2;
            clone.position.set(x, y, z);
            this.models.push(clone);
          }

          if (this.scene) {
            for (let i = 1; i <= dogNum; i++) {
              this.scene.add(this.models[i]);
            }
          }

          // モデルの読み込みが完了してから、レンダリングループを開始
          this.render();
        },
        undefined,
        (error) => {
          console.error("An error happened", error);
        }
      );

      // キーの押下状態を保持するフラグ
      this.isDown = false;

      // キーの押下や離す操作を検出できるようにする
      window.addEventListener(
        "keydown",
        (keyEvent) => {
          switch (keyEvent.key) {
            case " ":
              this.isDown = true;
              break;
            default:
          }
        },
        false
      );
      window.addEventListener(
        "keyup",
        (keyEvent) => {
          this.isDown = false;
        },
        false
      );

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
    if (this.renderer && this.scene && this.camera && this.controls) {
      // 恒常ループの設定
      requestAnimationFrame(this.render);

      // コントロールを更新
      this.controls.update();

      // フラグに応じてオブジェクトの状態を変化させる
      if (this.isDown === true) {
        // Y 軸回転 @@@
        this.meshArray.forEach((torus) => {
          torus.rotation.y += 0.05;
        });
      }

      // レンダラーで描画
      this.renderer.render(this.scene, this.camera);
    }
  }
}
