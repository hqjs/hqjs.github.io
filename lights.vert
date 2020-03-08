attribute vec2 a_Position;
attribute vec3 a_Color;
attribute float a_Size;
attribute float a_Alpha;

uniform vec2 u_Res;
uniform float u_Scale;
uniform float u_Shift;

varying vec3 v_Color;
varying float v_Alpha;

void main() {
  v_Color = a_Color;
  v_Alpha = a_Alpha;
  gl_PointSize = a_Size;
  gl_Position = vec4(a_Position * u_Res * u_Scale - vec2(0, u_Shift), 0, 1);
}
