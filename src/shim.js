/* MUFIT Sales Desk: penghubung aplikasi ke Supabase (login + database + realtime).
   Aplikasi memanggil window.claude.use('db' | 'user' | 'downloads'); di sini panggilan itu dijalankan ke Supabase. */
(function(){
  const CFG=window.MUFIT_CFG||{};
  const sb=window.supabase.createClient(CFG.url,CFG.anonKey,{auth:{persistSession:true,autoRefreshToken:true}});
  window.__sb=sb;
  const DOMAIN=CFG.usernameDomain||'mufitsalesdesk.com';
  let session=null,profile=null,readyRes;const ready=new Promise(r=>readyRes=r);

  /* ---------- Layar login ---------- */
  function loginScreen(msg){
    let el=document.getElementById('loginGate');
    if(!el){el=document.createElement('div');el.id='loginGate';document.body.appendChild(el)}
    el.innerHTML=`<form class="lg-card" autocomplete="on">
      <div class="lg-brand">${(document.querySelector('.brand .logo')||{}).outerHTML||''}<b>MUFIT Sales Desk</b></div>
      <p class="lg-sub">Masuk dengan username dan password kamu.</p>
      <label>Username<input name="u" autocomplete="username" required autofocus></label>
      <label>Password<input name="p" type="password" autocomplete="current-password" required></label>
      <p class="lg-err" role="alert">${msg||''}</p>
      <button class="btn primary" type="submit">Masuk</button></form>`;
    el.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=e.target;const btn=f.querySelector('button');btn.disabled=true;btn.textContent='Memeriksa…';
      const u=f.u.value.trim().toLowerCase();let email=u.includes('@')?u:'';if(!email){try{const {data}=await sb.rpc('login_email',{u});email=data||''}catch(e){}if(!email)email=u+'@'+DOMAIN}
      const {error}=await sb.auth.signInWithPassword({email,password:f.p.value});
      if(error){btn.disabled=false;btn.textContent='Masuk';f.querySelector('.lg-err').textContent='Username atau password salah.';return}
      location.reload()}}
  async function start(){
    const {data}=await sb.auth.getSession();session=data.session;
    if(!session){document.documentElement.classList.add('locked');loginScreen();return}
    const {data:p,error}=await sb.from('profiles').select('*').eq('user_id',session.user.id).maybeSingle();
    if(error||!p){document.documentElement.classList.add('locked');await sb.auth.signOut();loginScreen('Akun ini belum diberi akses. Hubungi Max.');return}
    profile=p;document.documentElement.classList.remove('locked');
    const out=document.createElement('button');out.className='btn sm ghost';out.id='logoutBtn';out.textContent='Keluar ('+(p.name||p.username)+')';
    out.onclick=async()=>{await sb.auth.signOut();location.reload()};
    const bar=document.querySelector('header .bar');if(bar)bar.appendChild(out);
    if(p.role==='owner'&&bar){const ib=document.createElement('button');ib.className='btn sm ghost';ib.id='importBtn';ib.textContent='Impor data lama';ib.onclick=importOld;bar.insertBefore(ib,out)}
    readyRes()}

  /* ---------- Impor data dari Sales Desk lama (file JSON hasil "Ekspor semua data") ---------- */
  function importOld(){const inp=document.createElement('input');inp.type='file';inp.accept='.json,application/json';
    inp.onchange=async()=>{const f=inp.files[0];if(!f)return;let J;try{J=JSON.parse(await f.text())}catch(e){alert('File tidak terbaca.');return}
      if(!J||!J.mufitExport||!J.collections){alert('Ini bukan file ekspor MUFIT Sales Desk.');return}
      const rows=[];Object.entries(J.collections).forEach(([c,arr])=>(arr||[]).forEach(d=>rows.push({collection:c,id:String(d.id),data:d.data||{},updated_at:new Date().toISOString()})));
      if(!confirm('Masukkan '+rows.length+' data ke website ini? Data dengan ID yang sama akan ditimpa.'))return;
      const btn=document.getElementById('importBtn');let done=0;
      for(let i=0;i<rows.length;i+=200){const {error}=await sb.from('docs').upsert(rows.slice(i,i+200));if(error){alert('Gagal di data ke-'+(i+1)+': '+error.message+'. Coba impor ulang, data yang sudah masuk tidak akan dobel.');return}done+=Math.min(200,rows.length-i);if(btn)btn.textContent='Mengimpor '+done+'/'+rows.length}
      alert(done+' data berhasil dimasukkan.');location.reload()};
    inp.click()}

  /* ---------- Database: koleksi dokumen + realtime ---------- */
  const mkSnap=m=>({docs:[...m.entries()].map(([id,data])=>({id,data:()=>data})),metadata:{fromCache:false}});
  const db={
    collection(c){return {onSnapshot(cb,err){const m=new Map();let alive=true;
      (async()=>{let from=0;const N=1000;try{for(;;){const {data,error}=await sb.from('docs').select('id,data').eq('collection',c).range(from,from+N-1);if(error)throw error;data.forEach(r=>m.set(r.id,r.data));if(data.length<N)break;from+=N}
        if(alive)cb(mkSnap(m))}catch(e){err&&err({code:e.code||'error',message:e.message})}})();
      const ch=sb.channel('docs-'+c).on('postgres_changes',{event:'*',schema:'public',table:'docs',filter:'collection=eq.'+c},pl=>{
        if(pl.eventType==='DELETE'){m.delete(pl.old.id)}else{m.set(pl.new.id,pl.new.data)}if(alive)cb(mkSnap(m))}).subscribe();
      return ()=>{alive=false;sb.removeChannel(ch)}}}},
    doc(path){const i=path.indexOf('/');const c=path.slice(0,i),id=path.slice(i+1);return {
      async set(data){const {error}=await sb.from('docs').upsert({collection:c,id,data,updated_at:new Date().toISOString()});if(error)throw error},
      async update(data){const {data:cur}=await sb.from('docs').select('data').eq('collection',c).eq('id',id).maybeSingle();const {error}=await sb.from('docs').upsert({collection:c,id,data:{...(cur&&cur.data||{}),...data},updated_at:new Date().toISOString()});if(error)throw error},
      async delete(){const {error}=await sb.from('docs').delete().eq('collection',c).eq('id',id);if(error)throw error},
      async get(){const {data}=await sb.from('docs').select('data').eq('collection',c).eq('id',id).maybeSingle();return {exists:!!data,id,data:()=>data&&data.data}}}}};

  /* ---------- Pengguna & peran ---------- */
  const user={async isOwner(){return profile.role==='owner'},async canEdit(){return profile.role==='owner'},async can(){return profile.role==='owner'},
    async id(){return session.user.id},async me(){return {id:session.user.id,name:profile.name||profile.username}},
    async profiles(ids){const {data}=await sb.from('profiles').select('user_id,name,username').in('user_id',ids);const o={};(data||[]).forEach(p=>o[p.user_id]={id:p.user_id,name:p.name||p.username});return o}};

  /* ---------- Download file (Excel/CSV) ---------- */
  const downloads={async save({filename,data}){const url=URL.createObjectURL(data);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000)}};

  window.claude={use:async name=>{await ready;return ({db,user,downloads})[name]||null}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
