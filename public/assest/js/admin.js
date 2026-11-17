(function(global){'use strict';
/* ── helpers ─────────────────────────────────────────────────────── */
function api(){return global.NutriApi;}
function toast(msg,type){var t=document.getElementById('admin-toast');if(!t)return;t.textContent=msg;t.className='admin-toast '+(type||'success');t.classList.add('show');setTimeout(function(){t.classList.remove('show');},3500);}
function loading(show){var l=document.getElementById('page-loading');if(l)l.style.display=show?'flex':'none';}
function fmt(d){return d?new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—';}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function confirm(msg,cb){
  var o=document.createElement('div');o.className='admin-confirm-overlay';
  o.innerHTML='<div class="admin-confirm-box"><h3>Confirm Action</h3><p>'+esc(msg)+'</p><div class="admin-form__actions"><button class="admin-btn admin-btn--ghost" id="cc">Cancel</button><button class="admin-btn admin-btn--danger" id="co">Delete</button></div></div>';
  document.body.appendChild(o);
  o.querySelector('#cc').onclick=function(){document.body.removeChild(o);};
  o.querySelector('#co').onclick=function(){document.body.removeChild(o);cb();};}

/* ── auth guard ──────────────────────────────────────────────────── */
function guardAdmin(){
  var sess=null;try{sess=JSON.parse(localStorage.getItem('nutri_auth_session')||'null');}catch(e){}
  var role=localStorage.getItem('nutri_user_role')||'';
  if(!sess||(sess.role!=='admin'&&role!=='admin')){alert('Access denied. Admins only.');location.replace('../../index.html');return false;}
  var el=document.getElementById('topbar-user');if(el)el.textContent=sess.name||'Admin';
  return true;}

/* ── sidebar ─────────────────────────────────────────────────────── */
function initSidebar(){
  var btn=document.getElementById('sidebar-toggle'),sb=document.getElementById('admin-sidebar');
  if(btn&&sb){btn.addEventListener('click',function(){sb.classList.toggle('open');});}
  document.querySelectorAll('[data-auth-logout]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var token=api()?api().getToken():'';
      function doOut(){if(api())api().clearAuth();localStorage.removeItem('nutri_auth_session');location.href='../../index.html';}
      var base=(global.NutriAuthConfig&&global.NutriAuthConfig.API_BASE_URL)?String(global.NutriAuthConfig.API_BASE_URL).replace(/\/+$/,''):(location.origin||'');
      if(token){fetch(base+'/api/logout',{method:'POST',headers:{'Authorization':'Bearer '+token,'Accept':'application/json'}}).catch(function(){}).finally(doOut);}else{doOut();}});});}

/* ── multipart upload helper ─────────────────────────────────────── */
function uploadFile(path,file){
  var fd=new FormData();fd.append('image',file);
  var token=api()?api().getToken():'';
  var base=(global.NutriAuthConfig&&global.NutriAuthConfig.API_BASE_URL)?String(global.NutriAuthConfig.API_BASE_URL).replace(/\/+$/,''):(location.origin||'');
  return fetch(base+path,{method:'POST',headers:{'Authorization':'Bearer '+token,'Accept':'application/json'},body:fd})
    .then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error((d&&d.message)||'Upload failed');return d;});});}

/* ══════════════════════════════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════════════════════════════════ */
function loadDashboard(){
  if(!guardAdmin())return;initSidebar();
  api().get('/api/admin/stats').then(function(d){
    document.getElementById('stat-total-users').textContent=d.total_users||0;
    document.getElementById('stat-total-admins').textContent=d.total_admins||0;
    document.getElementById('stat-new-today').textContent=d.new_today||0;
  }).catch(function(){});
  api().get('/api/meals').then(function(d){document.getElementById('stat-meals').textContent=(d.meals||[]).length;}).catch(function(){});
  api().get('/api/admin/users?per_page=5').then(function(d){
    var rows=d.data||[];var tb=document.getElementById('recent-users-body');
    if(!rows.length){tb.innerHTML='<tr><td colspan="4" class="admin-table__empty">No users yet.</td></tr>';return;}
    tb.innerHTML=rows.map(function(u){return'<tr><td>'+esc(u.name)+'</td><td>'+esc(u.email)+'</td><td><span class="admin-badge admin-badge--'+esc(u.role)+'">'+esc(u.role)+'</span></td><td>'+fmt(u.created_at)+'</td></tr>';}).join('');
  }).catch(function(){});}

