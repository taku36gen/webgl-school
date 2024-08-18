// ======================================================================
// jsとシェーダの受け渡しの復習

// Uniform 変数:
//  - JavaScript から直接値を設定できます。
//  - gl.uniform* 系の関数（例：gl.uniform1f, gl.uniformMatrix4fv）を使用して値を設定します。
//  - すべての頂点で共通の値を持ちます。
// Attribute 変数:
//  - JavaScript から直接値を設定するのではなく、頂点バッファオブジェクト（VBO）を通じてデータを提供します。
//  - 各頂点ごとに異なる値を持ちます。

// Attribute 変数へのデータ提供プロセス:

//  1. JavaScript でデータを準備:
//     頂点データ（位置、法線、色など）を配列として準備します。

//  2. バッファの作成と設定:
//     gl.createBuffer() でバッファを作成します。
//     gl.bindBuffer() で作成したバッファをバインドします。
//     gl.bufferData() でバッファにデータを転送します。

//   3. Attribute 変数の位置取得:
//     gl.getAttribLocation() で attribute 変数の位置（インデックス）を取得します。

//   4. バッファとAttribute変数の関連付け:
//     gl.vertexAttribPointer() でバッファ内のデータ構造を指定し、attribute 変数と関連付けます。
//     gl.enableVertexAttribArray() で attribute を有効化します。

//   5. 描画時:
//     WebGL が自動的にバッファからデータを読み取り、各頂点の attribute 変数に適用します。

// つまり、attribute 変数への「値の転送」は、バッファを介して間接的に行われます。JavaScript は直接 attribute 変数に値を設定するのではなく、
// バッファにデータを設定し、そのバッファと attribute 変数を関連付けるという形を取ります。
// この仕組みにより、大量の頂点データを効率的に GPU に転送し、処理することが可能になっています。uniform 変数が全頂点で共通の値を持つのに対し、
// attribute 変数は各頂点ごとに異なる値を持つことができるため、この間接的なアプローチが採用されています。
// ============================================================================

// モジュールを読み込み
import { WebGLUtility } from "../lib/webgl.js";
import { Vec3, Mat4 } from "../lib/math.js";
import { WebGLGeometry } from "../lib/geometry.js";
import { WebGLOrbitCamera } from "../lib/camera.js";
import { Pane } from "../lib/tweakpane-4.0.3.min.js"; // tweakpane の読み込み @@@
// シェーダの読み込み
import vertex from "./shaders_frag/vert.glsl";
import fragment from "./shaders_frag/frag.glsl";

// インスタンス変数に必要な型定義
interface TorusGeometry extends ReturnType<typeof WebGLGeometry.torus> {
  // 追加のプロパティがある場合はここに定義できます
  position: number[];
  normal: number[];
  color: number[];
  index: number[];
}

/**
 * アプリケーション管理クラス
 */
class App {
  canvas!: HTMLElement | null; // WebGL で描画を行う canvas 要素
  gl!: WebGLRenderingContext; // WebGLRenderingContext （WebGL コンテキスト）
  program!: WebGLProgram; // WebGLProgram （プログラムオブジェクト）
  position: any[] = []; // 頂点の座標情報を格納する配列
  positionStride: number = 0; // 頂点の座標のストライド
  positionVBO!: WebGLBuffer; // 頂点座標の VBO
  color: any[] = []; // 頂点カラーの座標情報を格納する配列
  colorStride: number = 0; // 頂点カラーの座標のストライド
  colorVBO!: WebGLBuffer; // 頂点カラー座標の VBO
  startTime!: number; // レンダリング開始時のタイムスタンプ @@@
  isRendering!: boolean; // レンダリングを行うかどうかのフラグ @@@

  previousVertexX!: number; // ポジション定義の時に使用する座標格納用変数
  previousVertexY!: number; // ポジション定義の時に使用する座標格納用変数
  polyValue: number = 5; // ポリゴンの角の数
  sizeValue: number = 0.5; // ポリゴンの大きさ

  // 課題6追加
  attributeLocation: any[] = [];
  attributeStride: any[] = [];
  // シェーダのUnifrom変数とリンクする用のオブジェクト
  uniformLocation!: {
    mMatrix: WebGLUniformLocation | null;
    mvpMatrix: WebGLUniformLocation | null;
    normalMatrix: WebGLUniformLocation | null;
    eyePosition: WebGLUniformLocation | null;
  };
  isRotation: boolean = false;
  torusGeometry!: TorusGeometry;
  torusVBO: any[] = [];
  torusIBO!: WebGLBuffer;
  camera!: WebGLOrbitCamera;

