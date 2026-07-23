(function () {
  "use strict";

  // ---------- helpers ----------
  var DIAC = { "ł":"l","ó":"o","ą":"a","ę":"e","ś":"s","ż":"z","ź":"z","ć":"c","ń":"n","é":"e","è":"e","ô":"o","â":"a" };
  function norm(s){ return s.toLowerCase().replace(/[łóąęśżźćńéèôâ]/g, function(m){return DIAC[m]||m;}); }
  function slug(s){ return norm(s).replace(/[^a-z0-9]+/g," ").trim(); }
  function compact(s){ return norm(s).replace(/[^a-z0-9]+/g,""); }
  function money(n){ return n.toLocaleString("pl-PL",{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function esc(s){ return s.replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function volMl(v){ var m=v.replace(",",".").match(/([\d.]+)\s*ml/); return m?parseFloat(m[1]):null; }
  function starsHTML(r){
    var full=Math.round(r), out="";
    for(var i=1;i<=5;i++) out+= i<=full?"★":"☆";
    return '<span class="stars" aria-hidden="true">'+out+'</span>';
  }
  function plural(n,one,few,many){ if(n===1)return one; var t=n%10,h=n%100; if(t>=2&&t<=4&&!(h>=12&&h<=14))return few; return many; }

  // ---------- product illustrations ----------
  // Rysowane wektorowo sylwetki opakowan (tubka, sloik, pipeta, flakon...),
  // zamiast zdjec: podglad musi byc samowystarczalny, bez zewnetrznych hostow.
  function productSVG(d){
    var im = d.img || { form:"bottle", body:"#EEEEF0", cap:"#C9C9CE" };
    var tx = im.tx || im.accent || "#1D1D1F";
    var stroke = 'stroke="rgba(29,29,31,.07)" stroke-width="1"';
    var parts = [];

    function label(y){
      var out = "";
      if(im.l1){
        var f1 = im.l1.length>12 ? 5.6 : (im.l1.length>8 ? 6.6 : 8.5);
        var ls = im.l1.length>8 ? 0.4 : 1;
        out += '<text x="70" y="'+y+'" text-anchor="middle" font-size="'+f1+'" font-weight="700" letter-spacing="'+ls+'" fill="'+tx+'">'+esc(im.l1)+'</text>';
      }
      if(im.l2){
        var f2 = im.l2.length>13 ? 5.4 : 6.6;
        out += '<text x="70" y="'+(y+10)+'" text-anchor="middle" font-size="'+f2+'" font-weight="500" fill="'+tx+'" opacity=".72">'+esc(im.l2)+'</text>';
      }
      return out;
    }
    function shine(x,y,h){ return '<rect x="'+x+'" y="'+y+'" width="6" height="'+h+'" rx="3" fill="#FFFFFF" opacity=".45"/>'; }

    switch(im.form){
      case "tube":
        parts.push('<rect x="42" y="24" width="56" height="7" rx="3" fill="'+im.cap+'" opacity=".85"/>');
        parts.push('<rect x="40" y="31" width="60" height="102" rx="12" fill="'+im.body+'" '+stroke+'/>');
        parts.push('<rect x="52" y="133" width="36" height="24" rx="7" fill="'+im.cap+'"/>');
        parts.push(shine(46,40,84));
        parts.push(label(80));
        break;
      case "pump":
        parts.push('<rect x="65" y="30" width="28" height="10" rx="4" fill="'+im.cap+'"/>');
        parts.push('<rect x="65" y="36" width="10" height="14" fill="'+im.cap+'"/>');
        parts.push('<rect x="58" y="46" width="24" height="12" rx="3" fill="'+im.cap+'" opacity=".85"/>');
        parts.push('<rect x="44" y="56" width="52" height="100" rx="10" fill="'+im.body+'" '+stroke+'/>');
        parts.push(shine(50,64,84));
        parts.push(label(102));
        break;
      case "dropper":
        parts.push('<rect x="62" y="24" width="16" height="10" rx="5" fill="'+im.cap+'"/>');
        parts.push('<rect x="58" y="32" width="24" height="34" rx="8" fill="'+im.cap+'"/>');
        parts.push('<rect x="48" y="64" width="44" height="92" rx="9" fill="'+im.body+'" '+stroke+'/>');
        parts.push(shine(53,72,76));
        parts.push(label(106));
        break;
      case "jar":
        parts.push('<rect x="38" y="58" width="64" height="22" rx="9" fill="'+im.cap+'" '+stroke+'/>');
        parts.push('<rect x="42" y="80" width="56" height="76" rx="12" fill="'+im.body+'" '+stroke+'/>');
        parts.push(shine(48,88,60));
        parts.push(label(114));
        break;
      case "mascara":
        parts.push('<rect x="56" y="28" width="28" height="44" rx="9" fill="'+im.cap+'"/>');
        parts.push('<rect x="59" y="72" width="22" height="84" rx="8" fill="'+im.body+'" '+stroke+'/>');
        parts.push(shine(62,78,72));
        break;
      case "glass":
        parts.push('<rect x="60" y="26" width="30" height="8" rx="4" fill="'+im.cap+'"/>');
        parts.push('<rect x="60" y="32" width="20" height="14" rx="3" fill="'+im.cap+'"/>');
        parts.push('<rect x="58" y="44" width="24" height="10" fill="'+im.cap+'" opacity=".82"/>');
        parts.push('<rect x="46" y="54" width="48" height="102" rx="10" fill="'+im.body+'" '+stroke+'/>');
        parts.push(shine(52,62,86));
        parts.push(label(112));
        break;
      case "gloss":
        parts.push('<rect x="58" y="28" width="24" height="54" rx="7" fill="'+im.cap+'"/>');
        parts.push('<rect x="55" y="82" width="30" height="74" rx="9" fill="'+im.body+'" '+stroke+'/>');
        parts.push(shine(59,88,60));
        break;
      case "spray":
        parts.push('<rect x="58" y="34" width="24" height="20" rx="5" fill="'+im.cap+'"/>');
        parts.push('<rect x="48" y="54" width="44" height="102" rx="9" fill="'+im.body+'" '+stroke+'/>');
        parts.push(shine(54,62,86));
        parts.push(label(110));
        break;
      case "perfume":
        parts.push('<rect x="55" y="26" width="30" height="26" rx="7" fill="'+im.cap+'"/>');
        parts.push('<rect x="62" y="50" width="16" height="12" fill="'+im.cap+'" opacity=".7"/>');
        parts.push('<rect x="38" y="62" width="64" height="94" rx="12" fill="'+im.body+'" '+stroke+'/>');
        parts.push('<rect x="46" y="70" width="8" height="78" rx="4" fill="#FFFFFF" opacity=".32"/>');
        parts.push(label(116));
        break;
      case "toner":
        parts.push('<rect x="56" y="26" width="28" height="18" rx="5" fill="'+im.cap+'"/>');
        parts.push('<rect x="48" y="44" width="44" height="112" rx="10" fill="'+im.body+'" '+stroke+'/>');
        parts.push(shine(53,52,96));
        parts.push(label(106));
        break;
      default: // bottle
        parts.push('<rect x="54" y="30" width="32" height="20" rx="6" fill="'+im.cap+'"/>');
        parts.push('<rect x="44" y="50" width="52" height="106" rx="16" fill="'+im.body+'" '+stroke+'/>');
        parts.push(shine(50,58,90));
        parts.push(label(108));
    }

    return '<svg viewBox="0 0 140 176" role="img" aria-hidden="true" '+
      'style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif">'+
      '<ellipse cx="70" cy="164" rx="34" ry="5" fill="#1D1D1F" opacity=".05"/>'+
      parts.join("")+'</svg>';
  }

  var HAS_FEED = typeof FEED_P!=="undefined" && FEED_P.length>0;
  var DATA = P.map(function(p,i){
    var offers = Object.keys(p.o).map(function(s){ return { store:s, price:p.o[s].p, was:p.o[s].w||null, url:p.o[s].u||null, inStock:true }; });
    if(!HAS_FEED && i%9===4 && offers.length>3){ offers.slice().sort(function(a,b){return a.price-b.price;})[0].inStock=false; }
    var avail = offers.filter(function(o){return o.inStock;}).sort(function(a,b){return a.price-b.price;});
    var low=avail[0].price, high=avail[avail.length-1].price;
    offers.sort(function(a,b){ if(a.inStock!==b.inStock)return a.inStock?-1:1; return a.price-b.price; });
    return {
      id:i, brand:p.brand, name:p.name, cat:p.cat, vol:p.vol, ml:volMl(p.vol),
      pop:p.pop, rate:p.rate, votes:p.votes, img:p.img, photo:p.photo||null,
      offers:offers, low:low, high:high, lowStore:avail[0].store,
      save:+(high-low).toFixed(2), savePct:Math.round((high-low)/high*100),
      hay:slug(p.brand+" "+p.name+" "+p.kw+" "+p.cat), hayc:compact(p.brand+" "+p.name+" "+p.kw)
    };
  });

  function search(qRaw){
    var q=slug(qRaw); if(!q) return [];
    var toks=q.split(" ").filter(Boolean), qc=compact(qRaw);
    return DATA.map(function(d){
      var score=0, all=true;
      toks.forEach(function(t){
        if(d.hay.indexOf(t)>=0) score+=3+(d.hay.indexOf(t)<20?2:0);
        else if(d.hayc.indexOf(t)>=0) score+=2;
        else all=false;
      });
      if(qc.length>4 && d.hayc.indexOf(qc)>=0) score+=4;
      return {d:d, s: all?score:0};
    }).filter(function(x){return x.s>0;})
      .sort(function(a,b){return b.s-a.s || b.d.pop-a.d.pop;})
      .map(function(x){return x.d;});
  }

  // ---------- state ----------
  // Ulubione i alerty sa trwale: localStorage przezywa restart aplikacji.
  function loadStore(key){ try { return JSON.parse(localStorage.getItem(key)||"{}"); } catch(e){ return {}; } }
  function saveStore(key,obj){ try { localStorage.setItem(key, JSON.stringify(obj)); } catch(e){} }
  var favs=loadStore("blask.favs"), alerts=loadStore("blask.alerts");
  var favMode=false, activeCat="Wszystkie", activeIdx=-1, curSug=[];
  var homeEl=document.getElementById("home"), pdpEl=document.getElementById("pdp");
  var qEl=document.getElementById("q"), sugEl=document.getElementById("suggest");
  var IS_ELECTRON=/Electron/i.test(navigator.userAgent);

  // ---------- prawdziwe zdjecia produktow ----------
  // Zrodlo: Open Beauty Facts (otwarta baza zdjec realnych produktow).
  // Adresy sa cache'owane w localStorage; gdy sieci brak (np. sandbox
  // podgladu), na kartach zostaja wektorowe ilustracje.
  var PHOTOS=loadStore("blask.photos");
  function visualInner(d){
    var url=d.photo||PHOTOS[d.id]; // zdjecie z feedu sklepu ma pierwszenstwo
    return productSVG(d)+(url?'<img class="pphoto" alt="" loading="lazy" src="'+esc(url)+'">':'');
  }
  function injectPhoto(id){
    var url=PHOTOS[id]; if(!url) return;
    Array.prototype.forEach.call(document.querySelectorAll('.pv[data-pid="'+id+'"]'),function(el){
      if(el.querySelector("img.pphoto")) return;
      var im=document.createElement("img");
      im.className="pphoto"; im.alt=""; im.loading="lazy"; im.src=url;
      el.appendChild(im);
    });
  }
  // Uszkodzone/niedostepne zdjecie -> wracamy do ilustracji.
  document.addEventListener("error",function(e){
    var t=e.target;
    if(t && t.classList && t.classList.contains("pphoto")){
      var pv=t.closest(".pv");
      if(pv){ PHOTOS[pv.getAttribute("data-pid")]=""; saveStore("blask.photos",PHOTOS); }
      t.remove();
    }
  },true);
  function loadPhotos(){
    var queue=DATA.filter(function(d){ return !d.photo && !(d.id in PHOTOS); });
    (function next(){
      if(!queue.length){ saveStore("blask.photos",PHOTOS); return; }
      var d=queue.shift();
      var q=encodeURIComponent(d.brand+" "+d.name.split(" ").slice(0,3).join(" "));
      fetch("https://world.openbeautyfacts.org/cgi/search.pl?search_terms="+q+
            "&search_simple=1&action=process&json=1&page_size=5&sort_by=unique_scans_n&fields=image_front_url")
        .then(function(r){ return r.json(); })
        .then(function(js){
          var hit=(js.products||[]).filter(function(x){return x.image_front_url;})[0];
          PHOTOS[d.id]=hit?hit.image_front_url:"";
          if(hit) injectPhoto(d.id);
          saveStore("blask.photos",PHOTOS);
          next();
        })
        .catch(function(){ next(); /* brak sieci - zostaje ilustracja, sprobujemy przy nastepnym starcie */ });
    })();
  }

  // ---------- hero stats ----------
  var stores={}; DATA.forEach(function(d){d.offers.forEach(function(o){stores[o.store]=1;});});
  var avgPct=Math.round(DATA.reduce(function(s,d){return s+d.savePct;},0)/DATA.length);
  document.getElementById("bandStats").innerHTML =
    '<span>'+DATA.length+' produktów z cenami</span><span class="dot"></span>'+
    '<span>'+Object.keys(stores).length+' sklepów</span><span class="dot"></span>'+
    '<span>średnia różnica cen '+avgPct+'%</span><span class="dot"></span>'+
    '<span>pełny katalog w wyszukiwarce</span>';

  // ---------- category nav ----------
  var catnav=document.getElementById("catnav");
  CATS.forEach(function(c){
    var b=document.createElement("button");
    b.className="catlink"+(c===activeCat?" on":""); b.type="button"; b.textContent=c;
    b.addEventListener("click", function(){
      activeCat=c; favMode=false;
      Array.prototype.forEach.call(catnav.children,function(x){x.classList.toggle("on",x.textContent===c);});
      goHome(); renderGrid();
    });
    catnav.appendChild(b);
  });

  // ---------- grid ----------
  var gridEl=document.getElementById("pgrid"), sortEl=document.getElementById("sort");
  sortEl.addEventListener("change", renderGrid);

  function gridList(){
    var list=DATA.filter(function(d){
      if(favMode) return !!favs[d.id];
      return activeCat==="Wszystkie"||d.cat===activeCat;
    });
    var s=sortEl.value;
    list.sort(function(a,b){
      if(s==="pop")return b.pop-a.pop;
      if(s==="save")return b.save-a.save;
      if(s==="low")return a.low-b.low;
      if(s==="high")return b.low-a.low;
      return b.rate-a.rate;
    });
    return list;
  }

  function cardHTML(d){
    return '<div class="pcard" role="button" tabindex="0" data-id="'+d.id+'">'+
      (d.savePct>=15?'<span class="badge">−'+d.savePct+'%</span>':'')+
      '<button class="fav'+(favs[d.id]?" on":"")+'" data-fav="'+d.id+'" type="button" aria-label="Dodaj do ulubionych">'+
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="'+(favs[d.id]?"currentColor":"none")+'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.5-1.4 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3.4 1-4.5 2.5C10.9 4 9.3 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.1 3 5.5l7 7z"/></svg></button>'+
      '<div class="pimg pv" data-pid="'+d.id+'">'+visualInner(d)+'</div>'+
      '<div class="pbrand">'+esc(d.brand)+'</div>'+
      '<div class="pname">'+esc(d.name)+'</div>'+
      '<div class="prating">'+starsHTML(d.rate)+' '+d.rate.toFixed(1)+' ('+d.votes.toLocaleString("pl-PL")+')</div>'+
      '<div class="pfoot"><div class="pfrom">od</div>'+
      '<div class="pprice"><span class="now">'+money(d.low)+' zł</span>'+
      (d.save>0?'<span class="high">'+money(d.high)+' zł</span>':'')+'</div>'+
      '<div class="pstores">w <b>'+d.offers.length+'</b> '+plural(d.offers.length,"sklepie","sklepach","sklepach")+
      (d.save>0?' · taniej o <b>'+money(d.save)+' zł</b>':'')+'</div></div></div>';
  }

  function renderGrid(){
    var list=gridList();
    document.getElementById("gridTitle").childNodes[0].nodeValue =
      favMode ? "Ulubione" : (activeCat==="Wszystkie"?"Bestsellery":activeCat);
    document.getElementById("gridRes").textContent=" · "+list.length+" "+plural(list.length,"produkt","produkty","produktów");
    gridEl.innerHTML = list.length ? list.map(cardHTML).join("")
      : (favMode
        ? '<div class="empty"><div class="t">Nie masz jeszcze ulubionych</div>Kliknij ♥ na dowolnym produkcie, a znajdziesz go tutaj — zapamiętamy go na stałe.</div>'
        : '<div class="empty"><div class="t">Brak produktów</div>Zmień kategorię lub wyszukaj coś innego.</div>');
  }

  function bindCardEvents(container){
    container.addEventListener("click", function(e){
      var f=e.target.closest("[data-fav]");
      if(f){ e.stopPropagation(); toggleFav(+f.getAttribute("data-fav")); return; }
      var c=e.target.closest(".pcard"); if(c) openPDP(+c.getAttribute("data-id"));
    });
    container.addEventListener("keydown", function(e){
      if(e.key!=="Enter"&&e.key!==" ") return;
      var c=e.target.closest(".pcard"); if(c){ e.preventDefault(); openPDP(+c.getAttribute("data-id")); }
    });
  }
  bindCardEvents(gridEl);
  bindCardEvents(document.getElementById("related"));

  // ---------- favourites / alerts ----------
  function count(obj){ return Object.keys(obj).filter(function(k){return obj[k];}).length; }
  function syncCounts(){
    var fc=count(favs), ac=count(alerts);
    var fEl=document.getElementById("favCnt"), aEl=document.getElementById("alertCnt");
    fEl.hidden=!fc; fEl.textContent=fc; aEl.hidden=!ac; aEl.textContent=ac;
  }
  function toggleFav(id){
    favs[id]=!favs[id]; if(!favs[id]) delete favs[id];
    saveStore("blask.favs",favs); syncCounts();
    toast(favs[id]?"Zapisano w ulubionych ♥":"Usunięto z ulubionych");
    renderGrid(); if(pdpEl.style.display==="block"&&curPdp===id) paintPdpMini(id);
  }
  function toggleAlert(id){
    alerts[id]=!alerts[id]; if(!alerts[id]) delete alerts[id];
    saveStore("blask.alerts",alerts); syncCounts();
    toast(alerts[id]?"Alert cenowy ustawiony 🔔":"Alert wyłączony");
    if(pdpEl.style.display==="block"&&curPdp===id) paintPdpMini(id);
  }
  document.getElementById("favBtnTop").addEventListener("click", function(){
    favMode=true; activeCat="Wszystkie";
    Array.prototype.forEach.call(catnav.children,function(x){x.classList.remove("on");});
    goHome(); renderGrid();
  });
  document.getElementById("alertBtnTop").addEventListener("click", function(){
    var n=count(alerts); toast(n?("Aktywne alerty: "+n):"Nie masz alertów — ustaw je na stronie produktu");
  });

  var toastEl=document.getElementById("toast"), toastT;
  function toast(msg){
    toastEl.textContent=msg; toastEl.classList.add("show");
    clearTimeout(toastT); toastT=setTimeout(function(){toastEl.classList.remove("show");},2200);
  }

  // ---------- otwieranie sklepow ----------
  // W Electronie link przejmuje main.js (shell.openExternal -> systemowa
  // przegladarka). W przegladarce probujemy window.open; jesli srodowisko
  // (np. sandbox podgladu) je blokuje, pokazujemy link do skopiowania.
  function fallbackCopy(t){
    var ta=document.createElement("textarea");
    ta.value=t; ta.style.position="fixed"; ta.style.opacity="0";
    document.body.appendChild(ta); ta.select();
    var ok=false; try{ ok=document.execCommand("copy"); }catch(e){}
    ta.remove(); return ok;
  }
  function copyText(t,done){
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(t).then(function(){done(true);},function(){done(fallbackCopy(t));});
    } else done(fallbackCopy(t));
  }
  var lmodal=document.getElementById("lmodal"), lmodalUrl=document.getElementById("lmodalUrl");
  function showLinkModal(url){
    lmodalUrl.textContent=url; lmodal.hidden=false;
    document.getElementById("lmodalCopy").focus();
  }
  document.getElementById("lmodalClose").addEventListener("click", function(){ lmodal.hidden=true; });
  lmodal.addEventListener("click", function(e){ if(e.target===lmodal) lmodal.hidden=true; });
  document.addEventListener("keydown", function(e){ if(e.key==="Escape" && !lmodal.hidden) lmodal.hidden=true; });
  document.getElementById("lmodalCopy").addEventListener("click", function(){
    copyText(lmodalUrl.textContent, function(ok){
      toast(ok?"Link skopiowany — wklej go w przeglądarce":"Nie udało się skopiować — zaznacz link ręcznie");
      if(ok) lmodal.hidden=true;
    });
  });
  document.addEventListener("click", function(e){
    var a=e.target.closest("a.buy, a.cta");
    if(!a || IS_ELECTRON) return;
    e.preventDefault();
    var url=a.getAttribute("href");
    var w=null;
    try{ w=window.open(url,"_blank","noopener"); }catch(err){}
    if(!w) showLinkModal(url);
  });

  // ---------- wyszukiwarka: porownywarka + katalog live ----------
  // Wpisac mozna cokolwiek: najpierw trafienia z porownywarki cen,
  // ponizej produkty z otwartego katalogu (Open Beauty Facts, ~pol miliona
  // kosmetykow), na koncu wyszukiwanie frazy bezposrednio w sklepach.
  var sugRows=[], catCache={}, sugTimer=null, sugSeq=0;

  function hl(text,qn){
    var out=esc(text);
    qn.split(" ").filter(function(t){return t.length>1;}).forEach(function(t){
      try{ out=out.replace(new RegExp("("+t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")","ig"),"<b>$1</b>"); }catch(e){}
    });
    return out;
  }
  function openSug(){ sugEl.classList.add("show"); qEl.setAttribute("aria-expanded","true"); }
  function closeSug(){ sugEl.classList.remove("show"); qEl.setAttribute("aria-expanded","false"); activeIdx=-1; }

  function remoteSearch(q, cb){
    var key=norm(q);
    if(catCache[key]){ cb(catCache[key]); return; }
    fetch("https://world.openbeautyfacts.org/cgi/search.pl?search_terms="+encodeURIComponent(q)+
          "&search_simple=1&action=process&json=1&page_size=6&sort_by=unique_scans_n"+
          "&fields=code,product_name,brands,quantity,image_front_small_url,image_front_url")
      .then(function(r){ return r.json(); })
      .then(function(js){
        var items=(js.products||[]).filter(function(p){ return p.product_name; }).map(function(p){
          return { code:p.code, name:p.product_name, brand:(p.brands||"").split(",")[0].trim(),
                   qty:p.quantity||"", img:p.image_front_small_url||p.image_front_url||"" };
        });
        catCache[key]=items; cb(items);
      })
      .catch(function(){ cb(null); });
  }

  var genericImg={ img:{ form:"bottle", body:"#E9E9EE", cap:"#C9C9CE" } };
  function rowsHTML(q){
    var qn=slug(q), html="", firstCat=true;
    sugRows.forEach(function(r,i){
      if(r.t==="local"){
        var d=r.d;
        html+='<div class="sug-item" role="option" data-i="'+i+'">'+
          '<div class="sug-thumb pv" data-pid="'+d.id+'">'+visualInner(d)+'</div>'+
          '<div class="sug-body"><div class="sug-name">'+hl(d.brand+" "+d.name,qn)+'</div>'+
          '<div class="sug-meta">'+d.cat+' · '+d.vol+'</div></div>'+
          '<div class="sug-price">od<b>'+money(d.low)+' zł</b></div></div>';
      } else if(r.t==="cat"){
        if(firstCat){ html+='<div class="sug-sec">Katalog kosmetyków</div>'; firstCat=false; }
        var it=r.item;
        html+='<div class="sug-item" role="option" data-i="'+i+'">'+
          '<div class="sug-thumb pv">'+productSVG(genericImg)+
            (it.img?'<img class="pphoto" alt="" loading="lazy" src="'+esc(it.img)+'">':'')+'</div>'+
          '<div class="sug-body"><div class="sug-name">'+hl((it.brand?it.brand+" ":"")+it.name,qn)+'</div>'+
          '<div class="sug-meta">'+(it.qty?it.qty+' · ':'')+'sprawdź ceny w sklepach</div></div></div>';
      } else {
        html+='<div class="sug-item sug-all" role="option" data-i="'+i+'">Szukaj „'+esc(q)+'" we wszystkich sklepach →</div>';
      }
    });
    return html;
  }

  function renderSuggest(){
    var q=qEl.value.trim();
    if(q.length<2){ closeSug(); return; }
    var local=search(q).slice(0,5);
    sugRows=local.map(function(d){ return {t:"local", d:d}; });
    sugRows.push({t:"all", q:q});
    activeIdx=-1;
    sugEl.innerHTML=rowsHTML(q);
    openSug();

    // katalog: doładuj z opóźnieniem, tylko jeśli fraza się nie zmieniła
    clearTimeout(sugTimer);
    var seq=++sugSeq;
    sugTimer=setTimeout(function(){
      remoteSearch(q, function(items){
        if(seq!==sugSeq || !items || !items.length) return;
        var localKeys={};
        sugRows.forEach(function(r){ if(r.t==="local") localKeys[compact(r.d.brand+r.d.name)]=1; });
        var extra=items.filter(function(it){ return !localKeys[compact((it.brand||"")+it.name)]; }).slice(0,4)
          .map(function(it){ return {t:"cat", item:it}; });
        if(!extra.length) return;
        sugRows.splice(sugRows.length-1, 0, extra[0]); // keep "all" last
        for(var k=1;k<extra.length;k++) sugRows.splice(sugRows.length-1,0,extra[k]);
        activeIdx=-1;
        if(qEl.value.trim()===q && sugEl.classList.contains("show")) sugEl.innerHTML=rowsHTML(q);
      });
    }, 300);
  }

  function activateRow(i){
    var r=sugRows[i]; if(!r) return;
    if(r.t==="local") openPDP(r.d.id);
    else if(r.t==="cat") openCatalog(r.item);
    else openCatalog({ query:true, name:r.q||qEl.value.trim() });
  }

  qEl.addEventListener("input", renderSuggest);
  qEl.addEventListener("focus", function(){ if(qEl.value.trim().length>=2) renderSuggest(); });
  qEl.addEventListener("blur", function(){ setTimeout(closeSug,150); });
  qEl.addEventListener("keydown", function(e){
    if(!sugEl.classList.contains("show")||!sugRows.length){ if(e.key==="Enter") doSearch(); return; }
    if(e.key==="ArrowDown"){ e.preventDefault(); activeIdx=Math.min(activeIdx+1,sugRows.length-1); paintAct(); }
    else if(e.key==="ArrowUp"){ e.preventDefault(); activeIdx=Math.max(activeIdx-1,0); paintAct(); }
    else if(e.key==="Enter"){ e.preventDefault(); if(activeIdx>=0) activateRow(activeIdx); else doSearch(); }
    else if(e.key==="Escape"){ closeSug(); }
  });
  function paintAct(){
    Array.prototype.forEach.call(sugEl.querySelectorAll(".sug-item"),function(el){
      el.classList.toggle("active",+el.getAttribute("data-i")===activeIdx);
    });
  }
  sugEl.addEventListener("mousedown", function(e){
    var it=e.target.closest(".sug-item"); if(it){ e.preventDefault(); activateRow(+it.getAttribute("data-i")); }
  });
  function doSearch(){
    var q=qEl.value.trim(); if(!q) return;
    var res=search(q);
    if(res.length) openPDP(res[0].id);
    else openCatalog({ query:true, name:q });
  }
  document.getElementById("goBtn").addEventListener("click", doSearch);

  // ---------- product page ----------
  var curPdp=null;
  var wishes=loadStore("blask.wishes");

  function searchUrl(store,q){
    var st=STORES[store]||{};
    return st.search ? st.search.replace("{q}", encodeURIComponent(q)) : st.url;
  }
  function setTracked(on){
    Array.prototype.forEach.call(document.querySelectorAll(".tracked-only"),function(el){
      el.style.display = on ? "" : "none";
    });
    document.getElementById("catPanel").hidden = on;
  }

  // Produkt spoza porownywarki (katalog / surowa fraza): pokazujemy karte
  // z wyszukiwaniem w sklepach zamiast tabeli cen.
  function openCatalog(item){
    curPdp=null; closeSug(); qEl.blur();
    var isQuery=!!item.query;
    document.getElementById("crumbs").innerHTML=
      '<button type="button" data-home>Strona główna</button><span class="sep">›</span>'+
      '<span>'+(isQuery?"Wyszukiwanie":"Katalog kosmetyków")+'</span>';
    var vis=document.getElementById("pdpVis");
    vis.classList.add("pv"); vis.removeAttribute("data-pid");
    vis.innerHTML=productSVG(genericImg)+
      (item.img?'<img class="pphoto" alt="" src="'+esc(item.img)+'">':'');
    document.getElementById("pdpBrand").textContent=item.brand||"";
    document.getElementById("pdpName").textContent=item.name;
    document.getElementById("pdpSub").textContent=
      (item.qty?item.qty+" · ":"")+(isQuery?"Twoje wyszukiwanie":"z otwartego katalogu kosmetyków");
    document.getElementById("pdpRating").innerHTML="";
    setTracked(false);

    var q=((item.brand?item.brand+" ":"")+item.name).trim();
    document.getElementById("catShops").innerHTML=Object.keys(STORES).map(function(s){
      if(!STORES[s].search) return "";
      return '<a class="buy" href="'+esc(searchUrl(s,q))+'" target="_blank" rel="noopener noreferrer">'+
        '<span class="store-dot" style="background:'+STORES[s].c+'"></span>Szukaj w '+s+'</a>';
    }).join("");

    var wkey=item.code?("c:"+item.code):("q:"+norm(item.name));
    var wb=document.getElementById("wishBtn");
    function paintWish(){
      wb.className="mini"+(wishes[wkey]?" on":"");
      wb.textContent=wishes[wkey]?"Na liście życzeń ✓":"Chcę porównywać ceny tego produktu";
    }
    paintWish();
    wb.onclick=function(){
      wishes[wkey]=!wishes[wkey]; if(!wishes[wkey]) delete wishes[wkey];
      saveStore("blask.wishes",wishes);
      toast(wishes[wkey]?"Zapisano — dodamy ten produkt do porównywarki":"Usunięto z listy życzeń");
      paintWish();
    };

    document.getElementById("relatedHead").textContent="Popularne w Blask";
    document.getElementById("related").innerHTML=
      DATA.slice().sort(function(a,b){return b.pop-a.pop;}).slice(0,4).map(cardHTML).join("");

    homeEl.style.display="none"; pdpEl.style.display="block";
    window.scrollTo({top:0,behavior:"auto"});
  }
  function openPDP(id){
    curPdp=id;
    var d=DATA[id];
    closeSug(); qEl.blur();

    document.getElementById("crumbs").innerHTML=
      '<button type="button" data-home>Strona główna</button><span class="sep">›</span>'+
      '<button type="button" data-cat="'+esc(d.cat)+'">'+esc(d.cat)+'</button><span class="sep">›</span>'+
      '<span>'+esc(d.brand)+'</span>';
    var vis=document.getElementById("pdpVis");
    vis.classList.add("pv"); vis.setAttribute("data-pid",d.id);
    vis.innerHTML=visualInner(d);
    document.getElementById("pdpBrand").textContent=d.brand;
    document.getElementById("pdpName").textContent=d.name;
    document.getElementById("pdpSub").textContent=d.cat+" · "+d.vol;
    document.getElementById("pdpRating").innerHTML=starsHTML(d.rate)+' <b>'+d.rate.toFixed(1)+'</b> · '+d.votes.toLocaleString("pl-PL")+' ocen';

    setTracked(true);
    var shopQ=d.brand+" "+d.name.split(" ").slice(0,3).join(" ");
    document.getElementById("bbAmt").innerHTML=money(d.low)+'<span class="cur">zł</span>';
    document.getElementById("bbAt").innerHTML='w <b>'+d.lowStore+'</b>'+(d.ml?' · '+money(d.low/d.ml*100)+' zł / 100 ml':'');
    var bestOffer=d.offers.filter(function(o){return o.inStock&&o.store===d.lowStore;})[0];
    document.getElementById("bbCta").href=(bestOffer&&bestOffer.url)||searchUrl(d.lowStore, shopQ);
    document.getElementById("bbSave").innerHTML=d.save>0
      ? '<span class="save-note"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>Oszczędzasz do '+money(d.save)+' zł ('+d.savePct+'%) względem najdroższej oferty</span>' : '';

    paintPdpMini(id);

    document.getElementById("offCnt").textContent=" · "+d.offers.length+" "+plural(d.offers.length,"sklep","sklepy","sklepów");
    document.getElementById("offers").innerHTML=d.offers.map(function(o){
      var st=STORES[o.store]||{c:"#999",url:"#",dl:""};
      var best=o.inStock&&o.price===d.low&&o.store===d.lowStore;
      var action=o.inStock
        ? '<a class="buy" href="'+esc(o.url||searchUrl(o.store, shopQ))+'" target="_blank" rel="noopener noreferrer">'+(best?"Kup najtaniej":"Do sklepu")+
          ' <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M7 7h10v10"/></svg></a>'
        : '<span class="oos-pill">Chwilowo niedostępny</span>';
      return '<div class="offer'+(best?" best":"")+(o.inStock?"":" oos")+'">'+
        '<div class="offer-store"><span class="store-dot" style="background:'+st.c+'"></span>'+
        '<div><div class="nm">'+o.store+(best?'<span class="bflag">najniższa cena</span>':'')+'</div>'+
        '<div class="dl">'+st.dl+'</div></div></div>'+
        '<div class="offer-price"><span class="now">'+money(o.price)+' zł</span>'+
        (o.was?'<span class="was">'+money(o.was)+' zł</span>':'')+
        (d.ml?'<div class="ppu">'+money(o.price/d.ml*100)+' zł / 100 ml</div>':'')+'</div>'+
        action+'</div>';
    }).join("");

    document.getElementById("relatedHead").textContent="Podobne produkty";
    var rel=DATA.filter(function(x){return x.cat===d.cat&&x.id!==d.id;}).sort(function(a,b){return b.pop-a.pop;}).slice(0,4);
    document.getElementById("related").innerHTML=rel.map(cardHTML).join("");

    homeEl.style.display="none"; pdpEl.style.display="block";
    window.scrollTo({top:0,behavior:"auto"});
  }

  function paintPdpMini(id){
    var f=document.getElementById("pdpFav"), a=document.getElementById("pdpAlert");
    f.className="mini"+(favs[id]?" on":"");
    f.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="'+(favs[id]?"currentColor":"none")+'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.5-1.4 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3.4 1-4.5 2.5C10.9 4 9.3 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.1 3 5.5l7 7z"/></svg> '+
      (favs[id]?"W ulubionych":"Do ulubionych");
    a.className="mini"+(alerts[id]?" on":"");
    a.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="'+(alerts[id]?"currentColor":"none")+'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg> '+
      (alerts[id]?"Śledzisz cenę":"Alert cenowy");
    f.onclick=function(){toggleFav(id);};
    a.onclick=function(){toggleAlert(id);};
    document.getElementById("pdpShare").onclick=function(){
      var d=DATA[id], url=(STORES[d.lowStore]||{}).url||"";
      copyText(d.brand+" "+d.name+" — najtaniej "+money(d.low)+" zł w "+d.lowStore+": "+url, function(ok){
        toast(ok?"Skopiowano do schowka":"Nie udało się skopiować");
      });
    };
  }

  document.getElementById("crumbs").addEventListener("click", function(e){
    var b=e.target.closest("button"); if(!b) return;
    if(b.hasAttribute("data-home")){ showHome(); }
    else if(b.hasAttribute("data-cat")){
      activeCat=b.getAttribute("data-cat"); favMode=false;
      Array.prototype.forEach.call(catnav.children,function(x){x.classList.toggle("on",x.textContent===activeCat);});
      goHome(); renderGrid();
    }
  });

  function goHome(){
    pdpEl.style.display="none"; homeEl.style.display="block"; curPdp=null;
    qEl.value=""; closeSug(); window.scrollTo({top:0,behavior:"auto"});
  }
  function showHome(){ favMode=false; goHome(); renderGrid(); }
  document.getElementById("logoBtn").addEventListener("click", showHome);
  document.getElementById("logoBtn2").addEventListener("click", showHome);

  renderGrid();
  syncCounts();
  loadPhotos();
})();
