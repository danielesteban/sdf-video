import './main.css';
import { Presentation } from './presentation';

const grid = 16;

const operations = {
  'opUnion': (a: number, b: number) => {
    return Math.min(a, b);
  },
  'opSubtraction': (a: number, b: number) => {
    return Math.max(a, -b);
  },
  'opIntersection': (a: number, b: number) => {
    return Math.max(a, b);
  },
};

const getShapes = () => {
  const size = p.getSize();
  const origin = {
    x: (Math.floor(size.x * 0.5 / grid) + 0.5) * grid,
    y: (Math.floor(size.y * 0.5 / grid) + 0.5) * grid,
  };
  return [
    {
      x: origin.x - 4 * grid,
      y: origin.y - 4 * grid,
      radius: 8 * grid,
    },
    {
      x: origin.x + 4 * grid,
      y: origin.y + 4 * grid,
      radius: 8 * grid,
    },
  ];
};

const getCSGAnimation = (operation: keyof typeof operations, animateShapes = false) => () => {
  const shapes = getShapes();
  const size = p.getSize();
  const cells = {
    x: Math.ceil(size.x / grid),
    y: Math.ceil(size.y / grid),
  };
  const distances = new Float32Array(cells.x * cells.y);
  for (let y = 0, i = 0; y < cells.y; y += 1) {
    for (let x = 0; x < cells.x; x += 1, i += 1) {
      distances[i] = shapes.reduce((d, shape, i) => {
        const s = Math.sqrt((shape.x - (x + 0.5) * grid) ** 2 + (shape.y - (y + 0.5) * grid) ** 2) - shape.radius;
        if (i === 0) {
          return operations.opUnion(d, s);
        } else {
          return operations[operation](d, s);
        }
      }, 10000);
    }
  }
  p.setAnimation((time) => {
    p.drawGrid(grid);
    for (const shape of shapes) {
      p.drawCircle(shape.x, shape.y, shape.radius, animateShapes ? time : null);
    }
    if (!animateShapes) {
      p.drawLabels(distances, grid, time);
    } else {
      drawSelected(shapes);
    }
  });
  p.setProgram(/* glsl */`
    float d = 10000.0;
    float s;
    float r;
    ${shapes.map((shape, i) => /* glsl */`
      r = float(${shape.radius});
      ${animateShapes ? /* glsl */`
        r = min(r * time, r);
      ` : ''}
      s = sdCircle(fragPixel - vec2(float(${shape.x}), float(${shape.y})), r);
      ${i === 0 ? /* glsl */`
        d = opUnion(d, s);
      ` : /* glsl */`
        d = ${operation}(d, s);
      `}
    `).join('\n')}
    float alpha = (1.0 - smoothstep(-0.5, 0.5, d)) * 0.75;
    vec3 color = vec3(${32.0 / 255}, ${138 / 255}, ${78 / 255});
    gl_FragColor = vec4(color * alpha, alpha);
  `);
};

const getInvertedSDFAnimation = (animateShape = false) => () => {
  const size = p.getSize();
  const shape = {
    x: (Math.floor(size.x * 0.5 / grid) + 0.5) * grid,
    y: (Math.floor(size.y * 0.5 / grid) + 0.5) * grid,
    radius: 8 * grid,
  };
  const cells = {
    x: Math.ceil(size.x / grid),
    y: Math.ceil(size.y / grid),
  };
  const distances = new Float32Array(cells.x * cells.y);
  for (let y = 0, i = 0; y < cells.y; y += 1) {
    for (let x = 0; x < cells.x; x += 1, i += 1) {
      distances[i] = (Math.sqrt((shape.x - (x + 0.5) * grid) ** 2 + (shape.y - (y + 0.5) * grid) ** 2) - shape.radius) * -1;
    }
  }
  p.setAnimation((time) => {
    p.drawGrid(grid);
    p.drawCircle(shape.x, shape.y, shape.radius, animateShape ? time : null);
    if (!animateShape) {
      p.drawLabels(distances, grid, time);
    } else {
      drawSelected([shape]);
    }
  });
  p.setProgram(/* glsl */`
    float r = float(${shape.radius});
    ${animateShape ? /* glsl */`
      r = min(r * time, r);
    ` : ''}
    float d = sdCircle(fragPixel - vec2(float(${shape.x}), float(${shape.y})), r) * -1.0;
    float alpha = (1.0 - smoothstep(-0.5, 0.5, d)) * 0.75;
    vec3 color = vec3(${32.0 / 255}, ${138 / 255}, ${78 / 255});
    gl_FragColor = vec4(color * alpha, alpha);
  `);
};