  constructor() {
    // console.log("App constructor called");
    if (window != undefined) {
      //アプリケーションのインスタンスを初期化し、必要なリソースをロードする
      (async () => {
        // アプリケーションのインスタンスを初期化し、必要なリソースをロードする
        this.init();
        await this.load();
        // ロードが終わったら各種セットアップを行う
        await this.setupGeometry();
        await this.setupLocation();
        // paneをセットアップする
        await this.setupPane();
        // すべてのセットアップが完了したら描画を開始する @@@
        this.start();
      })();
      // this を固定するためのバインド処理
      this.render = this.render.bind(this);
    }

    window.addEventListener("resize", () => {
      if (this.canvas && this.canvas instanceof HTMLCanvasElement) {
        // canvas のサイズを設定
        this.canvas.width = window.innerWidth / 2;
        this.canvas.height = window.innerHeight;
      }
    });
  }

  /**
   * 初期化処理を行う
   */
  init() {
    // canvas エレメントの取得と WebGL コンテキストの初期化
    this.canvas = document.getElementById("webgl-canvas-frag");
    // this.canvasに正常にcanvas要素が格納されたら...
    if (this.canvas && this.canvas instanceof HTMLCanvasElement) {
      // glはWebGLコンテキスト
      // 独自util関数createWebGLContextの中で、canvas要素に定義されている
      // canvas.getContext("webgl")を呼び出している
      this.gl = WebGLUtility.createWebGLContext(this.canvas);
      // canvas のサイズを設定
      this.canvas.width = window.innerWidth / 2;
      this.canvas.height = window.innerHeight;

      // カメラ制御用インスタンスを生成する
      const cameraOption = {
        distance: 5.0, // Z 軸上の初期位置までの距離
        min: 1.0, // カメラが寄れる最小距離
        max: 10.0, // カメラが離れられる最大距離
        move: 2.0, // 右ボタンで平行移動する際の速度係数
      };
      this.camera = new WebGLOrbitCamera(this.canvas, cameraOption);

      // バックフェイスカリングと深度テストは初期状態で有効
      this.gl.enable(this.gl.CULL_FACE);
      this.gl.enable(this.gl.DEPTH_TEST);
    }
  }

  /**
   * 各種リソースのロードを行う
   * @return {Promise}
   */
  load() {
    return new Promise<void>(async (resolve, reject) => {
      // 変数に WebGL コンテキストを代入しておく（コード記述の最適化）
      const gl = this.gl;
      // WebGL コンテキストがあるかどうか確認する
      if (gl == null) {
        // もし WebGL コンテキストがない場合はエラーとして Promise を reject する
        const error = new Error("not initialized");
        reject(error);
      } else {
        // シェーダのソースコードを読み込む
        const VSSource = vertex;
        const FSSource = fragment;
        // 無事に読み込めたらシェーダオブジェクトの実体を生成する
        const vertexShader = WebGLUtility.createShaderObject(
          gl,
          VSSource,
          gl.VERTEX_SHADER
        );
        const fragmentShader = WebGLUtility.createShaderObject(
          gl,
          FSSource,
          gl.FRAGMENT_SHADER
        );
        // プログラムオブジェクトを生成する
        this.program = WebGLUtility.createProgramObject(
          gl,
          vertexShader,
          fragmentShader
        );
        resolve();
      }
    });
  }

  /**
   * paneの設定用の関数
   * @returns void
   */
  setupPane() {
    return new Promise<void>(async (resolve, reject) => {
      // canvas要素の取得
      const canvas = document.getElementById(
        "webgl-canvas-frag"
      ) as HTMLCanvasElement;
      if (!canvas) {
        reject(new Error("Canvas element not found"));
        return;
      }

      // canvasの位置とサイズを取得
      const canvasRect = canvas.getBoundingClientRect();

      // paneのコンテナ要素を作成
      const paneContainer = document.createElement("div");
      paneContainer.style.position = "absolute";
      paneContainer.style.top = `${canvasRect.top + 10}px`;
      paneContainer.style.left = `${canvasRect.left + 10}px`;
      paneContainer.style.zIndex = "1000";
      document.body.appendChild(paneContainer);

      // Tweakpane を使った GUI の設定
      const pane = new Pane({
        container: paneContainer,
      });
      const parameter = {
        culling: true,
        depthTest: true,
        rotation: false,
      };
      // バックフェイスカリングの有効・無効
      pane.addBinding(parameter, "culling").on("change", (v: any) => {
        this.setCulling(v.value);
      });
      // 深度テストの有効・無効
      pane.addBinding(parameter, "depthTest").on("change", (v: any) => {
        this.setDepthTest(v.value);
      });
      // 回転の有無
      pane.addBinding(parameter, "rotation").on("change", (v: any) => {
        this.setRotation(v.value);
      });

      // 処理を完了
      resolve();
    });
  }