/* ══════════════════════════════════════════════════════════════════
   USERS
════════════════════════════════════════════════════════════════════ */
var _usersPage=1,_usersAll=[];
function loadUsers(){
  if(!guardAdmin())return;initSidebar();
  _fetchUsers(1);
  document.getElementById('user-search').addEventListener('input',_filterUsers);
  document.getElementById('user-role-filter').addEventListener('change',_filterUsers);
  _setupUserModal();}
function _fetchUsers(page){
  loading(true);
  api().get('/api/admin/users?per_page=20&page='+page).then(function(d){
    _usersAll=d.data||[];_usersPage=d.current_page||1;_renderUsers(_usersAll);_renderUserPagination(d);
  }).catch(function(e){toast(e.message||'Failed','error');}).finally(function(){loading(false);});}
function _filterUsers(){
  var q=document.getElementById('user-search').value.toLowerCase();
  var r=document.getElementById('user-role-filter').value;
  _renderUsers(_usersAll.filter(function(u){return(!q||(u.name||'').toLowerCase().includes(q)||(u.email||'').toLowerCase().includes(q))&&(!r||u.role===r);}));}
function _renderUsers(rows){
  var tb=document.getElementById('users-body');
  if(!rows.length){tb.innerHTML='<tr><td colspan="9" class="admin-table__empty">No users found.</td></tr>';return;}
  tb.innerHTML=rows.map(function(u){return(
    '<tr>'+
    '<td>'+esc(u.id)+'</td>'+
    '<td>'+esc(u.name)+'</td>'+
    '<td>'+esc(u.email)+'</td>'+
    '<td><span class="admin-badge admin-badge--'+esc(u.role)+'">'+esc(u.role)+'</span></td>'+
    '<td>'+(u.gender||'—')+'</td>'+
    '<td>'+(u.age||'—')+'</td>'+
    '<td>'+(u.goal?u.goal.replace(/_/g,' '):'—')+'</td>'+
    '<td>'+fmt(u.created_at)+'</td>'+
    '<td><div class="admin-actions">'+
      '<button class="admin-btn-edit" onclick="AdminPanel.openEditUser('+u.id+')"><span class="material-symbols-outlined" style="font-size:16px">edit</span></button>'+
      (u.role!=='admin'?'<button class="admin-btn-delete" onclick="AdminPanel.deleteUser('+u.id+')"><span class="material-symbols-outlined" style="font-size:16px">delete</span></button>':'')+
    '</div></td>'+
    '</tr>');}).join('');}
function _renderUserPagination(d){
  var el=document.getElementById('users-pagination');if(!el)return;
  var total=d.last_page||1,cur=d.current_page||1,html='';
  for(var i=1;i<=total;i++){html+='<button class="admin-page-btn'+(i===cur?' active':'')+'" onclick="AdminPanel._fetchUsers('+i+')">'+i+'</button>';}
  el.innerHTML=html;}
function _setupUserModal(){
  var modal=document.getElementById('edit-user-modal');
  document.getElementById('close-edit-user').onclick=function(){modal.style.display='none';};
  document.getElementById('cancel-edit-user').onclick=function(){modal.style.display='none';};
  document.getElementById('edit-user-form').addEventListener('submit',function(e){e.preventDefault();_saveUser();});}
function openEditUser(id){
  loading(true);
  api().get('/api/admin/users/'+id).then(function(d){
    var u=d.user;
    document.getElementById('edit-user-id').value=u.id;
    document.getElementById('edit-user-name').value=u.name||'';
    document.getElementById('edit-user-email').value=u.email||'';
    document.getElementById('edit-user-role').value=u.role||'user';
    document.getElementById('edit-user-gender').value=u.gender||'';
    document.getElementById('edit-user-age').value=u.age||'';
    document.getElementById('edit-user-goal').value=u.goal||'';
    document.getElementById('edit-user-height').value=u.height_cm||'';
    document.getElementById('edit-user-weight').value=u.weight_kg||'';
    document.getElementById('edit-user-activity').value=u.activity_level||'';
    document.getElementById('edit-user-modal').style.display='flex';
  }).catch(function(e){toast(e.message||'Error','error');}).finally(function(){loading(false);});}
