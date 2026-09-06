/* solar-compare.js — reproduces every figure in occvm/SPINE-AUDIT.md section 3.
 * Both solar implementations are lifted verbatim from the deployed artifacts:
 *   btcSolar   <- Btc-terminal/index.html      solarPosition()
 *   rhymeSolar <- Rhyme-Instrument/index.html  solar()
 * Run: TZ=America/New_York node occvm/tools/solar-compare.js
 * No dependencies. If a tool changes its solar code, this file is stale and the audit is stale with it. */
const LAT=39.7589, LON=-84.1916;
function btcSolar(lat,lon,date){const rad=Math.PI/180;const jd=date.getTime()/86400000+2440587.5,jc=(jd-2451545)/36525;
const gml=(280.46646+jc*(36000.76983+jc*0.0003032))%360;const gma=357.52911+jc*(35999.05029-0.0001537*jc);
const ecc=0.016708634-jc*(0.000042037+0.0000001267*jc);
const ceq=Math.sin(gma*rad)*(1.914602-jc*(0.004817+0.000014*jc))+Math.sin(2*gma*rad)*(0.019993-0.000101*jc)+Math.sin(3*gma*rad)*0.000289;
const tl=gml+ceq;const app=tl-0.00569-0.00478*Math.sin((125.04-1934.136*jc)*rad);
const mo=23+(26+((21.448-jc*(46.815+jc*(0.00059-jc*0.001813))))/60)/60;const oc=mo+0.00256*Math.cos((125.04-1934.136*jc)*rad);
const dec=Math.asin(Math.sin(oc*rad)*Math.sin(app*rad));const y=Math.tan(oc/2*rad)**2;
const eqt=4*(y*Math.sin(2*gml*rad)-2*ecc*Math.sin(gma*rad)+4*ecc*y*Math.sin(gma*rad)*Math.cos(2*gml*rad)-0.5*y*y*Math.sin(4*gml*rad)-1.25*ecc*ecc*Math.sin(2*gma*rad))/rad;
const minutes=(date.getUTCHours()*60+date.getUTCMinutes()+date.getUTCSeconds()/60);
const tst=(minutes+eqt+4*lon+1440)%1440;const ha=(tst/4<0)?tst/4+180:tst/4-180;
const cz=Math.sin(lat*rad)*Math.sin(dec)+Math.cos(lat*rad)*Math.cos(dec)*Math.cos(ha*rad);
const zen=Math.acos(Math.max(-1,Math.min(1,cz)));
let az=Math.acos(Math.max(-1,Math.min(1,((Math.sin(lat*rad)*Math.cos(zen))-Math.sin(dec))/(Math.cos(lat*rad)*Math.sin(zen)))))/rad;
az=ha>0?(az+180)%360:(540-az)%360;return{elev:90-zen/rad,az};}
function rhymeSolar(date){const r=Math.PI/180;const start=new Date(date.getFullYear(),0,0);const doy=Math.floor((date-start)/864e5);
const hr=date.getHours()+date.getMinutes()/60;const g=2*Math.PI/365*(doy-1+(hr-12)/24);
const eqt=229.18*(0.000075+0.001868*Math.cos(g)-0.032077*Math.sin(g)-0.014615*Math.cos(2*g)-0.040849*Math.sin(2*g));
const decl=0.006918-0.399912*Math.cos(g)+0.070257*Math.sin(g)-0.006758*Math.cos(2*g)+0.000907*Math.sin(2*g)-0.002697*Math.cos(3*g)+0.00148*Math.sin(3*g);
const tz=-date.getTimezoneOffset()/60;const tst=hr*60+eqt+4*LON-60*tz;const ha=(tst/4-180)*r,lat=LAT*r;
const cosZ=Math.sin(lat)*Math.sin(decl)+Math.cos(lat)*Math.cos(decl)*Math.cos(ha);
const elev=90-Math.acos(Math.max(-1,Math.min(1,cosZ)))/r;
let az=Math.atan2(Math.sin(ha),Math.cos(ha)*Math.sin(lat)-Math.tan(decl)*Math.cos(lat))/r+180;return{elev,az:(az+360)%360};}
const adiff=(a,b)=>{let d=Math.abs(a-b)%360;return d>180?360-d:d;};
let mE=0,mA=0,mAday=0,worst=null,rows=[];
for(const day of ['2026-03-21','2026-06-21','2026-09-06','2026-12-21']){
 let dE=0,dA=0;
 for(let m=0;m<1440;m+=10){const d=new Date(day+'T00:00:00Z');d.setUTCMinutes(m);
  const b=btcSolar(LAT,LON,d),rr=rhymeSolar(d);
  const de=Math.abs(b.elev-rr.elev);dE=Math.max(dE,de);
  if(b.elev>0){const da=adiff(b.az,rr.az);dA=Math.max(dA,da);if(da>mAday){mAday=da;worst=day+' '+d.toISOString().slice(11,16)+'Z';}}}
 rows.push([day,dE,dA]);mE=Math.max(mE,dE);mA=Math.max(mA,dA);}
console.log('date        max |Δelev| deg   max |Δazimuth| deg (sun up)');
rows.forEach(r=>console.log(r[0]+'   '+r[1].toFixed(3).padStart(9)+'   '+r[2].toFixed(3).padStart(12)));
console.log('\nworst azimuth divergence:',mA.toFixed(3),'deg at',worst);
// --night / --elev value divergence at the same instants
console.log('\ninstant                 BTC(elev,night)      RHYME(elev,night)');
for(const iso of ['2026-09-06T12:00:00Z','2026-09-06T22:30:00Z','2026-09-06T23:30:00Z','2026-09-07T01:00:00Z','2026-09-07T06:00:00Z']){
 const d=new Date(iso);const b=btcSolar(LAT,LON,d),rr=rhymeSolar(d);
 const bn=b.elev<-2?1:0, be=bn?0.15:Math.max(0,Math.min(1,Math.sin(Math.max(0,b.elev)*Math.PI/180)*1.4));
 const rn=Math.max(0,Math.min(1,(-rr.elev-2)/8)), re=Math.max(0,Math.min(1,Math.sin(Math.max(0,rr.elev)*Math.PI/180)*1.25));
 const bg=(bn*0.28), rg=0.45+0.25*(1-re)+0.30*rn;
 console.log(iso+'   '+be.toFixed(3)+', '+bn.toFixed(3)+'   glow '+bg.toFixed(2)+'    '+re.toFixed(3)+', '+rn.toFixed(3)+'   glow '+rg.toFixed(2));}
