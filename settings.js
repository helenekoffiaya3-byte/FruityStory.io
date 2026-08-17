const STORAGE_KEY = 'fruitystory-settings-v2';

const defaults = {
  accountPrivate: false, activityStatus: true, profileViews: false, postViews: true,
  downloads: true, comments: true, mentions: true, directMessages: 'friends',
  duet: true, stitch: true, reuse: true, reposts: true, stories: 'friends',
  sensitiveContent: 'standard', personalizedAds: true, pushNotifications: true,
  language: 'fr', theme: 'system', dataSaver: false, autoplay: true,
  location: false, contacts: false, screenTimeLimit: 0, filteredKeywords: '',
  saveSearchHistory: true
};

let state = {...defaults, ...(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'))};
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

const definitions = {
  'Compte': [
    ['Informations du compte','profile','Nom, pseudo, e-mail et date de création.'],
    ['Gestion du compte','account','Type de compte, désactivation et suppression.'],
    ['Type de compte','select','Compte personnel / créateur / professionnel.','accountType',['Personnel','Créateur','Professionnel']],
    ['Langue','select','Langue de l’application.','language',['Français','English']],
    ['Télécharger tes données','action','Prépare une exportation locale de tes préférences et activités disponibles.','export'],
    ['Supprimer le compte','danger','Supprime les données locales de l’application sur cet appareil.','deleteLocal']
  ],
  'Confidentialité': [
    ['Compte privé','toggle','Seuls les abonnés approuvés peuvent voir le contenu.','accountPrivate'],
    ['Statut d’activité','toggle','Autoriser les contacts à voir quand tu es actif.','activityStatus'],
    ['Vues du profil','toggle','Autoriser l’historique des visites de profil.','profileViews'],
    ['Vues des publications','toggle','Afficher les vues de tes publications.','postViews'],
    ['Téléchargements','toggle','Autoriser le téléchargement des vidéos publiées.','downloads'],
    ['Localisation','toggle','Utiliser la localisation pour les fonctions qui la demandent.','location'],
    ['Contacts et synchronisation','toggle','Autoriser la recherche d’amis depuis les contacts.','contacts'],
    ['Comptes bloqués','list','Gérer les comptes bloqués et débloquer un compte.'],
    ['Mots-clés filtrés','text','Masquer les commentaires contenant certains mots.','filteredKeywords'],
    ['Contenu sensible','select','Niveau de filtrage du contenu recommandé.','sensitiveContent',['Standard','Renforcé']]
  ],
  'Publications': [
    ['Visibilité par défaut','select','Qui peut voir tes nouvelles publications.','postVisibility',['Tout le monde','Amis','Privé']],
    ['Commentaires','toggle','Autoriser les commentaires sur tes publications.','comments'],
    ['Mentions','toggle','Autoriser les mentions dans les publications et commentaires.','mentions'],
    ['Duet / collaboration','toggle','Autoriser la création de collaborations à partir de tes vidéos.','duet'],
    ['Stitch / remix','toggle','Autoriser l’utilisation de segments de tes vidéos.','stitch'],
    ['Réutilisation du contenu','toggle','Autoriser les réutilisations compatibles.','reuse'],
    ['Reposts','toggle','Autoriser les reposts de tes publications.','reposts'],
    ['Playlists / séries','list','Créer, modifier et réordonner tes playlists.'],
    ['Brouillons','list','Accéder aux brouillons enregistrés sur cet appareil.'],
    ['Publications supprimées','list','Consulter les éléments supprimés récemment.']
  ],
  'Notifications': [
    ['Notifications push','toggle','Activer les notifications de l’application.','pushNotifications'],
    ['Mentions et tags','toggle','Recevoir les alertes de mentions.','mentions'],
    ['Commentaires et réponses','toggle','Recevoir les réponses et interactions.','comments'],
    ['Nouveaux abonnés','toggle','Recevoir les alertes de nouveaux abonnés.','pushNotifications'],
    ['Messages directs','select','Qui peut t’envoyer un message direct.','directMessages',['Tout le monde','Amis','Personne']],
    ['Activité et filtres','list','Filtrer les notifications par type et période.']
  ],
  'Sécurité': [
    ['Protection du compte','security','Contrôles de sécurité et vérification des sessions.'],
    ['Appareils et sessions','list','Voir et révoquer les sessions enregistrées localement.'],
    ['Authentification à deux facteurs','security','Configurer une méthode 2FA lorsque l’authentification serveur est disponible.'],
    ['Récupération du compte','security','Vérifier les options de récupération du compte.'],
    ['Vérification du compte','security','État de vérification et sécurité du profil.']
  ],
  'Contenu et affichage': [
    ['Préférences de contenu','content','Choisir les sujets et ajuster les recommandations.'],
    ['Actualiser le fil','action','Réinitialise les préférences locales de recommandation.','resetFeed'],
    ['Lecture automatique','toggle','Lire automatiquement les vidéos dans le flux.','autoplay'],
    ['Économiseur de données','toggle','Réduire les données utilisées pour la lecture vidéo.','dataSaver'],
    ['Afficher','select','Choisir le thème de l’application.','theme',['Système','Clair','Sombre']],
    ['Langue','select','Choisir la langue de l’interface.','language',['Français','English']],
    ['Accessibilité','access','Taille du texte, contraste, animations et lecture.'],
    ['Musique et sons','list','Gérer les sons enregistrés et les préférences audio.']
  ],
  'Temps d’écran et bien-être': [
    ['Tableau de temps d’écran','wellbeing','Voir le temps quotidien et hebdomadaire sur cet appareil.'],
    ['Limite quotidienne','number','Définir une limite locale en minutes.','screenTimeLimit'],
    ['Rappels de pause','toggle','Afficher un rappel après une longue session.','pushNotifications'],
    ['Mode repos','wellbeing','Configurer une plage sans notifications.']
  ],
  'Publicités et données': [
    ['Publicités personnalisées','toggle','Autoriser la personnalisation publicitaire.','personalizedAds'],
    ['Gestion des données','data','Consulter les données et permissions utilisées par FruityStory.'],
    ['Historique de recherche','toggle','Conserver l’historique de recherche local.','saveSearchHistory'],
    ['Effacer le cache','action','Effacer les préférences temporaires de l’interface.','clearCache']
  ],
  'Aide et informations': [
    ['Centre d’aide','info','Guides et dépannage de FruityStory.io.'],
    ['Centre de confidentialité','info','Résumé des contrôles de confidentialité.'],
    ['Signaler un problème','report','Préparer un rapport avec les informations non sensibles de cette page.'],
    ['Conditions et politiques','info','Conditions d’utilisation et politique de confidentialité.']
  ]
};

function displayValue(key) {
  const v = state[key];
  if (typeof v === 'boolean') return v ? 'Activé' : 'Désactivé';
  if (key === 'directMessages') return ({friends:'Amis', all:'Tout le monde', none:'Personne'})[v] || v;
  if (key === 'language') return v === 'fr' ? 'Français' : 'English';
  if (key === 'theme') return ({system:'Système',light:'Clair',dark:'Sombre'})[v] || v;
  return String(v || 'Configurer');
}

function openPanel(item) {
  const [title,type,description,key,options] = item;
  const panel = document.getElementById('panel');
  let control = '';
  if (type === 'toggle') control = `<label class="switch"><input id="control" type="checkbox" ${state[key]?'checked':''}><span></span></label>`;
  if (type === 'select') control = `<select id="control">${options.map(o=>`<option>${o}</option>`).join('')}</select>`;
  if (type === 'text') control = `<textarea id="control" rows="4" placeholder="mot1, mot2, mot3">${state[key]||''}</textarea>`;
  if (type === 'number') control = `<input id="control" type="number" min="0" max="1440" value="${state[key]||0}">`;
  if (!control && ['action','profile','account','list','security','content','wellbeing','access','data','info','report','danger'].includes(type)) control = `<button id="control" class="panel-action">${type==='danger'?'Supprimer les données locales':'Ouvrir'}</button>`;
  panel.innerHTML = `<div class="sheet"><button class="close" aria-label="Fermer">×</button><div class="eyebrow">PARAMÈTRE</div><h2>${title}</h2><p>${description}</p><div class="panel-control">${control}</div><div class="panel-actions"><button class="btn secondary" id="cancel">Annuler</button><button class="btn primary" id="saveBtn">Enregistrer</button></div></div>`;
  panel.classList.add('open');

  const close = () => panel.classList.remove('open');
  panel.querySelector('.close').onclick = close;
  panel.querySelector('#cancel').onclick = close;
  const c = panel.querySelector('#control');
  if (type === 'select' && c) {
    const current = displayValue(key);
    [...c.options].forEach(o=>{ if(o.textContent===current) o.selected=true; });
  }
  panel.querySelector('#saveBtn').onclick = () => {
    if (type === 'toggle') state[key] = c.checked;
    else if (type === 'text') state[key] = c.value;
    else if (type === 'number') state[key] = Number(c.value)||0;
    else if (type === 'select') {
      const val=c.value;
      if(key==='language') state[key]=val==='Français'?'fr':'en';
      else if(key==='theme') state[key]=({'Système':'system','Clair':'light','Sombre':'dark'})[val];
      else if(key==='directMessages') state[key]=({'Amis':'friends','Tout le monde':'all','Personne':'none'})[val];
      else if(key==='sensitiveContent') state[key]=val==='Renforcé'?'strict':'standard';
      else if(key==='postVisibility') state[key]=val;
    }
    save(); applyTheme(); render(); close();
  };
  if (type === 'danger') panel.querySelector('.panel-action').onclick=()=>{localStorage.clear();state={...defaults};save();render();close();};
  if (key === 'resetFeed') panel.querySelector('.panel-action').onclick=()=>{localStorage.removeItem('fruitystory-feed-preferences');alert('Préférences du fil réinitialisées.');close();};
  if (key === 'clearCache') panel.querySelector('.panel-action').onclick=()=>{sessionStorage.clear();alert('Cache local de session effacé.');close();};
  if (key === 'export') panel.querySelector('.panel-action').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='fruitystory-settings.json';a.click();URL.revokeObjectURL(a.href);close();};
}

function render() {
  const root=document.getElementById('settingsGrid');
  root.innerHTML='';
  Object.entries(definitions).forEach(([section,items])=>{
    const card=document.createElement('section'); card.className='settings-card';
    card.innerHTML=`<h2>${section}</h2><div class="rows"></div>`;
    const rows=card.querySelector('.rows');
    items.forEach(item=>{
      const row=document.createElement('button'); row.className='setting-row';
      const [title,type,,key]=item;
      const val=key?displayValue(key):'';
      row.innerHTML=`<span class="setting-icon">${({toggle:'●',select:'▾',list:'☷',security:'◆',content:'◉',wellbeing:'◷',access:'A',data:'◌',danger:'!',report:'!',info:'i',action:'↗',profile:'●',account:'⚙',number:'#',text:'⌘'})[type]||'›'}</span><span class="setting-main"><strong>${title}</strong><small>${item[2]}</small></span><span class="setting-value">${val}</span><span class="chevron">›</span>`;
      row.onclick=()=>openPanel(item); rows.appendChild(row);
    });
    root.appendChild(card);
  });
}

function applyTheme(){document.documentElement.dataset.theme=state.theme;}

document.addEventListener('DOMContentLoaded',()=>{render();applyTheme();document.getElementById('searchSettings').addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('.setting-row').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(q));});document.getElementById('panel').addEventListener('click',e=>{if(e.target.id==='panel')e.currentTarget.classList.remove('open');});});
