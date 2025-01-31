"use client";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";

export default class ThreeApp {
  private containerRef: React.RefObject<HTMLDivElement>;

  /**
   * シーン共通パラメータ（クラス定義）
   */
  static CAMERA_PARAM = {
    fovy: 60,
    aspect: 0, // window定義後にコンストラクタで再代入
    near: 0.1,
    far: 150.0,
    position: new THREE.Vector3(0, 0, 4),
    lookAt: new THREE.Vector3(0, 0.0, 0.0),
  };
  static RENDERER_PARAM = {
    clearColor: 0x1f66c0,
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
  raycaster: THREE.Raycaster = new THREE.Raycaster();
  touchStartY: number | null = 0; // スマホ等タッチの開始点Y座標
  isTouch: boolean = false;
  isScroll: boolean = false;
  scrollEndTimer: number | null = null;
  scrollSensitivity: number = 0.9;
  windowOrient: string = "";
  textureLoader: THREE.TextureLoader = new THREE.TextureLoader();
  rect: DOMRect | undefined;
  /**
   * 板ポリゴン
   */
  planeGeometry: THREE.BufferGeometry | undefined;
  planeArray: THREE.Mesh[] = [];
  planeGroup: THREE.Group = new THREE.Group();
  planeArrowHelpers: THREE.Group = new THREE.Group();
  initialPositions: THREE.Vector3[] = [];
  // 円運動モード用
  planesRadius: number = 0;
  planeRotationAngle: number = 0;
  //////////////
  // 直線運動モード用
  scrollOffset: number = 0;
  planeRelativeSize: number = 1.3; // プレーンの相対的なサイズ（画面の右半分の40%）
  //////////////
  // intersect関連
  intersects!: any[]; // 可変長配列の空配列の定義方法
  planeIntersected: boolean = false;
  selectedIndex: number | null = null; // 選択中のアルバムのインデックスを保持 // 最初はnull
  highlightScale: number = 1.3; // ハイライト中の拡大スケール
  gsapTimeline: gsap.core.Timeline = gsap.timeline(); // gsapのタイムライン
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
  constructor(
    wrapper: any,
    containerRef: React.RefObject<HTMLDivElement>,
    onIntersect: (index: number) => void
  ) {
    // クラスの呼び出し元でコンストラクタに受け渡されたコールバック関数をクラスのプロパティに代入
    this.onIntersect = onIntersect;

    // 親要素(wrapperで保持)の情報を受け取る
    this.rect = wrapper.getBoundingClientRect();
    // three.jsのcanvasの親要素への参照を保持
    this.containerRef = containerRef;

    if (typeof window !== "undefined" && this.rect) {
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
      this.renderer.setSize(this.rect.width, this.rect.height);
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

      // 軸ヘルパー
      // const worldAxes = this.createCustomWorldAxesHelper(1000, 10);
      // this.scene.add(worldAxes);

      // コントロール
      // this.controls = new OrbitControls(this.camera, this.renderer.domElement);

      /**
       * 板ポリゴンの作成
       */
      this.setPlaneInitialPositions(); // 板ポリゴンの初期配置

      // this のバインド
      this.render = this.render.bind(this);

      /**
       * window関連イベント定義
       */
      // ウィンドウのリサイズを検出できるようにする
      window.addEventListener(
        "resize",
        () => {
          if (this.renderer && this.camera && this.containerRef.current) {
            this.rect = this.containerRef.current.getBoundingClientRect();
            const width = this.rect.width;
            const height = Math.min(this.rect.height, 650); // 最大高さを600pxに制限

            this.renderer.setSize(width, height);
            this.camera.aspect = width / height;

            if (this.planeMode === "straight") {
              this.updatePlanesWithResizes();
              // ハイライト状態を元に戻す
              this.highlightAndSetSelectedPlane(null, true);
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
      // this.renderer.render(this.scene, this.orthograpohicCamera);
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
    this.getAndSetIntersectPlanes(e.clientX, e.clientY);
    // console.log("scrolled!");
    if (this.planeIntersected) {
      e.preventDefault();
      // console.log(e.deltaY);
      this.planeRotationAngle += e.deltaY * this.scrollSensitivity; //円運動用
      this.scrollOffset += e.deltaY * this.scrollSensitivity; // 直線配置用
      console.log(this.scrollOffset);
      this.updatePlanesPosition();
    }

    // スクロール終了の検知
    if (this.scrollEndTimer !== null) {
      window.clearTimeout(this.scrollEndTimer);
    }
    this.scrollEndTimer = window.setTimeout(() => {
      // スクロール終了時の raycaster 更新
      this.getAndSetIntersectPlanes(e.clientX, e.clientY);
      this.scrollEndTimer = null;
      this.isScroll = false;
      // console.log("scrolleEnd...");
    }, 300);
  }

  private handleTouchStart(e: TouchEvent) {
    // console.log("touchStarted!");
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
    // rotationモード用
    this.planeRotationAngle += deltaY * this.scrollSensitivity;
    // straightモード用
    this.scrollOffset += deltaY * this.scrollSensitivity; // スクロール方向を反転
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
          1.2,
          Math.sin(radian) * this.planesRadius,
          Math.cos(radian) * this.planesRadius
        );
        plane.position.copy(initialPosition);
        this.initialPositions.push(initialPosition);
        this.planeGroup.add(plane);
        this.planeArray.push(plane);
      });
      this.scene.add(this.planeGroup);
    } else if (this.planeMode == "straight" && this.rect) {
      // planeSizeの設定
      this.planeSize = (this.rect.width / 2) * this.planeRelativeSize;
      // console.log(this.planeSize);
      if (300 < this.planeSize) {
        this.planeSize = 300;
      }

      this.planeGeometry = new THREE.PlaneGeometry(
        this.planeSize,
        this.planeSize
      );

      ThreeApp.DISCOGRAPHY_DATA.forEach((data, i) => {
        const material = new THREE.MeshPhongMaterial();
        const texture = this.textureLoader.load(data.img_path);
        material.map = texture;
        // メッシュ
        const plane = new THREE.Mesh(this.planeGeometry, material);
        plane.name = `${i}`;
        // y座標はplaneSizeごとに下に一つずつずらし、余白は設けない
        const y = i * -1 * this.planeSize;

        // X軸は微調整
        if (!this.rect) return;
        const x =
          -(this.rect.width / 2) + this.rect.width * 0.04 + this.planeSize / 2;
        plane.position.set(x, y, 0);
        const initialPosition = new THREE.Vector3(x, y, 0);
        this.initialPositions.push(initialPosition);
        this.planeGroup.add(plane);
        this.planeArray.push(plane);
      });
      this.scene.add(this.planeGroup);

      // 直交投影カメラの追加
      const aspect = this.rect.width / this.rect.height;
      const fov = 60;
      const radian = (fov / 2) * (Math.PI / 180);
      const distance = this.rect.height / 2 / Math.tan(radian);
      // console.log(distance);
      this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000.0);
      this.camera.position.set(0, 0, distance);

      // 最初は最初のオブジェクトをハイライトしておく
      this.highlightAndSetSelectedPlane(0, false);
    }
  }

  // 直線運動の際のカメラの距離を計算
  calculateCameraDistance() {
    if (this.rect) {
      const fov = 60;
      const radian = (fov / 2) * (Math.PI / 180);
      const distance = this.rect.height / 2 / Math.tan(radian);
      return distance;
    } else {
      throw new Error("rect is not exsit");
    }
  }

  private updatePlanesWithResizes() {
    if (!this.planeArray || !this.rect) return;
    // planeSizeの設定
    const originalSize = this.planeSize; // 前のサイズを保持
    this.planeSize = Math.min(
      (this.rect.width / 2) * this.planeRelativeSize,
      300
    );
    this.planeArray.forEach((planeMesh, i) => {
      if (!this.rect) return;
      // サイズ更新
      planeMesh.geometry.dispose();
      planeMesh.geometry = new THREE.PlaneGeometry(
        this.planeSize,
        this.planeSize
      );
      // x軸更新
      const x =
        -(this.rect.width / 2) + this.rect.width * 0.04 + this.planeSize / 2;
      // y軸更新
      const originalY = planeMesh.position.y;
      //// スクロールオフセットも調節が必要な気がする->これは良いか。
      // this.scrollOffset = this.scrollOffset - (this.planeSize - originalSize);
      ////  スクロールの制限（必要に応じて）
      const totalHeight = (this.planeArray.length - 1) * this.planeSize;
      const minScroll = 0;
      const maxScroll = totalHeight;
      this.scrollOffset = Math.max(
        minScroll,
        Math.min(maxScroll, this.scrollOffset)
      );
      const y = i * -1 * this.planeSize + this.scrollOffset;
      planeMesh.position.x = x;
      planeMesh.position.y = y;
      planeMesh.updateMatrix();
      // 初期値座標の情報も更新
      //// x座用はみんな共通
      this.initialPositions[i].x = x;
      /// y座標はplaneSizeに応じて再設定
      const initialY = i * -1 * this.planeSize;
      this.initialPositions[i].y = initialY;
    });
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
      // スクロールの制限（必要に応じて）
      const totalHeight = (this.planeArray.length - 1) * this.planeSize;
      const minScroll = 0;
      const maxScroll = totalHeight;
      this.scrollOffset = Math.max(
        minScroll,
        Math.min(maxScroll, this.scrollOffset)
      );
      this.planeArray.forEach((plane, index) => {
        const initialY = this.initialPositions[index].y;
        const newY = initialY + this.scrollOffset; // マイナスに注意
        // plane.position.y = newY;
        gsap.to(plane.position, {
          y: newY,
          duration: 0.5, // アニメーション時間（秒）
          ease: "power2.out", // イージング関数
        });
      });
    }
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
    if (!this.rect) return [];
    if (
      clientX < this.rect.width ||
      clientY < (window.innerHeight - this.rect.height) / 2 ||
      (window.innerHeight + this.rect.height) / 2 < clientY
    )
      return [];
    // スクリーン空間の座標系をレイキャスター用に正規化する（-1.0 ~ 1.0 の範囲）
    const x = (clientX / window.innerWidth) * 2.0 - 1.0;
    const y = (clientY / window.innerHeight) * 2.0 - 1.0;
    const yOffSet =
      ((window.innerHeight - this.rect.height) / 2 / window.innerHeight) * 2.0 -
      1.0;
    // レンダリング位置が変わったためもう一段階変換する
    const canvasX = (x - 0.5) / 0.5;
    const canvasY =
      (y - yOffSet) / (this.rect.height / window.innerHeight) - 1.0;
    // console.log(canvasX, canvasY);
    // スクリーン空間は上下が反転している点に注意（Y だけ符号を反転させる）
    const v = new THREE.Vector2(canvasX, -canvasY);
    // レイキャスターに正規化済みマウス座標とカメラを指定する
    this.raycaster.setFromCamera(v, this.camera);
    const intersects = this.raycaster.intersectObjects(this.planeArray);

    if (0 < intersects.length) {
      const intersectIndex = Number(intersects[0].object.name);
      // console.log("intersected!", intersectIndex);
      // クラスの呼び出し元から渡される関数を使用
      // &&で繋げているのは、関数の存在確認と関数の実行を同時に行なっている
      this.onIntersect && this.onIntersect(intersectIndex);
      this.planeIntersected = true;
      // 選ばれたインデックスをイライト用の関数に渡し実行する
      this.highlightAndSetSelectedPlane(intersectIndex, false);
    } else {
      this.planeIntersected = false;
      // 何もしない？
      this.highlightAndSetSelectedPlane(null, false);
    }

    // console.log(this.selectedIndex);
    return intersects;
  }

