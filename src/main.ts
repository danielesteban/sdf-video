import './main.css';
import { Presentation } from './presentation';
import alea from 'alea';

const grid = 16;

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

const getRandomShapes = (seed: number) => {
  const size = p.getSize();
  const origin = {
    x: (Math.floor(size.x * 0.5 / grid) + 0.5) * grid,
    y: (Math.floor(size.y * 0.5 / grid) + 0.5) * grid,
  };
  const prng = alea(seed);
  const shapes: Parameters<Presentation['computeDistances']>[0] = Array.from({ length: 8 }, (_, i) => ({
    x: origin.x + Math.floor((prng() - 0.5) * 24) * grid,
    y: origin.y + Math.floor((prng() - 0.5) * 48) * grid,
    radius: (3 + Math.floor(i / 2)) * grid,
    operation: 'opUnion',
  }));
  return shapes;
};

const getShapes = () => {
  // const testSeed = (seed: number) => {
  //   const shapes = getRandomShapes(seed);
  //   return !shapes.find((a) => (
  //     !!shapes.find((b) => (
  //       b !== a
  //       && (
  //         Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2) < (a.radius + b.radius + 48)
  //       )
  //     ))
  //   ));
  // };
  // const findSeed = () => {
  //   for (let i = 0; i < 1000; i++) {
  //     const seed = Math.floor(Math.random() * 0xFFFFFFFF);
  //     if (testSeed(seed)) {
  //       console.log('FOUND IT!');
  //       console.log('Seed:', seed);
  //       return;
  //     }
  //   }
  //   setTimeout(findSeed, 0);
  // };
  // findSeed();
  return getRandomShapes(1585837567);
};

const getRaymarchAnimation = (rayAngle: number, initialStep: number = -2) => () => {
  const shapes = getShapes();
  const size = p.getSize();
  const distances = p.computeDistances(shapes, grid);

  const origin = {
    x: (Math.floor(size.x * 0.5 / grid) + 0.5) * grid,
    y: (Math.floor(size.y * 0.5 / grid) + 0.5) * grid,
  };
  const ray = {
    origin: { x: origin.x - 240, y: origin.y + 48 },
    direction: { x: Math.cos(rayAngle), y: Math.sin(rayAngle) },
    distance: 0,
  };
  let point = { ...ray.origin };
  const steps: { x: number; y: number; distance: number }[] = [];
  const minDistance = grid * 0.5;

  let step = initialStep;
  p.setAnimation((time) => {
    p.drawGrid(grid);
    for (const shape of shapes) {
      p.drawCircle(shape.x, shape.y, shape.radius, step === -2 ? time : null);
    }
    if (step >= -1) {
      p.drawLabels(distances, grid, step === -1 ? time : null);
    }
    if (step >= 0) {
      p.drawRay(ray, steps, time);
    }
    drawSelected(shapes);
  });
  p.setOnNext(() => {
    step = step + 1;
    if (step < 0) {
      setProgram();
      return;
    }
    if (step === 0) {
      return;
    }
    const distance = Presentation.computeDistance(shapes, point);
    steps.push({
      x: point.x,
      y: point.y,
      distance,
    });
    ray.distance += Math.max(distance, minDistance);
    point = {
      x: ray.origin.x + ray.direction.x * ray.distance,
      y: ray.origin.y + ray.direction.y * ray.distance,
    };
    if (
      point.x < 0 || point.x > size.x
      || point.y < 0 || point.y > size.y
      || distance <= minDistance
    ) {
      p.setOnNext(null);
    }
  });
  const setProgram = () => p.setProgram(/* glsl */`
    float d;
    float s;
    float r;
    ${shapes.map((shape, i) => /* glsl */`
      r = float(${shape.radius});
      ${step === -2 ? /* glsl */`
        r = min(r * time, r);
      ` : ''}
      s = sdCircle(fragPixel - vec2(float(${shape.x}), float(${shape.y})), r);
      ${i === 0 ? /* glsl */`
        d = s;
      ` : /* glsl */`
        d = ${shape.operation}(d, s);
      `}
    `).join('\n')}
    float alpha = (1.0 - smoothstep(-0.5, 0.5, d)) * 0.75;
    vec3 color = vec3(${32.0 / 255}, ${138 / 255}, ${78 / 255});
    gl_FragColor = vec4(color * alpha, alpha);
  `);
  setProgram();
};

