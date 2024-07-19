"use client";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default class ThreeApp {
  /**
   * シーン共通パラメータ（クラス定義）
   */
  static CAMERA_PARAM = {
    fovy: 60,
    aspect: 0, // window定義後にコンストラクタで再代入
    near: 0.1,
    far: 150.0,
    position: new THREE.Vector3(0, 0, 4),
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
    position: new THREE.Vector3(0, 0, 20),
  };
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 1.0,
  };
  /**
   * ディスコグラフィのデータ定義
   */
  static DISCOGRAPHY_DATA = [
    {
      title: "unlosted",
      img_path: "/jacket/unlosted.jpg",
      release_date: "",
      feat: [
        { role: "", name: "" },
        { role: "", name: "" },
      ],
      Streaming: "",
      MV: "",
    },
    {
      title: "last uncore",
      img_path: "/jacket/last_uncore.jpg",
      release_date: "",
      feat: [
        { role: "", name: "" },
        { role: "", name: "" },
      ],
      Streaming: "",
      MV: "",
    },
    {
      title: "メロンソーダ",
      img_path: "/jacket/meronsoda.jpg",
      release_date: "",
      feat: [
        { role: "", name: "" },
        { role: "", name: "" },
      ],
      Streaming: "",
      MV: "",
    },
    {
      title: "明快ラビリンス",
      img_path: "/jacket/meikai.jpg",
      release_date: "",
      feat: [
        { role: "", name: "" },
        { role: "", name: "" },
      ],
      Streaming: "",
      MV: "",
    },
    {
      title: "キミイロパレット",
      img_path: "/jacket/kimiiro.jpg",
      release_date: "",
      feat: [
        { role: "", name: "" },
        { role: "", name: "" },
      ],
      Streaming: "",
      MV: "",
    },
  ];
  static IMG_DATA_LIST: THREE.Texture[] = [];

  /**
   * プロパティ
   */
  // 共通
  renderer: THREE.WebGLRenderer | undefined;
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  previousPosition = new THREE.Vector3();
  directionalLight: THREE.DirectionalLight | undefined;
  ambientLight: THREE.AmbientLight | undefined;
  controls: OrbitControls | undefined;
  axesHelper: THREE.AxesHelper | undefined;
  models: THREE.Object3D[] = [];
  clock: THREE.Clock | undefined;
  raycaster: THREE.Raycaster = new THREE.Raycaster();
  touchStartY: number = 0;
  scrollSensitivity: number = 0.1;
  windowOrient: string = "";
  /**
   * 板ポリゴン
   */
  planeGeometry: THREE.BufferGeometry | undefined;
  planeArray: THREE.Mesh[] = [];
  planeGroup: THREE.Group = new THREE.Group();
  material: THREE.MeshPhongMaterial = new THREE.MeshPhongMaterial();
  imgMaterial: THREE.MeshPhongMaterial = new THREE.MeshPhongMaterial();
  planeArrowHelpers: THREE.Group = new THREE.Group();
  initialPositions: THREE.Vector3[] = [];
  planesRadius: number = 1;
  planeRotationAngle: number = 0;
  intersects!: any[]; // 可変長配列の空配列の定義方法
  planeIntersected: boolean = false;
  // 選択中のアルバムのインデックスを保持するための関数プロパティ
  // 関数自体はクラスの呼び出し元で定義しこのクラスに渡される。ここではその型定義のみしている
  // (index: number | null): この関数は引数として number または null 型の index を1つ受け取ります。
  // => void: この関数は void を返します。つまり、戻り値がないことを意味します。
  // | null: これは、onIntersect プロパティが null である可能性があることを示しています。
  onIntersect: ((index: number | null) => void) | null = null;

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   */
  constructor(wrapper: any, onIntersect: (index: number | null) => void) {
    // クラスの呼び出し元でコンストラクタに受け渡されたコールバック関数をクラスのプロパティに代入
    this.onIntersect = onIntersect;

    if (typeof window !== "undefined") {
      // 画面の縦長/横長を判定
      this.setOrientation();

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

      // 軸ヘルパー
      const worldAxes = this.createCustomWorldAxesHelper(15, 5);
      this.scene.add(worldAxes);

      // コントロール
      // this.controls = new OrbitControls(this.camera, this.renderer.domElement);

      /**
       * 板ポリゴンの作成
       */
      this.planeGeometry = new THREE.PlaneGeometry(1.5, 1.5);
      const textureLoader = new THREE.TextureLoader();
      ThreeApp.DISCOGRAPHY_DATA.forEach((data, i) => {
        this.imgMaterial = this.material.clone();
        const texture = textureLoader.load(data.img_path);
        this.imgMaterial.map = texture;
        // メッシュ
        const plane = new THREE.Mesh(this.planeGeometry, this.imgMaterial);
        plane.name = `${i}`;
        let radian = (i * 2 * Math.PI) / ThreeApp.DISCOGRAPHY_DATA.length;
        const initialPosition = new THREE.Vector3(
          0,
          Math.sin(radian) * this.planesRadius,
          Math.cos(radian) * this.planesRadius
        );
        plane.position.copy(initialPosition);
        this.initialPositions.push(initialPosition);
        this.planeGroup.add(plane);
        this.planeArray.push(plane);

        // 向きベクトルデバッグ用
        // これをつけるとraycasterが全て最前面が適用されてしまうので注意
        // this.addAxesHelper(plane, 5);
      });
      // this.scene.add(this.planeArrowHelpers);
      this.scene.add(this.planeGroup);

      this.clock = new THREE.Clock();

      /**
       * スクロールイベント関連
       */
      // GSAPのScrollTriggerプラグインを登録
      gsap.registerPlugin(ScrollTrigger);
      // スクロールイベントの設定
      this.setupScrollAnimation();

      // this のバインド
      this.render = this.render.bind(this);

      /**
       * window関連イベント定義
       */
      // ウィンドウのリサイズを検出できるようにする
      window.addEventListener(
        "resize",
        () => {
          if (this.renderer && this.camera) {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
          }
          this.setOrientation();
        },
        false
      );

      this.onIntersect = onIntersect;
      window.addEventListener(
        "mousemove",
        (mouseEvent) => {
          // スクリーン空間の座標系をレイキャスター用に正規化する（-1.0 ~ 1.0 の範囲）
          const x = (mouseEvent.clientX / window.innerWidth) * 2.0 - 1.0;
          const y = (mouseEvent.clientY / window.innerHeight) * 2.0 - 1.0;
          // スクリーン空間は上下が反転している点に注意（Y だけ符号を反転させる）
          const v = new THREE.Vector2(x, -y);
          // レイキャスターに正規化済みマウス座標とカメラを指定する
          this.raycaster.setFromCamera(v, this.camera);
          const intersects = this.raycaster.intersectObjects(this.planeArray);

          // console.log(this.planeArray.length, intersects.length);
          if (0 < intersects.length) {
            const intersectIndex = Number(intersects[0].object.name);
            console.log(
              intersectIndex,
              ThreeApp.DISCOGRAPHY_DATA[intersectIndex].title
            );
            // クラスの呼び出し元から渡される関数を使用
            // &&で繋げているのは、関数の存在確認と関数の実行を同時に行なっている
            this.onIntersect && this.onIntersect(intersectIndex);
            this.planeIntersected = true;
          } else {
            this.onIntersect && this.onIntersect(null);
            this.planeIntersected = false;
            console.log("not intersected.");
          }
        },
        false
      );

      this.setupScrollEventListeners();
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
      // this.controls &&
      this.planeGroup &&
      this.clock
    ) {
      // 恒常ループの設定
      requestAnimationFrame(this.render);

      // this.displayCameraInfo();

      // 経過時間の取得
      const deltaTime = this.clock.getDelta();
      // 回転角度（ラジアン）
      const rotationAngle = this.clock.getElapsedTime() * 0.5; // 0.5は回転速度
      // 各プレーンを回転
      this.planeArray.forEach((plane, index) => {
        const initialPosition = this.initialPositions[index];

        // 初期位置を基準に回転した新しい位置を計算
        const movedPosition = this.rotationPlanesByOrient(
          initialPosition,
          rotationAngle
        );
        // プレーンの位置を更新
        // plane.position.set(movedPosition.x, movedPosition.y, movedPosition.z);
      });

      // コントロールを更新
      // this.controls.update();

      // レンダラーで描画
      this.renderer.render(this.scene, this.camera);
    }
  }
  private setupScrollEventListeners() {
    window.addEventListener("wheel", this.handleWheel.bind(this), {
      passive: false,
    });
    window.addEventListener("touchstart", this.handleTouchStart.bind(this));
    window.addEventListener("touchmove", this.handleTouchMove.bind(this));
  }

  private handleWheel(e: WheelEvent) {
    e.preventDefault();
    if (this.planeIntersected) {
      this.planeRotationAngle += e.deltaY * this.scrollSensitivity;
      this.updatePlanesPosition();
    }
  }

  private handleTouchStart(e: TouchEvent) {
    this.touchStartY = e.touches[0].clientY;
  }

  private handleTouchMove(e: TouchEvent) {
    if (this.touchStartY === null || !this.planeIntersected) return;
    const touchY = e.touches[0].clientY;
    const deltaY = this.touchStartY - touchY;
    this.planeRotationAngle += deltaY * this.scrollSensitivity;
    this.touchStartY = touchY;
    this.updatePlanesPosition();
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

  addAxesHelper(object: THREE.Object3D, size = 1) {
    const axesHelper = new THREE.AxesHelper(size);
    object.add(axesHelper);
  }

  setOrientation() {
    const portrait = window.innerHeight > window.innerWidth;
    // ここで向きに応じた処理を行う
    if (portrait) {
      console.log("縦長画面になりました");
      // 縦長画面用の処理
      this.windowOrient = "Portrait";
    } else {
      console.log("横長画面になりました");
      // 横長画面用の処理
      this.windowOrient = "Landscape";
    }
  }

  setupScrollAnimation() {
    console.log("Setting up scroll animation"); // デバッグ用

    ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        // スクロール量に基づいて回転角度を計算
        const progress = self.progress;
        this.planeRotationAngle = progress * Math.PI * 2; // 1回転
        console.log("Scroll progress:", progress); // デバッグ用
        console.log("Rotation angle:", this.planeRotationAngle); // デバッグ用
        // プレーンの位置を更新
        this.updatePlanesPosition();
      },
    });
  }

  updatePlanesPosition() {
    this.planeArray.forEach((plane, index) => {
      const initialPosition = this.initialPositions[index];
      const movedPosition = this.rotationPlanesByOrient(
        initialPosition,
        this.planeRotationAngle
      );
      console.log(`Updating plane ${index} position:`, movedPosition); // デバッグ用

      // GSAPを使用してスムーズにアニメーション
      // gsap.to(plane.position, {
      //   x: movedPosition.x,
      //   y: movedPosition.y,
      //   z: movedPosition.z,
      //   duration: 0.5,
      //   // ease: "power2.out",
      // });
      // GSAPを使用せずに直接位置を更新
      plane.position.set(movedPosition.x, movedPosition.y, movedPosition.z);
    });
  }

  rotationPlanesByOrient(
    initialPosition: THREE.Vector3,
    rotationAngle: number
  ): { x: number; y: number; z: number } {
    if (this.windowOrient == "Portrait") {
      const result = {
        x: initialPosition.x,
        y:
          initialPosition.y * Math.cos(rotationAngle) -
          initialPosition.z * Math.sin(rotationAngle),
        z:
          initialPosition.y * Math.sin(rotationAngle) +
          initialPosition.z * Math.cos(rotationAngle),
      };
      return result;
    } else if (this.windowOrient == "Landscape") {
      const result = {
        x: initialPosition.x,
        y:
          initialPosition.y * Math.cos(rotationAngle) -
          initialPosition.z * Math.sin(rotationAngle),
        z:
          initialPosition.y * Math.sin(rotationAngle) +
          initialPosition.z * Math.cos(rotationAngle),
      };
      return result;
    } else {
      throw new Error("Invalid window orientation");
    }
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
