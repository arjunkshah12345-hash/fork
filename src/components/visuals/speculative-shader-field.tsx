"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

import { cn } from "@/lib/utils";

const VERTEX_WEBGL1 = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const VERTEX_WEBGL2 = `#version 300 es
in vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

function fragmentShader(webgl2: boolean, precision: "highp" | "mediump") {
  return `${webgl2 ? "#version 300 es" : ""}
precision ${precision} float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_pointer;
uniform float u_quality;
uniform float u_reveal;
uniform float u_converge;
uniform float u_join;

${webgl2 ? "out vec4 outColor;" : ""}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 turn = mat2(0.82, -0.57, 0.57, 0.82);
  for (int octave = 0; octave < 4; octave++) {
    value += valueNoise(p) * amplitude;
    p = turn * p * 2.03 + 11.7;
    amplitude *= 0.5;
    if (octave == 2 && u_quality < 0.8) break;
  }
  return value;
}

float bayer4(vec2 coordinate) {
  vec2 cell = mod(floor(coordinate), 4.0);
  float index = cell.x + cell.y * 4.0;
  if (index < 0.5) return 0.03125;
  if (index < 1.5) return 0.53125;
  if (index < 2.5) return 0.15625;
  if (index < 3.5) return 0.65625;
  if (index < 4.5) return 0.78125;
  if (index < 5.5) return 0.28125;
  if (index < 6.5) return 0.90625;
  if (index < 7.5) return 0.40625;
  if (index < 8.5) return 0.21875;
  if (index < 9.5) return 0.71875;
  if (index < 10.5) return 0.09375;
  if (index < 11.5) return 0.59375;
  if (index < 12.5) return 0.96875;
  if (index < 13.5) return 0.46875;
  if (index < 14.5) return 0.84375;
  return 0.34375;
}

float branchY(float startY, float x, float flow, float pointerBend) {
  float merge = smoothstep(0.28, 0.70, x);
  float residual = 1.0 - smoothstep(0.63, 0.78, x);
  return mix(startY, 0.5, merge * u_converge) + flow * residual + pointerBend;
}

