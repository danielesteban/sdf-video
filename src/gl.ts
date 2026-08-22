export const initGL = (app: HTMLElement, done: () => void) => {

const canvas = document.createElement('canvas');
canvas.width = window.innerHeight * 9 / 16;
canvas.height = window.innerHeight;
app.appendChild(canvas);

const hints = {
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: false,
};
const GL = (
  canvas.getContext('webgl2', hints)
  || canvas.getContext('webgl', hints)
  || canvas.getContext('experimental-webgl', hints)
) as WebGLRenderingContext;

const pixel = 16;
const clock = {
  tick: 0,
  time: 0,
};
let animation = () => {};
let frame = 0;
let step = -1;

const vertexShader = `
  attribute vec2 position;
  varying vec2 fragPixel;

  void main(void) {
    gl_Position = vec4(position, 0.0, 1.0);
    fragPixel = (vec2(position.x, -position.y) * 0.5 + 0.5) * (vec2(${canvas.width}.0, ${canvas.height}.0) / ${pixel}.0) + ${pixel}.0 * 0.5;
  }
`;

const fragmentShader = `
  precision highp float;

  #define PI 3.141592653589793

  uniform float time;
  varying vec2 fragPixel;

  float sdCircle(const in vec2 p, const in float r) {
    return length(p) - r;
  }

  float smoothUnion(const in float a, const in float b, const in float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k*h*(1.0-h);
  }

  float grid() {
    return mod(floor(fragPixel.y) + floor(fragPixel.x), 2.0) == 1.0 ? ${215/255} : 1.0;
  }

  void main(void) {
    vec2 origin = (vec2(${canvas.width}.0, ${canvas.height}.0) / ${pixel}.0) * 0.5 + ${pixel}.0 * 0.5;
    float offset = 9.899494936611665 + sin(time * 2.0) * 2.0;
    float angle = PI * 0.25 + time;
    float a = sdCircle(fragPixel - vec2(origin.x - cos(angle) * offset, origin.y - sin(angle) * offset), 8.0);
    float b = sdCircle(fragPixel - vec2(origin.x + cos(angle) * offset, origin.y + sin(angle) * offset), 8.0);
    float d = smoothUnion(a, b, 8.0);
    float alpha = smoothstep(-0.5, 0.5, d * ${pixel}.0);
    gl_FragColor = vec4(mix(vec3(${32.0 / 255}, ${138 / 255}, ${78 / 255}), vec3(grid()), alpha), 1.0);
  }
`;

const vertex = GL.createShader(GL.VERTEX_SHADER)!;
GL.shaderSource(vertex, vertexShader);
GL.compileShader(vertex);
const fragment = GL.createShader(GL.FRAGMENT_SHADER)!;
GL.shaderSource(fragment, fragmentShader);
GL.compileShader(fragment);

const program = GL.createProgram();
GL.attachShader(program, vertex);
GL.attachShader(program, fragment);
GL.linkProgram(program);
GL.useProgram(program);

const attributes = {
  position: GL.getAttribLocation(program, 'position'),
};
const buffers = {
  position: GL.createBuffer(),
};
const uniforms = {
  time: GL.getUniformLocation(program, 'time')!,
};
GL.bindBuffer(GL.ARRAY_BUFFER, buffers.position);
GL.bufferData(GL.ARRAY_BUFFER, new Float32Array([
  -1, 1,
  -1, -1,
  1, -1,
  1, 1,
  -1, 1,
  1, -1,
]), GL.STATIC_DRAW);
GL.vertexAttribPointer(attributes.position, 2, GL.FLOAT, false, 0, 0);
GL.enableVertexAttribArray(attributes.position);

const staticAnimation = () => {
  GL.clear(GL.COLOR_BUFFER_BIT);
  GL.uniform1f(uniforms.time, 0);
  GL.drawArrays(GL.TRIANGLES, 0, 6);
};

const dynamicAnimation = () => {
  GL.clear(GL.COLOR_BUFFER_BIT);
  GL.uniform1f(uniforms.time, clock.time / 1000);
  GL.drawArrays(GL.TRIANGLES, 0, 6);
};

const animate = () => {
  const tick = performance.now();
  const delta = tick - clock.tick;
  clock.tick = tick;
  clock.time += delta;
  animation();
  frame = requestAnimationFrame(animate);
};

const dispose = () => {
  cancelAnimationFrame(frame);
  app.removeChild(canvas);
};

const next = () => {
  clock.tick = performance.now();
  clock.time = 0;
  step += 1;
  if (step < steps.length) {
    steps[step]();
  } else {
    done();
  }
};

const tap = () => {};

const steps = [
  () => {
    animation = staticAnimation;
  },
  () => {
    animation = dynamicAnimation;
  },
];

next();
frame = requestAnimationFrame(animate);

return {
  dispose,
  next,
  tap,
};

};