function _saveUser(){
  var id=document.getElementById('edit-user-id').value;
  var payload={name:document.getElementById('edit-user-name').value,email:document.getElementById('edit-user-email').value,role:document.getElementById('edit-user-role').value,gender:document.getElementById('edit-user-gender').value||null,age:document.getElementById('edit-user-age').value||null,goal:document.getElementById('edit-user-goal').value||null,height_cm:document.getElementById('edit-user-height').value||null,weight_kg:document.getElementById('edit-user-weight').value||null,activity_level:document.getElementById('edit-user-activity').value||null};
  var err=document.getElementById('edit-user-error');err.style.display='none';
  loading(true);
  api().put('/api/admin/users/'+id,payload).then(function(){toast('User updated!','success');document.getElementById('edit-user-modal').style.display='none';_fetchUsers(_usersPage);}).catch(function(e){err.textContent=e.message||'Update failed';err.style.display='block';}).finally(function(){loading(false);});}
function deleteUser(id){
  confirm('Delete this user? This cannot be undone.',function(){
    loading(true);
    api().del('/api/admin/users/'+id).then(function(){toast('User deleted.','success');_fetchUsers(_usersPage);}).catch(function(e){toast(e.message||'Delete failed','error');}).finally(function(){loading(false);});});}

/* ══════════════════════════════════════════════════════════════════
   MEALS  (with image upload / preview / replace / delete)
════════════════════════════════════════════════════════════════════ */
var _mealsAll=[], _mealPendingFile=null, _mealImageAction='keep';

function loadMeals(){
  if(!guardAdmin())return;initSidebar();
  _fetchMeals();
  document.getElementById('add-meal-btn').onclick=function(){_openMealModal(null);};
  document.getElementById('meal-search').addEventListener('input',_filterMeals);
  document.getElementById('meal-type-filter').addEventListener('change',_filterMeals);
  document.getElementById('close-meal-modal').onclick=function(){document.getElementById('meal-modal').style.display='none';};
  document.getElementById('cancel-meal').onclick=function(){document.getElementById('meal-modal').style.display='none';};
  document.getElementById('meal-form').addEventListener('submit',function(e){e.preventDefault();_saveMeal();});
  _setupMealImageWidget();}

function _setupMealImageWidget(){
  var fileInput=document.getElementById('meal-image-file');
  var dropzone=document.getElementById('meal-img-dropzone');
  var removeBtn=document.getElementById('meal-img-remove-btn');
  if(!fileInput)return;

  fileInput.addEventListener('change',function(){
    if(this.files&&this.files[0]){_previewMealFile(this.files[0]);}});

  if(dropzone){
    dropzone.addEventListener('dragover',function(e){e.preventDefault();document.getElementById('meal-img-upload-zone').classList.add('drag-over');});
    dropzone.addEventListener('dragleave',function(){document.getElementById('meal-img-upload-zone').classList.remove('drag-over');});
    dropzone.addEventListener('drop',function(e){
      e.preventDefault();document.getElementById('meal-img-upload-zone').classList.remove('drag-over');
      var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];
      if(f&&f.type.startsWith('image/')){_previewMealFile(f);}});}

  if(removeBtn){
    removeBtn.addEventListener('click',function(){
      _mealPendingFile=null;_mealImageAction='remove';
      document.getElementById('meal-image-url').value='';
      _showMealDropzone();
      document.getElementById('meal-img-upload-note').style.display='none';});}}

function _previewMealFile(file){
  _mealPendingFile=file;_mealImageAction='upload';
  var reader=new FileReader();
  reader.onload=function(ev){_showMealPreview(ev.target.result);};
  reader.readAsDataURL(file);
  document.getElementById('meal-img-upload-note').style.display='block';}

function _showMealPreview(src){
  document.getElementById('meal-img-preview').src=src;
  document.getElementById('meal-img-preview-wrap').style.display='block';
  document.getElementById('meal-img-dropzone').style.display='none';}

