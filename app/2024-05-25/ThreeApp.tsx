"use client";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

/*
 * 扇風機をグループに分ける
 ** ヘッドの回転と羽根の回転があるので、羽根グループ、ヘッドグループ（羽根グループを含む）が必要
 ** ネックと土台はグループ化してもしなくてもだが、メッシュの形が違うので
 */

// 扇風機の回転速度の型
type SpeedLevel = "high" | "medium" | "low";

export default class ThreeApp {
  /**
   * シーン共通パラメータ（クラス定義）
   */
  static CAMERA_PARAM = {
    fovy: 120,
    aspect: 0, // コンストラクタにてwindowサイズに応じて初期化
    near: 2,
    far: 1200.0,
    position: new THREE.Vector3(0.92, 81.43, 116.65),
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
   * 扇風機オブジェクトパラメータ
   */
  static FAN_GEOM_PARAM = {
    BASE_PARAM: {
      radiusTop: 30,
      radiusBottom: 36,
      height: 5,
      radialSegments: 32,
    },
    NECK_PARAM: {
      radiusTop: 4,
      radiusBottom: 4,
      height: 80,
      radiusSegments: 32,
    },
    SHAFT_PARAM: {
      radiusTop: 8,
      radiusBottom: 12,
      height: 24,
      radialSegments: 32,
    },
    BLADE_SHAFT_PARAM: {
      radiusTop: 4,
      radiusBottom: 4,
      height: 36,
      radialSegments: 32,
    },
    GUARD_RING_PARAM: {
      radius: 24,
      tube: 1,
      radialSegments: 12,
      tubularSegments: 48,
      arc: Math.PI * 2,
    },
    GUARD_PARAM: {
      radius: 24,
      tube: 0.5,
      radialSegments: 30,
      tubularSegments: 30,
      arc: (Math.PI * 2) / 3,
    },
    BLADE_PARAM: {
      radiusTop: 22.0,
      radiusBottom: 18.0,
      height: 2.0,
      radialSegments: 30,
      heightSegments: 10,
      openEnded: false,
      thetaStart: Math.PI / 5,
      thetaLength: Math.PI / 4,
      // color: 0xafdfd4,
      angle: 0.1,
    },
  };

  static FAN_MAT_PARAM = {
    BODY_PARAM: {
      color: "#DBA3C2",
    },
    BLADE_PARAM: {
      color: 0xafdfd4,
      transparent: true,
      opacity: 0.5,
    },
  };

  /**
   * プロパティ
   */
  // 共通
  renderer: THREE.WebGLRenderer | undefined;
  scene: THREE.Scene | undefined;
  camera: THREE.PerspectiveCamera | undefined;
  directionalLight: THREE.DirectionalLight | undefined;
  ambientLight: THREE.AmbientLight | undefined;
  meshArray: THREE.Mesh[] = [];
  controls: OrbitControls | undefined;
  axesHelper: THREE.AxesHelper | undefined;
  initialPositions: [number, number, number][] | undefined;
  isDown = false;
  models: THREE.Object3D[] = [];
  // 扇風機
  bodyMaterial: THREE.MeshPhongMaterial | undefined;
  // 土台
  baseGeometry: THREE.BufferGeometry | undefined;
  baseMesh: THREE.Mesh | undefined;
  //　ネック
  neckGeometry: THREE.BufferGeometry | undefined;
  neckMesh: THREE.Mesh | undefined;
  // 太い軸
  shaftGeometry: THREE.BufferGeometry | undefined;
  shaftMesh: THREE.Mesh | undefined;
  // 羽のカバー
  guardRingGeometry: THREE.BufferGeometry | undefined;
  guardRingMesh: THREE.Mesh | undefined;
  guardGeometry: THREE.BufferGeometry | undefined;
  guardMesh: THREE.Mesh | undefined;
  numOfGuard: number | undefined;
  guardFrontGroup: THREE.Group | undefined;
  guardBackGroup: THREE.Group | undefined;
  guardGroup: THREE.Group | undefined;
  //　羽
  bladeMaterial: THREE.MeshPhongMaterial | undefined;
  bladeGeometry: THREE.BufferGeometry | undefined;
  bladeMesh: THREE.Mesh | undefined;
  bladeShaftGeometry: THREE.BufferGeometry | undefined; // 細い（羽の）軸
  bladeShaftMesh: THREE.Mesh | undefined;
  bladeGroup: THREE.Group | undefined;
  // 回転制御
  switch = false;
  speedParam = {
    high: 0.5,
    medium: 0.25,
    low: 0.1,
  };
  currentSpeedParam: SpeedLevel = "low";
  currentSpeed = 0;
  targetSpeed = 0;
  minSpeed = 0.015; // 最小速度（これ以下になったら完全に停止）
  accelerate = false;
  acceleration = 0.005; // 加速度
  decelerate = false;
  decelerationParam = {
    // 基本減速度
    high: 0.01,
    medium: 0.005,
    low: 0.005,
  };
  // 首振り用
  // ヘッド全体
  headGroup: THREE.Group | undefined;
  isOscillating = true; // 首振りのオン/オフ
  oscillationAngle = Math.PI / 4; // 首振りの角度（45度）
  oscillationSpeed = 0.002; // 首振りの速度
  currentAngle = 0; // 現在の角度
  oscillationDirection = 1; // 回転の方向（1 or -1）

  previousPosition = new THREE.Vector3();

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

      /**
       * 扇風機オブジェクトに関するパラメータ定義
       */

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
      this.camera.getWorldPosition(this.previousPosition);

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
       * 扇風機の作成
       */
      // マテリアル
      this.bodyMaterial = new THREE.MeshPhongMaterial(
        ThreeApp.FAN_MAT_PARAM.BODY_PARAM
      );

      // 土台
      this.baseGeometry = new THREE.CylinderGeometry(
        ThreeApp.FAN_GEOM_PARAM.BASE_PARAM.radiusTop,
        ThreeApp.FAN_GEOM_PARAM.BASE_PARAM.radiusBottom,
        ThreeApp.FAN_GEOM_PARAM.BASE_PARAM.height,
        ThreeApp.FAN_GEOM_PARAM.BASE_PARAM.radialSegments
      );
      this.baseMesh = new THREE.Mesh(this.baseGeometry, this.bodyMaterial);
      this.scene.add(this.baseMesh);
      // ネック
      this.neckGeometry = new THREE.CylinderGeometry(
        ThreeApp.FAN_GEOM_PARAM.NECK_PARAM.radiusTop,
        ThreeApp.FAN_GEOM_PARAM.NECK_PARAM.radiusBottom,
        ThreeApp.FAN_GEOM_PARAM.NECK_PARAM.height,
        ThreeApp.FAN_GEOM_PARAM.NECK_PARAM.radiusSegments
      );
      this.neckMesh = new THREE.Mesh(this.neckGeometry, this.bodyMaterial);
      // ネック底面を台座上面に合わせる
      // ネック底面のy座標 = 台座高さ/2 + ネック高さ/2
      // 各オブジェクトの座標は、各オブジェクトの3D的な中心にあるため。/2をする
      this.neckMesh.position.y =
        ThreeApp.FAN_GEOM_PARAM.BASE_PARAM.height / 2 +
        ThreeApp.FAN_GEOM_PARAM.NECK_PARAM.height / 2;
      this.scene.add(this.neckMesh);

      // 軸（太い方）
      this.shaftGeometry = new THREE.CylinderGeometry(
        ThreeApp.FAN_GEOM_PARAM.SHAFT_PARAM.radiusTop,
        ThreeApp.FAN_GEOM_PARAM.SHAFT_PARAM.radiusBottom,
        ThreeApp.FAN_GEOM_PARAM.SHAFT_PARAM.height,
        ThreeApp.FAN_GEOM_PARAM.SHAFT_PARAM.radialSegments
      );
      this.shaftMesh = new THREE.Mesh(this.shaftGeometry, this.bodyMaterial);
      this.shaftMesh.position.y =
        this.neckMesh.position.y +
        ThreeApp.FAN_GEOM_PARAM.NECK_PARAM.height / 2 +
        ThreeApp.FAN_GEOM_PARAM.SHAFT_PARAM.radiusBottom / 2;
      this.shaftMesh.rotation.x = -Math.PI / 2;
      //this.scene.add(this.shaftMesh);

      // 羽のカバー
      // 円環状のジオメトリを、半端な円環にすることで、カバーの網目を表現する
      this.guardFrontGroup = new THREE.Group();
      //// まずはカバーの中心
      this.guardRingGeometry = new THREE.TorusGeometry(
        ThreeApp.FAN_GEOM_PARAM.GUARD_RING_PARAM.radius,
        ThreeApp.FAN_GEOM_PARAM.GUARD_RING_PARAM.tube,
        ThreeApp.FAN_GEOM_PARAM.GUARD_RING_PARAM.radialSegments,
        ThreeApp.FAN_GEOM_PARAM.GUARD_RING_PARAM.tubularSegments,
        ThreeApp.FAN_GEOM_PARAM.GUARD_RING_PARAM.arc
      );
      this.guardRingMesh = new THREE.Mesh(
        this.guardRingGeometry,
        this.bodyMaterial
      );
      this.guardRingMesh.position.y =
        this.neckMesh.position.y +
        ThreeApp.FAN_GEOM_PARAM.NECK_PARAM.height / 2 +
        ThreeApp.FAN_GEOM_PARAM.SHAFT_PARAM.radiusBottom / 2;
      this.guardRingMesh.position.z =
        ThreeApp.FAN_GEOM_PARAM.SHAFT_PARAM.height;
      this.guardFrontGroup.add(this.guardRingMesh);
      //// 次にカバーのあみあみ
      this.guardGeometry = new THREE.TorusGeometry(
        ThreeApp.FAN_GEOM_PARAM.GUARD_PARAM.radius,
        ThreeApp.FAN_GEOM_PARAM.GUARD_PARAM.tube,
        ThreeApp.FAN_GEOM_PARAM.GUARD_PARAM.radialSegments,
        ThreeApp.FAN_GEOM_PARAM.GUARD_PARAM.tubularSegments,
        ThreeApp.FAN_GEOM_PARAM.GUARD_PARAM.arc
      );
      //// あみあみを複製する
      this.numOfGuard = 20;
      ////// 表面
      for (let i = 0; i < this.numOfGuard; i++) {
        this.guardMesh = new THREE.Mesh(this.guardGeometry, this.bodyMaterial);
        this.guardMesh.position.y =
          this.neckMesh.position.y +
          ThreeApp.FAN_GEOM_PARAM.NECK_PARAM.height / 2 +
          ThreeApp.FAN_GEOM_PARAM.SHAFT_PARAM.radiusBottom / 2;
        this.guardMesh.position.z = this.guardRingMesh.position.z;
        // this.guardMesh.rotation.y += -Math.PI / 2;
        this.guardMesh.rotation.y += ((Math.PI * 2) / this.numOfGuard) * i;
        this.guardMesh.rotation.x += Math.PI / 2;
        this.guardFrontGroup.add(this.guardMesh);
      }
      ////// 裏面
      this.guardBackGroup = this.guardFrontGroup.clone();
      this.guardBackGroup.rotation.y += Math.PI; // グループの原点はワールドの原点になる？
      this.guardBackGroup.position.z +=
        2 * ThreeApp.FAN_GEOM_PARAM.SHAFT_PARAM.height; // x軸回転をした後なので、元のGroupより2倍離れることになる
      //console.log("guardBack_x", this.guardBackGroup.position.x);
      //console.log("guardBack_z", this.guardBackGroup.position.z);
      this.guardGroup = new THREE.Group();
      this.guardGroup.add(this.guardFrontGroup, this.guardBackGroup);
      // this.scene.add(this.guardGroup);

      // 羽
      this.bladeGroup = new THREE.Group();
      this.bladeMaterial = new THREE.MeshPhongMaterial(
        ThreeApp.FAN_MAT_PARAM.BLADE_PARAM
      );
      for (let i = 0; i < 5; i++) {
        const thetaStart =
          ThreeApp.FAN_GEOM_PARAM.BLADE_PARAM.thetaStart * i * 2;
        this.bladeGeometry = new THREE.CylinderGeometry(
          ThreeApp.FAN_GEOM_PARAM.BLADE_PARAM.radiusTop,
          ThreeApp.FAN_GEOM_PARAM.BLADE_PARAM.radiusBottom,
          ThreeApp.FAN_GEOM_PARAM.BLADE_PARAM.height,
          ThreeApp.FAN_GEOM_PARAM.BLADE_PARAM.radialSegments,
          ThreeApp.FAN_GEOM_PARAM.BLADE_PARAM.heightSegments,
          ThreeApp.FAN_GEOM_PARAM.BLADE_PARAM.openEnded,
          thetaStart,
          ThreeApp.FAN_GEOM_PARAM.BLADE_PARAM.thetaLength
        );
        const fanBlade = new THREE.Mesh(this.bladeGeometry, this.bladeMaterial);
        if (i % 2 === 0) {
          fanBlade.rotation.x = ThreeApp.FAN_GEOM_PARAM.BLADE_PARAM.angle;
        } else {
          fanBlade.rotation.x = -ThreeApp.FAN_GEOM_PARAM.BLADE_PARAM.angle;
        }
        fanBlade.position.z = 5.0;
        fanBlade.rotation.x = -Math.PI / 2;
        this.bladeGroup.add(fanBlade);
      }
      // 羽の軸
      this.bladeShaftGeometry = new THREE.CylinderGeometry(
        ThreeApp.FAN_GEOM_PARAM.BLADE_SHAFT_PARAM.radiusTop,
        ThreeApp.FAN_GEOM_PARAM.BLADE_SHAFT_PARAM.radiusBottom,
        ThreeApp.FAN_GEOM_PARAM.BLADE_SHAFT_PARAM.height,
        ThreeApp.FAN_GEOM_PARAM.BLADE_SHAFT_PARAM.radialSegments
      );
      this.bladeShaftMesh = new THREE.Mesh(
        this.bladeShaftGeometry,
        this.bodyMaterial
      );
      this.bladeShaftMesh.rotation.x = -Math.PI / 2;
      this.bladeGroup.add(this.bladeShaftMesh);
      this.bladeGroup.position.y =
        this.neckMesh.position.y +
        ThreeApp.FAN_GEOM_PARAM.NECK_PARAM.height / 2 +
        ThreeApp.FAN_GEOM_PARAM.SHAFT_PARAM.radiusBottom / 2;
      this.bladeGroup.position.z = this.guardRingMesh.position.z;
      //this.scene.add(this.bladeGroup);

      // 首振りのために、シャフト（太）、羽カバー、羽をグループにまとめる
      this.headGroup = new THREE.Group();
      this.headGroup.add(this.shaftMesh, this.guardGroup, this.bladeGroup);
      this.scene.add(this.headGroup);

      // 軸ヘルパー
      const axesBarLength = 100.0;
      this.axesHelper = new THREE.AxesHelper(axesBarLength);
      //this.scene.add(this.axesHelper);

      // カメラの注目点を扇風機のヘッドにする
      this.camera.lookAt(new THREE.Vector3(0, this.bladeGroup.position.y, 0));

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
    if (
      this.renderer &&
      this.scene &&
      this.camera &&
      this.controls &&
      this.bladeGroup
    ) {
      // 恒常ループの設定
      requestAnimationFrame(this.render);

      // this.displayCameraInfo();

      // コントロールを更新
      this.controls.update();

      // 現在の速度を目標速度に向けて調整
      if (this.switch) {
        if (!this.decelerate) {
          if (this.accelerate && this.currentSpeed < this.targetSpeed * 0.95) {
            this.currentSpeed +=
              (this.targetSpeed - this.currentSpeed) * this.acceleration;
            // currentSpeedがtargetSpeedを超えないようにする
            if (this.targetSpeed < this.currentSpeed) {
              this.currentSpeed = this.targetSpeed;
              this.accelerate = false;
            }
          } else {
            this.currentSpeed = this.targetSpeed;
          }
          this.bladeGroup.rotation.z += this.currentSpeed;
        } else {
          if (this.decelerate && this.targetSpeed < this.currentSpeed * 0.95) {
            this.currentSpeed += (this.targetSpeed - this.currentSpeed) * 0.05;
            // targetSpeedを下回らないようにする
            if (this.currentSpeed < this.targetSpeed) {
              this.currentSpeed = this.targetSpeed;
              this.decelerate = false;
            }
          } else {
            this.currentSpeed = this.targetSpeed;
          }
          this.bladeGroup.rotation.z += this.currentSpeed;
        }
      } else {
        this.currentSpeed -=
          this.currentSpeed * this.decelerationParam[this.currentSpeedParam];
        // 逆回転を防止
        this.currentSpeed = Math.max(this.currentSpeed, 0);
        if (this.minSpeed < this.currentSpeed) {
          this.bladeGroup.rotation.z += this.currentSpeed;
        } else {
          this.currentSpeed = 0;
        }
      }

      // console.log("target", this.targetSpeed);
      // console.log("current", this.currentSpeed);

      if (this.switch && this.headGroup && this.isOscillating) {
        // 現在の角度を更新
        this.currentAngle += this.oscillationSpeed * this.oscillationDirection;
        // 最大角度に達したら方向を反転
        if (Math.abs(this.currentAngle) >= this.oscillationAngle) {
          this.oscillationDirection *= -1;
        }
        // 扇風機モデルを回転
        this.headGroup.rotation.y = this.currentAngle;
      }
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

  changeSwitch() {
    this.switch = !this.switch;
    if (this.switch) {
      this.currentSpeedParam = "low";
      this.targetSpeed = this.speedParam[this.currentSpeedParam];
      this.currentSpeed = 0;
      this.accelerate = true;
    }
  }

  changeSpeed(speed: "low" | "medium" | "high") {
    // speedパラメータに基づいて、Three.jsシーンを更新するロジックをここに実装
    if (this.switch) {
      // 現在のパラメータから落とす場合のみ減速フラグを立てる
      if (
        (this.currentSpeedParam == "high" && speed == "medium") ||
        (this.currentSpeedParam == "high" && speed == "low") ||
        (this.currentSpeedParam == "medium" && speed == "low")
      ) {
        this.decelerate = true;
      }

      // 現在のパラメータから加速する場合のみ加速フラグを立てる
      if (
        (this.currentSpeedParam == "low" && speed == "high") ||
        (this.currentSpeedParam == "low" && speed == "medium") ||
        (this.currentSpeedParam == "medium" && speed == "high")
      ) {
        this.accelerate = true;
      }

      this.currentSpeedParam = speed;
      this.targetSpeed = this.speedParam[this.currentSpeedParam];
    }
  }
}
