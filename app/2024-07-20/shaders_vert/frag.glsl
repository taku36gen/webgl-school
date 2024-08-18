precision mediump float;

varying vec4 vColor;

uniform mat4 eyePosition; // カメラ位置を表す行列（uniformの定義はfragでも良い）

void main() {
  gl_FragColor = vColor;
}