function _showMealDropzone(){
  document.getElementById('meal-img-preview-wrap').style.display='none';
  document.getElementById('meal-img-dropzone').style.display='flex';
  var fi=document.getElementById('meal-image-file');if(fi)fi.value='';}

function _fetchMeals(){
  loading(true);
  api().get('/api/meals').then(function(d){_mealsAll=d.meals||[];_renderMeals(_mealsAll);}).catch(function(e){toast(e.message||'Failed','error');}).finally(function(){loading(false);});}

function _filterMeals(){
  var q=document.getElementById('meal-search').value.toLowerCase();
  var t=document.getElementById('meal-type-filter').value;
  _renderMeals(_mealsAll.filter(function(m){return(!q||(m.name||'').toLowerCase().includes(q))&&(!t||m.meal_type===t);}));}

function _renderMeals(meals){
  var g=document.getElementById('meals-grid');
  if(!meals.length){g.innerHTML='<div class="admin-table__empty">No meals found.</div>';return;}
  g.innerHTML=meals.map(function(m){return(
    '<div class="admin-meal-card">'+
    (m.image_url?'<img class="admin-meal-card__img" src="'+esc(m.image_url)+'" alt="'+esc(m.name)+'" onerror="this.style.display=\'none\'">'
      :'<div class="admin-meal-card__img-placeholder"><span class="material-symbols-outlined">restaurant</span></div>')+
    '<div class="admin-meal-card__body">'+
    '<div class="admin-meal-card__name">'+esc(m.name)+'</div>'+
    '<div style="margin-bottom:8px"><span class="admin-badge admin-badge--'+esc(m.meal_type)+'">'+esc(m.meal_type)+'</span></div>'+
    '<div class="admin-meal-card__macros">'+
      '<div>🔥 <span>'+Math.round(m.calories)+'</span> kcal</div>'+
      '<div>P: <span>'+(m.protein_g||0)+'g</span></div>'+
      '<div>C: <span>'+(m.carbs_g||0)+'g</span></div>'+
      '<div>F: <span>'+(m.fat_g||0)+'g</span></div>'+
    '</div>'+
    '<div class="admin-meal-card__actions">'+
      '<button class="admin-btn-edit" onclick="AdminPanel.openEditMeal('+m.id+')"><span class="material-symbols-outlined" style="font-size:16px">edit</span> Edit</button>'+
      '<button class="admin-btn-delete" onclick="AdminPanel.deleteMeal('+m.id+')"><span class="material-symbols-outlined" style="font-size:16px">delete</span> Delete</button>'+
    '</div></div></div>');}).join('');}

function _openMealModal(m){
  _mealPendingFile=null;_mealImageAction='keep';
  document.getElementById('meal-modal-title').textContent=m?'Edit Meal':'Add Meal';
  document.getElementById('meal-id').value=m?m.id:'';
  document.getElementById('meal-name').value=m?m.name:'';
  document.getElementById('meal-description').value=m?m.description||'':'';
  document.getElementById('meal-type').value=m?m.meal_type:'';
  document.getElementById('meal-calories').value=m?m.calories:'';
  document.getElementById('meal-protein').value=m?m.protein_g||'':'';
  document.getElementById('meal-carbs').value=m?m.carbs_g||'':'';
  document.getElementById('meal-fat').value=m?m.fat_g||'':'';
  document.getElementById('meal-image-url').value=m?m.image_url||'':'';
  document.getElementById('meal-img-upload-note').style.display='none';
  if(m&&m.image_url){_showMealPreview(m.image_url);}else{_showMealDropzone();}
  document.getElementById('meal-form-error').style.display='none';
  document.getElementById('meal-modal').style.display='flex';}

function openEditMeal(id){var m=_mealsAll.find(function(x){return x.id===id;});if(m)_openMealModal(m);}

