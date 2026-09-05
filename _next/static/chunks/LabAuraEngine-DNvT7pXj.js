import{D as e,S as t,T as n,f as r,g as i,m as a,t as o,x as s}from"./three.module-BFQEXiI0.js";var c=(e,t,n)=>Math.min(Math.max(Number.isFinite(e)?e:t,t),n);function l(){return[{x:.18,y:.25,radius:.25,phase:.4,driftX:.065,driftY:.05},{x:.55,y:.21,radius:.27,phase:2.1,driftX:.075,driftY:.055},{x:.79,y:.48,radius:.235,phase:4.2,driftX:.06,driftY:.075},{x:.43,y:.63,radius:.29,phase:5.3,driftX:.085,driftY:.06},{x:.12,y:.76,radius:.22,phase:3.3,driftX:.055,driftY:.07}].map(t=>{let r=new n(t.x,t.y);return{base:r,position:r.clone(),target:r.clone(),velocity:new n,radius:t.radius,phase:t.phase,drift:new n(t.driftX,t.driftY),uniform:new e(t.x,t.y,t.radius,1)}})}function u(e,u,d){let f=new o({canvas:e,antialias:!1,alpha:!1,powerPreference:`low-power`});f.setClearColor(1312791,1);let p=new s,m=new a(-1,1,1,-1,-1,1),h=l(),g={uPointer:{value:new n(.5,.5)},uResolution:{value:new n(1,1)},uInteraction:{value:0},uColorTime:{value:0},uRippleTime:{value:0},uTheme:{value:1},uBlobA:{value:h[0].uniform},uBlobB:{value:h[1].uniform},uBlobC:{value:h[2].uniform},uBlobD:{value:h[3].uniform},uBlobE:{value:h[4].uniform}},_=new r(new i(2,2),new t({uniforms:g,vertexShader:`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
          }
        `,fragmentShader:`
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
            vec3 coral = mix(vec3(0.63, 0.19, 0.16), vec3(0.78, 0.38, 0.25), coralShift * 0.4);
            vec3 indigo = mix(vec3(0.18, 0.16, 0.28), vec3(0.34, 0.29, 0.42), indigoShift * 0.4);
            vec3 teal = mix(vec3(0.20, 0.36, 0.31), vec3(0.38, 0.51, 0.42), tealShift * 0.4);
            vec3 yellow = mix(vec3(0.62, 0.41, 0.16), vec3(0.82, 0.63, 0.31), yellowShift * 0.4);
            vec3 pink = mix(vec3(0.46, 0.18, 0.29), vec3(0.64, 0.31, 0.40), pinkShift * 0.4);
            coral = mix(coral, vec3(0.92, 0.15, 0.31), uTheme);
            indigo = mix(indigo, vec3(0.43, 0.10, 0.65), uTheme);
            teal = mix(teal, vec3(0.18, 0.25, 0.24), uTheme);
            yellow = mix(yellow, vec3(0.45, 0.28, 0.18), uTheme);
            pink = mix(pink, vec3(0.64, 0.08, 0.38), uTheme);
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
        `,depthWrite:!1,depthTest:!1}));p.add(_);let v=matchMedia(`(prefers-reduced-motion: reduce)`),y=new n(.5,.5),b=new n(.5,.5),x=new n,S=new n,C=0,w=0,T=0,E=0,D=!1,O=!1,k=!1;function A(e,t=!1){let n=u(),r=!v.matches&&n.active;b.set(r?c(n.x,0,1):.5,r?1-c(n.y,0,1):.5),y.lerp(b,t?1:1-Math.exp(-13*e)),C+=(+!!r-C)*(t?1:1-Math.exp(-15*e));for(let n of h){let r=(Math.sin(w*.58+n.phase)+Math.sin(w*.23+n.phase*1.7)*.42)*n.drift.x,i=(Math.cos(w*.46+n.phase*1.3)+Math.sin(w*.19+n.phase*.8)*.4)*n.drift.y;n.target.set(n.base.x+r,n.base.y+i),x.copy(b).sub(n.target);let a=C*c(1-x.length()/.9,0,1)**1.7;n.target.addScaledVector(x,.38*a),t?(n.position.copy(n.target),n.velocity.set(0,0)):(S.copy(n.target).sub(n.position),n.velocity.addScaledVector(S,9*e),n.velocity.multiplyScalar(Math.exp(-2.8*e)),n.position.addScaledVector(n.velocity,e)),n.uniform.set(n.position.x,n.position.y,n.radius,1+a*1.85+Math.abs(Math.sin(w+n.phase))*.1)}g.uPointer.value.copy(y),g.uInteraction.value=C,g.uColorTime.value=w,g.uRippleTime.value=w}let j=()=>{!O&&!k&&f.render(p,m)},M=()=>{cancelAnimationFrame(E),E=0};function N(e){if(E=0,O||k||!D||document.hidden||v.matches||d())return;let t=Math.min((e-T)/1e3,.05);T=e,w+=t,A(t),j(),E=requestAnimationFrame(N)}function P(){if(!(O||k)){if(!D||document.hidden||v.matches||d()){M(),v.matches&&(w=0,A(0,!0)),D&&!document.hidden&&j();return}E||=(T=performance.now(),requestAnimationFrame(N))}}function F(){if(O||k)return;let t=Math.max(1,e.clientWidth),n=Math.max(1,e.clientHeight);f.setPixelRatio(Math.min(devicePixelRatio||1,1.5)),f.setSize(t,n,!1),g.uResolution.value.set(t,n),j()}function I(e){e.preventDefault(),k=!0,M()}let L=new ResizeObserver(F),R=new IntersectionObserver(([e])=>{D=e.isIntersecting,P()},{threshold:.01});return L.observe(e),R.observe(e),document.addEventListener(`visibilitychange`,P),v.addEventListener(`change`,P),e.addEventListener(`webglcontextlost`,I),A(0,!0),F(),{sync:P,dispose(){O=!0,M(),L.disconnect(),R.disconnect(),document.removeEventListener(`visibilitychange`,P),v.removeEventListener(`change`,P),e.removeEventListener(`webglcontextlost`,I),_.geometry.dispose(),_.material.dispose(),f.dispose()}}}export{u as createLabAura};