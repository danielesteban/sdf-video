export const init2D = (app: HTMLElement, done: () => void) => {

const canvas = document.createElement('canvas');
canvas.width = window.innerHeight * 9 / 16;
canvas.height = window.innerHeight;
app.appendChild(canvas);

const ctx = canvas.getContext('2d')!;
const pixel = 16;
const pixels = {
  x: Math.ceil(canvas.width / pixel),
  y: Math.ceil(canvas.height / pixel),
};
const distances = new Float32Array(pixels.x * pixels.y);
let shapes: { x: number, y: number, radius: number }[] = [];
let selected: { x: number, y: number, secondary: boolean } | null = null;

const clock = {
  tick: 0,
  time: 0,
};
let animation = () => {};
let frame = 0;
let step = -1;
let animationStep = 0;

const clear = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

const drawGrid = (animate = false) => {
  for (let y = 0; y < pixels.y; y += 1) {
    for (let x = 0; x < pixels.x; x += 1) {
      if (!animate || animationStep >= Math.sqrt(x * x + y * y)) {
        ctx.fillStyle = ((y + x) % 2) ? '#d7d7d7' : '#ffffff';
        ctx.fillRect(x * pixel, y * pixel, pixel, pixel);
      }
    }
  }
};

const drawPoint = (x: number, y: number, radius: number, animate = false) => {
  if (animate) {
    radius = Math.min(animationStep * radius / 20, radius);
  }
  ctx.beginPath();
  ctx.lineWidth = 1;
  ctx.arc(x * pixel + pixel * 0.5, y * pixel + pixel * 0.5, Math.max(radius * pixel - 0.5, 0), 0, Math.PI * 2);
  ctx.strokeStyle = '#000000';
  ctx.stroke();
};

const drawDistanceLabels = (animate = false) => {
  const min = distances.reduce((min, d) => Math.min(min, d), 10000);
  ctx.fillStyle = '#000000';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let y = 0, i = 0; y < pixels.y; y += 1) {
    for (let x = 0; x < pixels.x; x += 1, i += 1) {
      if (!animate || animationStep * 0.5 >= (distances[i] - min)) {
        ctx.fillText(`${Math.round(distances[i])}`, x * pixel + pixel * 0.5, y * pixel + pixel * 0.5);
      }
    }
  }
};

const drawDistanceColors = (animate = false) => {
  const min = distances.reduce((min, d) => Math.min(min, d), 10000);
  for (let y = 0, i = 0; y < pixels.y; y += 1) {
    for (let x = 0; x < pixels.x; x += 1, i += 1) {
      if ((!animate || animationStep * 0.5 >= (distances[i] - min)) && Math.round(distances[i]) < 1) {
        ctx.fillStyle = '#208a4e';
        ctx.fillRect(x * pixel, y * pixel, pixel, pixel);
      }
    }
  }
};