function _saveMeal(){
  var id=document.getElementById('meal-id').value;
  var payload={name:document.getElementById('meal-name').value,description:document.getElementById('meal-description').value||null,meal_type:document.getElementById('meal-type').value,calories:Number(document.getElementById('meal-calories').value),protein_g:Number(document.getElementById('meal-protein').value)||null,carbs_g:Number(document.getElementById('meal-carbs').value)||null,fat_g:Number(document.getElementById('meal-fat').value)||null};
  if(_mealImageAction==='keep'){payload.image_url=document.getElementById('meal-image-url').value||null;}
  if(_mealImageAction==='remove'){payload.image_url=null;}
  var err=document.getElementById('meal-form-error');err.style.display='none';
  loading(true);
  var req=id?api().put('/api/admin/meals/'+id,payload):api().post('/api/admin/meals',payload);
  req.then(function(d){
    var savedId=(d.meal&&d.meal.id)?d.meal.id:id;
    var afterSave=function(){toast(id?'Meal updated!':'Meal created!','success');document.getElementById('meal-modal').style.display='none';_fetchMeals();loading(false);};
    if(_mealPendingFile&&savedId){
      uploadFile('/api/admin/meals/'+savedId+'/image',_mealPendingFile).then(afterSave).catch(function(e){toast('Meal saved but image upload failed: '+e.message,'error');_fetchMeals();loading(false);});
    } else if(_mealImageAction==='remove'&&id){
      api().del('/api/admin/meals/'+id+'/image').then(afterSave).catch(afterSave);
    } else {afterSave();}
  }).catch(function(e){err.textContent=e.message||'Save failed';err.style.display='block';loading(false);});}

function deleteMeal(id){
  confirm('Delete this meal? This cannot be undone.',function(){
    loading(true);
    api().del('/api/admin/meals/'+id).then(function(){toast('Meal deleted.','success');_fetchMeals();}).catch(function(e){toast(e.message||'Error','error');}).finally(function(){loading(false);});});}

/* ══════════════════════════════════════════════════════════════════
   EXERCISES
════════════════════════════════════════════════════════════════════ */
var _exAll=[], _exPage=1;
function loadExercises(){
  if(!guardAdmin())return;initSidebar();
  _fetchExercises(1);
  document.getElementById('add-exercise-btn').onclick=function(){_openExModal(null);};
  document.getElementById('exercise-search').addEventListener('input',_filterEx);
  document.getElementById('exercise-diff-filter').addEventListener('change',_filterEx);
  document.getElementById('close-exercise-modal').onclick=function(){document.getElementById('exercise-modal').style.display='none';};
  document.getElementById('cancel-exercise').onclick=function(){document.getElementById('exercise-modal').style.display='none';};
  document.getElementById('exercise-form').addEventListener('submit',function(e){e.preventDefault();_saveEx();});}

function _fetchExercises(page){
  loading(true);
  api().get('/api/exercises?page='+(page||1)+'&per_page=20').then(function(d){
    _exAll=d.exercises||d.data||[];_exPage=page||1;_renderEx(_exAll);
  }).catch(function(e){toast(e.message||'Failed','error');}).finally(function(){loading(false);});}

function _filterEx(){
  var q=document.getElementById('exercise-search').value.toLowerCase();
  var diff=document.getElementById('exercise-diff-filter').value;
  _renderEx(_exAll.filter(function(x){return(!q||(x.name||'').toLowerCase().includes(q))&&(!diff||x.difficulty===diff);}));}

function _renderEx(list){
  var tb=document.getElementById('exercises-body');
  if(!list.length){tb.innerHTML='<tr><td colspan="6" class="admin-table__empty">No exercises found.</td></tr>';return;}
  tb.innerHTML=list.map(function(x){return(
    '<tr>'+
    '<td>'+esc(x.name)+'</td>'+
    '<td>'+(x.muscle_group||'—')+'</td>'+
    '<td>'+(x.duration_minutes||'—')+' min</td>'+
    '<td>'+(x.calories_burned||0)+' kcal</td>'+
    '<td><span class="admin-badge admin-badge--'+esc(x.difficulty||'easy')+'">'+esc(x.difficulty||'easy')+'</span></td>'+
    '<td><div class="admin-actions">'+
      '<button class="admin-btn-edit" onclick="AdminPanel.openEditEx('+x.id+')"><span class="material-symbols-outlined" style="font-size:16px">edit</span></button>'+
      '<button class="admin-btn-delete" onclick="AdminPanel.deleteEx('+x.id+')"><span class="material-symbols-outlined" style="font-size:16px">delete</span></button>'+
    '</div></td>'+
    '</tr>');}).join('');}

