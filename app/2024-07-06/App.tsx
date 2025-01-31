// = 003 ======================================================================
// WebGL で利用するシェーダには３つの修飾子があり、既に登場している attribute と
// varying の他に、uniform 変数と呼ばれる固有の役割を持つ変数タイプがあります。
// これまでに登場した attribute 変数が「あらかじめ VBO（頂点属性）にしておく必要
// があった」のに対し、ここで登場する uniform 変数は、あらかじめバッファにデータ
// を詰めておく必要はありません。
// 任意のタイミングで、自由に、汎用的に、CPU 側の実装（JavaScript）からシェーダ
// に対してデータを送ることができます。
// ただし、データを送る手順（利用するメソッド）などがやや難しいので、少しずつ慣
// れていきましょう。
// ============================================================================

// = 004 ======================================================================
// このサンプルは、最初の状態では 003 とまったく同じ内容です。
// これを、みなさん自身の手で修正を加えて「描かれる図形を五角形に」してみてくだ
// さい。
// そんなの余裕じゃろ～ と思うかも知れませんが……結構最初は難しく感じる人も多い
// かもしれません。なお、正確な正五角形でなくても構いません。
// ポイントは以下の点を意識すること！
// * canvas 全体が XY 共に -1.0 ～ 1.0 の空間になっている
// * gl.TRIANGLES では頂点３個がワンセットで１枚のポリゴンになる
// * つまりいくつかの頂点は「まったく同じ位置に重複して配置される」ことになる
// * 頂点座標だけでなく、頂点カラーも同じ個数分必要になる
// * 物足りない人は、星型や円形などに挑戦してみてもいいかもしれません
// ============================================================================

// モジュールを読み込み
import { WebGLUtility } from "../lib/webgl";
import vertex from "./shaders/vert.glsl";
import fragment from "./shaders/frag.glsl";

// ドキュメントの読み込みが完了したら実行されるようイベントを設定する
// window.addEventListener(
//   "DOMContentLoaded",
//   async () => {
//     // アプリケーションのインスタンスを初期化し、必要なリソースをロードする
//     const app = new App();
//     app.init();
//     await app.load();
//     // ロードが終わったら各種セットアップを行う
//     app.setupGeometry();
//     app.setupLocation();
//     // すべてのセットアップが完了したら描画を開始する @@@
//     app.start();
//   },
//   false
// );

// インスタンス変数に必要な型定義
interface UniformLocations {
  time: WebGLUniformLocation | null;
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
  uniformLocation!: UniformLocations; // uniform 変数のロケーション @@@
  startTime!: number; // レンダリング開始時のタイムスタンプ @@@
  isRendering!: boolean; // レンダリングを行うかどうかのフラグ @@@

  previousVertexX!: number; // ポジション定義の時に使用する座標格納用変数
  previousVertexY!: number; // ポジション定義の時に使用する座標格納用変数
  polyValue: number = 5; // ポリゴンの角の数
  sizeValue: number = 0.5; // ポリゴンの大きさ

  constructor() {
    // console.log("App constructor called");
    if (window != undefined) {
      //アプリケーションのインスタンスを初期化し、必要なリソースをロードする
      (async () => {
        //OK console.log("check initialize");
        // アプリケーションのインスタンスを初期化し、必要なリソースをロードする
        this.init();
        await this.load();
        // ロードが終わったら各種セットアップを行う
        await this.setupGeometry_task5();
        await this.setupLocation();
        // すべてのセットアップが完了したら描画を開始する @@@
        this.start();
      })();
      // this を固定するためのバインド処理
      this.render = this.render.bind(this);
    }

    window.addEventListener("resize", () => {
      if (this.canvas && this.canvas instanceof HTMLCanvasElement) {
        // canvas のサイズを設定
        const size = Math.min(window.innerWidth, window.innerHeight);
        this.canvas.width = size;
        this.canvas.height = size;
      }
    });
  }