const drawSelected = () => {
  if (!selected) {
    return;
  }
  const { x, y } = selected;
  const from = {
    x: (x + 0.5) * pixel,
    y: (y + 0.5) * pixel,
  };
  const drawLabel = (text: string, position: { x: number, y: number }, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(position.x, position.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, position.x, position.y);
  };
  for (const s of shapes) {
    const dx = (s.x + 0.5) - (x + 0.5);
    const dy = (s.y + 0.5) - (y + 0.5);
    const l = Math.sqrt(dx ** 2 + dy ** 2);
    const d = l - s.radius;
    const n = {
      x: dx / (l || 1),
      y: dy / (l || 1)
    };
    const origin = {
      x: (s.x + 0.5) * pixel,
      y: (s.y + 0.5) * pixel,
    };
    const to = {
      x: ((x + 0.5) + n.x * d) * pixel,
      y: ((y + 0.5) + n.y * d) * pixel,
    };
    ctx.lineWidth = 4;
    if (selected.secondary) {
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#9999ff';
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(from.x, origin.y);
      ctx.moveTo(from.x, origin.y);
      ctx.lineTo(origin.x, origin.y);
      ctx.stroke();
      drawLabel(
        'dy',
        {
          x: from.x,
          y: (from.y + origin.y) * 0.5,
        },
        '#9999ff'
      );
      drawLabel(
        'dx',
        {
          x: (from.x + origin.x) * 0.5,
          y: origin.y,
        },
        '#9999ff'
      );

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      const math = s.radius > 0 ? [
        "dx = p.x - p'.x",
        "dy = p.y - p'.y",
        '(d + r)² = dx² + dy²',
        'd + r = √(dx² + dy²)',
        'd = √(dx² + dy²) - r'
      ] : [
        "dx = p.x - p'.x",
        "dy = p.y - p'.y",
        'd² = dx² + dy²',
        'd = √(dx² + dy²)',
      ];
      const height = math.length * 24 + 24;
      ctx.beginPath();
      ctx.roundRect(16, canvas.height - 16 - height, canvas.width - 32, height, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      math.forEach((text, i) => {
        ctx.fillText(text, 32, canvas.height - 16 - height + 24 + 24 * i);
      });
    }
    if (s.radius > 0) {
      ctx.strokeStyle = '#ff99ff';
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(origin.x, origin.y);
      ctx.stroke();
      ctx.fillStyle = '#ff99ff';
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, pixel * 0.25, 0, Math.PI * 2);
      ctx.fill();
      if (selected.secondary) {
        drawLabel(
          'r',
          {
            x: (to.x + origin.x) * 0.5,
            y: (to.y + origin.y) * 0.5,
          },
          '#ff99ff'
        );
      }
    }
    ctx.strokeStyle = '#ff9999';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.fillStyle = '#ff9999';
    ctx.beginPath();
    ctx.arc(from.x, from.y, pixel * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(to.x, to.y, pixel * 0.25, 0, Math.PI * 2);
    ctx.fill();
    drawLabel(
      selected.secondary ? 'd' : `${Math.round(d)}`,
      {
        x: (from.x + to.x) * 0.5,
        y: (from.y + to.y) * 0.5,
      },
      '#ff9999'
    );
  }
};

const drawText = (lines: string[]) => {
  const origin = {
    x: canvas.width * 0.5,
    y: canvas.height * 0.5,
  };
  ctx.fillStyle = '#ffffff';
  ctx.font = '64px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const offset = lines.length * 80 * 0.5 - 40;
  return lines.map((text, i) => {
    const position = {
      x: origin.x,
      y: origin.y - offset + 80 * i,
    };
    ctx.fillText(text, position.x, position.y);
    return {
      text,
      position,
    };
  });
};

const computeDistances = (union: (a: number, b: number) => number) => {
  for (let y = 0, i = 0; y < pixels.y; y += 1) {
    for (let x = 0; x < pixels.x; x += 1, i += 1) {
      distances[i] = shapes.reduce((d, s) => {
        const dp = Math.sqrt(((s.x + 0.5) - (x + 0.5)) ** 2 + ((s.y + 0.5) - (y + 0.5)) ** 2) - s.radius;
        return union(d, dp);
      }, 10000);
    }
  }
};

const union = (a: number, b: number) => {
  return Math.min(a, b);
};

const lerp = (a: number, b: number, t: number) => {
  return (1-t) * a + b * t;
};

const smoothUnion = (a: number, b: number, k: number) => {
  const h = Math.min(Math.max(0.5 + 0.5 * (b - a) / k, 0), 1);
  return lerp(b, a, h) - k*h*(1-h);
};

const gridAnimation = () => {
  clear();
  drawGrid(true);
};

const shapesAnimation = () => {
  clear();
  drawGrid();
  for (const shape of shapes) {
    drawPoint(shape.x, shape.y, Math.max(shape.radius, 0.5), true);
  }
  drawSelected();
};

const labelsAnimation = () => {
  clear();
  drawGrid();
  for (const shape of shapes) {
    drawPoint(shape.x, shape.y, Math.max(shape.radius, 0.5));
  }
  drawDistanceLabels(true);
  drawSelected();
};

const colorsAnimation = () => {
  clear();
  drawGrid();
  drawDistanceColors(true);
  for (const shape of shapes) {
    drawPoint(shape.x, shape.y, Math.max(shape.radius, 0.5));
  }
  drawDistanceLabels();
};

const animate = () => {
  const rate = 1000 / 30;
  const tick = performance.now();
  const delta = tick - clock.tick;
  clock.tick = tick;
  clock.time += delta;
  if (clock.time >= rate) {
    clock.time -= rate;
    animationStep += 1;
    animation();
  }
  frame = requestAnimationFrame(animate);
};

const dispose = () => {
  cancelAnimationFrame(frame);
  app.removeChild(canvas);
};

const next = () => {
  clock.tick = performance.now();
  clock.time = 0;
  animationStep = 0;
  selected = null;
  step += 1;
  if (step < steps.length) {
    steps[step]();
  } else {
    done();
  }
};

const tap = (e: PointerEvent) => {
  const rect = canvas.getBoundingClientRect();
  if (
    e.clientX < rect.left || e.clientX > rect.right
    || e.clientY < rect.top || e.clientY > rect.bottom
    || (e.button === 2 && shapes.length > 1)
  ) {
    selected = null;
    return;
  }
  selected = {
    x: Math.floor((e.clientX - rect.left) / pixel),
    y: Math.floor((e.clientY - rect.top) / pixel),
    secondary: e.button === 2,
  };
};

const steps = [
  () => {
    animation = () => {};
    clear();
    drawText(['S', 'D', 'F']);
  },
  () => {
    animation = () => {};
    clear();
    drawText(['WTF is that?', 'What do', 'they know?', 'Do they', 'know things??']);
  },
  () => {
    animation = () => {};
    clear();
    drawText(["Let's find out!"]);
  },
  () => {
    animation = () => {};
    clear();
    drawText(['Signed', 'Distance', 'Field']);
  },
  () => {
    animation = () => {};
    clear();
    const lines = drawText(['Signed', 'Distance', 'Field']);
    {
      const { text, position } = lines[0];
      const width = ctx.measureText(text).width + 20;
      ctx.strokeStyle = '#ff9999';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(position.x - width * 0.5, position.y);
      ctx.lineTo(position.x + width * 0.5, position.y);
      ctx.stroke();
    }
  },
  () => {
    animation = gridAnimation;
  },
  () => {
    const origin = {
      x: Math.floor(canvas.width * 0.5 / pixel),
      y: Math.floor(canvas.height * 0.5 / pixel),
    };
    shapes = [
      { x: origin.x, y: origin.y, radius: 0 },
    ];
    computeDistances(union);
    animation = shapesAnimation;
  },
  () => {
    animation = labelsAnimation;
  },
  () => {
    animation = () => {};
    clear();
    drawText(["OK. That's cool.", 'But you said', 'something about', 'them being signed.']);
  },
  () => {
    const origin = {
      x: Math.floor(canvas.width * 0.5 / pixel),
      y: Math.floor(canvas.height * 0.5 / pixel),
    };
    shapes = [
      { x: origin.x, y: origin.y, radius: 8 },
    ];
    computeDistances(union);
    animation = shapesAnimation;
  },
  () => {
    animation = labelsAnimation;
  },
  () => {
    animation = colorsAnimation;
  },
  () => {
    const origin = {
      x: Math.floor(canvas.width * 0.5 / pixel),
      y: Math.floor(canvas.height * 0.5 / pixel),
    };
    shapes = [
      { x: origin.x - 7, y: origin.y - 7, radius: 8 },
      { x: origin.x + 7, y: origin.y + 7, radius: 8 },
    ];
    computeDistances(union);
    animation = shapesAnimation;
  },
  () => {
    animation = labelsAnimation;
  },
  () => {
    animation = colorsAnimation;
  },
  () => {
    animation = () => {};
    clear();
    drawText(['OK Computer.', "That's cool,", 'I guess.']);
  },
  () => {
    animation = () => {};
    clear();
    drawText(['But...', "Why should", 'I care?']);
  },
  () => {
    animation = () => {};
    clear();
    drawText(['Let me introduce', 'you to a friend...']);
  },
  () => {
    animation = () => {};
    clear();
    drawText(['Polynomial', 'Smooth', 'Minimum']);
  },
  () => {
    animation = () => {};
    clear();
    ctx.fillStyle = '#ffffff';
    ctx.font = '64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('min', canvas.width * 0.25, canvas.height * 0.25);
    ctx.fillText('smin', canvas.width * 0.75, canvas.height * 0.25);

    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.25 - 64, canvas.height * 0.25 + 256);
    ctx.lineTo(canvas.width * 0.25, canvas.height * 0.25 + 256);
    ctx.lineTo(canvas.width * 0.25, canvas.height * 0.25 + 128);
    ctx.lineTo(canvas.width * 0.25 + 64, canvas.height * 0.25 + 128);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.75 - 64, canvas.height * 0.25 + 256);
    for (let x = 0; x < 128; x++) {
      const t = Math.min(Math.max(((x * 1.5) - 32) / 128, 0.0), 1.0);
      const h = t * t * (3.0 - 2.0 * t) * 128;
      ctx.lineTo(canvas.width * 0.75 - 64 + x, canvas.height * 0.25 + 256 - h);
    }
    ctx.stroke();
  },
  () => {
    computeDistances((a, b) => smoothUnion(a, b, 8.0));
    animation = labelsAnimation;
  },    
  () => {
    animation = colorsAnimation;
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