  private highlightAndSetSelectedPlane(
    intersectIndex: number | null,
    isResize: boolean
  ) {
    // ハイライトにより移動する量
    const delta = (this.planeSize * (this.highlightScale - 1)) / 2;

    if (!isResize) {
      // ★selectedIndexが非null = 何かハイライトしているとき
      // ※selectedIndexが描画中に非nullからnullになるのは、リサイズ時のみ
      if (this.selectedIndex != null) {
        // ①今選択中のものと同じものにintersectedした場合(intersectIndex!=null)
        if (intersectIndex != null && this.selectedIndex == intersectIndex) {
          // 何もしない
          return;
        }
        // ②今選択中のものと異なるものにintersectedした場合(intersectIndex!=null)
        else if (
          intersectIndex != null &&
          this.selectedIndex != intersectIndex
        ) {
          // 最初に各パラメータを更新する
          const previousIndex = this.selectedIndex;
          this.selectedIndex = intersectIndex;
          // 選択中のものを戻し、新しいものをハイライトする
          this.gsapTimeline = gsap.timeline();
          this.gsapTimeline
            .to(
              this.planeArray[previousIndex].scale,
              {
                duration: 0.2,
                x: 1,
                y: 1,
                z: 1,
                ease: "power2.inOut",
              },
              0
            )
            .to(
              this.planeArray[previousIndex].position,
              {
                duration: 0.2,
                x: this.initialPositions[previousIndex].x,
                y: this.planeArray[previousIndex].position.y,
                z: 0,
                ease: "power2.inOut",
              },
              0
            )
            .to(
              this.planeArray[this.selectedIndex].scale,
              {
                duration: 0.2,
                x: this.highlightScale,
                y: this.highlightScale,
                z: this.highlightScale,
                ease: "power2.inOut",
              },
              0
            )
            .to(
              this.planeArray[this.selectedIndex].position,
              {
                duration: 0.2,
                x: this.initialPositions[previousIndex].x + delta,
                y: this.planeArray[this.selectedIndex].position.y,
                z: 1,
                ease: "power2.inOut",
              },
              0
            );

          return;
        }
        // ③intersectedしている状態から、intersected外に出た場合
        else if (intersectIndex == null) {
          // 何もしない
          return;
        }
      }
      // ★selectedIndexがnull = 何もハイライトしていないとき
      else {
        // selectedIndexがnull の状態から、何かにintersecetしたとき(intersectedIndex!=null)
        if (intersectIndex != null) {
          // intersectedIndexをハイライトし、selectedIndexも更新する
          this.gsapTimeline = gsap.timeline();
          this.gsapTimeline
            .to(
              this.planeArray[intersectIndex].scale,
              {
                duration: 0.2,
                x: this.highlightScale,
                y: this.highlightScale,
                z: this.highlightScale,
                ease: "power2.inOut",
              },
              0
            )
            .to(
              this.planeArray[intersectIndex].position,
              {
                duration: 0.2,
                x: this.initialPositions[intersectIndex].x + delta,
                y: this.planeArray[intersectIndex].position.y,
                z: 1,
                ease: "power2.inOut",
              },
              0
            );
          this.selectedIndex = intersectIndex;
          return;
        }
        // selectedIndexがnull の状態から、何にもintersecetしていないとき
        else {
          // 何もしない
          return;
        }
      }
    }
    // リサイズ時の限定処理を行う
    else {
      // selectedIndexが選ばれている状態でのリサイズ
      if (this.selectedIndex != null) {
        this.planeArray[this.selectedIndex].scale.set(1, 1, 1);
        this.planeArray[this.selectedIndex].position.x =
          this.initialPositions[this.selectedIndex].x;
        this.planeArray[this.selectedIndex].position.z = 0;
        this.planeArray[this.selectedIndex].updateMatrix();
        this.selectedIndex = null;
        return;
      }
      // selectedIndexが選ばれていない時（連続リサイズなど）
      else {
        return;
      }
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