const steps = [
  () => {
    p.setAnimation(() => {
      p.drawText(['Why should', 'I care about', 'SDFs?', '(ep. 3)']);
    });
  },
  () => {
    p.setAnimation(() => {
      p.drawText(['Sphere', 'Tracing']);
    });
  },
  () => {
    p.setAnimation((time) => {
      p.drawGrid(grid, time);
    });
  },
  getRaymarchAnimation(Math.PI * -0.25),
  getRaymarchAnimation(Math.PI * -0.3, 0),
  () => {
    p.setAnimation(() => {
      p.drawText(['OK Computer.', "That's cool,", 'I guess.']);
    });
  },
  () => {
    p.setAnimation(() => {
      p.drawText(['But...', 'What can I do', 'with this?']);
    });
  },
  () => {
    const shapes = getShapes();
    const size = p.getSize();
    const minDistance = 0.1;
    const maxDistance = Math.sqrt((size.x ** 2) + (size.y ** 2));
    p.setAnimation(() => {
      p.drawGrid(grid);
      for (const shape of shapes) {
        p.drawCircle(shape.x, shape.y, shape.radius);
      }
      const hover = p.getHover();
      const selected = p.getSelected();
      if (hover && !selected) {
        p.setUniformVec2('lightPos', hover);
      }
    });
    p.setProgram(/* glsl */`
      float d = map(fragPixel);
      vec3 shapeColor = vec3(${32.0 / 255}, ${138 / 255}, ${78 / 255});
      float shapeAlpha = (1.0 - smoothstep(-0.5, 0.5, d)) * 0.75;
      vec4 shape = vec4(shapeColor * shapeAlpha, shapeAlpha);

      vec2 lightDir = normalize(lightPos - fragPixel);
      float lightDist = length(fragPixel - lightPos);
      float lightRayDistance = march(fragPixel, lightDir);
      float lightDecay = sqrt(min(lightDist / 512.0, 1.0));
      vec3 lightColor = mix(vec3(1.0, 1.0, 0.0), vec3(0.0), lightRayDistance >= lightDist ? lightDecay : 1.0);
      float lightAlpha = smoothstep(-0.5, 0.5, d) * 0.75;
      vec4 light = vec4(lightColor * lightAlpha, lightAlpha);

      gl_FragColor = vec4(
        shape.rgb + (light.rgb * (1.0 - shape.a)),
        shape.a + (light.a * (1.0 - shape.a))
      );
    `, /* glsl */`
      uniform vec2 lightPos;
      float map(const in vec2 p) {
        float d;
        float s;
        ${shapes.map((shape, i) => /* glsl */`
          s = sdCircle(p - vec2(float(${shape.x}), float(${shape.y})), float(${shape.radius}));
          ${i === 0 ? /* glsl */`
            d = s;
          ` : /* glsl */`
            d = ${shape.operation}(d, s);
          `}
        `).join('\n')}
        return d;
      }
      float march(const in vec2 rayOrigin, const in vec2 rayDirection) {
        float rayDistance;
        vec2 p = rayOrigin;
        for (int i = 0; i < 1000; i++) {
          float step = map(p);
          rayDistance += max(step, float(${minDistance}));
          p = rayOrigin + rayDirection * rayDistance;
          if (
            rayDistance >= float(${maxDistance})
            || step <= float(${minDistance})
          ) {
            break;
          }
        }
        return rayDistance;
      }
    `);
    p.setUniformVec2('lightPos', { x: size.x * 0.5, y: size.y * 0.5 });
  },
];

const p = new Presentation(document.getElementById('app')!, steps);