void main() {
  vec2 uv = gl_FragCoord.xy / max(u_resolution, vec2(1.0));
  uv.y = 1.0 - uv.y;
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 fieldPoint = vec2(uv.x * aspect, uv.y);

  float time = u_time * 0.17;
  float broadNoise = fbm(fieldPoint * vec2(2.6, 3.2) + vec2(-time * 0.12, time * 0.045));
  float fineNoise = fbm(fieldPoint * vec2(7.5, 9.0) + vec2(time * 0.09, -time * 0.07));
  float warp = (broadNoise - 0.5) * 0.038 + (fineNoise - 0.5) * 0.010;

  vec2 pointerDelta = (uv - u_pointer) * vec2(aspect, 1.0);
  float pointerInfluence = exp(-dot(pointerDelta, pointerDelta) * 14.0);
  float pointerBend = (u_pointer.y - uv.y) * pointerInfluence * 0.042;

  float flowA = warp + sin(uv.x * 10.0 - time * 0.72) * 0.009;
  float flowB = warp * -0.55 + sin(uv.x * 12.0 + time * 0.48 + 1.7) * 0.006;
  float flowC = warp + sin(uv.x * 9.0 + time * 0.61 + 3.4) * 0.009;

  float yA = branchY(0.23, uv.x, flowA, pointerBend);
  float yB = branchY(0.50, uv.x, flowB, pointerBend * 0.72);
  float yC = branchY(0.77, uv.x, flowC, pointerBend);

  float dA = abs(uv.y - yA);
  float dB = abs(uv.y - yB);
  float dC = abs(uv.y - yC);
  float minDistance = min(dA, min(dB, dC));

  float filamentA = exp(-dA * 118.0);
  float filamentB = exp(-dB * 132.0);
  float filamentC = exp(-dC * 118.0);
  float filament = max(filamentA, max(filamentB, filamentC));

  float wispA = exp(-abs(uv.y - yA - sin(uv.x * 25.0 + fineNoise * 5.0 - time) * 0.026) * 150.0);
  float wispB = exp(-abs(uv.y - yB - sin(uv.x * 22.0 - fineNoise * 4.0 + time * 0.7) * 0.021) * 160.0);
  float wispC = exp(-abs(uv.y - yC - sin(uv.x * 24.0 + fineNoise * 5.0 + time) * 0.026) * 150.0);
  float wisps = max(wispA, max(wispB, wispC));

  float contourWave = 0.5 + 0.5 * cos(minDistance * 205.0 - broadNoise * 10.0 + time * 0.42);
  float contours = pow(contourWave, 11.0) * exp(-minDistance * 18.0);
  contours *= 0.62 + fineNoise * 0.38;

  // Draw-on sweep: the three filaments trace in left-to-right as GSAP raises
  // u_reveal, then u_converge folds them into the single winner line.
  float revealGate = smoothstep(u_reveal - 0.07, u_reveal, uv.x);
  float convergeGate = smoothstep(0.35, 1.0, u_converge);

  float mergeGate = smoothstep(0.61, 0.76, uv.x);
  float winnerFlow = sin(uv.x * 17.0 - time * 0.85 + broadNoise * 3.0) * 0.006;
  float winnerDistance = abs(uv.y - 0.5 - winnerFlow - pointerBend * 0.35);
  float winnerFilament = exp(-winnerDistance * 165.0) * mergeGate * convergeGate;

  vec2 joinDelta = (uv - vec2(0.69, 0.5)) * vec2(aspect, 1.0);
  float joinDistance = length(joinDelta);
  float joinCore = exp(-joinDistance * 52.0) * smoothstep(0.6, 1.0, u_converge);

  float entryGate = smoothstep(0.12, 0.22, uv.x);
  float exitGate = 1.0 - smoothstep(0.86, 0.98, uv.x);
  float domainGate = entryGate * exitGate;
  float travelPulse = 0.78 + 0.22 * sin(uv.x * 17.0 - time * 1.45);

  float graphiteEnergy = (filament * 0.42 + wisps * 0.12 + contours * 0.19) * domainGate * revealGate;
  graphiteEnergy += pointerInfluence * contours * 0.05;
  float convergenceEnergy = winnerFilament * (0.38 + travelPulse * 0.18) * (1.0 + u_join * 0.7);
  convergenceEnergy += joinCore * (0.22 + u_join * 0.55) * smoothstep(0.54, 0.70, uv.x);
  convergenceEnergy += filament * smoothstep(0.56, 0.76, uv.x) * 0.07;
  convergenceEnergy *= revealGate;

  float threshold = bayer4(gl_FragCoord.xy);
  float graphiteDot = step(threshold, clamp(graphiteEnergy, 0.0, 0.94));
  float convergenceDot = step(threshold, clamp(convergenceEnergy, 0.0, 0.88));
  float sparseField = step(0.985, hash21(floor(gl_FragCoord.xy / 3.0) + floor(time)));
  sparseField *= (1.0 - smoothstep(0.0, 0.18, minDistance)) * 0.2;

  vec3 base = vec3(0.026, 0.029, 0.033);
  vec3 graphite = vec3(0.235, 0.258, 0.275);
  vec3 steel = vec3(0.58, 0.63, 0.67);
  vec3 color = mix(base, graphite, clamp(graphiteDot * 0.66 + sparseField, 0.0, 1.0));
  color = mix(color, steel, convergenceDot * 0.62);
  color = mix(color, steel, joinCore * u_join * 0.55);

  float edgeShade = smoothstep(0.0, 0.12, uv.x) * (1.0 - smoothstep(0.88, 1.0, uv.x));
  edgeShade *= smoothstep(0.0, 0.08, uv.y) * (1.0 - smoothstep(0.92, 1.0, uv.y));
  color = mix(base, color, 0.58 + edgeShade * 0.42);

  ${webgl2 ? "outColor" : "gl_FragColor"} = vec4(color, 1.0);
}
`;
}

function compileShader(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  type: number,
  source: string,
  onError: (message: string) => void,
) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    onError(gl.getShaderInfoLog(shader) ?? "Shader compilation failed");
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function SpeculativeShaderField({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const fallback = fallbackRef.current;
    if (!root || !canvas || !fallback) return;

    const options: WebGLContextAttributes = {
      alpha: false,
      antialias: false,
      depth: false,
      failIfMajorPerformanceCaveat: true,
      powerPreference: "high-performance",
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      stencil: false,
    };
    const webgl2 = canvas.getContext("webgl2", options);
    const gl = webgl2 ?? canvas.getContext("webgl", options);
    if (!gl) return;

    const highPrecision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    const precision = highPrecision && highPrecision.precision > 0 ? "highp" : "mediump";
    const reportShaderError = (message: string) => {
      root.dataset.shaderError = message.replaceAll(/\s+/g, " ").trim().slice(0, 280);
    };
    const vertex = compileShader(
      gl,
      gl.VERTEX_SHADER,
      webgl2 ? VERTEX_WEBGL2 : VERTEX_WEBGL1,
      reportShaderError,
    );
    const fragment = compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShader(Boolean(webgl2), precision),
      reportShaderError,
    );
    if (!vertex || !fragment) {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
      return;
    }

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      reportShaderError(gl.getProgramInfoLog(program) ?? "Shader program link failed");
      gl.deleteProgram(program);
      return;
    }

    const position = gl.getAttribLocation(program, "a_position");
    const resolution = gl.getUniformLocation(program, "u_resolution");
    const time = gl.getUniformLocation(program, "u_time");
    const pointerUniform = gl.getUniformLocation(program, "u_pointer");
    const qualityUniform = gl.getUniformLocation(program, "u_quality");
    const revealUniform = gl.getUniformLocation(program, "u_reveal");
    const convergeUniform = gl.getUniformLocation(program, "u_converge");
    const joinUniform = gl.getUniformLocation(program, "u_join");
    const buffer = gl.createBuffer();
    if (
      !buffer ||
      position < 0 ||
      !resolution ||
      !time ||
      !pointerUniform ||
      !qualityUniform ||
      !revealUniform ||
      !convergeUniform ||
      !joinUniform
    ) {
      if (buffer) gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    gl.useProgram(program);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);

    canvas.style.opacity = "1";
    fallback.style.opacity = "0";
    delete root.dataset.shaderError;
    root.dataset.renderer = webgl2 ? "webgl2" : "webgl1";
    root.dataset.motion = "paused";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");

    // Uniform state that both the RAF loop and GSAP read/write. GSAP owns the
    // intro choreography (reveal sweep → converge → join pulse) and the pointer
    // spring; the RAF loop only copies these into the shader each frame.
    const state = {
      pointer: { x: 0.5, y: 0.5 },
      reveal: 0,
      converge: 0,
      join: 0,
    };
    let renderQuality = 1;
    let animationFrame = 0;
    let elapsed = 0;
    let lastFrame = 0;
    let inView = false;
    let contextLost = false;
    let introStarted = false;
    let intro: gsap.core.Timeline | null = null;
    let pointerToX: ((value: number) => void) | null = null;
    let pointerToY: ((value: number) => void) | null = null;

    const draw = (timestamp: number, staticFrame = false) => {
      if (contextLost) return;
      if (!staticFrame) {
        if (lastFrame > 0) elapsed += Math.min(timestamp - lastFrame, 48) / 1_000;
        lastFrame = timestamp;
      }

      gl.useProgram(program);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, staticFrame ? 4.25 : elapsed);
      gl.uniform2f(pointerUniform, state.pointer.x, state.pointer.y);
      gl.uniform1f(qualityUniform, renderQuality);
      gl.uniform1f(revealUniform, staticFrame ? 1 : state.reveal);
      gl.uniform1f(convergeUniform, staticFrame ? 1 : state.converge);
      gl.uniform1f(joinUniform, staticFrame ? 0 : state.join);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (!staticFrame && inView && !document.hidden && !reduceMotion.matches) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    };

    const stop = () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      lastFrame = 0;
    };

    const reconcile = () => {
      stop();
      if (contextLost) return;
      if (reduceMotion.matches) {
        root.dataset.motion = "static";
        draw(0, true);
      } else if (inView && !document.hidden) {
        root.dataset.motion = "running";
        if (!introStarted) {
          introStarted = true;
          intro?.play();
        }
        animationFrame = window.requestAnimationFrame(draw);
      } else {
        root.dataset.motion = "paused";
      }
    };

    // GSAP owns the motion layer: the pointer spring and the three-act intro
    // (filaments draw on, fold together, winner resolves with a pulse).
    const gsapCtx = gsap.context(() => {
      pointerToX = gsap.quickTo(state.pointer, "x", { duration: 0.55, ease: "power3.out" });
      pointerToY = gsap.quickTo(state.pointer, "y", { duration: 0.55, ease: "power3.out" });

      intro = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });
      intro
        .to(state, { reveal: 1, duration: 1.7, ease: "power2.inOut" }, 0.15)
        .to(state, { converge: 1, duration: 1.5, ease: "power3.inOut" }, "-=0.9")
        .to(state, { join: 1, duration: 0.5, ease: "power2.out", yoyo: true, repeat: 1 }, "-=0.4")
        .to(state, { join: 0, duration: 0.4 }, "+=0.05");
    }, root);

    const resize = () => {
      const rect = root.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const mobile = rect.width < 640 || coarsePointer.matches;
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.5);
      const scale = mobile ? 0.72 : 1;
      const nextWidth = Math.max(2, Math.round(rect.width * dpr * scale));
      const nextHeight = Math.max(2, Math.round(rect.height * dpr * scale));
      renderQuality = mobile ? 0.64 : 1;
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
        gl.viewport(0, 0, nextWidth, nextHeight);
      }
      if (reduceMotion.matches || !animationFrame) draw(0, reduceMotion.matches);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
      if (pointerToX && pointerToY) {
        pointerToX(x);
        pointerToY(y);
      } else {
        state.pointer.x = x;
        state.pointer.y = y;
      }
    };
    const onPointerLeave = () => {
      if (pointerToX && pointerToY) {
        pointerToX(0.5);
        pointerToY(0.5);
      } else {
        state.pointer.x = 0.5;
        state.pointer.y = 0.5;
      }
    };
    const onVisibilityChange = () => reconcile();
    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      stop();
      canvas.style.opacity = "0";
      fallback.style.opacity = "1";
      root.dataset.renderer = "fallback";
      root.dataset.motion = "static";
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        inView = Boolean(entry?.isIntersecting);
        reconcile();
      },
      { rootMargin: "120px 0px", threshold: 0.01 },
    );
    intersectionObserver.observe(root);
    canvas.addEventListener("pointermove", onPointerMove, { passive: true });
    canvas.addEventListener("pointerleave", onPointerLeave, { passive: true });
    canvas.addEventListener("webglcontextlost", onContextLost);
    document.addEventListener("visibilitychange", onVisibilityChange);
    reduceMotion.addEventListener("change", reconcile);
    coarsePointer.addEventListener("change", resize);
    resize();

    return () => {
      stop();
      gsapCtx.revert();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reduceMotion.removeEventListener("change", reconcile);
      coarsePointer.removeEventListener("change", resize);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      data-speculative-shader
      data-renderer="fallback"
      data-motion="static"
      className={cn("relative overflow-hidden bg-[#090b0d]", className)}
    >
      <svg
        ref={fallbackRef}
        viewBox="0 0 1000 700"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full transition-opacity duration-300 motion-reduce:transition-none"
      >
        <defs>
          <pattern id="shader-fallback-dither" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="1" height="1" fill="#aeb9c2" />
            <rect x="4" y="4" width="1" height="1" fill="#aeb9c2" />
          </pattern>
        </defs>
        <rect width="1000" height="700" fill="#090b0d" />
        <rect width="1000" height="700" fill="url(#shader-fallback-dither)" opacity="0.035" />
        <g fill="none" stroke="#667078" opacity="0.28">
          <path d="M120 158C410 136 426 324 710 350" />
          <path d="M120 350C406 346 480 350 710 350" />
          <path d="M120 542C410 564 426 376 710 350" />
          <path d="M110 132C390 102 434 300 710 336" opacity="0.35" />
          <path d="M110 184C390 170 434 344 710 364" opacity="0.28" />
          <path d="M110 516C390 530 434 356 710 336" opacity="0.28" />
          <path d="M110 568C390 598 434 400 710 364" opacity="0.35" />
        </g>
        <path d="M660 350H900" stroke="#aeb9c2" opacity="0.48" />
        <rect x="704" y="344" width="12" height="12" fill="#e8e4dc" />
      </svg>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full opacity-0 transition-opacity duration-300 motion-reduce:transition-none"
      />
    </div>
  );
}
