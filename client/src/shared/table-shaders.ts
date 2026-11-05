const WGSL_HEAD = /* wgsl */ `
struct GlobalFilterUniforms {
  uInputSize: vec4<f32>,
  uInputPixel: vec4<f32>,
  uInputClamp: vec4<f32>,
  uOutputFrame: vec4<f32>,
  uGlobalFrame: vec4<f32>,
  uOutputTexture: vec4<f32>,
};
@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;
struct VSOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};
@vertex
fn mainVertex(@location(0) aPosition: vec2<f32>) -> VSOutput {
  var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;
  position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;
  return VSOutput(vec4(position, 0.0, 1.0), aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw));
}
`;

/** Сукно: плетение, свет лампы и медленно плывущие ступенчатые разводы цвета раунда. */
export const FELT_SHADER = {
  glsl: /* glsl */ `precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec3 uTint;
uniform float uTime;
uniform vec3 uAccent;

void main() {
  vec2 uv = vTextureCoord * uInputSize.xy / uOutputFrame.zw;
  vec2 cell = floor(uv * vec2(427.0, 240.0));
  float weave = mod(cell.x + cell.y, 2.0) * 0.018 + mod(cell.x - cell.y, 5.0) * 0.004;
  vec2 lamp = uv - vec2(0.4 + 0.012 * sin(uTime * 0.7), 0.42);
  float light = smoothstep(0.75, 0.05, length(lamp * vec2(1.25, 1.0))) * (0.96 + 0.04 * sin(uTime * 1.3));
  vec2 p = (uv - 0.5) * vec2(1.78, 1.0);
  float swirl = sin(p.x * 7.0 + sin(p.y * 6.0 + uTime * 0.37) * 1.6 + uTime * 0.22) + sin(length(p) * 11.0 - uTime * 0.45);
  float bands = floor((swirl * 0.25 + 0.5) * 5.0) / 5.0;
  vec3 color = mix(vec3(0.035, 0.11, 0.09), uTint, light) + uAccent * bands * 0.16 * (0.4 + light) + weave;
  finalColor = vec4(color, 1.0) * texture(uTexture, vTextureCoord).a;
}
`,
  wgsl:
    WGSL_HEAD +
    /* wgsl */ `
struct Custom { uTint: vec3<f32>, uTime: f32, uAccent: vec3<f32> };
@group(1) @binding(0) var<uniform> custom: Custom;

@fragment
fn mainFragment(@location(0) coord: vec2<f32>) -> @location(0) vec4<f32> {
  let uv = coord * gfu.uInputSize.xy / gfu.uOutputFrame.zw;
  let cell = floor(uv * vec2(427.0, 240.0));
  let a = cell.x + cell.y;
  let b = cell.x - cell.y;
  let weave = (a - 2.0 * floor(a / 2.0)) * 0.018 + (b - 5.0 * floor(b / 5.0)) * 0.004;
  let lamp = uv - vec2(0.4 + 0.012 * sin(custom.uTime * 0.7), 0.42);
  let light = smoothstep(0.75, 0.05, length(lamp * vec2(1.25, 1.0))) * (0.96 + 0.04 * sin(custom.uTime * 1.3));
  let p = (uv - 0.5) * vec2(1.78, 1.0);
  let swirl = sin(p.x * 7.0 + sin(p.y * 6.0 + custom.uTime * 0.37) * 1.6 + custom.uTime * 0.22) + sin(length(p) * 11.0 - custom.uTime * 0.45);
  let bands = floor((swirl * 0.25 + 0.5) * 5.0) / 5.0;
  let color = mix(vec3(0.035, 0.11, 0.09), custom.uTint, light) + custom.uAccent * bands * 0.16 * (0.4 + light) + weave;
  return vec4(color, 1.0) * textureSample(uTexture, uSampler, coord).a;
}
`,
};

/** Стекло: узкая полоса света идёт по карте и преломляется ступенями. */
export const GLASS_SHADER = {
  glsl: /* glsl */ `precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform float uTime;

void main() {
  vec4 base = texture(uTexture, vTextureCoord);
  float band = fract(vTextureCoord.x * 2.0 + vTextureCoord.y * 1.3 - uTime * 0.35);
  float glint = smoothstep(0.0, 0.08, band) * smoothstep(0.2, 0.08, band);
  vec3 tint = vec3(0.72, 0.92, 1.0) * floor(glint * 4.0) / 4.0;
  finalColor = vec4(base.rgb + tint * 0.55 * base.a, base.a);
}
`,
  wgsl:
    WGSL_HEAD +
    /* wgsl */ `
struct Custom { uTime: f32 };
@group(1) @binding(0) var<uniform> custom: Custom;

@fragment
fn mainFragment(@location(0) coord: vec2<f32>) -> @location(0) vec4<f32> {
  let base = textureSample(uTexture, uSampler, coord);
  let band = fract(coord.x * 2.0 + coord.y * 1.3 - custom.uTime * 0.35);
  let glint = smoothstep(0.0, 0.08, band) * smoothstep(0.2, 0.08, band);
  let tint = vec3(0.72, 0.92, 1.0) * floor(glint * 4.0) / 4.0;
  return vec4(base.rgb + tint * 0.55 * base.a, base.a);
}
`,
};

