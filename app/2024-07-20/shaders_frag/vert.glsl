
attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;

uniform mat4 mMatrix; // モデル座標変換
uniform mat4 mvpMatrix;
// uniform mat4 normalMatrix; // 法線変換行列 @@@

varying vec3 vPosition;
varying vec3 vNormal;
varying vec4 vColor;


// ライトベクトルはひとまず定数で定義する
// const vec3 light = vec3(1.0, 1.0, 1.0);

void main() {

  // 元の頂点シェーダでの計算
  ////////////////////////////////////////////////////
  // 法線をまず行列で変換する @@@
  // vec3 n = (normalMatrix * vec4(normal, 0.0)).xyz;

  // 変換した法線とライトベクトルで内積を取る @@@
  // ・normalizeはglslの組み込み関数
  // ・lightベクトルは、あくまでライトの「向き」のみを定義しているだけ(白色など、色の情報はない)
  //   ライトの「向き」と、法線（=頂点の「向き」）で内積を取ると、向きの一致度が-1~1で得られる
  //   この向きの一致度を頂点の色に乗算することで、ライトのような効果を生み出している
  // float d = dot(normalize(n), normalize(light));

  // 内積の結果を頂点カラーの RGB 成分に乗算する
  // vColor = vec4(color.rgb * d, color.a);
  ////////////////////////////////////////////////////

  // フラグメントシェーダに渡す用
  ////////////////////////////////////////////////////
  // モデルの座標をワールド空間上での頂点の位置に変換してラグメントシェーダへ
  // (復習)
  // attribute position：モデルのローカル座標。値自体はjsで定義しており、enableBuffer()でVBOバッファに転送され関連付けされる
  // uniform mMatrix：モデル座標変換行列。ローカル座標に対し、拡大や回転を適用し、最終的なワールド座標に変換するための行列。
  vPosition = (mMatrix * vec4(position, 1.0)).xyz;

  vNormal = normal;
  vColor = color;

  // MVP 行列と頂点座標を乗算してから出力する
  gl_Position = mvpMatrix * vec4(position, 1.0);
}

