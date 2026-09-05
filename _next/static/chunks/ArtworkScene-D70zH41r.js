import{C as e,E as t,O as n,S as r,T as i,_ as a,a as o,c as s,d as c,f as l,g as u,h as d,i as f,l as p,m,n as h,o as g,p as _,r as v,s as y,t as b,u as x,v as S,w as C,x as w,y as T}from"./three.module-BFQEXiI0.js";var E={name:`CopyShader`,uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`},D=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error(`THREE.Pass: .render() must be implemented in derived pass.`)}dispose(){}},O=new m(-1,1,1,-1,0,1),k=new class extends v{constructor(){super(),this.setAttribute(`position`,new y([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute(`uv`,new y([0,2,0,0,2,0],2))}},A=class{constructor(e){this._mesh=new l(k,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,O)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}},j=class extends D{constructor(e,t=`tDiffuse`){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof r?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=C.clone(e.uniforms),this.material=new r({name:e.name===void 0?`unspecified`:e.name,defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new A(this.material)}render(e,t,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}},M=class extends D{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,n){let r=e.getContext(),i=e.state;i.buffers.color.setMask(!1),i.buffers.depth.setMask(!1),i.buffers.color.setLocked(!0),i.buffers.depth.setLocked(!0);let a,o;this.inverse?(a=0,o=1):(a=1,o=0),i.buffers.stencil.setTest(!0),i.buffers.stencil.setOp(r.REPLACE,r.REPLACE,r.REPLACE),i.buffers.stencil.setFunc(r.ALWAYS,a,4294967295),i.buffers.stencil.setClear(o),i.buffers.stencil.setLocked(!0),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),i.buffers.color.setLocked(!1),i.buffers.depth.setLocked(!1),i.buffers.color.setMask(!0),i.buffers.depth.setMask(!0),i.buffers.stencil.setLocked(!1),i.buffers.stencil.setFunc(r.EQUAL,1,4294967295),i.buffers.stencil.setOp(r.KEEP,r.KEEP,r.KEEP),i.buffers.stencil.setLocked(!0)}},N=class extends D{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}},P=class{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){let r=e.getSize(new i);this._width=r.width,this._height=r.height,t=new n(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:p}),t.texture.name=`EffectComposer.rt1`}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name=`EffectComposer.rt2`,this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new j(E),this.copyPass.material.blending=0,this.clock=new f}swapBuffers(){let e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){let t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());let t=this.renderer.getRenderTarget(),n=!1;for(let t=0,r=this.passes.length;t<r;t++){let r=this.passes[t];if(r.enabled!==!1){if(r.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(t),r.render(this.renderer,this.writeBuffer,this.readBuffer,e,n),r.needsSwap){if(n){let t=this.renderer.getContext(),n=this.renderer.state.buffers.stencil;n.setFunc(t.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),n.setFunc(t.EQUAL,1,4294967295)}this.swapBuffers()}M!==void 0&&(r instanceof M?n=!0:r instanceof N&&(n=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){let t=this.renderer.getSize(new i);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;let n=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(n,r),this.renderTarget2.setSize(n,r);for(let e=0;e<this.passes.length;e++)this.passes[e].setSize(n,r)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}},F=class extends D{constructor(e,t,n=null,r=null,i=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=n,this.clearColor=r,this.clearAlpha=i,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new o}render(e,t,n){let r=e.autoClear;e.autoClear=!1;let i,a;this.overrideMaterial!==null&&(a=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(i=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==1&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(i),this.overrideMaterial!==null&&(this.scene.overrideMaterial=a),e.autoClear=r}},I={name:`LuminosityHighPassShader`,uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new o(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`},L=class e extends D{constructor(e,a=1,s,c){super(),this.strength=a,this.radius=s,this.threshold=c,this.resolution=e===void 0?new i(256,256):new i(e.x,e.y),this.clearColor=new o(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let l=Math.round(this.resolution.x/2),u=Math.round(this.resolution.y/2);this.renderTargetBright=new n(l,u,{type:p}),this.renderTargetBright.texture.name=`UnrealBloomPass.bright`,this.renderTargetBright.texture.generateMipmaps=!1;for(let e=0;e<this.nMips;e++){let t=new n(l,u,{type:p});t.texture.name=`UnrealBloomPass.h`+e,t.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(t);let r=new n(l,u,{type:p});r.texture.name=`UnrealBloomPass.v`+e,r.texture.generateMipmaps=!1,this.renderTargetsVertical.push(r),l=Math.round(l/2),u=Math.round(u/2)}let d=I;this.highPassUniforms=C.clone(d.uniforms),this.highPassUniforms.luminosityThreshold.value=c,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new r({uniforms:this.highPassUniforms,vertexShader:d.vertexShader,fragmentShader:d.fragmentShader}),this.separableBlurMaterials=[];let f=[3,5,7,9,11];l=Math.round(this.resolution.x/2),u=Math.round(this.resolution.y/2);for(let e=0;e<this.nMips;e++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(f[e])),this.separableBlurMaterials[e].uniforms.invSize.value=new i(1/l,1/u),l=Math.round(l/2),u=Math.round(u/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=a,this.compositeMaterial.uniforms.bloomRadius.value=.1;let m=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=m,this.bloomTintColors=[new t(1,1,1),new t(1,1,1),new t(1,1,1),new t(1,1,1),new t(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=C.clone(E.uniforms),this.blendMaterial=new r({uniforms:this.copyUniforms,vertexShader:E.vertexShader,fragmentShader:E.fragmentShader,blending:2,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new o,this._oldClearAlpha=1,this._basic=new _,this._fsQuad=new A(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,t){let n=Math.round(e/2),r=Math.round(t/2);this.renderTargetBright.setSize(n,r);for(let e=0;e<this.nMips;e++)this.renderTargetsHorizontal[e].setSize(n,r),this.renderTargetsVertical[e].setSize(n,r),this.separableBlurMaterials[e].uniforms.invSize.value=new i(1/n,1/r),n=Math.round(n/2),r=Math.round(r/2)}render(t,n,r,i,a){t.getClearColor(this._oldClearColor),this._oldClearAlpha=t.getClearAlpha();let o=t.autoClear;t.autoClear=!1,t.setClearColor(this.clearColor,0),a&&t.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=r.texture,t.setRenderTarget(null),t.clear(),this._fsQuad.render(t)),this.highPassUniforms.tDiffuse.value=r.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this._fsQuad.render(t);let s=this.renderTargetBright;for(let n=0;n<this.nMips;n++)this._fsQuad.material=this.separableBlurMaterials[n],this.separableBlurMaterials[n].uniforms.colorTexture.value=s.texture,this.separableBlurMaterials[n].uniforms.direction.value=e.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[n]),t.clear(),this._fsQuad.render(t),this.separableBlurMaterials[n].uniforms.colorTexture.value=this.renderTargetsHorizontal[n].texture,this.separableBlurMaterials[n].uniforms.direction.value=e.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[n]),t.clear(),this._fsQuad.render(t),s=this.renderTargetsVertical[n];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this._fsQuad.render(t),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,a&&t.state.buffers.stencil.setTest(!0),this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(r),this._fsQuad.render(t)),t.setClearColor(this._oldClearColor,this._oldClearAlpha),t.autoClear=o}_getSeparableBlurMaterial(e){let t=[];for(let n=0;n<e;n++)t.push(.39894*Math.exp(-.5*n*n/(e*e))/e);return new r({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new i(.5,.5)},direction:{value:new i(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {
					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`})}_getCompositeMaterial(e){return new r({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`})}};L.BlurDirectionX=new i(1,0),L.BlurDirectionY=new i(0,1);var R={name:`OutputShader`,uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`},z=class extends D{constructor(){super(),this.uniforms=C.clone(R.uniforms),this.material=new S({name:R.name,uniforms:this.uniforms,vertexShader:R.vertexShader,fragmentShader:R.fragmentShader}),this._fsQuad=new A(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,n){this.uniforms.tDiffuse.value=n.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},g.getTransfer(this._outputColorSpace)===`srgb`&&(this.material.defines.SRGB_TRANSFER=``),this._toneMapping===1?this.material.defines.LINEAR_TONE_MAPPING=``:this._toneMapping===2?this.material.defines.REINHARD_TONE_MAPPING=``:this._toneMapping===3?this.material.defines.CINEON_TONE_MAPPING=``:this._toneMapping===4?this.material.defines.ACES_FILMIC_TONE_MAPPING=``:this._toneMapping===6?this.material.defines.AGX_TONE_MAPPING=``:this._toneMapping===7?this.material.defines.NEUTRAL_TONE_MAPPING=``:this._toneMapping===5&&(this.material.defines.CUSTOM_TONE_MAPPING=``),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}},B=class{constructor(){this.group=new s,this.uniforms={uTime:{value:0},uEnergy:{value:0},uTreble:{value:0},uOnset:{value:0},uForce:{value:0}},this.resources=[],this.seed=61231,this.group.name=`pelagic-organism`,this.createBell(),this.createTendrils()}random(){return this.seed=1664525*this.seed+1013904223>>>0,this.seed/4294967296}material(e,t,n={}){let i=new r({uniforms:{...this.uniforms,...n},vertexShader:e,fragmentShader:t,transparent:!0,depthWrite:!1,side:2,blending:2});return this.resources.push(i),i}createBell(){for(let e=0;e<3;e++){let t=[],n=[],r=[];for(let i=0;i<=80;i++){let a=i/80,o=a*Math.PI*.5;for(let s=0;s<=256;s++){let c=s/256,l=c*Math.PI*2,u=1+.013*Math.cos(l*16)*a*a,d=Math.sin(o)*(2.05-e*.075)*u;if(t.push(Math.cos(l)*d,.36+Math.cos(o)*(1.86-e*.075),Math.sin(l)*d),n.push(c,a),i<80&&s<256){let e=i*257+s;r.push(e,e+1,e+256+1,e+1,e+256+2,e+256+1)}}}let i=new v;i.setAttribute(`position`,new y(t,3)),i.setAttribute(`uv`,new y(n,2)),i.setIndex(r),i.computeVertexNormals(),this.resources.push(i),this.group.add(new l(i,this.material(`
      uniform float uTime; uniform float uEnergy; uniform float uForce;
      varying vec2 vUv; varying vec3 vNormal; varying vec3 vView;
      void main() {
        vUv = uv;
        vec3 p = position;
        float skirt = pow(uv.y, 3.0);
        float pulse = sin(uTime * .62 - uv.y * 4.0);
        p.xz *= 1.0 + .025 * pulse * uv.y + uEnergy * .025 + uForce*.045*uv.y;
        p.y += skirt * (.075+uForce*.085) * sin(uv.x * 75.398 + uTime * .75);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,`
      uniform float uTime; uniform float uEnergy; uniform float uLayer; uniform float uTreble;
      varying vec2 vUv; varying vec3 vNormal; varying vec3 vView;
      float wave(float x) { return .5 + .5 * sin(x); }
      void main() {
        float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.2);
        float longitude = pow(wave(vUv.x * 603.1858 + sin(vUv.y * 17.0 - uTime * .15) * .8), 42.0);
        float major = pow(wave(vUv.x * 100.531 + sin(vUv.y * 6.0) * .35), 55.0);
        float latitude = pow(wave(vUv.y * 370.0 + sin(vUv.x * 75.398) * 1.6), 26.0);
        float cells = longitude * latitude;
        float edge = smoothstep(.94, 1.0, vUv.y);
        float tissue = .017 + .065 * fresnel + longitude * .17 + major * .22 + cells * .19;
        tissue *= smoothstep(.0, .07, vUv.y);
        float travelling = pow(wave(vUv.y * 13.0 - uTime * .8), 9.0);
        vec3 ice = vec3(.13, .65, 1.15);
        vec3 violet = vec3(.45, .20, .9);
        vec3 color = mix(violet, ice, smoothstep(.05, .9, vUv.y));
        color += vec3(.10, .25, .32) * travelling;
        color = mix(color, vec3(1.5, .55, .17), major * .40 * (1.0 - vUv.y));
        // Narrow luminous vessels trace the rim. Their fixed colors describe
        // temperature; only the smooth current inside each vessel moves.
        float angle = vUv.x * 6.2831853;
        float vesselY = vUv.y + .007 * sin(angle * 16.0) + .004 * sin(angle * 31.0);
        float vesselA = exp(-pow((vesselY - .975) / .0045, 2.0));
        float vesselB = exp(-pow((vesselY - .928) / .0035, 2.0));
        float vesselC = exp(-pow((vesselY - .866) / .0025, 2.0));
        float current = .72 + .28 * sin(angle * 5.0 - uTime * .38 + vUv.y * 19.0);
        float hot = pow(wave(angle * 3.0 + .9), 8.0);
        vec3 rimColor = mix(vec3(.06, 1.25, 2.4), vec3(3.2, .85, .15), hot);
        vec3 vessels = rimColor * vesselA + vec3(.9, .17, 2.8) * vesselB + vec3(.12, .9, 1.8) * vesselC;
        float capillary = (vesselA + vesselB + vesselC) * current * uLayer;
        float alpha = tissue * uLayer * .48 + edge * .08 + capillary * .21;
        color += vessels * current * uLayer * (1.45 + uEnergy*.75 + uTreble*.45);
        gl_FragColor = vec4(color * (1.0 + fresnel * .65 + uEnergy * .3), alpha);
      }`,{uLayer:{value:e===0?1:.3}})))}}createTendrils(){let e=`
      uniform float uTime; uniform float uEnergy; uniform float uOnset; uniform float uForce;
      attribute float aAlong; attribute float aPhase; attribute vec3 aColor;
      varying float vAlong; varying float vPhase; varying vec3 vColor;
      void main() {
        vec3 p = position;
        float bend = pow(aAlong, 1.25);
        p.x += bend * (1.+uForce*2.4) * (.19 * sin(aAlong * 5.0 - uTime * .32 + aPhase) + .13 * sin(uTime * .21 + aPhase));
        p.z += bend * (1.+uForce*2.1) * .22 * cos(aAlong * 6.0 - uTime * .28 + aPhase);
        p.y += bend*uForce*.24*sin(aAlong*9.-uTime*.5+aPhase);
        p.y += .045 * sin(uTime * .62 + aPhase) * (1.0-aAlong);
        p.xz *= 1.0 + uEnergy * .04 + uForce*.1*bend + uOnset*.08*bend;
        vAlong = aAlong; vPhase = aPhase; vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(15.0 / -mv.z, 1.0, 3.0);
      }`,n=`
      uniform float uTime; uniform float uEnergy; uniform float uTreble;
      varying float vAlong; varying float vPhase; varying vec3 vColor;
      void main() {
        float signal = pow(.5 + .5 * sin(vAlong * 24.0 - uTime * .9 + vPhase), 15.0);
        float fade = pow(1.0 - vAlong, .3);
        gl_FragColor = vec4(vColor * (.65 + signal * (.9+uTreble*.55) + uEnergy * .55), fade * .40);
      }`,r=[],i=[],o=[],s=[],c=[],u=[],d=[],f=[],p=(e,n,r,i,a)=>{let o=a*(1-.38*Math.sin(e*Math.PI)),s=e*e;return new t(Math.cos(n)*o+Math.sin(e*8+i)*(.08+s*.42)+Math.sin(e*3+i)*e*.6,.34-e*r,Math.sin(n)*o+Math.cos(e*7+i)*(.05+s*.35))};for(let e=0;e<144;e++){let t=e/144*Math.PI*2,n=this.random()*Math.PI*2,a=2.35+this.random()*3.55,l=1.75+this.random()*.26,m=e%13==0?[1.35,.42,.12]:e%3==0?[.42,.27,1.15]:[.1,.73,1.2];for(let h=0;h<100;h++){for(let e of[h/100,(h+1)/100]){let c=p(e,t,a,n,l);r.push(c.x,c.y,c.z),i.push(e),o.push(n),s.push(...m)}if(h%4==0&&e%2==0){let e=(h+this.random())/100,r=p(e,t,a,n,l);c.push(r.x,r.y,r.z),u.push(e),d.push(n),f.push(...m)}}}let m=(e,t,n,r)=>{let i=new v;return i.setAttribute(`position`,new y(e,3)),i.setAttribute(`aAlong`,new y(t,1)),i.setAttribute(`aPhase`,new y(n,1)),i.setAttribute(`aColor`,new y(r,3)),this.resources.push(i),i};this.group.add(new x(m(r,i,o,s),this.material(e,n))),this.group.add(new a(m(c,u,d,f),this.material(e,`
      uniform float uTime;
      varying float vAlong; varying float vPhase; varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - .5) * 2.0;
        if (d > 1.0) discard;
        float flicker = .45 + .55 * pow(.5 + .5 * sin(vAlong * 45.0 - uTime * 1.1 + vPhase), 5.0);
        gl_FragColor = vec4(vColor * 1.8, pow(1.0 - d, 1.5) * flicker);
      }`)));for(let t=0;t<12;t++){let r=t/12*Math.PI*2+.19,i=t*1.73,a=3.6+this.random()*2.2,o=[],s=[],c=[],u=[],d=[];for(let e=0;e<=150;e++){let t=e/150,n=p(t,r,a,i,1.36),l=t*17+i,f=(.055+.09*Math.sin(t*13+i)**2)*(1-t)**.7+.002;for(let r=0;r<6;r++){let a=r/6*Math.PI*2,p=Math.cos(a)*f,m=Math.sin(a)*f*.2;if(o.push(n.x+Math.cos(l)*p-Math.sin(l)*m,n.y,n.z+Math.sin(l)*p+Math.cos(l)*m),s.push(t),c.push(i),u.push(.2+.18*Math.sin(t*7+i),.37+.24*Math.sin(t*4),1.15),e<150){let t=e*6+r,n=e*6+(r+1)%6;d.push(t,n,t+6,n,n+6,t+6)}}}let f=m(o,s,c,u);f.setIndex(d),this.group.add(new l(f,this.material(e,n)))}}update(e,t,n=0,r=0,i=0){this.uniforms.uTime.value=e,this.uniforms.uEnergy.value=c.clamp(t,0,1),this.uniforms.uTreble.value=c.clamp(n,0,1),this.uniforms.uOnset.value=c.clamp(r,0,1),this.uniforms.uForce.value=c.clamp(i,0,3)}dispose(){for(let e of this.resources)e.dispose();this.group.clear()}},V=`
varying vec2 vUv;
void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }
`,H=class{constructor(){this.group=new s,this.group.position.y=.65,this.disk=new l(new u(9,9,64,64),new r({vertexShader:`varying vec2 vUv;uniform float force;uniform float time;
      void main(){vUv=uv;vec3 p=position;float radial=length(p.xy);float outer=smoothstep(.8,3.8,radial);
      p.xy*=1.+force*.085*outer;p.z+=sin(radial*4.-time*.5)*force*.06*outer;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,transparent:!0,depthWrite:!1,side:2,blending:2,uniforms:{time:{value:0},energy:{value:0},force:{value:0}},fragmentShader:`
      varying vec2 vUv; uniform float time; uniform float energy;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
      void main(){
        vec2 p=(vUv-.5)*9.; float r=length(p); float a=atan(p.y,p.x);
        float inner=smoothstep(.87,1.14,r); float outer=exp(-max(r-1.15,0.)*1.32);
        float orbit=a-time*.13/max(r*.3,.3);
        float n=noise(vec2(r*19.+cos(orbit*9.)*1.5,sin(orbit*9.)*2.));
        float threads=pow(.5+.5*sin(r*139.+n*4.+sin(orbit*13.)*1.4),4.);
        float cloud=noise(vec2(r*7.+cos(orbit*4.)*2.,sin(orbit*4.)*3.));
        float spiral=pow(.5+.5*sin(r*24.-orbit*7.+n*2.),5.);
        float doppler=.42+1.05*pow(.5+.5*cos(a-.6),2.);
        float density=inner*outer*(.15+threads*.55+cloud*.36+spiral*.3)*doppler*(1.+energy*.65);
        vec3 col=mix(vec3(1.,.20,.045),vec3(1.,.69,.31),exp(-max(r-1.,0.)*.95));
        col=mix(col,vec3(1.,.91,.72),threads*.2);
        float blueShift=pow(.5+.5*cos(a-.6),12.)*exp(-max(r-1.,0.)*1.8);
        col=mix(col,vec3(.17,.65,1.5),blueShift*.85);
        float edge=1.-smoothstep(3.5,4.4,r);
        gl_FragColor=vec4(col*density*3.8,edge);
      }`})),this.disk.rotation.x=-Math.PI/2+.12,this.disk.rotation.z=.08,this.group.add(this.disk);let t=new l(new e(.86,64,48),new _({color:0}));this.group.add(t),this.corona=new l(new u(4.7,4.7),new r({vertexShader:V,transparent:!0,depthWrite:!1,blending:2,uniforms:{time:{value:0},energy:{value:0},treble:{value:0}},fragmentShader:`varying vec2 vUv; uniform float time; uniform float energy; uniform float treble;
      void main(){vec2 p=(vUv-.5)*4.7;float r=length(p),a=atan(p.y,p.x);
      float rim=exp(-abs(r-.88)*100.); float glow=exp(-abs(r-.9)*14.)*.35;
      float fine=exp(-abs(r-.936)*170.)*.25;
      float d=.42+.58*pow(.5+.5*cos(a+.3),2.);
      vec3 c=mix(vec3(1.5,.09,.18),vec3(1.5,.67,.14),d);
      c=mix(c,vec3(.18,.8,2.),pow(.5+.5*cos(a-2.4),14.)*.9);
      float mask=smoothstep(.86,.88,r);
      float outer=exp(-abs(r-1.02)*60.);
      gl_FragColor=vec4((c*(rim*2.4+glow*(1.+energy*.65)+fine)*d+vec3(.35,.06,.8)*outer*(.3+treble*.5))*mask,1.);}`})),this.group.add(this.corona),this.arcs=new l(new u(5.8,5.8),new r({vertexShader:V,transparent:!0,depthWrite:!1,blending:2,uniforms:{time:{value:0}},fragmentShader:`varying vec2 vUv; uniform float time;
      void main(){vec2 p=(vUv-.5)*5.8; float r=length(vec2(p.x,p.y*.87));float a=atan(p.y,p.x);
      float band=exp(-pow((r-1.04)/.16,2.));
      float fibers=pow(.5+.5*sin(r*210.+sin(a*18.-time*.5)*1.2),5.);
      float top=smoothstep(-.2,.55,p.y); float bot=(1.-smoothstep(-.9,.1,p.y))*.22;
      vec3 c=mix(vec3(1.5,.12,.035),vec3(1.4,.62,.19),fibers);
      float flank=.5+.5*cos(a-2.6);
      c=mix(c,vec3(.08,.75,2.1),pow(flank,7.)*.8);
      float outer=exp(-pow((r-1.22)/.14,2.));
      float stream=.65+.35*sin(a*9.-time*.22+r*70.);
      vec3 violet=mix(vec3(.65,.035,1.2),vec3(.04,.55,1.3),flank);
      gl_FragColor=vec4(c*band*(.15+fibers*.65)*(top+bot)*1.8+violet*outer*stream*(top+bot)*.42,1.);}`})),this.group.add(this.arcs)}update(e,t,n,r=0,i=0){this.disk.material.uniforms.time.value=e,this.disk.material.uniforms.energy.value=t,this.disk.material.uniforms.force.value=i,this.corona.material.uniforms.time.value=e,this.corona.material.uniforms.energy.value=t,this.corona.material.uniforms.treble.value=r,this.arcs.material.uniforms.time.value=e,this.corona.quaternion.copy(n.quaternion),this.arcs.quaternion.copy(n.quaternion)}dispose(){this.group.traverse(e=>{e instanceof l&&(e.geometry.dispose(),e.material.dispose())})}},U=class{constructor(){this.group=new s;let e=937,t=()=>(e=e*1664525+1013904223>>>0,e/4294967296),n=2400,i=new Float32Array(n*3),o=new Float32Array(n),c=new Float32Array(n*3);for(let e=0;e<n;e++){let n=t()*Math.PI*2,r=t()*2-1,a=35+t()*35;i.set([Math.sqrt(1-r*r)*Math.cos(n)*a,r*a,Math.sqrt(1-r*r)*Math.sin(n)*a],e*3),o[e]=t()<.025?3.4:.6+t()*1.4;let s=t()>.3;c.set(s?[.49+t()*.25,.62+t()*.25,1]:[1,.57+t()*.25,.38],e*3)}let l=new v;l.setAttribute(`position`,new h(i,3)),l.setAttribute(`size`,new h(o,1)),l.setAttribute(`color`,new h(c,3)),this.material=new r({transparent:!0,depthWrite:!1,blending:2,uniforms:{time:{value:0},pixelRatio:{value:1}},vertexShader:`attribute float size; attribute vec3 color; varying vec3 vColor; uniform float time; uniform float pixelRatio;
      void main(){ vColor=color*(.35+.18*sin(time*.23+position.x)); vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=size*pixelRatio;}`,fragmentShader:`varying vec3 vColor;void main(){float d=length(gl_PointCoord-.5)*2.; gl_FragColor=vec4(vColor,exp(-d*d*3.)*(1.-smoothstep(.3,1.,d)));}`}),this.group.add(new a(l,this.material))}update(e,t){this.material.uniforms.time.value=e,this.material.uniforms.pixelRatio.value=t}dispose(){this.group.traverse(e=>{e instanceof a&&e.geometry.dispose()}),this.material.dispose()}},W={sample:()=>({energy:0,bass:0,treble:0,onset:0})},G=class{constructor(e,n){this.root=e,this.onFailure=n,this.scene=new w,this.camera=new d(42,1,.1,160),this.center=new t,this.rim=new t,this.right=new t,this.visible=!1,this.paused=!0,this.disposed=!1,this.contextUnavailable=!1,this.time=0,this.last=0,this.frameId=0,this.resize=()=>{if(this.disposed||this.contextUnavailable)return;let e=Math.max(1,this.root.clientWidth),t=Math.max(1,this.root.clientHeight),n=Math.min(devicePixelRatio||1,e<600?1.25:1.5);this.renderer.setPixelRatio(n),this.renderer.setSize(e,t,!1),this.composer.setPixelRatio(n),this.composer.setSize(e,t),this.camera.aspect=e/t;let r=Math.max(15.2,11/this.camera.aspect);this.camera.position.set(0,1,r),this.camera.lookAt(0,-1.2,0),this.camera.updateProjectionMatrix(),this.lens.uniforms.aspect.value=this.camera.aspect,this.render()},this.visibilityChanged=()=>this.schedule(),this.frame=e=>{this.frameId=0,!(this.disposed||this.contextUnavailable||this.paused||!this.visible||document.hidden)&&(this.time+=Math.min((e-this.last)/1e3,.05),this.last=e,this.render(),this.frameId=requestAnimationFrame(this.frame))},this.contextLost=e=>{e.preventDefault(),this.contextUnavailable=!0,cancelAnimationFrame(this.frameId),this.onFailure()},this.renderer=new b({antialias:!1,alpha:!0,powerPreference:`low-power`}),this.organism=new B,this.singularity=new H,this.cosmos=new U;let r=this.renderer.domElement;r.setAttribute(`aria-hidden`,`true`),Object.assign(r.style,{width:`100%`,height:`100%`,display:`block`,pointerEvents:`none`}),this.renderer.setClearColor(131849,1),this.renderer.outputColorSpace=T,this.renderer.toneMapping=4,this.renderer.toneMappingExposure=.9,this.scene.add(this.organism.group,this.singularity.group,this.cosmos.group),this.composer=new P(this.renderer),this.composer.addPass(new F(this.scene,this.camera)),this.composer.addPass(new L(new i(1,1),.38,.5,.72)),this.lens=new j({uniforms:{tDiffuse:{value:null},center:{value:new i(.5,.5)},radius:{value:.1},aspect:{value:1},time:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D tDiffuse;uniform vec2 center;uniform float radius;uniform float aspect;uniform float time;varying vec2 vUv;
      void main(){
        vec2 delta=vUv-center;delta.x*=aspect;float d=length(delta);float r=radius;
        float bend=exp(-max(d-r,0.)/max(r*.45,.001))*.035*r*smoothstep(r*.98,r*1.2,d);
        vec2 dir=delta/max(d,.001);dir.x/=aspect;
        vec2 uv=vUv-dir*bend;
        vec3 color=texture2D(tDiffuse,uv).rgb;
        float fringe=exp(-abs(d-r*1.06)/max(r*.08,.001))*.0007;
        color.r=texture2D(tDiffuse,uv+dir*fringe).r;
        color.b=texture2D(tDiffuse,uv-dir*fringe).b;
        float vignette=1.-.31*pow(length((vUv-.5)*vec2(1.,.85)),1.4);
        float grain=fract(sin(dot(gl_FragCoord.xy+mod(time,30.),vec2(12.9898,78.233)))*43758.5453)-.5;
        float atmosphere=exp(-length(delta*vec2(.85,1.05))*5.5);
        float cloud=.6+.2*sin(delta.x*23.+sin(delta.y*17.))+.2*sin(delta.y*31.+delta.x*7.);
        color+=vec3(.0007,.0006,.0022)*atmosphere*cloud;
        color*=vignette;color+=grain*.00025;
        color*=smoothstep(r*.96,r*.99,d);
        gl_FragColor=vec4(max(color,vec3(0.)),1.);
      }`}),this.composer.addPass(this.lens),this.composer.addPass(new z),e.appendChild(r),r.addEventListener(`webglcontextlost`,this.contextLost),document.addEventListener(`visibilitychange`,this.visibilityChanged),this.resizeObserver=new ResizeObserver(this.resize),this.resizeObserver.observe(e),this.resize()}setPaused(e){this.paused=e,this.schedule()}setVisible(e){this.visible=e,this.schedule()}schedule(){cancelAnimationFrame(this.frameId),this.frameId=0,!(this.disposed||this.contextUnavailable||!this.visible||document.hidden)&&(this.render(),this.paused||(this.last=performance.now(),this.frameId=requestAnimationFrame(this.frame)))}render(){let e=W.sample(this.time);this.organism.update(this.time,e.energy,e.treble,e.onset,0),this.singularity.update(this.time,e.energy,this.camera,e.treble,0),this.cosmos.update(this.time,this.renderer.getPixelRatio()),this.center.set(0,.65,0).project(this.camera),this.right.set(1,0,0).applyQuaternion(this.camera.quaternion).multiplyScalar(.86),this.rim.copy(this.right).add(new t(0,.65,0)).project(this.camera),this.lens.uniforms.center.value.set(this.center.x*.5+.5,this.center.y*.5+.5),this.lens.uniforms.radius.value=Math.abs(this.rim.x-this.center.x)*.5*this.camera.aspect,this.lens.uniforms.time.value=this.time,this.composer.render()}dispose(){this.disposed=!0,cancelAnimationFrame(this.frameId),this.resizeObserver.disconnect(),document.removeEventListener(`visibilitychange`,this.visibilityChanged),this.renderer.domElement.removeEventListener(`webglcontextlost`,this.contextLost),this.organism.dispose(),this.singularity.dispose(),this.cosmos.dispose();for(let e of this.composer.passes)e.dispose();this.composer.dispose(),this.renderer.dispose(),this.renderer.domElement.remove()}};export{G as ArtworkScene};