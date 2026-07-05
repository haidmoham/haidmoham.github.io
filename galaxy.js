/* Ambient galaxy hero background — a single WebGL2 fullscreen fragment shader.
   Evokes Voidpulse without the audio engine: no particle sim, one draw call.
   Runs on index.html only (no-ops if #galaxy-canvas is absent).

   Motion: always animates. The subtle ambient breathe is an owner-approved
   exception to prefers-reduced-motion (2026-07-05); the render loop still pauses
   when the tab is hidden, and pixel ratio / star density scale down on small
   screens. If WebGL2 is unavailable, the canvas keeps its CSS gradient fallback. */
(function () {
  var canvas = document.getElementById('galaxy-canvas');
  if (!canvas) return;

  var gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) { console.warn('[galaxy] WebGL2 unavailable — using static gradient fallback.'); return; }

  var isSmall = matchMedia('(max-width: 640px)').matches;

  var VERT = '#version 300 es\n' +
    'void main(){\n' +
    '  vec2 p = vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2));\n' +
    '  gl_Position = vec4(p*2.0 - 1.0, 0.0, 1.0);\n' +
    '}';

  var FRAG = '#version 300 es\n' +
    'precision highp float;\n' +
    'out vec4 fragColor;\n' +
    'uniform vec2 uRes;\n' +
    'uniform float uTime;\n' +
    'uniform vec2 uMouse;\n' +
    'uniform float uDensity;\n' +
    'uniform float uGlow;\n' +
    'float hash21(vec2 p){ p=fract(p*vec2(123.34,345.45)); p+=dot(p,p+34.345); return fract(p.x*p.y); }\n' +
    'vec2 hash22(vec2 p){ float n=sin(dot(p,vec2(41.0,289.0))); return fract(vec2(262144.0,32768.0)*n); }\n' +
    'float vnoise(vec2 p){\n' +
    '  vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);\n' +
    '  float a=hash21(i), b=hash21(i+vec2(1,0)), c=hash21(i+vec2(0,1)), d=hash21(i+vec2(1,1));\n' +
    '  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);\n' +
    '}\n' +
    'float fbm(vec2 p){\n' +
    '  float s=0.0,a=0.5; mat2 m=mat2(1.6,1.2,-1.2,1.6);\n' +
    '  for(int i=0;i<5;i++){ s+=a*vnoise(p); p=m*p; a*=0.5; }\n' +
    '  return s;\n' +
    '}\n' +
    'mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }\n' +
    'vec3 stars(vec2 uv,float scale,float t,vec3 tint){\n' +
    '  vec3 col=vec3(0.0);\n' +
    '  vec2 g=uv*scale; vec2 id=floor(g); vec2 f=fract(g)-0.5;\n' +
    '  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){\n' +
    '    vec2 o=vec2(float(x),float(y));\n' +
    '    vec2 h=hash22(id+o);\n' +
    '    vec2 pos=o+(h-0.5)*0.75;\n' +
    '    float d=length(f-pos);\n' +
    '    float present=step(0.64, h.x*h.y*1.9);\n' +
    '    float tw=0.6+0.4*sin(t*(1.0+h.x*2.2)+h.y*6.28);\n' +
    '    float core=smoothstep(0.045,0.0,d);\n' +
    '    float halo=0.1*smoothstep(0.22,0.0,d);\n' +
    '    vec3 sc=mix(tint,vec3(0.42,0.72,1.0),h.x*0.6);\n' +
    '    sc=mix(sc,vec3(0.60,0.50,1.0),step(0.84,h.y)*0.6);\n' +
    '    col+=sc*present*tw*(core+halo);\n' +
    '  }\n' +
    '  return col;\n' +
    '}\n' +
    'void main(){\n' +
    '  vec2 uv=(gl_FragCoord.xy-0.5*uRes)/uRes.y;\n' +
    '  float t=uTime;\n' +
    '  vec2 mo=uMouse-0.5;\n' +
    '  float breathe=0.68+0.32*sin(t*0.8);\n' +
    '  float swell=pow(0.5+0.5*sin(t*0.37),3.0);\n' +
    '  float pulse=breathe+swell*0.5;\n' +
    '  vec2 center=vec2(0.30,0.03);\n' +
    '  vec2 p=uv-center + mo*0.06;\n' +
    '  float r=length(p);\n' +
    '  float ang=atan(p.y,p.x);\n' +
    '  vec3 accent=vec3(0.239,0.545,1.0);\n' +
    '  vec3 ground=vec3(0.055,0.067,0.090);\n' +
    '  vec3 light=vec3(0.0);\n' +
    '  vec2 np=p*1.5; np*=rot(t*0.045); np+=mo*0.12;\n' +
    '  float neb=fbm(np*2.0+vec2(0.0,t*0.035));\n' +
    '  neb=pow(neb,2.2);\n' +
    '  float arms=0.5+0.5*sin(ang*2.0+r*7.0-t*0.35);\n' +
    '  neb*=mix(0.55,1.0,arms);\n' +
    '  float radial=smoothstep(1.15,0.0,r);\n' +
    '  float hueN=fbm(np*1.1+7.0);\n' +
    '  vec3 cyan=vec3(0.28,0.68,1.0);\n' +
    '  vec3 indigo=vec3(0.45,0.33,0.98);\n' +
    '  vec3 nebCol=mix(accent,cyan,smoothstep(0.38,0.80,hueN));\n' +
    '  nebCol=mix(nebCol,indigo,smoothstep(0.55,1.05,r)*0.6);\n' +
    '  light+=nebCol*neb*radial*0.42*(0.75+0.35*pulse);\n' +
    '  float core=pow(smoothstep(0.5,0.0,r),3.2);\n' +
    '  light+=accent*core*(0.5*uGlow)*pulse;\n' +
    '  light+=vec3(0.75,0.85,1.0)*pow(smoothstep(0.085,0.0,r),3.5)*uGlow*pulse*0.35;\n' +
    '  vec2 suv=rot(t*0.025)*uv;\n' +
    '  vec3 farTint=mix(accent,vec3(1.0),0.6);\n' +
    '  light+=stars(suv+mo*0.02,3.0,t,farTint*0.5)*uDensity;\n' +
    '  light+=stars(suv+mo*0.05,6.0,t,farTint*0.72)*uDensity;\n' +
    '  light+=stars(suv+mo*0.09,10.0,t,accent*0.9+vec3(0.30))*uDensity*0.75;\n' +
    '  light*=smoothstep(1.5,0.25,length(uv));\n' +
    '  vec3 col=ground+light;\n' +
    '  col=vec3(1.0)-exp(-col*1.15);\n' +
    '  col+=(hash21(gl_FragCoord.xy)-0.45)/255.0;\n' +
    '  fragColor=vec4(col,1.0);\n' +
    '}';

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('[galaxy] shader compile failed:\n' + gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }
  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('[galaxy] program link failed:\n' + gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  var U = {
    res: gl.getUniformLocation(prog, 'uRes'),
    time: gl.getUniformLocation(prog, 'uTime'),
    mouse: gl.getUniformLocation(prog, 'uMouse'),
    density: gl.getUniformLocation(prog, 'uDensity'),
    glow: gl.getUniformLocation(prog, 'uGlow')
  };

  var SPEED = 0.6;
  var GLOW = 0.85;
  var DENSITY = isSmall ? 0.75 : 0.9;
  var DPR_CAP = isSmall ? 1.5 : 2;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    var w = Math.floor(canvas.clientWidth * dpr), h = Math.floor(canvas.clientHeight * dpr);
    if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }
  window.addEventListener('resize', resize);

  // subtle pointer parallax, smoothed; idle state is centered and calm
  var tx = 0.5, ty = 0.5, mx = 0.5, my = 0.5;
  function pointer(x, y) { tx = x / window.innerWidth; ty = 1 - y / window.innerHeight; }
  window.addEventListener('mousemove', function (e) { pointer(e.clientX, e.clientY); });
  window.addEventListener('touchmove', function (e) { if (e.touches[0]) pointer(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });

  function draw(t) {
    resize();
    mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
    gl.uniform2f(U.res, canvas.width, canvas.height);
    gl.uniform1f(U.time, t * SPEED);
    gl.uniform2f(U.mouse, mx, my);
    gl.uniform1f(U.density, DENSITY);
    gl.uniform1f(U.glow, GLOW);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  var raf = 0, clock = 0, last = performance.now() / 1000;
  function loop() {
    var now = performance.now() / 1000;
    clock += Math.min(now - last, 0.05); // clamp big gaps so pausing doesn't jump
    last = now;
    draw(clock);
    raf = requestAnimationFrame(loop);
  }

  resize();
  raf = requestAnimationFrame(loop);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; }
    else if (!raf) { last = performance.now() / 1000; raf = requestAnimationFrame(loop); }
  });
})();
