"use client";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

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
  torusGeometry: THREE.TorusGeometry | undefined;
  torusArray: THREE.Mesh[] = [];
  controls: OrbitControls | undefined;
  axesHelper: THREE.AxesHelper | undefined;
  isDown = false;

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
        clearColor: 0x666666,
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
        color: 0x3399ff,
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
      const torusCount = 10;
      const transformScale = 5.0;
      this.torusGeometry = new THREE.TorusGeometry(0.5, 0.2, 8, 16);
      this.torusArray = [];
      for (let i = 0; i < torusCount; ++i) {
        // トーラスメッシュのインスタンスを生成
        const torus = new THREE.Mesh(this.torusGeometry, this.material);
        // 座標をランダムに散らす
        torus.position.x = (Math.random() * 2.0 - 1.0) * transformScale;
        torus.position.y = (Math.random() * 2.0 - 1.0) * transformScale;
        torus.position.z = (Math.random() * 2.0 - 1.0) * transformScale;
        // シーンに追加する
        this.scene.add(torus);
        // 配列に入れておく
        this.torusArray.push(torus);
      }

      // 軸ヘルパー
      const axesBarLength = 5.0;
      this.axesHelper = new THREE.AxesHelper(axesBarLength);
      this.scene.add(this.axesHelper);

      // コントロール
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);

      // this のバインド
      this.render = this.render.bind(this);

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
        this.torusArray.forEach((torus) => {
          torus.rotation.y += 0.05;
        });
      }

      // レンダラーで描画
      this.renderer.render(this.scene, this.camera);
    }
  }
}