function _openExModal(x){
  document.getElementById('exercise-modal-title').textContent=x?'Edit Exercise':'Add Exercise';
  document.getElementById('exercise-id').value=x?x.id:'';
  document.getElementById('exercise-name').value=x?x.name:'';
  document.getElementById('exercise-description').value=x?x.description||'':'';
  document.getElementById('exercise-difficulty').value=x?x.difficulty:'';
  document.getElementById('exercise-muscle').value=x?x.muscle_group||'':'';
  document.getElementById('exercise-duration').value=x?x.duration_minutes:'';
  document.getElementById('exercise-calories').value=x?x.calories_burned:'';
  document.getElementById('exercise-form-error').style.display='none';
  document.getElementById('exercise-modal').style.display='flex';}

function openEditEx(id){var x=_exAll.find(function(e){return e.id===id;});if(x)_openExModal(x);}

function _saveEx(){
  var id=document.getElementById('exercise-id').value;
  var payload={name:document.getElementById('exercise-name').value,description:document.getElementById('exercise-description').value||null,difficulty:document.getElementById('exercise-difficulty').value,muscle_group:document.getElementById('exercise-muscle').value||null,duration_minutes:Number(document.getElementById('exercise-duration').value),calories_burned:Number(document.getElementById('exercise-calories').value)};
  var err=document.getElementById('exercise-form-error');err.style.display='none';
  loading(true);
  var req=id?api().put('/api/admin/exercises/'+id,payload):api().post('/api/admin/exercises',payload);
  req.then(function(){toast(id?'Exercise updated!':'Exercise created!','success');document.getElementById('exercise-modal').style.display='none';_fetchExercises(_exPage);}).catch(function(e){err.textContent=e.message||'Save failed';err.style.display='block';}).finally(function(){loading(false);});}

function deleteEx(id){
  confirm('Delete this exercise?',function(){
    loading(true);
    api().del('/api/admin/exercises/'+id).then(function(){toast('Deleted.','success');_fetchExercises(_exPage);}).catch(function(e){toast(e.message||'Error','error');}).finally(function(){loading(false);});});}

/* ══════════════════════════════════════════════════════════════════
   ADVICE
════════════════════════════════════════════════════════════════════ */
var _adviceAll=[];
function loadAdvice(){
  if(!guardAdmin())return;initSidebar();
  _fetchAdvice();
  document.getElementById('add-advice-btn').onclick=function(){_openAdviceModal(null);};
  document.getElementById('advice-search').addEventListener('input',_filterAdvice);
  document.getElementById('advice-category-filter').addEventListener('change',_filterAdvice);
  document.getElementById('close-advice-modal').onclick=function(){document.getElementById('advice-modal').style.display='none';};
  document.getElementById('cancel-advice').onclick=function(){document.getElementById('advice-modal').style.display='none';};
  document.getElementById('advice-form').addEventListener('submit',function(e){e.preventDefault();_saveAdvice();});}

function _fetchAdvice(){
  loading(true);
  api().get('/api/advice').then(function(d){_adviceAll=d.advice||d.data||[];_renderAdvice(_adviceAll);}).catch(function(e){toast(e.message||'Failed','error');}).finally(function(){loading(false);});}

function _filterAdvice(){
  var q=document.getElementById('advice-search').value.toLowerCase();
  var cat=document.getElementById('advice-category-filter').value;
  _renderAdvice(_adviceAll.filter(function(a){return(!q||(a.title||'').toLowerCase().includes(q)||(a.content||'').toLowerCase().includes(q))&&(!cat||a.category===cat);}));}