  /**
   * 課題6_頂点属性（頂点ジオメトリ）のセットアップを行う
   */
  setupGeometry() {
    // トーラスのジオメトリ情報を取得
    const row = 32;
    const column = 32;
    const innerRadius = 0.4;
    const outerRadius = 0.8;
    const color = [1.0, 1.0, 1.0, 1.0];
    this.torusGeometry = WebGLGeometry.torus(
      row,
      column,
      innerRadius,
      outerRadius,
      color
    ) as TorusGeometry;

    // VBO と IBO を生成する
    // VBOは、getAttribLocationでVBOバッファ(GPU)に格納する。
    // そのため、getAttrbLocationで指定するattribute変数の順番と、
    // VBO配列の格納の順番は一致させる必要がある。
    // 下記のような対応をする必要がある
    // this.torusVBO[0] ⇔ this.attributeLocation[0] // position
    // this.torusVBO[1] ⇔ this.attributeLocation[1] // normal
    // this.torusVBO[2] ⇔ this.attributeLocation[2] // color
    this.torusVBO = [
      WebGLUtility.createVBO(this.gl, this.torusGeometry.position),
      WebGLUtility.createVBO(this.gl, this.torusGeometry.normal),
      WebGLUtility.createVBO(this.gl, this.torusGeometry.color),
    ];
    this.torusIBO = WebGLUtility.createIBO(this.gl, this.torusGeometry.index);
  }

  /**
   * 頂点属性のロケーションに関するセットアップを行う
   */
  setupLocation() {
    return new Promise<void>(async (resolve, reject) => {
      const gl = this.gl;
      // attribute location の取得
      this.attributeLocation = [
        gl.getAttribLocation(this.program, "position"),
        gl.getAttribLocation(this.program, "normal"),
        gl.getAttribLocation(this.program, "color"),
      ];
      // attribute のストライド
      this.attributeStride = [3, 3, 4];

      // uniform location の取得
      // getUniformLocationは、WebGLProgram(=シェーダコード)に含まれる、特定のuniform変数の値を取得する、WebGLコンテキストの組み込み関数
      // 1. Uniform 変数の位置特定:
      //    シェーダープログラム内で定義された uniform 変数の位置（メモリ内のアドレス）を特定します。
      //    この位置情報は、後で JavaScript から uniform 変数に値を送る際に必要となります。
      // 2. シェーダーとJavaScriptの橋渡し:
      //    シェーダーコード（GLSL）と JavaScript コードの間の通信を可能にします。
      //    JavaScript 側から uniform 変数の値を設定したり更新したりする際に、この位置情報を使用します。
      // ★つまり、シェーダで埋めた値を取得するというよりは、シェーダの変数とリンクさせるもの
      this.uniformLocation = {
        mMatrix: gl.getUniformLocation(this.program, "mMatrix"),
        mvpMatrix: gl.getUniformLocation(this.program, "mvpMatrix"),
        normalMatrix: gl.getUniformLocation(this.program, "normalMatrix"), // 法線変換行列 @@@
        eyePosition: gl.getUniformLocation(this.program, "eyePosition"),
      };

      // 処理を完了
      resolve();
    });
  }

  /**
   * バックフェイスカリングを設定する
   * @param {boolean} flag - 設定する値
   */
  setCulling(flag: boolean) {
    const gl = this.gl;
    if (gl == null) {
      return;
    }
    if (flag === true) {
      gl.enable(gl.CULL_FACE);
    } else {
      gl.disable(gl.CULL_FACE);
    }
  }

  /**
   * 深度テストを設定する
   * @param {boolean} flag - 設定する値
   */
  setDepthTest(flag: boolean) {
    const gl = this.gl;
    if (gl == null) {
      return;
    }
    if (flag === true) {
      gl.enable(gl.DEPTH_TEST);
    } else {
      gl.disable(gl.DEPTH_TEST);
    }
  }

  /**
   * isRotation を設定する
   * @param {boolean} flag - 設定する値
   */
  setRotation(flag: boolean) {
    this.isRotation = flag;
  }

