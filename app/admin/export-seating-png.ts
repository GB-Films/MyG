import type { Plan } from "./seating-planner";
import { itemGeometry, seatPosition } from "./seating-geometry";

/** Render the entire room, independently of viewport zoom and selection handles. */
export async function downloadSeatingPng(plan: Plan) {
  const w = plan.canvas?.width || 1400, h = plan.canvas?.height || 1050;
  const scale = Math.min(2, 4096 / Math.max(w, h));
  const canvas = document.createElement("canvas"); canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("No se pudo generar la imagen");
  ctx.scale(scale, scale); ctx.fillStyle = "#1e2518"; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#ccd6be12"; ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 36) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
  for (let y = 0; y < h; y += 36) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
  const points = plan.room_outline?.points;
  if (points?.length) {
    const outside = new Path2D(); outside.rect(0,0,w,h); outside.moveTo(points[0].x*w/100,points[0].y*h/100);
    points.slice(1).forEach(p=>outside.lineTo(p.x*w/100,p.y*h/100)); outside.closePath();
    ctx.fillStyle="#0008";ctx.fill(outside,"evenodd");
    ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x*w/100,p.y*h/100):ctx.moveTo(p.x*w/100,p.y*h/100));ctx.closePath();ctx.strokeStyle="#e7d2af";ctx.lineWidth=3;ctx.stroke();
  }
  const guests = plan.guest_source === "official" ? plan.official_guests || [] : plan.manual_guests;
  for (const item of plan.items.filter(i=>i.kind!=="couple"||!plan.couple_at_main)) {
    const g=itemGeometry(item), x=item.x*w/100,y=item.y*h/100,table=item.kind==="table"||item.kind==="main";
    const occupied=guests.filter(p=>plan.assignments[p.id]===item.id).length+(item.kind==="main"&&plan.couple_at_main&&!plan.couple_in_roster?2:0);
    ctx.save();ctx.translate(x,y);ctx.rotate(g.rotation*Math.PI/180);ctx.lineWidth=2;
    if(item.kind==="door") {
      ctx.scale(g.width/100,g.height/200);ctx.translate(-50,0);ctx.strokeStyle="#1e2518";ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(100,0);ctx.stroke();ctx.strokeStyle="#c9e0ef";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,100);ctx.arc(0,0,100,Math.PI/2,0,true);ctx.stroke();
    } else {
      ctx.beginPath();if(g.shape==="circle")ctx.arc(0,0,g.width/2,0,Math.PI*2);else ctx.roundRect(-g.width/2,-g.height/2,g.width,g.height,8);
      ctx.fillStyle=table?"#e8dfca":item.kind==="dance"?"#39472c":"#384035";ctx.strokeStyle=table?"#c5b997":"#83976a";if(item.kind==="dance")ctx.setLineDash([6,4]);ctx.fill();ctx.stroke();ctx.setLineDash([]);
      if(table)for(let index=0;index<item.capacity;index++){const p=seatPosition(index,item.capacity,g);ctx.beginPath();ctx.arc((parseFloat(p.left)/100-.5)*g.width,(parseFloat(p.top)/100-.5)*g.height,6.5,0,Math.PI*2);ctx.fillStyle=index<occupied?"#d5c49c":"#303a24";ctx.fill();ctx.strokeStyle="#d5c49c";ctx.stroke();}
    }
    ctx.restore();ctx.save();ctx.translate(x,y);ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillStyle=table?"#24291f":"#e6eedb";
    const label=table?item.name.replace(/^Mesa(?:\s+|(?=\d))/i,"").trim()||String(item.number||""):item.name;
    if(item.kind==="main"){ctx.font="9px Arial";ctx.fillText("PRINCIPAL",0,-25);}
    ctx.font=table?"800 34px Arial":"bold 12px Arial";ctx.fillText(label,0,table?-5:item.kind==="door"?18:0,Math.max(60,g.width-12));
    if(table){if(item.movie){ctx.font="9px Arial";ctx.fillText(item.movie,0,18,g.width-12);}ctx.font="10px Arial";ctx.fillStyle="#48533a";ctx.fillText(`${occupied}/${item.capacity}`,0,item.movie?32:20);}
    ctx.restore();
  }
  const blob = await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error("No se pudo exportar el plano")),"image/png"));
  const url=URL.createObjectURL(blob), link=document.createElement("a");link.href=url;link.download="plano-mesas-maria-y-guido.png";link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
