import{r as e}from"./rolldown-runtime-C60lm6uB.js";import{i as t,r as n}from"./framework-D_rUT4EX.js";import{D as r,S as i,T as a,f as o,g as s,m as c,t as ee,x as l}from"./three.module-BFQEXiI0.js";var u=e(t(),1),d=n(),f=9,te=2.8,p=1200;function m(e,t,n){return Math.min(Math.max(e,t),n)}function ne(){return[{x:.18,y:.25,radius:.25,phase:.4,driftX:.065,driftY:.05},{x:.55,y:.21,radius:.27,phase:2.1,driftX:.075,driftY:.055},{x:.79,y:.48,radius:.235,phase:4.2,driftX:.06,driftY:.075},{x:.43,y:.63,radius:.29,phase:5.3,driftX:.085,driftY:.06},{x:.12,y:.76,radius:.22,phase:3.3,driftX:.055,driftY:.07}].map(e=>{let t=new a(e.x,e.y);return{base:t,position:t.clone(),target:t.clone(),velocity:new a,radius:e.radius,phase:e.phase,drift:new a(e.driftX,e.driftY),uniform:new r(e.x,e.y,e.radius,1)}})}var re=`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`,ie=`
  varying vec2 vUv;
  uniform vec2 uPointer;
  uniform vec2 uResolution;
  uniform float uInteraction;
  uniform float uColorTime;
  uniform float uRippleTime;
  uniform float uTheme;
  uniform vec4 uBlobA;
  uniform vec4 uBlobB;
  uniform vec4 uBlobC;
  uniform vec4 uBlobD;
  uniform vec4 uBlobE;

  float blobField(vec2 point, vec4 blob) {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 center = vec2(blob.x * aspect, blob.y);
    vec2 pointer = vec2(uPointer.x * aspect, uPointer.y);
    vec2 pull = pointer - center;
    float angle = atan(pull.y, pull.x);
    vec2 delta = point - center;
    float radial = length(delta);
    float ripple = 1.0
      + sin(radial * 30.0 - uRippleTime * 2.2 + blob.x * 9.0) * (0.045 + uInteraction * 0.035)
      + sin(radial * 17.0 + uRippleTime * 1.35 + blob.y * 11.0) * 0.028;
    float cosine = cos(angle);
    float sine = sin(angle);
    vec2 local = vec2(
      cosine * delta.x + sine * delta.y,
      -sine * delta.x + cosine * delta.y
    );
    local.x /= blob.w;
    local.y *= sqrt(blob.w);
    local /= ripple;
    return (blob.z * blob.z) / (dot(local, local) + 0.0015);
  }

  void main() {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 point = vec2(vUv.x * aspect, vUv.y);
    float a = blobField(point, uBlobA);
    float b = blobField(point, uBlobB);
    float c = blobField(point, uBlobC);
    float d = blobField(point, uBlobD);
    float e = blobField(point, uBlobE);
    float total = a + b + c + d + e;

    float weight = max(total, 0.001);
    float coralShift = 0.5 + 0.5 * sin(uColorTime * 0.32 + uBlobA.x * 6.0 + uBlobA.y * 3.0);
    float indigoShift = 0.5 + 0.5 * sin(uColorTime * 0.27 + uBlobB.x * 4.0 - uBlobB.y * 5.0);
    float tealShift = 0.5 + 0.5 * sin(uColorTime * 0.29 + uBlobC.x * 5.0 + uBlobC.y * 4.0);
    float yellowShift = 0.5 + 0.5 * sin(uColorTime * 0.24 + uBlobD.x * 3.0 - uBlobD.y * 6.0);
    float pinkShift = 0.5 + 0.5 * sin(uColorTime * 0.3 + uBlobE.x * 7.0 + uBlobE.y * 2.0);
    vec3 coral = mix(vec3(0.95, 0.24, 0.18), vec3(1.0, 0.46, 0.22), coralShift * 0.4);
    vec3 indigo = mix(vec3(0.39, 0.23, 0.85), vec3(0.55, 0.38, 0.96), indigoShift * 0.4);
    vec3 teal = mix(vec3(0.04, 0.65, 0.55), vec3(0.14, 0.78, 0.64), tealShift * 0.4);
    vec3 yellow = mix(vec3(0.96, 0.63, 0.14), vec3(1.0, 0.78, 0.30), yellowShift * 0.4);
    vec3 pink = mix(vec3(0.90, 0.18, 0.48), vec3(1.0, 0.36, 0.60), pinkShift * 0.4);
    coral = mix(coral, vec3(1.0, 0.09, 0.27), uTheme);
    indigo = mix(indigo, vec3(0.49, 0.06, 0.94), uTheme);
    teal = mix(teal, vec3(0.02, 0.53, 0.46), uTheme);
    yellow = mix(yellow, vec3(0.83, 0.35, 0.06), uTheme);
    pink = mix(pink, vec3(0.92, 0.04, 0.46), uTheme);
    vec3 blobColor = (coral * a + indigo * b + teal * c + yellow * d + pink * e) / weight;

    float merged = smoothstep(0.96, 1.03, total);
    float contour = smoothstep(0.90, 0.96, total) - smoothstep(1.03, 1.09, total);
    float contact = 1.0 - smoothstep(0.0, 0.2, length(vUv - uPointer));
    vec3 paper = mix(vec3(0.957, 0.933, 0.875), vec3(0.078, 0.031, 0.090), uTheme);
    vec3 color = mix(paper, blobColor, merged);
    color = mix(color, mix(vec3(0.16, 0.11, 0.14), vec3(0.18, 0.04, 0.22), uTheme), contour * 0.38);
    color += blobColor * contact * uInteraction * 0.08;
    gl_FragColor = vec4(color, 1.0);
  }
`;function h({className:e}){let t=(0,u.useRef)(null);return(0,u.useEffect)(()=>{let e=t.current,n=e?.parentElement;if(!e||!n)return;let r;try{r=new ee({canvas:e,antialias:!1,alpha:!1,powerPreference:`low-power`})}catch{return}r.setClearColor(16051935,1),r.setPixelRatio(1);let u=new l,d=new c(-1,1,1,-1,-1,1),h=ne(),g={uPointer:{value:new a(.5,.5)},uResolution:{value:new a(1,1)},uInteraction:{value:0},uColorTime:{value:0},uRippleTime:{value:0},uTheme:{value:0},uBlobA:{value:h[0].uniform},uBlobB:{value:h[1].uniform},uBlobC:{value:h[2].uniform},uBlobD:{value:h[3].uniform},uBlobE:{value:h[4].uniform}},_=new o(new s(2,2),new i({uniforms:g,vertexShader:re,fragmentShader:ie,depthWrite:!1,depthTest:!1}));u.add(_);let v=window.matchMedia(`(prefers-reduced-motion: reduce)`),y=new a(.5,.5),b=new a(.5,.5),x=new a,S=new a,C=0,w=0,T=!1,E=!1,D=null,O=0,k=performance.now(),A=0,j=typeof IntersectionObserver>`u`,M=!document.hidden,N=!1,P=()=>r.render(u,d),ae=()=>{let e=v.matches?0:.35+w*.65,t=((y.x-.5)*3.2+Math.sin(O*1.7)*.7)*e,r=((.5-y.y)*2.4+Math.cos(O*1.35)*.55)*e;n.style.setProperty(`--tiramisu-ripple-x`,`${t.toFixed(2)}px`),n.style.setProperty(`--tiramisu-ripple-y`,`${r.toFixed(2)}px`),n.style.setProperty(`--tiramisu-ripple-x-reverse`,`${(-t*.72).toFixed(2)}px`),n.style.setProperty(`--tiramisu-ripple-y-reverse`,`${(-r*.72).toFixed(2)}px`)},F=(e,t,n)=>{let r=v.matches?0:e/1e3,i=T?1:E?.62:0;for(let e of h){let a=(Math.sin(r*.58+e.phase)+Math.sin(r*.23+e.phase*1.7)*.42)*e.drift.x,o=(Math.cos(r*.46+e.phase*1.3)+Math.sin(r*.19+e.phase*.8)*.4)*e.drift.y;e.target.set(e.base.x+a,e.base.y+o),x.copy(b).sub(e.target);let s=i*m(1-x.length()/.9,0,1)**1.7;e.target.addScaledVector(x,.38*s);let c=1+s*(T?1.85:1.08)+Math.abs(Math.sin(r+e.phase))*.1;t?(e.position.copy(e.target),e.velocity.set(0,0)):(S.copy(e.target).sub(e.position),e.velocity.addScaledVector(S,f*n),e.velocity.multiplyScalar(Math.exp(-te*n)),e.position.addScaledVector(e.velocity,n)),e.uniform.set(e.position.x,e.position.y,e.radius,c)}},I=(e,t=!1)=>{let n=t?1/60:Math.min((e-k)/1e3,.05);if(k=e,!T&&D!==null){let t=e-D;b.copy(H),C=m(1-t/p,0,1),t>=p&&(D=null)}y.lerp(b,t?1:1-Math.exp(-13*n)),w+=(C-w)*(t?1:1-Math.exp(-15*n)),O=v.matches?0:e/1e3,F(e,t,n),g.uPointer.value.copy(y),g.uInteraction.value=w,g.uColorTime.value=O,g.uRippleTime.value=v.matches?0:O,ae(),P()},oe=()=>j&&M&&!v.matches&&!N,L=()=>{A&&window.cancelAnimationFrame(A),A=0},R=e=>{A=0,I(e),oe()&&(A=window.requestAnimationFrame(R))},z=()=>{N||!j||!M||(v.matches?I(performance.now(),!0):A||=(k=performance.now(),window.requestAnimationFrame(R)))},B=()=>{let t=e.getBoundingClientRect(),n=Math.max(1,t.width),i=Math.max(1,t.height);r.setPixelRatio(1),r.setSize(n,i,!1),g.uResolution.value.set(n,i),z()},V=e=>{let t=n.getBoundingClientRect();b.set(m((e.clientX-t.left)/Math.max(t.width,1),0,1),1-m((e.clientY-t.top)/Math.max(t.height,1),0,1))},H=new a(.5,.5),U=e=>{V(e),T=!0,E=!1,H.copy(b),C=1,D=null},W=()=>{H.copy(b),T=!1,D=v.matches?null:performance.now(),v.matches&&(C=0)},G=e=>{e.pointerType===`mouse`?(T=!1,E=!0,V(e),C=.62,z()):T&&(U(e),z())},K=e=>{e.pointerType===`mouse`?(E=!0,T=!1,V(e),C=.62):U(e),z()},q=e=>{e.pointerType!==`mouse`&&W(),z()},J=e=>{e.pointerType===`mouse`?(E=!1,C=0):T&&W(),z()},Y=()=>{M=!document.hidden,M?z():L()},X=()=>{L(),v.matches&&(C=0),z()},Z=e=>{e.preventDefault(),L()},Q=typeof IntersectionObserver>`u`?null:new IntersectionObserver(([e])=>{j=e.isIntersecting,j?z():L()},{threshold:.01}),$=typeof ResizeObserver>`u`?null:new ResizeObserver(B);return Q?.observe(n),$?.observe(e),$||window.addEventListener(`resize`,B),n.addEventListener(`pointermove`,G,{passive:!0}),n.addEventListener(`pointerdown`,K,{passive:!0}),n.addEventListener(`pointerup`,q,{passive:!0}),n.addEventListener(`pointercancel`,q,{passive:!0}),n.addEventListener(`pointerleave`,J,{passive:!0}),document.addEventListener(`visibilitychange`,Y),e.addEventListener(`webglcontextlost`,Z),v.addEventListener?v.addEventListener(`change`,X):v.addListener(X),F(performance.now(),!0,1/60),B(),z(),()=>{N=!0,L(),Q?.disconnect(),$?.disconnect(),$||window.removeEventListener(`resize`,B),n.removeEventListener(`pointermove`,G),n.removeEventListener(`pointerdown`,K),n.removeEventListener(`pointerup`,q),n.removeEventListener(`pointercancel`,q),n.removeEventListener(`pointerleave`,J),document.removeEventListener(`visibilitychange`,Y),e.removeEventListener(`webglcontextlost`,Z),v.removeEventListener?v.removeEventListener(`change`,X):v.removeListener(X),_.geometry.dispose(),_.material.dispose(),r.dispose(),n.style.removeProperty(`--tiramisu-ripple-x`),n.style.removeProperty(`--tiramisu-ripple-y`),n.style.removeProperty(`--tiramisu-ripple-x-reverse`),n.style.removeProperty(`--tiramisu-ripple-y-reverse`)}},[]),(0,d.jsx)(`canvas`,{ref:t,className:e,"aria-hidden":`true`})}export{h as TiramisuAmbient};