  /**
   * レンダリングのためのセットアップを行う
   */
  setupRendering() {
    const gl = this.gl;
    // ビューポートを設定する
    if (this.canvas && this.canvas instanceof HTMLCanvasElement)
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    // クリアする色と深度を設定する
    gl.clearColor(0.3, 0.3, 0.3, 1.0);
    gl.clearDepth(1.0);
    // 色と深度をクリアする
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  /**
   * 描画を開始する @@@
   */
  start() {
    // レンダリング開始時のタイムスタンプを取得しておく @@@
    this.startTime = Date.now();
    // レンダリングを行っているフラグを立てておく @@@
    this.isRendering = true;
    // レンダリングの開始
    this.render();
  }

  /**
   * 描画を停止する @@@
   */
  stop() {
    this.isRendering = false;
  }

  /**
   * レンダリングを行う
   */
  render() {
    // - uniform 変数は種類応じてメソッドが変化 -------------------------------
    // WebGLRenderingContextに組み込まれているunifromXv系の関数は、
    // javascriptで定義した行列の値を、シェーダで定義したユニフォーム値に当てはめる関数。
    //
    // シェーダプログラム（つまり GLSL）側で uniform 変数がどのように定義されて
    // いるのかによって、CPU 側から値を送る際は適切にメソッドを呼び分ける
    // 基本的なルールは「要素数＋データ型＋配列かどうか」
    // →たとえば uniform1fv なら「１つの、float の、配列」
    // ※配列の部分はより正確にはベクトルで、v で表されます
    //
    // メソッド名       : 中身のデータ                       : GLSL での意味
    // -----------------:------------------------------------:--------------
    // uniform1i        : １つの整数                         : int
    // uniform1f        : １つの浮動小数点                   : float
    // uniform1fv       : １つの浮動小数点を配列に入れたもの : float[n]
    // uniform2fv       : ２つの浮動小数点を配列にいれたもの : vec2
    // uniform3fv       : ３つの浮動小数点を配列にいれたもの : vec3
    // uniform4fv       : ４つの浮動小数点を配列にいれたもの : vec4
    // uniformMatrix2fv : 配列で表現された 2x2 の行列        : mat2
    // uniformMatrix3fv : 配列で表現された 3x3 の行列        : mat3
    // uniformMatrix4fv : 配列で表現された 4x4 の行列        : mat4
    // --------------------------------------------------------------------

    const gl = this.gl;

    // レンダリングのフラグの状態を見て、requestAnimationFrame を呼ぶか決める
    if (this.isRendering === true) {
      requestAnimationFrame(this.render);
    }

    // 現在までの経過時間
    const nowTime = (Date.now() - this.startTime) * 0.001;

    // レンダリングのセットアップ
    this.setupRendering();

    // 行列mはモデル座標変換行列（フラグが立っている場合だけ回転させる）
    // モデル座標変換行列とは、頂点を3D空間内で何らかの動きをさせる、というもの
    // 言い換えると、ローカル座標に乗算する、拡大や回転を表す行列を表す行列のこと
    // ローカル座標に、拡大や回転を表すモデル座用変換行列を掛けることで、ワールド座標として拡大や回転された座標が得られる
    // https://matcha-choco010.net/2018/08/30/mvp-matrix/
    const rotateAxis = Vec3.create(0.0, 1.0, 0.0);
    const m =
      this.isRotation === true
        ? Mat4.rotate(Mat4.identity(undefined as any), nowTime, rotateAxis)
        : Mat4.identity(undefined as any);

    // ビュー・プロジェクション座標変換行列
    // vはビュー座標変換行列
    // 「カメラ（視点）の位置を考慮した変換を与える」
    const v = this.camera.update();
    // pはプロジェクション座標変換行列
    // 「平面（スクリーン）に頂点を投影するための変換」を担う
    const fovy = 45;
    const aspect = window.innerWidth / 2 / window.innerHeight;
    const near = 0.1;
    const far = 10.0;
    const p = Mat4.perspective(fovy, aspect, near, far);

    // 行列を乗算して MVP 行列を生成する（掛ける順序に注意）
    const vp = Mat4.multiply(p, v);
    const mvp = Mat4.multiply(vp, m);

    // モデル座標変換行列の、逆転置行列を生成する @@@
    const normalMatrix = Mat4.transpose(Mat4.inverse(m));

    // プログラムオブジェクトを選択し uniform 変数を更新する @@@
    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.uniformLocation.mMatrix, false, m as Float32Array);
    gl.uniformMatrix4fv(
      this.uniformLocation.mvpMatrix,
      false,
      mvp as Float32Array
    );
    gl.uniformMatrix4fv(
      this.uniformLocation.normalMatrix,
      false,
      normalMatrix as Float32Array
    );
    gl.uniform3fv(this.uniformLocation.eyePosition, this.camera.position);

    // VBO と IBO を設定し、描画する
    // enableBufferの中でattribute変数との関連付けと、attribute変数の有効化を行う
    // (ここまで、attribute変数は渡されていない。最後の描画手順のような感じ)
    WebGLUtility.enableBuffer(
      gl,
      this.torusVBO,
      this.attributeLocation,
      this.attributeStride,
      this.torusIBO
    );
    gl.drawElements(
      gl.TRIANGLES,
      this.torusGeometry.index.length,
      gl.UNSIGNED_SHORT,
      0
    );
  }
}

export default App;