function _renderAdvice(list){
  var g=document.getElementById('advice-grid');
  if(!list.length){g.innerHTML='<div class="admin-table__empty">No advice articles found.</div>';return;}
  g.innerHTML=list.map(function(a){return(
    '<div class="admin-advice-card">'+
    '<div class="admin-advice-card__meta">'+
      (a.category?'<span class="admin-badge admin-badge--user">'+esc(a.category)+'</span>':'')+
      '<span style="font-size:.78rem;color:var(--admin-text-muted)">'+fmt(a.created_at)+'</span>'+
    '</div>'+
    '<div class="admin-advice-card__title">'+esc(a.title)+'</div>'+
    '<div class="admin-advice-card__content">'+esc(a.content)+'</div>'+
    '<div class="admin-advice-card__actions">'+
      '<button class="admin-btn-edit" onclick="AdminPanel.openEditAdvice('+a.id+')"><span class="material-symbols-outlined" style="font-size:16px">edit</span> Edit</button>'+
      '<button class="admin-btn-delete" onclick="AdminPanel.deleteAdvice('+a.id+')"><span class="material-symbols-outlined" style="font-size:16px">delete</span> Delete</button>'+
    '</div></div>');}).join('');}

function _openAdviceModal(a){
  document.getElementById('advice-modal-title').textContent=a?'Edit Article':'New Health Article';
  document.getElementById('advice-id').value=a?a.id:'';
  document.getElementById('advice-title').value=a?a.title:'';
  document.getElementById('advice-category').value=a?a.category||'':'';
  document.getElementById('advice-content').value=a?a.content:'';
  document.getElementById('advice-form-error').style.display='none';
  document.getElementById('advice-modal').style.display='flex';}

function openEditAdvice(id){var a=_adviceAll.find(function(x){return x.id===id;});if(a)_openAdviceModal(a);}

function _saveAdvice(){
  var id=document.getElementById('advice-id').value;
  var payload={title:document.getElementById('advice-title').value,category:document.getElementById('advice-category').value||null,content:document.getElementById('advice-content').value};
  var err=document.getElementById('advice-form-error');err.style.display='none';
  loading(true);
  var req=id?api().put('/api/admin/advice/'+id,payload):api().post('/api/admin/advice',payload);
  req.then(function(){toast(id?'Article updated!':'Article published!','success');document.getElementById('advice-modal').style.display='none';_fetchAdvice();}).catch(function(e){err.textContent=e.message||'Save failed';err.style.display='block';}).finally(function(){loading(false);});}

function deleteAdvice(id){
  confirm('Delete this article?',function(){
    loading(true);
    api().del('/api/admin/advice/'+id).then(function(){toast('Deleted.','success');_fetchAdvice();}).catch(function(e){toast(e.message||'Error','error');}).finally(function(){loading(false);});});}

/* ══════════════════════════════════════════════════════════════════
   REPORTS
════════════════════════════════════════════════════════════════════ */
var _progressAll=[],_feedbackAll=[],_progChart=null;
function loadReports(){
  if(!guardAdmin())return;initSidebar();
  _fetchProgress();_fetchFeedback();
  document.querySelectorAll('.admin-tab').forEach(function(btn){
    btn.addEventListener('click',function(){
      document.querySelectorAll('.admin-tab').forEach(function(b){b.classList.remove('active');});
      document.querySelectorAll('.admin-report-section').forEach(function(s){s.style.display='none';});
      btn.classList.add('active');
      var sec=document.getElementById('section-'+btn.getAttribute('data-tab'));
      if(sec)sec.style.display='block';});});
  var pf=document.getElementById('progress-user-filter');
  if(pf)pf.addEventListener('change',function(){
    var uid=this.value;
    if(uid){
      loading(true);
      api().get('/api/admin/reports/progress/'+uid).then(function(d){
        var logs=d.progress_logs||[];_renderProgressTable(logs);_renderProgressChart(logs,d.user?d.user.name:'User');
      }).catch(function(e){toast(e.message||'Error','error');}).finally(function(){loading(false);});
    } else {_renderProgressTable(_progressAll);_renderProgressChart(_progressAll,'All Users');}});
  var fs=document.getElementById('feedback-search');
  if(fs)fs.addEventListener('input',function(){
    var q=this.value.toLowerCase();
    _renderFeedbackTable(_feedbackAll.filter(function(f){return(f.user&&(f.user.name||'').toLowerCase().includes(q))||(f.comment||'').toLowerCase().includes(q);}));});}

function _fetchProgress(){
  loading(true);
  api().get('/api/admin/reports/progress?per_page=50').then(function(d){
    _progressAll=d.data||[];_renderProgressTable(_progressAll);_renderProgressChart(_progressAll,'All Users');_populateUserFilter(_progressAll);
  }).catch(function(e){toast(e.message||'Failed to load reports','error');}).finally(function(){loading(false);});}

