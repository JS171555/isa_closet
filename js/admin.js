(() => {
  'use strict';

  const { createClient } = window.supabase || {};
  const cfg = window.ISA_CONFIG || {};
  const ready = Boolean(createClient && cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes('COLE_SUA_') && cfg.SUPABASE_PUBLISHABLE_KEY && !cfg.SUPABASE_PUBLISHABLE_KEY.includes('COLE_SUA_'));
  const supabase = ready ? createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken:true, persistSession:true, detectSessionInUrl:true }
  }) : null;

  let products = [];
  let editingId = null;
  let imageItems = [];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const money = value => Number(value || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
  const esc = value => String(value ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  function message(id, text, type='') {
    const el = $('#' + id); if (!el) return;
    el.textContent = text || ''; el.className = `form-message ${type}`.trim();
  }

  function setBusy(button, busy, label) {
    if (!button) return;
    if (busy) { button.dataset.originalText = button.textContent; button.disabled = true; button.textContent = label || 'Aguarde...'; }
    else { button.disabled = false; button.textContent = button.dataset.originalText || button.textContent; }
  }

  function configError() {
    if (!ready) {
      message('loginMessage', 'Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY em js/config.js antes de publicar.', 'error');
      $('#loginForm').querySelectorAll('input,button').forEach(el => el.disabled = true);
      $('#forgotPasswordBtn').disabled = true;
    }
  }

  async function isAdmin() {
    if (!supabase) return false;
    const { data, error } = await supabase.rpc('is_admin');
    if (error) { console.error(error); return false; }
    return data === true;
  }

  async function initAuth() {
    if (!supabase) { configError(); return; }

    supabase.auth.onAuthStateChange((event, session) => {
      // Supabase recomenda manter o callback leve; a verificação de permissão
      // acontece fora do callback para evitar corridas entre SIGNED_IN e getSession.
      if (event === 'PASSWORD_RECOVERY') {
        showRecovery();
        return;
      }
      if (event === 'SIGNED_OUT') {
        showLogin();
        return;
      }
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        refreshUI(session);
      }
    });

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error(error);
      showLogin();
      message('loginMessage', `Não foi possível verificar a sessão: ${error.message}`, 'error');
      return;
    }
    await refreshUI(data?.session || null);
  }

  async function refreshUI(session) {
    if (!session) { showLogin(); return; }
    if (await isAdmin()) { showDashboard(); return; }
    await supabase.auth.signOut();
    showLogin();
    message('loginMessage', 'Este usuário não possui acesso administrativo.', 'error');
  }

  function showLogin() {
    $('#loginView').hidden = false; $('#dashboardView').hidden = true; $('#logoutBtn').style.display = 'none';
  }
  function showDashboard() {
    $('#loginView').hidden = true; $('#dashboardView').hidden = false; $('#logoutBtn').style.display = 'inline-flex';
    loadSettings(); loadProducts();
    if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.from('#dashboardView > *',{y:16,opacity:0,duration:.5,stagger:.05,ease:'power2.out'});
    }
  }

  async function loadSettings() {
    const { data, error } = await supabase.from('store_settings').select('store_name,whatsapp').eq('id',1).maybeSingle();
    if (error) { console.error(error); message('settingsMessage','Não foi possível carregar as configurações.','error'); return; }
    $('#storeNameInput').value = data?.store_name || 'Isa Closet';
    $('#whatsappInput').value = data?.whatsapp || '';
  }

  async function loadProducts() {
    const { data, error } = await supabase.from('products').select('*').order('display_order',{ascending:true}).order('created_at',{ascending:false});
    if (error) { console.error(error); message('settingsMessage','Não foi possível carregar o catálogo. Confira as políticas RLS.','error'); return; }
    products = data || [];
    renderProducts(); updateStats();
  }

  function updateStats() {
    $('#statProducts').textContent = products.filter(p => p.active).length;
    $('#statPromos').textContent = products.filter(p => p.promo !== null && Number(p.promo)>0).length;
    $('#statImages').textContent = products.reduce((sum,p)=>sum+(Array.isArray(p.images)?p.images.length:0),0);
  }

  function renderProducts() {
    const q = ($('#productSearch').value || '').trim().toLowerCase();
    const list = products.filter(p => !q || `${p.name} ${p.category}`.toLowerCase().includes(q));
    const el = $('#adminProducts');
    if (!list.length) { el.innerHTML = '<div class="empty-state"><strong>Nenhum produto.</strong><span>Cadastre o primeiro look.</span></div>'; return; }
    el.innerHTML = list.map(product => {
      const image = Array.isArray(product.images) && product.images[0]?.url ? product.images[0].url : 'assets/demo/look-verde.webp';
      const promo = product.promo !== null && product.promo !== undefined && Number(product.promo)>0;
      return `<div class="admin-product">
        <img src="${esc(image)}" alt="${esc(product.name)}">
        <div><h3>${esc(product.name)}</h3><p>${esc(product.category)} • ${money(promo?product.promo:product.price)}${promo?' • promoção':''}</p><p>${product.active?'Ativo':'Oculto'} • ${(product.sizes||[]).join(', ')||'sem tamanho'}</p></div>
        <div class="admin-product-actions"><button class="ghost-btn" type="button" data-edit="${esc(product.id)}">editar</button><button class="ghost-btn" type="button" data-delete="${esc(product.id)}">×</button></div>
      </div>`;
    }).join('');
    $$('[data-edit]',el).forEach(button=>button.addEventListener('click',()=>openProduct(button.dataset.edit)));
    $$('[data-delete]',el).forEach(button=>button.addEventListener('click',()=>deleteProduct(button.dataset.delete)));
  }

  function openModal() { document.body.classList.add('admin-modal-open','is-locked'); $('#productFormModal').setAttribute('aria-hidden','false'); }
  function closeModal() { cleanupImageUrls(); document.body.classList.remove('admin-modal-open','is-locked'); $('#productFormModal').setAttribute('aria-hidden','true'); }
  function cleanupImageUrls() { imageItems.filter(x=>x.kind==='new' && x.previewUrl).forEach(x=>URL.revokeObjectURL(x.previewUrl)); }

  function resetForm() {
    cleanupImageUrls(); editingId=null; imageItems=[]; $('#productForm').reset(); $('#productId').value=''; $('#productActive').checked=true; $('#productModalTitle').textContent='Novo produto'; renderPreview(); message('productMessage','');
  }

  function openProduct(id=null) {
    resetForm();
    if (id) {
      const product = products.find(item=>item.id===id); if (!product) return;
      editingId=id; $('#productModalTitle').textContent='Editar produto'; $('#productId').value=product.id; $('#productName').value=product.name; $('#productCategory').value=product.category; $('#productPrice').value=product.price; $('#productPromo').value=product.promo ?? ''; $('#productOrder').value=product.display_order ?? 0; $('#productDescription').value=product.description || ''; $('#productActive').checked=Boolean(product.active);
      $$('.size-checks input').forEach(input=>input.checked=(product.sizes||[]).includes(input.value));
      imageItems=(Array.isArray(product.images)?product.images:[]).map(image=>({kind:'existing',path:image.path,url:image.url})); renderPreview();
    }
    openModal();
  }

  function renderPreview() {
    $('#imagePreview').innerHTML=imageItems.map((item,index)=>`<figure class="${item.kind==='new'?'pending':''}"><img src="${esc(item.kind==='new'?item.previewUrl:item.url)}" alt=""><button type="button" data-remove-image="${index}" aria-label="Remover foto">×</button></figure>`).join('');
    $$('[data-remove-image]').forEach(button=>button.addEventListener('click',()=>{
      const item=imageItems.splice(Number(button.dataset.removeImage),1)[0];
      if (item?.kind==='new' && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      renderPreview();
    }));
  }

  async function compressImage(file) {
    const objectUrl = URL.createObjectURL(file);
    const img = await new Promise((resolve,reject)=>{
      const i=new Image();
      i.onload=()=>resolve(i);
      i.onerror=reject;
      i.src=objectUrl;
    });
    const max=1600; const scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas=document.createElement('canvas'); canvas.width=Math.max(1,Math.round(img.naturalWidth*scale)); canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
    canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.86));
    URL.revokeObjectURL(objectUrl);
    if(!blob) throw new Error('Falha ao comprimir imagem.');
    return blob;
  }

  function safeFilename(name) { return name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'') || `imagem-${Date.now()}.webp`; }

  async function uploadImages(productId, newItems) {
    const uploaded=[];
    try {
      for (const item of newItems) {
        const blob=await compressImage(item.file);
        const path=`products/${productId}/${crypto.randomUUID()}-${safeFilename(item.file.name).replace(/\.[^.]+$/,'')}.webp`;
        const { error }=await supabase.storage.from('product-images').upload(path,blob,{contentType:'image/webp',cacheControl:'31536000',upsert:false});
        if(error) throw error;
        const { data }=supabase.storage.from('product-images').getPublicUrl(path);
        uploaded.push({path,url:data.publicUrl});
      }
      return uploaded;
    } catch(error) {
      if(uploaded.length) await supabase.storage.from('product-images').remove(uploaded.map(x=>x.path));
      throw error;
    }
  }

  async function saveProduct(event) {
    event.preventDefault();
    const submitButton=event.submitter || $('#productForm button[type="submit"]'); setBusy(submitButton,true,'Salvando...'); message('productMessage','');
    const id=editingId || crypto.randomUUID();
    const sizes=$$('.size-checks input:checked').map(input=>input.value);
    const price=Number($('#productPrice').value); const promo=$('#productPromo').value===''?null:Number($('#productPromo').value);
    if(promo!==null && promo>price){ message('productMessage','A promoção não pode ser maior que o preço.','error'); setBusy(submitButton,false); return; }
    if(!imageItems.length){ message('productMessage','Adicione pelo menos uma foto.','error'); setBusy(submitButton,false); return; }

    const newItems=imageItems.filter(x=>x.kind==='new'); let uploaded=[];
    try {
      if(newItems.length) uploaded=await uploadImages(id,newItems);
      const images=[...imageItems.filter(x=>x.kind==='existing').map(x=>({path:x.path,url:x.url})), ...uploaded];
      const payload={id,name:$('#productName').value.trim(),category:$('#productCategory').value,description:$('#productDescription').value.trim(),price,promo,sizes,images,display_order:Number($('#productOrder').value||0),active:$('#productActive').checked};
      const query=editingId ? supabase.from('products').update(payload).eq('id',editingId) : supabase.from('products').insert(payload);
      const { error }=await query; if(error) throw error;
      const previous=editingId?products.find(p=>p.id===editingId):null;
      const currentPaths=new Set(images.map(x=>x.path)); const removed=(previous?.images||[]).map(x=>x.path).filter(Boolean).filter(path=>!currentPaths.has(path));
      if(removed.length) await supabase.storage.from('product-images').remove(removed);
      closeModal(); await loadProducts();
    } catch(error) {
      console.error(error); if(uploaded.length) await supabase.storage.from('product-images').remove(uploaded.map(x=>x.path)); message('productMessage', error.message || 'Não foi possível salvar o produto.','error');
    } finally { setBusy(submitButton,false); }
  }

  async function deleteProduct(id) {
    const product=products.find(p=>p.id===id); if(!product) return;
    if(!confirm(`Excluir “${product.name}”? Esta ação não pode ser desfeita.`)) return;
    const { error }=await supabase.from('products').delete().eq('id',id);
    if(error){alert(error.message || 'Não foi possível excluir.');return;}
    const paths=(product.images||[]).map(x=>x.path).filter(Boolean); if(paths.length) await supabase.storage.from('product-images').remove(paths);
    await loadProducts();
  }

  function showRecovery() {
    const login=$('#loginView'); if(!login) return;
    login.innerHTML=`<p class="eyebrow">ISA CLOSET</p><h1>Nova senha</h1><p>Digite a nova senha do administrador.</p><form id="recoveryForm" class="stack-form"><label>Nova senha<input id="recoveryPassword" type="password" minlength="8" required placeholder="Mínimo de 8 caracteres"></label><button class="primary-btn" type="submit">Salvar nova senha</button><p class="form-message" id="recoveryMessage"></p></form>`;
    $('#recoveryForm').addEventListener('submit',async event=>{
      event.preventDefault(); const password=$('#recoveryPassword').value; message('recoveryMessage','Salvando...');
      const {error}=await supabase.auth.updateUser({password}); if(error){message('recoveryMessage',error.message,'error');return;}
      message('recoveryMessage','Senha alterada. Você já pode entrar.','success'); setTimeout(()=>location.reload(),900);
    });
  }

  $('#loginForm').addEventListener('submit',async event=>{
    event.preventDefault(); if(!supabase) return;
    const button=event.submitter; setBusy(button,true,'Entrando...'); message('loginMessage','');
    const {error}=await supabase.auth.signInWithPassword({
      email: $('#adminEmail').value.trim(),
      password: $('#adminPassword').value
    });
    if (error) {
      console.error('Supabase Auth:', error);
      const friendly = error.message === 'Invalid login credentials'
        ? 'E-mail ou senha inválidos.'
        : (error.message || 'Não foi possível entrar.');
      message('loginMessage', friendly, 'error');
    } else {
      message('loginMessage','Login realizado.','success');
      // A sessão será processada pelo SIGNED_IN e a permissão será verificada.
    }
    setBusy(button,false);
  });

  $('#forgotPasswordBtn').addEventListener('click',async()=>{
    const email=$('#adminEmail').value.trim(); if(!email){message('loginMessage','Digite seu e-mail primeiro.','error');return;}
    const redirectTo=new URL(location.href); redirectTo.hash='recovery';
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:redirectTo.href});
    if(error) message('loginMessage',error.message,'error'); else message('loginMessage','Enviamos o link de recuperação para seu e-mail.','success');
  });

  $('#logoutBtn').addEventListener('click',async()=>{await supabase.auth.signOut();location.reload();});
  $('#newProductBtn').addEventListener('click',()=>openProduct()); $('#closeAdminModal').addEventListener('click',closeModal); $('#cancelProduct').addEventListener('click',closeModal); $('#adminModalBackdrop').addEventListener('click',closeModal); $('#productSearch').addEventListener('input',renderProducts);
  $('#productImages').addEventListener('change',event=>{ [...event.target.files].forEach(file=>{if(file.size>8*1024*1024){message('productMessage',`A imagem “${file.name}” é grande demais (máx. 8 MB).`,'error');return;} imageItems.push({kind:'new',file,previewUrl:URL.createObjectURL(file)}); }); renderPreview(); event.target.value=''; });
  $('#productForm').addEventListener('submit',saveProduct);
  $('#settingsForm').addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter;setBusy(button,true,'Salvando...');const payload={store_name:$('#storeNameInput').value.trim()||'Isa Closet',whatsapp:$('#whatsappInput').value.replace(/\D/g,'')};const {error}=await supabase.from('store_settings').update(payload).eq('id',1);if(error)message('settingsMessage',error.message,'error');else message('settingsMessage','Configurações salvas.','success');setBusy(button,false);});

  configError(); initAuth();
})();