  /**
   * 初期化処理を行う
   */
  init() {
    // canvas エレメントの取得と WebGL コンテキストの初期化
    this.canvas = document.getElementById("webgl-canvas");
    // this.canvasに正常にcanvas要素が格納されたら...
    if (this.canvas && this.canvas instanceof HTMLCanvasElement) {
      this.gl = WebGLUtility.createWebGLContext(this.canvas);
      // canvas のサイズを設定
      const size = Math.min(window.innerWidth, window.innerHeight);
      this.canvas.width = size;
      this.canvas.height = size;
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
        // まずシェーダのソースコードを読み込む
        // const VSSource = await WebGLUtility.loadFile("/main.vert");
        // const FSSource = await WebGLUtility.loadFile("/main.frag");
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

  // = MY UPDATE ======================================================================
  /**
   * 頂点属性（頂点ジオメトリ）のセットアップを行う
   */
  setupGeometry_task5() {
    return new Promise<void>(async (resolve, reject) => {
      // 頂点座標の定義
      const n = this.polyValue;
      const r = this.sizeValue;
      const topPosition = [0, r, 0];
      this.position = [];
      // 頂点の色の定義
      this.color = [];
      for (let i = 1; i <= n; i++) {
        // 最初の三角形の描画
        if (i == 1) {
          // 最初に原点を格納
          this.position.push(0.0);
          this.position.push(0.0);
          this.position.push(0.0);
          // 頂点の描画
          topPosition.forEach((pos) => {
            this.position.push(pos);
          });
          // 頂点から回転した座標
          const x = r * Math.sin((2 * Math.PI) / n);
          const y = r * Math.cos((2 * Math.PI) / n);
          this.position.push(x);
          this.position.push(y);
          this.position.push(0);
          // 回転した座標をインスタンス変数に保持しておく
          this.previousVertexX = x;
          this.previousVertexY = y;

          // colorの設定
          this.color.push(0.941, 0.322, 0.388, 1.0); // ピンク
          this.color.push(0.475, 0.761, 0.278, 1.0); // ライムグリーン
          this.color.push(0.204, 0.596, 0.859, 1.0); // スカイブルー
        } else {
          // 最初に原点を格納
          this.position.push(0.0);
          this.position.push(0.0);
          this.position.push(0.0);
          // 一つ前の座標を格納
          this.position.push(this.previousVertexX);
          this.position.push(this.previousVertexY);
          this.position.push(0);
          // 頂点から回転した座標
          const x = r * Math.sin((i * 2 * Math.PI) / n);
          const y = r * Math.cos((i * 2 * Math.PI) / n);
          this.position.push(x);
          this.position.push(y);
          this.position.push(0);
          // 回転した座標をインスタンス変数に保持しておく
          this.previousVertexX = x;
          this.previousVertexY = y;

          // colorの設定
          this.color.push(0.941, 0.322, 0.388, 1.0); // ピンク
          this.color.push(0.475, 0.761, 0.278, 1.0); // ライムグリーン
          this.color.push(0.204, 0.596, 0.859, 1.0); // スカイブルー
        }
      }

      // 要素数は XYZ の３つ
      this.positionStride = 3;
      // VBO を生成
      this.positionVBO = WebGLUtility.createVBO(this.gl, this.position);
      // 要素数は RGBA の４つ
      this.colorStride = 4;
      // VBO を生成
      this.colorVBO = WebGLUtility.createVBO(this.gl, this.color);

      resolve();
    });
  }

  /**
   * 画面からの変数を受け取り描画を更新する関数
   */
  updatePolyValue(polyValue: number) {
    this.polyValue = polyValue;
    this.setupGeometry_task5();
    this.setupLocation();
    // this.render(); これを呼んだらバグった（this.uniformLocation.timeのuncaughtエラー）
    //// 理由はちょっと不明だが。。一旦おいておく
  }
  updateSizeValue(sizeValue: number) {
    this.sizeValue = sizeValue;
    this.setupGeometry_task5();
    this.setupLocation();
    // this.render(); エラー。。同上
  }

  // ============================================================================

  /**
   * 課題5_多角形を作る
   */
  setupGeometry() {
    // 頂点座標の定義
    //// 二つ描画してみる
    this.position = [
      0.0,
      0.5,
      0.0, // ひとつ目の頂点の x, y, z 座標
      0.5,
      -0.5,
      0.0, // ふたつ目の頂点の x, y, z 座標
      -0.5,
      -0.5,
      0.0, // みっつ目の頂点の x, y, z 座標
      // 新しい三角形（上向き）
      0.0,
      -0.5,
      0.0, // 頂点4: 下
      0.5,
      0.5,
      0.0, // 頂点5: 右上
      -0.5,
      0.5,
      0.0, // 頂点6: 左上
    ];
    // 要素数は XYZ の３つ
    this.positionStride = 3;
    // VBO を生成
    this.positionVBO = WebGLUtility.createVBO(this.gl, this.position);

    // 頂点の色の定義
    this.color = [
      1.0,
      0.0,
      0.0,
      1.0, // ひとつ目の頂点の r, g, b, a カラー
      0.0,
      1.0,
      0.0,
      1.0, // ふたつ目の頂点の r, g, b, a カラー
      0.0,
      0.0,
      1.0,
      1.0, // みっつ目の頂点の r, g, b, a カラー
      // 新しい三角形の色
      1.0,
      1.0,
      0.0,
      1.0, // 黄
      0.0,
      1.0,
      1.0,
      1.0, // シアン
      1.0,
      0.0,
      1.0,
      1.0, // マゼンタ
    ];
    // 要素数は RGBA の４つ
    this.colorStride = 4;
    // VBO を生成
    this.colorVBO = WebGLUtility.createVBO(this.gl, this.color);
  }

  /**
   * 頂点属性のロケーションに関するセットアップを行う
   */
  setupLocation() {
    return new Promise<void>(async (resolve, reject) => {
      const gl = this.gl;
      // attribute location の取得
      const positionAttributeLocation = gl.getAttribLocation(
        this.program,
        "position"
      );
      const colorAttributeLocation = gl.getAttribLocation(
        this.program,
        "color"
      );
      // WebGLUtility.enableBuffer は引数を配列で取る仕様なので、いったん配列に入れる
      const vboArray = [this.positionVBO, this.colorVBO];
      const attributeLocationArray = [
        positionAttributeLocation,
        colorAttributeLocation,
      ];
      const strideArray = [this.positionStride, this.colorStride];
      // 頂点情報の有効化
      WebGLUtility.enableBuffer(
        gl,
        vboArray,
        attributeLocationArray,
        strideArray
      );

      // uniform location の取得 @@@
      this.uniformLocation = {
        time: gl.getUniformLocation(this.program, "time"),
      };

      // 処理を完了
      resolve();
    });
  }

  /**
   * レンダリングのためのセットアップを行う
   */
  setupRendering() {
    const gl = this.gl;
    // ビューポートを設定する
    if (this.canvas && this.canvas instanceof HTMLCanvasElement)
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    // クリアする色を設定する（RGBA で 0.0 ～ 1.0 の範囲で指定する）
    gl.clearColor(0.3, 0.3, 0.3, 1.0);
    // 実際にクリアする（gl.COLOR_BUFFER_BIT で色をクリアしろ、という指定になる）
    gl.clear(gl.COLOR_BUFFER_BIT);
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
    const gl = this.gl;

    // レンダリングのフラグの状態を見て、requestAnimationFrame を呼ぶか決める @@@
    if (this.isRendering === true) {
      requestAnimationFrame(this.render);
    }

    // ビューポートの設定やクリア処理は毎フレーム呼び出す @@@
    this.setupRendering();

    // 現在までの経過時間を計算し、秒単位に変換する @@@
    const nowTime = (Date.now() - this.startTime) * 0.001;

    // プログラムオブジェクトを選択
    gl.useProgram(this.program);

    // - uniform 変数は種類応じてメソッドが変化 -------------------------------
    // シェーダプログラム（つまり GLSL）側で uniform 変数がどのように定義されて
    // いるのかによって、CPU 側から値を送る際は適切にメソッドを呼び分けないとい
    // けません。
    // 残念ながら、これは暗記するというかメソッド名のルールを覚えるしかないので、
    // 最初はちょっと難しいかもしれません。
    // 基本的なルールは「要素数＋データ型＋配列かどうか」という３つの要因によっ
    // て決まります。たとえば uniform1fv なら「１つの、float の、配列」です。
    // ※配列の部分はより正確にはベクトルで、v で表されます
    // 以下に、いくつかの例を記載しますがこれで全種類ではありません。まずは代表
    // 的なところだけでいいのでやんわり憶えておきましょう。
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
    //
    // ※ここに記載されているものが全てではありません
    // --------------------------------------------------------------------

    // ロケーションを指定して、uniform 変数の値を更新する（GPU に送る） @@@
    gl.uniform1f(this.uniformLocation.time, nowTime);

    // ドローコール（描画命令）
    gl.drawArrays(gl.TRIANGLES, 0, this.position.length / this.positionStride);
  }
}

export default App;