/** Монохром: серебряная гравюра, ступенчатые тона и медленный блик по диагонали. */
export const MONO_SHADER = {
  glsl: /* glsl */ `precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform float uTime;

void main() {
  vec4 base = texture(uTexture, vTextureCoord);
  float grey = dot(base.rgb, vec3(0.3, 0.59, 0.11));
  float tone = floor(grey * 5.0 + 0.5) / 5.0;
  float band = fract(vTextureCoord.x * 1.4 - vTextureCoord.y * 1.8 + uTime * 0.28);
  float sheen = smoothstep(0.0, 0.12, band) * smoothstep(0.3, 0.12, band);
  float grain = fract(sin(dot(floor(vTextureCoord * 220.0), vec2(12.9898, 78.233))) * 43758.5453) * 0.05;
  vec3 silver = vec3(tone) * vec3(0.92, 0.96, 1.0) - grain * base.a;
  finalColor = vec4(silver + vec3(0.32) * sheen * base.a, base.a);
}
`,
  wgsl:
    WGSL_HEAD +
    /* wgsl */ `
struct Custom { uTime: f32 };
@group(1) @binding(0) var<uniform> custom: Custom;

@fragment
fn mainFragment(@location(0) coord: vec2<f32>) -> @location(0) vec4<f32> {
  let base = textureSample(uTexture, uSampler, coord);
  let grey = dot(base.rgb, vec3(0.3, 0.59, 0.11));
  let tone = floor(grey * 5.0 + 0.5) / 5.0;
  let band = fract(coord.x * 1.4 - coord.y * 1.8 + custom.uTime * 0.28);
  let sheen = smoothstep(0.0, 0.12, band) * smoothstep(0.3, 0.12, band);
  let grain = fract(sin(dot(floor(coord * 220.0), vec2(12.9898, 78.233))) * 43758.5453) * 0.05;
  let silver = vec3(tone) * vec3(0.92, 0.96, 1.0) - grain * base.a;
  return vec4(silver + vec3(0.32) * sheen * base.a, base.a);
}
`,
};

/** Появление на витрине: карта прожигается из пикселей, по кромке идёт золотой огонь и блик. */
export const SHOP_REVEAL_SHADER = {
  glsl: /* glsl */ `precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform float uProgress;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec2 uv = vTextureCoord * uInputSize.xy / uOutputFrame.zw;
  vec4 base = texture(uTexture, vTextureCoord);
  vec2 cell = floor(uv * vec2(36.0, 48.0)) / vec2(36.0, 48.0);
  float field = noise(cell * 7.0) * 0.65 + (1.0 - cell.y) * 0.35;
  float front = uProgress * 1.3 - 0.15;
  float shown = step(field, front);
  float edge = shown * (1.0 - smoothstep(0.0, 0.1, front - field));
  vec3 fire = mix(vec3(1.0, 0.42, 0.08), vec3(1.0, 0.93, 0.55), edge);
  float band = fract(uv.x * 0.8 - uv.y * 0.8 + uProgress * 1.2);
  float sheen = smoothstep(0.0, 0.08, band) * smoothstep(0.18, 0.08, band) * (1.0 - uProgress) * 0.7;
  vec3 color = base.rgb + (fire * edge * 1.1 + vec3(sheen)) * base.a;
  finalColor = vec4(color, base.a) * shown;
}
`,
  wgsl:
    WGSL_HEAD +
    /* wgsl */ `
struct Custom { uProgress: f32 };
@group(1) @binding(0) var<uniform> custom: Custom;

fn hash(p: vec2<f32>) -> f32 {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

fn noise(p: vec2<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

@fragment
fn mainFragment(@location(0) coord: vec2<f32>) -> @location(0) vec4<f32> {
  let uv = coord * gfu.uInputSize.xy / gfu.uOutputFrame.zw;
  let base = textureSample(uTexture, uSampler, coord);
  let cell = floor(uv * vec2(36.0, 48.0)) / vec2(36.0, 48.0);
  let field = noise(cell * 7.0) * 0.65 + (1.0 - cell.y) * 0.35;
  let front = custom.uProgress * 1.3 - 0.15;
  let shown = step(field, front);
  let edge = shown * (1.0 - smoothstep(0.0, 0.1, front - field));
  let fire = mix(vec3(1.0, 0.42, 0.08), vec3(1.0, 0.93, 0.55), edge);
  let band = fract(uv.x * 0.8 - uv.y * 0.8 + custom.uProgress * 1.2);
  let sheen = smoothstep(0.0, 0.08, band) * smoothstep(0.18, 0.08, band) * (1.0 - custom.uProgress) * 0.7;
  let color = base.rgb + (fire * edge * 1.1 + vec3(sheen)) * base.a;
  return vec4(color, base.a) * shown;
}
`,
};

/** Весь кадр: едва заметные строки экрана и затемнённые углы. */
export const SCREEN_SHADER = {
  glsl: /* glsl */ `precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform float uStrength;

void main() {
  vec2 uv = vTextureCoord * uInputSize.xy / uOutputFrame.zw;
  vec4 color = texture(uTexture, vTextureCoord);
  float lines = 1.0 - uStrength * 0.07 * step(0.5, fract(uv.y * 240.0));
  vec2 edge = uv - 0.5;
  float corners = 1.0 - uStrength * smoothstep(0.3, 0.75, dot(edge, edge) * 2.0) * 0.45;
  finalColor = vec4(color.rgb * lines * corners, color.a);
}
`,
  wgsl:
    WGSL_HEAD +
    /* wgsl */ `
struct Custom { uStrength: f32 };
@group(1) @binding(0) var<uniform> custom: Custom;

@fragment
fn mainFragment(@location(0) coord: vec2<f32>) -> @location(0) vec4<f32> {
  let uv = coord * gfu.uInputSize.xy / gfu.uOutputFrame.zw;
  let color = textureSample(uTexture, uSampler, coord);
  let lines = 1.0 - custom.uStrength * 0.07 * step(0.5, fract(uv.y * 240.0));
  let edge = uv - 0.5;
  let corners = 1.0 - custom.uStrength * smoothstep(0.3, 0.75, dot(edge, edge) * 2.0) * 0.45;
  return vec4(color.rgb * lines * corners, color.a);
}
`,
};
