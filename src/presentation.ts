export class Presentation {
  private readonly app: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly FGCanvas: HTMLCanvasElement;
  private readonly GLCanvas: HTMLCanvasElement;

  private readonly ctx: CanvasRenderingContext2D;

  private readonly FGCtx: CanvasRenderingContext2D;

  private readonly GL: WebGLRenderingContext;
  private program: WebGLProgram | null = null;
  private readonly screen: WebGLBuffer;

  private animation: ((time: number) => void) | null = null;
  private readonly clock = {
    tick: 0,
    time: 0,
  };
  private frame = 0;
  private selected: { x: number, y: number } | null = null;
  private step = 0;
  private readonly steps: (() => void)[] = [];

  constructor(app: HTMLElement, steps: (() => void)[] = []) {
    this.app = app;
    {
      const canvas = document.createElement('canvas');
      canvas.width = window.innerHeight * 9 / 16;
      canvas.height = window.innerHeight;
      this.ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
      this.canvas = canvas;
      app.appendChild(canvas);
    }
    {
      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.width = this.canvas.width;
      canvas.height = this.canvas.height;
      const hints = {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
      };
      this.GL = (
        canvas.getContext('webgl2', hints)
        || canvas.getContext('webgl', hints)
        || canvas.getContext('experimental-webgl', hints)
      ) as WebGLRenderingContext;
      this.GLCanvas = canvas;
      app.appendChild(canvas);
    }
    {
      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.width = this.canvas.width;
      canvas.height = this.canvas.height;
      this.FGCtx = canvas.getContext('2d') as CanvasRenderingContext2D;
      this.FGCanvas = canvas;
      app.appendChild(canvas);
    }
    {
      const { GL } = this;
      this.screen = GL.createBuffer();
      GL.bindBuffer(GL.ARRAY_BUFFER, this.screen);
      GL.bufferData(GL.ARRAY_BUFFER, new Float32Array([
        -1, 1,
        -1, -1,
        1, -1,
        1, 1,
        -1, 1,
        1, -1,
      ]), GL.STATIC_DRAW);
      GL.bindBuffer(GL.ARRAY_BUFFER, null);
    }
    this.steps = steps;
    this.animation = () => {
      this.animation = null;
      this.step = -1;
      this.next();
    };
    this.animate = this.animate.bind(this);
    this.frame = requestAnimationFrame(this.animate);
    this.onkeydown = this.onkeydown.bind(this);
    window.addEventListener('keydown', this.onkeydown);
    this.onpointerdown = this.onpointerdown.bind(this);
    window.addEventListener('pointerdown', this.onpointerdown);
  }

  private animate() {
    const { animate, animation, clock, GL, program } = this;
    const tick = performance.now();
    const delta = (tick - clock.tick) / 1000;
    clock.tick = tick;
    clock.time += delta;
    this.clear();
    animation?.(clock.time);
    if (program) {
      GL.useProgram(program);
      GL.uniform1f(GL.getUniformLocation(program, 'time')!, clock.time);
      GL.drawArrays(GL.TRIANGLES, 0, 6);
      GL.useProgram(null);
    }
    this.frame = requestAnimationFrame(animate);
  }

  private clear() {
    const { canvas, ctx, FGCtx, GL } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    FGCtx.clearRect(0, 0, canvas.width, canvas.height);
    GL.clear(GL.COLOR_BUFFER_BIT);
  }

  dispose() {
    const { app, canvas, FGCanvas, GLCanvas, frame, GL, onkeydown, onpointerdown } = this;
    GL.getExtension('WEBGL_lose_context')?.loseContext();
    cancelAnimationFrame(frame);
    app.removeChild(canvas);
    app.removeChild(FGCanvas);
    app.removeChild(GLCanvas);
    window.removeEventListener('keydown', onkeydown);
    window.removeEventListener('pointerdown', onpointerdown);
  }

  next() {
    const { clock, steps } = this;
    clock.tick = performance.now();
    clock.time = 0;
    this.selected = null;
    this.step = (this.step + 1) % steps.length;
    this.setAnimation(null);
    this.setProgram(null);
    steps[this.step]();
  }

  private onkeydown(e: KeyboardEvent) {
    if (!e.repeat && e.key === ' ') {
      this.next();
    }
  }

  private onpointerdown(e: PointerEvent) {
    const { canvas } = this;
    const rect = canvas.getBoundingClientRect();
    if (
      e.clientX < rect.left || e.clientX > rect.right
      || e.clientY < rect.top || e.clientY > rect.bottom
    ) {
      this.selected = null;
      return;
    }
    this.selected = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  drawCircle(x: number, y: number, radius: number, time: number | null = null) {
    const { ctx } = this;
    if (time !== null) {
      radius = Math.min(radius * time, radius);
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.arc(x, y, Math.max(radius - 0.5, 0), 0, Math.PI * 2);
    ctx.stroke();
  }

  drawGrid(size: number, time: number | null = null) {
    const { canvas, ctx } = this;
    const animate = time !== null ? time * 60 : null;
    const cells = {
      x: Math.ceil(canvas.width / size),
      y: Math.ceil(canvas.height / size),
    };
    for (let y = 0; y < cells.y; y += 1) {
      for (let x = 0; x < cells.x; x += 1) {
        if (animate === null || animate >= Math.sqrt(x * x + y * y)) {
          ctx.fillStyle = ((y + x) % 2) ? '#d7d7d7' : '#ffffff';
          ctx.fillRect(x * size, y * size, size, size);
        }
      }
    }
  }

  drawLabel(text: string, x: number, y: number, color: string) {
    const { FGCtx: ctx } = this;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  drawLabels(values: Float32Array, size: number, time: number | null = null) {
    const { canvas, ctx } = this;
    const animate = time !== null ? time * 20 : null;
    const cells = {
      x: Math.ceil(canvas.width / size),
      y: Math.ceil(canvas.height / size),
    };
    const min = values.reduce((min, d) => Math.min(min, d / size), 10000);
    ctx.fillStyle = '#000000';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let y = 0, i = 0; y < cells.y; y += 1) {
      for (let x = 0; x < cells.x; x += 1, i += 1) {
        if (animate === null || animate >= ((values[i] / size) - min)) {
          ctx.fillText(`${Math.round(values[i] / size)}`, x * size + size * 0.5, y * size + size * 0.5);
        }
      }
    }
  }

  drawText(lines: string[]) {
    const { canvas, ctx } = this;
    const origin = {
      x: canvas.width * 0.5,
      y: canvas.height * 0.5,
    };
    ctx.fillStyle = '#ffffff';
    ctx.font = '64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const offset = lines.length * 80 * 0.5 - 40;
    lines.forEach((text, i) => {
      const position = {
        x: origin.x,
        y: origin.y - offset + 80 * i,
      };
      ctx.fillText(text, position.x, position.y);
    });
  }

  drawVectors(from: { x: number, y: number }, to: { x: number, y: number, distance: number }[], scale: number) {
    const { FGCtx: ctx } = this;
    const points = to.map((p) => {
      const dx = p.x - from.x;
      const dy = p.y - from.y;
      const n = { x: 0, y: 1 };
      if (dx !== 0 || dy !== 0) {
        const l = Math.sqrt(dx ** 2 + dy ** 2);
        n.x = dx / l;
        n.y = dy / l;
      }
      return {
        ...p,
        dx: from.x + n.x * p.distance,
        dy: from.y + n.y * p.distance,
      };
    });
    for (const p of points) {
      ctx.lineWidth = 4;
      ctx.fillStyle = ctx.strokeStyle = '#ff99ff';
      ctx.beginPath();
      ctx.moveTo(p.dx, p.dy);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const p of points) {
      ctx.lineWidth = 4;
      ctx.fillStyle = ctx.strokeStyle = '#ff9999';
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(p.dx, p.dy);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(from.x, from.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.dx, p.dy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const p of points) {
      this.drawLabel(
        `${Math.round(p.distance / scale)}`,
        (from.x + p.dx) * 0.5,
        (from.y + p.dy) * 0.5,
        '#ff9999'
      );
    }
  }

  getSize() {
    return { x: this.canvas.width, y: this.canvas.height };
  }

  getSelected() {
    return this.selected;
  }

  setAnimation(animation: ((time: number) => void) | null) {
    this.animation = animation;
  }

  setProgram(code: string | null) {
    const { canvas, GL, screen } = this;
    if (this.program) {
      GL.deleteProgram(this.program);
      this.program = null;
    }
    if (code === null) {
      return;
    }

    const vertexShader = /* glsl */`
      attribute vec2 position;
      varying vec2 fragPixel;

      void main(void) {
        gl_Position = vec4(position, 0.0, 1.0);
        fragPixel = (vec2(position.x, -position.y) * 0.5 + 0.5) * vec2(float(${canvas.width}), float(${canvas.height})) + 0.5;
      }
    `;

    const fragmentShader = /* glsl */`
      precision highp float;

      #define PI 3.141592653589793

      uniform float time;
      varying vec2 fragPixel;

      float sdCircle(const in vec2 p, const in float r) {
        return length(p) - r;
      }

      float opUnion(const in float a, const in float b) {
        return min(a, b);
      }

      float opSubtraction(const in float a, const in float b) {
        return max(a, -b);
      }

      float opIntersection(const in float a, const in float b) {
        return max(a, b);
      }

      float opSmoothUnion(const in float a, const in float b, const in float k) {
        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(b, a, h) - k*h*(1.0-h);
      }

      float opSmoothSubtraction(const in float a, const in float b, const in float k) {
        float h = clamp(0.5 - 0.5 * (a + b) / k, 0.0, 1.0);
        return mix(a, -b, h) - k*h*(1.0-h);
      }

      float opSmoothIntersection(const in float a, const in float b, const in float k) {
        float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
        return mix(a, b, h) - k*h*(1.0-h);
      }

      void main(void) {
        ${code}
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
    const position = GL.getAttribLocation(program, 'position');
    GL.bindBuffer(GL.ARRAY_BUFFER, screen);
    GL.vertexAttribPointer(position, 2, GL.FLOAT, false, 0, 0);
    GL.enableVertexAttribArray(position);
    GL.bindBuffer(GL.ARRAY_BUFFER, null);
    GL.useProgram(null);

    this.program = program;
  }
}