function _populateUserFilter(logs){
  var sel=document.getElementById('progress-user-filter');var seen={};
  logs.forEach(function(l){if(l.user&&!seen[l.user.id]){seen[l.user.id]=1;var o=document.createElement('option');o.value=l.user.id;o.textContent=l.user.name+' ('+l.user.email+')';sel.appendChild(o);}});}

function _renderProgressTable(logs){
  var tb=document.getElementById('progress-body');
  if(!logs.length){tb.innerHTML='<tr><td colspan="5" class="admin-table__empty">No progress logs.</td></tr>';return;}
  tb.innerHTML=logs.map(function(l){return(
    '<tr>'+
    '<td>'+(l.user?esc(l.user.name):'—')+'</td>'+
    '<td>'+(l.user?esc(l.user.email):'—')+'</td>'+
    '<td>'+(l.weight_kg||'—')+' kg</td>'+
    '<td>'+fmt(l.logged_at||l.created_at)+'</td>'+
    '<td>'+(l.notes?esc(l.notes):'—')+'</td>'+
    '</tr>');}).join('');}

function _renderProgressChart(logs,label){
  var canvas=document.getElementById('progress-chart');if(!canvas)return;
  var sorted=logs.slice().sort(function(a,b){return new Date(a.logged_at||a.created_at)-new Date(b.logged_at||b.created_at);});
  var labels=sorted.map(function(l){return fmt(l.logged_at||l.created_at);});
  var data=sorted.map(function(l){return l.weight_kg;});
  if(_progChart){_progChart.destroy();}
  _progChart=new Chart(canvas,{type:'line',data:{labels:labels,datasets:[{label:label+' — Weight (kg)',data:data,borderColor:'#6c63ff',backgroundColor:'rgba(108,99,255,.12)',tension:.4,pointBackgroundColor:'#6c63ff',fill:true}]},options:{responsive:true,plugins:{legend:{labels:{color:'#e8eaf0'}}},scales:{x:{ticks:{color:'#8b92a8'},grid:{color:'rgba(255,255,255,.06)'}},y:{ticks:{color:'#8b92a8'},grid:{color:'rgba(255,255,255,.06)'}}}}});}

function _fetchFeedback(){
  api().get('/api/admin/feedback?per_page=50').then(function(d){_feedbackAll=d.data||[];_renderFeedbackTable(_feedbackAll);}).catch(function(){});}

function _stars(n){var s='';for(var i=1;i<=5;i++)s+=(i<=n?'★':'☆');return'<span class="admin-stars">'+s+'</span>';}

function _renderFeedbackTable(list){
  var tb=document.getElementById('feedback-body');
  if(!list.length){tb.innerHTML='<tr><td colspan="5" class="admin-table__empty">No feedback yet.</td></tr>';return;}
  tb.innerHTML=list.map(function(f){return(
    '<tr>'+
    '<td>'+(f.user?esc(f.user.name):'—')+'</td>'+
    '<td>'+(f.exercise?esc(f.exercise.name):'General')+'</td>'+
    '<td>'+_stars(f.rating)+'</td>'+
    '<td>'+(f.comment?esc(f.comment):'—')+'</td>'+
    '<td>'+fmt(f.created_at)+'</td>'+
    '</tr>');}).join('');}

/* ══════════════════════════════════════════════════════════════════
   EXPORTS
════════════════════════════════════════════════════════════════════ */
function init(){}

global.AdminPanel={
  init:init,
  loadDashboard:loadDashboard,
  loadUsers:loadUsers,
  loadMeals:loadMeals,
  loadExercises:loadExercises,
  loadAdvice:loadAdvice,
  loadReports:loadReports,
  openEditUser:openEditUser,
  deleteUser:deleteUser,
  openEditMeal:openEditMeal,
  deleteMeal:deleteMeal,
  openEditEx:openEditEx,
  deleteEx:deleteEx,
  openEditAdvice:openEditAdvice,
  deleteAdvice:deleteAdvice,
  _fetchUsers:_fetchUsers,
};
})(window);