const getCoolDudeAnimation = (step: number) => () => {
  p.setAnimation(() => {
    p.drawGrid(grid);
  });
  const size = p.getSize();
  const origin = {
    x: (Math.floor(size.x * 0.5 / grid) + 0.5) * grid,
    y: (Math.floor(size.y * 0.5 / grid) + 0.5) * grid,
  };
  p.setProgram(/* glsl */`
    // head
    float d = sdCircle(fragPixel - vec2(float(${origin.x}), float(${origin.y})), 128.0);
    ${step > 1 ? /* glsl */`
      // eyes
      d = opSubtraction(
        d,
        sdCircle(
          fragPixel - vec2(float(${origin.x} - 48), float(${origin.y} - 48)) ${step > 2 ? /* glsl */`+ vec2(cos(time * -8.0) * 4.0, sin(time * -4.0) * 2.0)` : ''},
          24.0 ${step > 2 ? /* glsl */`+ sin(time * 8.0) * 4.0` : ''}
        )
      );
      d = opSubtraction(
        d,
        sdCircle(
          fragPixel - vec2(float(${origin.x} + 48), float(${origin.y} - 48)) ${step > 2 ? /* glsl */`+ vec2(cos(time * 8.0) * 4.0, sin(time * 4.0) * 2.0)` : ''},
          24.0 ${step > 2 ? /* glsl */`+ sin(PI + time * 8.0) * 4.0` : ''}
        )
      );
    ` : ''}
    ${step > 3 ? /* glsl */`
      // mouth
      d = opSubtraction(
        d,
        sdCircle(
          (fragPixel - vec2(float(${origin.x}), float(${origin.y} + 64))) / vec2(4.0, ${step > 4 ? /* glsl */`0.5 + sin(time * 8.0) * 0.25 + pow(sin(time * 8.0), 4.0)` : /* glsl */`2.0`}),
          16.0
        )
      );
    ` : ''}
    ${step > 5 ? /* glsl */`
      // ears
      d = opSmoothUnion(
        d,
        sdCircle(
          fragPixel - vec2(float(${origin.x} - 128), float(${origin.y} - 128)) + vec2(cos(time * 4.0), sin(time * 4.0)) * 4.0,
          32.0
        ),
        64.0
      );
      d = opSmoothUnion(
        d,
        sdCircle(
          fragPixel - vec2(float(${origin.x} + 128), float(${origin.y} - 128)) + vec2(cos(time * -4.0), sin(time * -4.0)) * 4.0,
          32.0
        ),
        64.0
      );
    ` : ''}
    ${step > 7 ? /* glsl */`
      // displacement
      d += sin((fragPixel.x - float(${origin.x})) / (PI + sin(time * 0.5)))
          * sin((fragPixel.y - float(${origin.y})) / (PI + sin(time * 0.5)))
          * 4.0;
    ` : ''}
    float alpha = 1.0 - smoothstep(-0.5, 0.5, d);
    vec3 color = vec3(${32.0 / 255}, ${138 / 255}, ${78 / 255});
    ${step > 6 ? /* glsl */`
      if (alpha > 0.0) {
        // lighting
        vec3 normal = normalize(vec3(fragPixel.x - float(${origin.x}), fragPixel.y - float(${origin.y}), -128.0));
        color *= 0.1
        + max(dot(
          normal,
          normalize(vec3(-1.0, 1.0, 0.0))
        ), 0.0) * vec3(1.0, 0.0, 0.0)
        + max(dot(
          normal,
          normalize(vec3(1.0, -1.0, 0.0))
        ), 0.0) * vec3(0.0, 0.0, 1.0)
        + max(dot(
          normal,
          normalize(vec3(0.0, 0.0, -1.0))
        ), 0.0) * vec3(1.0, 1.0, 0.0);
      }
    ` : ''}
    gl_FragColor = vec4(color * alpha, alpha);
  `);
};

const drawSelected = (shapes: { x: number; y: number; radius: number }[]) => {
  const selected = p.getSelected();
  if (selected) {
    const from = {
      x: (Math.floor(selected.x / grid) + 0.5) * grid,
      y: (Math.floor(selected.y / grid) + 0.5) * grid,
    };
    p.drawVectors(from, shapes.map((shape) => ({
      x: shape.x,
      y: shape.y,
      distance: Math.sqrt((shape.x - from.x) ** 2 + (shape.y - from.y) ** 2) - shape.radius,
    })), grid);
  }
};

const steps = [
  () => {
    p.setAnimation(() => {
      p.drawText(['Why should', 'I care about', 'SDFs?', '(ep. 2)']);
    });
  },
  () => {
    p.setAnimation(() => {
      p.drawText(['C', 'S', 'G']);
    });
  },
  () => {
    p.setAnimation(() => {
      p.drawText(['Constructive', 'Solid', 'Geometry']);
    });
  },
  () => {
    p.setAnimation((time) => {
      p.drawGrid(grid, time);
    });
  },
  () => {
    const shapes = getShapes();
    p.setAnimation((time) => {
      p.drawGrid(grid);
      for (const shape of shapes) {
        p.drawCircle(shape.x, shape.y, shape.radius, time);
      }
      drawSelected(shapes);
    });
  },
  () => {
    p.setAnimation(() => {
      p.drawText(['Union', 'min(a, b)']);
    });
  },
  getCSGAnimation('opUnion', true),
  getCSGAnimation('opUnion'),
  () => {
    p.setAnimation(() => {
      p.drawText(['Intersection', 'max(a, b)']);
    });
  },
  getCSGAnimation('opIntersection', true),
  getCSGAnimation('opIntersection'),
  () => {
    p.setAnimation(() => {
      p.drawText(['What happens', 'when you invert', 'a SDF?']);
    });
  },
  getInvertedSDFAnimation(true),
  getInvertedSDFAnimation(),
  () => {
    p.setAnimation(() => {
      p.drawText(['Subtraction', 'max(a, -b)']);
    });
  },
  getCSGAnimation('opSubtraction', true),
  getCSGAnimation('opSubtraction'),
  () => {
    p.setAnimation(() => {
      p.drawText(['OK Computer.', "That's cool,", 'I guess.']);
    });
  },
  () => {
    p.setAnimation(() => {
      p.drawText(['But...', "What can I do", 'with this?']);
    });
  },
  getCoolDudeAnimation(1),
  getCoolDudeAnimation(2),
  getCoolDudeAnimation(3),
  getCoolDudeAnimation(4),
  getCoolDudeAnimation(5),
  getCoolDudeAnimation(6),
  getCoolDudeAnimation(7),
  getCoolDudeAnimation(8),
];

const p = new Presentation(document.getElementById('app')!, steps);
