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
    clearColor: 0xffffff,
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
      release_date: "2024-02-17",
      feat: [
        { role: "voice", name: "初音ミク" },
        { role: "voice", name: "POPY" },
      ],
      Streaming: "https://big-up.style/YSbfQLBazZ",
      MV: "https://www.youtube.com/watch?v=1vzWby09k1k",
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
      feat: [{ role: "voice", name: "星界" }],
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
    {
      title: "星空の夢",
      img_path: "/jacket/hoshizora.jpeg",
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
  touchStartY: number | null = 0; // スマホ等タッチの開始点Y座標
  isTouch: boolean = false;
  isScroll: boolean = false;
  scrollEndTimer: number | null = null;
  scrollSensitivity: number = 0.1;
  windowOrient: string = "";
  textureLoader: THREE.TextureLoader = new THREE.TextureLoader();
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
  planesRadius: number = 0;
  // 円運動モード用の回転角
  planeRotationAngle: number = 0;
  // 直線運動モード用のスクロール量
  scrollOffset: number = 0;
  visiblePlanes: number = 3; // 画面に表示するプレーンの数
  planeRelativeSize: number = 0.8; // プレーンの相対的なサイズ（画面の右半分の40%）
  intersects!: any[]; // 可変長配列の空配列の定義方法
  planeIntersected: boolean = false;
  // 選択中のアルバムのインデックスを保持するための関数プロパティ
  // 関数自体はクラスの呼び出し元で定義しこのクラスに渡される。ここではその型定義のみしている
  // (index: number | null): この関数は引数として number または null 型の index を1つ受け取ります。
  // => void: この関数は void を返します。つまり、戻り値がないことを意味します。
  // | null: これは、onIntersect プロパティが null である可能性があることを示しています。
  onIntersect: ((index: number) => void) | null = null;
  // どのようにplaneを配置するかのフラグ
  planeMode: string = "straight";
  // planeの一辺の値
  planeSize: number = 0;

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   */
  constructor(wrapper: any, onIntersect: (index: number) => void) {
    // クラスの呼び出し元でコンストラクタに受け渡されたコールバック関数をクラスのプロパティに代入
    this.onIntersect = onIntersect;

    if (typeof window !== "undefined") {
      // 画面の縦長/横長を判定
      this.setOrientation();
      console.log(this.windowOrient);

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
      const worldAxes = this.createCustomWorldAxesHelper(1000, 10);
      this.scene.add(worldAxes);

      // コントロール
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);

      /**
       * 板ポリゴンの作成
       */
      this.setPlaneInitialPositions(); // 板ポリゴンの初期配置

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
            if (this.planeMode == "straight") {
              this.updatePlanesSize();
              this.camera.position.z = this.calculateCameraDistance();
            }
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
          const intersects = this.getAndSetIntersectPlanes(
            mouseEvent.clientX,
            mouseEvent.clientY
          );
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
    if (this.renderer && this.scene && this.camera && this.planeGroup) {
      // 恒常ループの設定
      requestAnimationFrame(this.render);

      // this.displayCameraInfo();

      // コントロールを更新
      this.controls?.update();

      // レンダラーで描画
      this.renderer.render(this.scene, this.camera);
    }
  }
  private setupScrollEventListeners() {
    window.addEventListener("wheel", this.handleWheel.bind(this), {
      passive: false,
    });
    window.addEventListener("touchstart", this.handleTouchStart.bind(this), {
      passive: false,
    });
    window.addEventListener("touchmove", this.handleTouchMove.bind(this), {
      passive: false,
    });
    window.addEventListener("touchend", this.handleTouchEnd.bind(this));
  }

  private handleWheel(e: WheelEvent) {
    this.isScroll = true;
    if (this.planeIntersected) {
      e.preventDefault();
      this.planeRotationAngle += e.deltaY * this.scrollSensitivity; //円運動用
      this.scrollOffset += e.deltaY * 0.001; // 直線配置用
      this.updatePlanesPosition();
    }
    this.getAndSetIntersectPlanes(e.clientX, e.clientY);

    // スクロール終了の検知
    if (this.scrollEndTimer !== null) {
      window.clearTimeout(this.scrollEndTimer);
    }
    this.scrollEndTimer = window.setTimeout(() => {
      // スクロール終了時の raycaster 更新
      this.getAndSetIntersectPlanes(e.clientX, e.clientY);
      this.scrollEndTimer = null;
    }, 150);
  }

  private handleTouchStart(e: TouchEvent) {
    e.preventDefault(); // オブジェクト上でのタッチ開始時にデフォルト動作を防ぐ
    this.isTouch = true;
    this.touchStartY = e.touches[0].clientY;
    this.getAndSetIntersectPlanes(e.touches[0].clientX, e.touches[0].clientY);
  }

  private handleTouchMove(e: TouchEvent) {
    if (this.touchStartY === null || !this.planeIntersected) return;
    e.preventDefault(); // オブジェクト上でのタッチ開始時にデフォルト動作を防ぐ
    const touchY = e.touches[0].clientY;
    const deltaY = this.touchStartY - touchY;
    this.planeRotationAngle += deltaY * this.scrollSensitivity;
    this.touchStartY = touchY;
    this.updatePlanesPosition();
    this.getAndSetIntersectPlanes(e.touches[0].clientX, e.touches[0].clientY);
  }

  private handleTouchEnd() {
    this.isTouch = false;
    this.touchStartY = null;
  }

  private setPlaneRadius() {
    if (this.windowOrient == "Portrait") {
      const result = 1;
      return result;
    } else if (this.windowOrient == "Landscape") {
      const result = 1;
      return result;
    } else {
      throw new Error("Invalid window orientation");
    }
  }

  // 板の配置の初期値を、モードによって切り替え取得する
  private setPlaneInitialPositions() {
    if (this.planeMode == "rotation") {
      this.planeGeometry = new THREE.PlaneGeometry(1.5, 1.5);
      // 回転半径を画面サイズに応じて変更
      this.planesRadius = this.setPlaneRadius();
      ThreeApp.DISCOGRAPHY_DATA.forEach((data, i) => {
        const material = new THREE.MeshPhongMaterial();
        const texture = this.textureLoader.load(data.img_path);
        material.map = texture;
        // メッシュ
        const plane = new THREE.Mesh(this.planeGeometry, material);
        plane.name = `${i}`;
        let radian = (i * 2 * Math.PI) / ThreeApp.DISCOGRAPHY_DATA.length;
        const initialPosition = new THREE.Vector3(
          0.75,
          Math.sin(radian) * this.planesRadius,
          Math.cos(radian) * this.planesRadius
        );
        plane.position.copy(initialPosition);
        this.initialPositions.push(initialPosition);
        this.planeGroup.add(plane);
        this.planeArray.push(plane);
      });
      this.scene.add(this.planeGroup);
    } else if (this.planeMode == "straight") {
      this.calculateAndSetPlaneSize(); // 初期サイズを設定
      this.planeGeometry = new THREE.PlaneGeometry(
        this.planeSize,
        this.planeSize
      );
      const totalPlanes = ThreeApp.DISCOGRAPHY_DATA.length;
      const middleIndex = Math.floor(totalPlanes / 2);

      ThreeApp.DISCOGRAPHY_DATA.forEach((data, i) => {
        const material = new THREE.MeshPhongMaterial();
        const texture = this.textureLoader.load(data.img_path);
        material.map = texture;
        // メッシュ
        const plane = new THREE.Mesh(this.planeGeometry, material);
        plane.name = `${i}`;
        const y = (i - middleIndex) * this.planeSize;
        const x = this.planeSize / (2 * this.planeRelativeSize);
        plane.position.set(x, y, 0);
        this.planeGroup.add(plane);
        this.planeArray.push(plane);
      });
      this.scene.add(this.planeGroup);

      const fov = 60;
      let aspect = window.innerWidth / window.innerHeight;
      if (600 < window.innerHeight) {
        aspect = window.innerWidth / 600;
      }
      const near = 0.1;
      const far = 1000;
      this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
      this.camera.position.x = this.planeSize / (2 * this.planeRelativeSize);
      this.camera.position.z = this.calculateCameraDistance();
    }
  }

  // 直線運動の際のカメラの距離を計算
  calculateCameraDistance() {
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const aspectRatio = window.innerWidth / window.innerHeight;

    // 縦長か横長かで計算方法を変える
    if (this.windowOrient === "Portrait") {
      // 縦長の場合、幅に対する相対サイズを使用
      return this.planeSize / 2 / Math.tan(vFov / 2) / aspectRatio;
    } else {
      // 横長の場合、高さに対する相対サイズを使用
      return this.planeSize / 2 / Math.tan(vFov / 2) / aspectRatio;
    }
  }
  // 直線運動の際のplaneの大きさを計算
  calculateAndSetPlaneSize() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    // windowOrientを使用してプレーンのサイズを計算
    this.planeSize = (screenWidth / 2) * this.planeRelativeSize;
    // this.windowOrient === "Landscape"
    //   ? screenHeight * this.planeRelativeSize
    //   : (screenWidth / 2) * this.planeRelativeSize;
  }

  private updatePlanesPosition() {
    if (this.planeMode == "rotation") {
      this.planeArray.forEach((plane, index) => {
        const initialPosition = this.initialPositions[index];
        const movedPosition = this.rotationPlanesByOrient(
          initialPosition,
          this.planeRotationAngle
        );
        plane.position.set(movedPosition.x, movedPosition.y, movedPosition.z);
      });
    } else if (this.planeMode == "straight") {
      const totalHeight = this.planeArray.length * this.planeSize;
      const halfVisibleHeight = (this.visiblePlanes * this.planeSize) / 2;

      this.planeArray.forEach((plane, index) => {
        let y =
          (index - Math.floor(this.planeArray.length / 2)) * this.planeSize -
          this.scrollOffset;

        // 無限スクロールの実装
        while (y < -halfVisibleHeight - this.planeSize / 2) {
          y += totalHeight;
        }
        while (y > halfVisibleHeight + this.planeSize / 2) {
          y -= totalHeight;
        }

        plane.position.setY(y);
      });

      // スクロールオフセットをリセット（無限スクロール効果を維持）
      if (Math.abs(this.scrollOffset) > this.planeSize) {
        this.scrollOffset %= this.planeSize;
      }
    }
  }

  updatePlanesSize() {
    this.calculateAndSetPlaneSize();

    this.planeArray.forEach((plane) => {
      //plane.scale.set(1, 1, 1); // スケールをリセット
      plane.geometry = new THREE.PlaneGeometry(this.planeSize, this.planeSize);
    });

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

  private setOrientation() {
    const portrait = window.innerHeight > window.innerWidth;
    // ここで向きに応じた処理を行う
    if (portrait) {
      // console.log("縦長画面になりました");
      // 縦長画面用の処理
      this.windowOrient = "Portrait";
    } else {
      // console.log("横長画面になりました");
      // 横長画面用の処理
      this.windowOrient = "Landscape";
    }
  }

  setupScrollAnimation() {
    ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        // スクロール量に基づいて回転角度を計算
        const progress = self.progress;
        this.planeRotationAngle = progress * Math.PI * 2; // 1回転
        // プレーンの位置を更新
        this.updatePlanesPosition();
      },
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

  private getAndSetIntersectPlanes(clientX: number, clientY: number): any[] {
    // スクリーン空間の座標系をレイキャスター用に正規化する（-1.0 ~ 1.0 の範囲）
    const x = (clientX / window.innerWidth) * 2.0 - 1.0;
    const y = (clientY / window.innerHeight) * 2.0 - 1.0;
    // スクリーン空間は上下が反転している点に注意（Y だけ符号を反転させる）
    const v = new THREE.Vector2(x, -y);
    // レイキャスターに正規化済みマウス座標とカメラを指定する
    this.raycaster.setFromCamera(v, this.camera);
    const intersects = this.raycaster.intersectObjects(this.planeArray);

    if (0 < intersects.length) {
      const intersectIndex = Number(intersects[0].object.name);
      console.log("intersected!", intersectIndex);
      // クラスの呼び出し元から渡される関数を使用
      // &&で繋げているのは、関数の存在確認と関数の実行を同時に行なっている
      this.onIntersect && this.onIntersect(intersectIndex);
      this.planeIntersected = true;
    } else {
      this.planeIntersected = false;
    }
    return intersects;
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
