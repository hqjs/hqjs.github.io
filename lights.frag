precision mediump float;

uniform sampler2D u_Texture;
varying vec3 v_Color;
varying float v_Alpha;
void main() {
  vec4 color = vec4(v_Color, v_Alpha) * texture2D(u_Texture, gl_PointCoord);
  gl_FragColor = color;
}
