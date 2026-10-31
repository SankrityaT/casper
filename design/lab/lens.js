/* Liquid glass lens: displacement map from a convex squircle bezel (Snell refraction),
   with optional chromatic split. Chromium only (backdrop-filter: url()). */
const Lens=(()=>{
  const sd=(px,py,w,h,r)=>{const qx=Math.abs(px-w/2)-(w/2-r),qy=Math.abs(py-h/2)-(h/2-r);return Math.min(Math.max(qx,qy),0)+Math.hypot(Math.max(qx,0),Math.max(qy,0))-r};
  function map(w,h,r,bezel){
    const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d'),im=x.createImageData(w,h),d=im.data;
    const n=1.5; // refractive index
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){
      const px=i+.5,py=j+.5,s=sd(px,py,w,h,r),k=(j*w+i)*4;let dx=0,dy=0;
      if(s<0){const dist=-s;
        if(dist<bezel){
          const u=1-dist/bezel;                 // 0 inside → 1 at rim
          const slope=u/Math.sqrt(Math.max(1e-4,1-u*u)); // convex circle-arc surface: dh/dx
          const th1=Math.atan(slope), th2=Math.asin(Math.sin(th1)/n);
          let m=Math.tan(th1-th2);               // lateral shift per unit thickness
          m=Math.min(m,2.2)/2.2;
          const e=.5,gx=sd(px+e,py,w,h,r)-sd(px-e,py,w,h,r),gy=sd(px,py+e,w,h,r)-sd(px,py-e,w,h,r),g=Math.hypot(gx,gy)||1;
          dx=-gx/g*m; dy=-gy/g*m;
        }}
      d[k]=128+dx*127;d[k+1]=128+dy*127;d[k+2]=128;d[k+3]=255;
    }
    x.putImageData(im,0,0);return c.toDataURL();
  }
  let n=0;
  function apply(el,{bezel,scale,blur=0.6,chroma=true,tint='',sat=1.35}){
    const w=Math.round(el.offsetWidth),h=Math.round(el.offsetHeight),r=Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius)||20,h/2,w/2);
    bezel=bezel||Math.min(Math.max(r,18),Math.min(w,h)/2.4,44); scale=scale||Math.round(bezel*1.6);
    const id='lens'+(++n), href=map(w,h,r,bezel);
    const disp=(sc,res)=>`<feDisplacementMap in="src" in2="map" scale="${sc}" xChannelSelector="R" yChannelSelector="G" result="${res}"/>`;
    const body=chroma?`${disp(scale,'dr')}${disp(scale*0.93,'dg')}${disp(scale*0.86,'db')}
      <feColorMatrix in="dr" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/>
      <feColorMatrix in="dg" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g"/>
      <feColorMatrix in="db" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b"/>
      <feBlend in="r" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="b" mode="screen" result="out"/>`:`${disp(scale,'out')}`;
    const f=`<filter id="${id}" x="0" y="0" width="${w}" height="${h}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation="${blur}" result="src"/>
      <feImage href="${href}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="map"/>${body}
      <feColorMatrix in="out" type="saturate" values="${sat}"/></filter>`;
    let svg=document.getElementById('lens-defs'); if(!svg){svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.id='lens-defs';svg.setAttribute('width',0);svg.setAttribute('height',0);svg.style.position='absolute';document.body.prepend(svg)}
    const old=el.dataset.lens&&document.getElementById(el.dataset.lens); if(old) old.remove();
    svg.insertAdjacentHTML('beforeend',f); el.dataset.lens=id;
    el.style.setProperty('--lens',`url(#${id})`);
  }
  return {apply};
})();
