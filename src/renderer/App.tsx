import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { LayoutDashboard, FolderGit2, GitBranch, Github, Terminal, BookOpen, Wrench, Settings,
  RefreshCw, Plus, ArrowRight, FolderOpen, Star, Trash2, Link2, Code2, Save, Activity,
  CheckCircle2, AlertCircle, DownloadCloud, Search, ShieldCheck, X, Clock3, Cloud, Copy } from 'lucide-react'
import type { Project,RemoteRepo,GithubStatus,GitDetails,Command,RunResult,Resource,ToolInfo } from '../shared/types'

type Page='home'|'projects'|'git'|'github'|'commands'|'library'|'tools'|'settings'
const nav=[
  {id:'home' as const,name:'Dashboard',icon:LayoutDashboard},
  {id:'projects' as const,name:'Proyectos',icon:FolderGit2},
  {id:'git' as const,name:'Git local',icon:GitBranch},
  {id:'github' as const,name:'GitHub',icon:Github},
  {id:'commands' as const,name:'Comandos',icon:Terminal},
  {id:'library' as const,name:'Biblioteca',icon:BookOpen},
  {id:'tools' as const,name:'Herramientas',icon:Wrench},
  {id:'settings' as const,name:'Ajustes',icon:Settings}
]
const titles:Record<Page,string>={home:'Dashboard',projects:'Mis proyectos',git:'Git local',github:'GitHub',commands:'Centro de comandos',library:'Biblioteca',tools:'Herramientas',settings:'Ajustes'}
const emptyResource:{title:string;kind:Resource['kind'];category:string;content:string;id?:string}={title:'',kind:'note',category:'General',content:''}
function describe(err:unknown):string{return err instanceof Error?err.message.replace(/^Error invoking remote method '[^']+': Error: /,''):String(err)}
function shortDate(date:string|null):string{if(!date)return'Sin abrir';const d=new Date(date);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'short'}).format(d)}

export default function App(){
  const[page,setPage]=useState<Page>('home')
  const[projects,setProjects]=useState<Project[]>([])
  const[busy,setBusy]=useState(false)
  const[notice,setNotice]=useState<{text:string;error:boolean}|null>(null)
  const[filter,setFilter]=useState('')
  const[editor,setEditor]=useState('system')
  const[github,setGithub]=useState<GithubStatus|null>(null)
  const[remote,setRemote]=useState<RemoteRepo[]>([])
  const[gitId,setGitId]=useState('')
  const[gitInfo,setGitInfo]=useState<GitDetails|null>(null)
  const[commitMessage,setCommitMessage]=useState('')
  const[commands,setCommands]=useState<Command[]>([])
  const[commandId,setCommandId]=useState('git-status')
  const[commandOutput,setCommandOutput]=useState<RunResult|null>(null)
  const[cmdAdd,setCmdAdd]=useState(false)
  const[cmdForm,setCmdForm]=useState({name:'',executable:'',args:'',category:'Personalizado'})
  const[resources,setResources]=useState<Resource[]>([])
  const[resourceForm,setResourceForm]=useState({...emptyResource})
  const[resourceOpen,setResourceOpen]=useState(false)
  const[resourceSelected,setResourceSelected]=useState<Resource|null>(null)
  const[tools,setTools]=useState<ToolInfo[]>([])
  const[toolsLoaded,setToolsLoaded]=useState(false)
  const[loading,setLoading]=useState(true)

  async function refreshProjects(){setProjects(await window.devdock.projects())}
  async function refreshCommands(){setCommands(await window.devdock.commands())}
  async function refreshResources(){setResources(await window.devdock.resources())}
  useEffect(()=>{
    let alive=true
    void Promise.all([window.devdock.projects(),window.devdock.editor(),window.devdock.commands(),window.devdock.resources()])
      .then(([p,e,c,r])=>{if(alive){setProjects(p);setEditor(e);setCommands(c);setResources(r)}})
      .catch(e=>{if(alive)setNotice({text:describe(e),error:true})})
      .finally(()=>{if(alive)setLoading(false)})
    return()=>{alive=false}
  },[])

  async function action(work:()=>Promise<void>,success?:string):Promise<boolean>{
    if(busy)return false
    setBusy(true);setNotice(null)
    try{await work();if(success)setNotice({text:success,error:false});return true}
    catch(e){setNotice({text:describe(e),error:true});return false}
    finally{setBusy(false)}
  }
  async function addProject(){
    await action(async()=>{const p=await window.devdock.addProject();if(p){await refreshProjects();setNotice({text:'Proyecto añadido: '+p.name,error:false})}})
  }
  async function openProject(id:string,inEditor:boolean){
    await action(async()=>{await window.devdock.openProject(id,inEditor);await refreshProjects()})
  }
  async function favorite(p:Project){await action(async()=>{await window.devdock.updateProject(p.id,{favorite:!p.favorite});await refreshProjects()})}
  async function remove(p:Project){
    if(!window.confirm('¿Quitar '+p.name+' del catálogo? No se borrarán sus archivos.'))return
    await action(async()=>{await window.devdock.removeProject(p.id);await refreshProjects()},'Proyecto quitado del catálogo')
  }
  async function changeCategory(p:Project){
    const category=window.prompt('Categoría del proyecto',p.category)
    if(category!==null&&category.trim())await action(async()=>{await window.devdock.updateProject(p.id,{category});await refreshProjects()})
  }
  async function loadGitHub(){
    await action(async()=>{
      const status=await window.devdock.githubStatus();setGithub(status)
      if(status.connected)setRemote(await window.devdock.githubRepos());else setRemote([])
    })
  }
  async function cloneRepo(r:RemoteRepo){
    await action(async()=>{const p=await window.devdock.githubClone(r.nameWithOwner)
      if(p){await refreshProjects();setNotice({text:'Repositorio clonado: '+p.name,error:false})}})
  }
  async function loadGit(){
    if(!gitId){setGitInfo(null);return}
    await action(async()=>{setGitInfo(await window.devdock.gitDetails(gitId))})
  }
  async function runGit(op:'fetch'|'pull'|'push'|'stage'|'commit'){
    if(!gitId)return
    if(!window.confirm(op==='stage'?'Añadir TODOS los archivos modificados al staging de Git?':
      '¿Ejecutar git '+op+' en el repositorio seleccionado?'))return
    await action(async()=>{
      const r=await window.devdock.gitAction(gitId,op,op==='commit'?commitMessage:undefined)
      setCommandOutput(r)
      if(r.exitCode!==0)throw new Error(r.stderr||r.stdout||'Comando fallido')
      await refreshProjects();setGitInfo(await window.devdock.gitDetails(gitId))
      if(op==='commit')setCommitMessage('')
    },'Operación Git completada')
  }
  async function runCommand(){
    const c=commands.find(x=>x.id===commandId)
    if(!c||!gitId)return
    if(c.dangerous&&!window.confirm('Ejecutar '+c.name+'? Esta acción puede modificar archivos.'))return
    await action(async()=>{
      const r=await window.devdock.runCommand(gitId,c.id);setCommandOutput(r)
      if(r.exitCode!==0)throw new Error(r.stderr||'Comando terminado con error')
    },'Comando ejecutado')
  }
  async function addCommand(e:FormEvent){
    e.preventDefault()
    const ok=await action(async()=>{await window.devdock.addCommand(cmdForm);await refreshCommands()},'Comando guardado')
    if(ok){setCmdAdd(false);setCmdForm({name:'',executable:'',args:'',category:'Personalizado'})}
  }
  async function saveResource(e:FormEvent){
    e.preventDefault()
    const ok=await action(async()=>{await window.devdock.saveResource(resourceForm);await refreshResources()},'Recurso guardado')
    if(ok){setResourceOpen(false);setResourceForm({...emptyResource});setResourceSelected(null)}
  }
  async function deleteResource(r:Resource){
    if(!window.confirm('¿Eliminar el recurso '+r.title+'?'))return
    await action(async()=>{await window.devdock.deleteResource(r.id);await refreshResources();setResourceSelected(null)},'Recurso eliminado')
  }
  async function loadTools(){await action(async()=>{setTools(await window.devdock.tools());setToolsLoaded(true)})}
  function selectPage(next:Page){setPage(next);setNotice(null);if(next==='github'&&github===null)void loadGitHub();if(next==='tools'&&!toolsLoaded)void loadTools()}
  const visible=useMemo(()=>projects.filter(p=>(p.name+' '+p.category+' '+p.rootPath).toLowerCase().includes(filter.toLowerCase())),[projects,filter])
  const gitProjects=projects.filter(p=>p.git.isRepository)
  const dirty=gitProjects.filter(p=>p.git.modified+p.git.untracked>0)
  const gitSelected=gitProjects.find(p=>p.id===gitId)
  const selectedCommand=commands.find(c=>c.id===commandId)
  useEffect(()=>{
    if(!gitId&&projects.length)setGitId(projects[0]!.id)
    if(page==='git'){
      const candidates=projects.filter(p=>p.git.isRepository)
      if(candidates.length&&!candidates.some(p=>p.id===gitId)){
        setGitId(candidates[0]!.id)
        setGitInfo(null)
      }
    }
  },[projects,gitId,page])

  function projectCard(p:Project){return <article className="project-card" key={p.id}>
    <div className="card-head"><span className="project-icon"><FolderGit2 size={22}/></span>
      <button className={'icon-button '+(p.favorite?'starred':'')} onClick={()=>void favorite(p)} title="Favorito"><Star size={18} fill={p.favorite?'currentColor':'none'}/></button>
    </div>
    <h3 title={p.name}>{p.name}</h3><div className="path" title={p.rootPath}>{p.rootPath}</div>
    <div className="chips"><span className="chip">{p.category}</span>
      {p.git.isRepository?<span className="chip violet"><GitBranch size={12}/>{p.git.branch}</span>:<span className="chip">Carpeta local</span>}
      {p.git.modified+p.git.untracked>0&&<span className="chip amber">{p.git.modified+p.git.untracked} cambios</span>}
    </div>
    <div className="card-foot"><span><Clock3 size={13}/>{shortDate(p.lastOpenedAt)}</span>
      <div className="card-buttons">
        <button className="icon-button" title="Editar categoría" onClick={()=>void changeCategory(p)}><Code2 size={16}/></button>
        <button className="icon-button" title="Quitar del catálogo" onClick={()=>void remove(p)}><Trash2 size={16}/></button>
        <button className="icon-button" title="Abrir carpeta" onClick={()=>void openProject(p.id,false)}><FolderOpen size={17}/></button>
        <button className="small-button" onClick={()=>void openProject(p.id,true)}>Abrir <ArrowRight size={13}/></button>
      </div>
    </div>
  </article>}

  return <div className="app">
    <aside className="sidebar"><div className="brand"><span className="logo"><Terminal size={23}/></span>
      <div><div className="brand-name">DEV<span>DOCK</span></div><small>PERSONAL WORKSPACE</small></div></div>
      <div className="nav-label">WORKSPACE</div>
      <nav>{nav.map(n=><button key={n.id} className={'nav '+(page===n.id?'selected':'')} onClick={()=>selectPage(n.id)}>
        <n.icon size={18}/><span>{n.name}</span>{n.id==='projects'&&<small>{projects.length}</small>}
      </button>)}</nav>
      <div className="sidebar-bottom"><span className="dot"/> ENTORNO LOCAL <span>v0.3.0</span></div>
    </aside>
    <main><header className="topbar"><div>Workspace <span>/</span> <strong>{titles[page]}</strong></div><div className="top-right"><span className="online"><span className="dot"/> LOCAL</span><div className="avatar"><Code2 size={18}/></div></div></header>
      <section className="content">
        {notice&&<div role="status" className={'notification '+(notice.error?'error':'success')}>{notice.error?<AlertCircle size={18}/>:<CheckCircle2 size={18}/>}<span>{notice.text}</span><button className="icon-button" onClick={()=>setNotice(null)}><X size={17}/></button></div>}
        {loading?<div className="empty">Cargando DEVDОCK…</div>:<>
          {page==='home'&&<>
            <div className="intro"><div><div className="eyebrow">CENTRO DE CONTROL / OVERVIEW</div><h1>Tu espacio de desarrollo<span className="accent">.</span></h1><p>Proyectos, Git y GitHub conectados desde un mismo lugar.</p></div>
              <button className="primary" onClick={()=>void addProject()}><Plus size={17}/> Añadir proyecto</button></div>
            <div className="stats"><div className="stat"><FolderGit2 size={22}/><b>{projects.length}</b><strong>Proyectos</strong><small>Registrados en el equipo</small></div>
              <div className="stat"><GitBranch size={22}/><b>{gitProjects.length}</b><strong>Repositorios Git</strong><small>Detectados localmente</small></div>
              <div className="stat"><Activity size={22}/><b>{dirty.length}</b><strong>Con cambios</strong><small>Trabajo pendiente</small></div>
              <div className="stat"><Star size={22}/><b>{projects.filter(p=>p.favorite).length}</b><strong>Favoritos</strong><small>Acceso rápido</small></div></div>
            <div className="section-title"><h2>Proyectos recientes</h2><button className="ghost" onClick={()=>selectPage('projects')}>Ver todos <ArrowRight size={16}/></button></div>
            {projects.length?<div className="cards">{projects.slice(0,3).map(projectCard)}</div>:<div className="empty"><FolderOpen size={33}/><h3>Añade tu primer proyecto</h3><p>Selecciona una carpeta local para empezar a trabajar.</p><button className="primary" onClick={()=>void addProject()}>Añadir carpeta</button></div>}
            <div className="dashboard-note"><Github size={23}/><div><b>¿Quieres conectar tus repositorios de GitHub?</b><p>Accede a GitHub desde la barra lateral, inicia sesión con GitHub CLI y clona tus repositorios en un par de clics.</p></div><button className="secondary" onClick={()=>selectPage('github')}>Ir a GitHub <ArrowRight size={14}/></button></div>
          </>}
          {page==='projects'&&<>
            <div className="intro"><div><div className="eyebrow">WORKSPACE / PROJECTS</div><h1>Mis proyectos<span className="accent">.</span></h1><p>Administra tus proyectos sin mover ni borrar sus carpetas.</p></div><button className="primary" onClick={()=>void addProject()}><Plus size={17}/> Añadir proyecto</button></div>
            <div className="toolbar"><label className="search"><Search size={17}/><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Buscar proyecto o categoría…"/></label>
              <button className="secondary" onClick={()=>void action(refreshProjects,'Proyectos actualizados')}><RefreshCw size={16}/> Actualizar</button></div>
            {visible.length?<div className="cards">{visible.map(projectCard)}</div>:<div className="empty">No hay proyectos. Añade una carpeta o clona un repositorio desde GitHub.</div>}
          </>}
          {page==='github'&&<>
            <div className="intro"><div><div className="eyebrow">INTEGRACIONES / GITHUB</div><h1>Tus repositorios GitHub<span className="accent">.</span></h1><p>Consulta y clona repositorios de tu cuenta, incluidos los privados autorizados.</p></div>
              <button className="secondary" onClick={()=>void loadGitHub()} disabled={busy}><RefreshCw size={16}/> Comprobar conexión</button></div>
            <div className="gh-status"><div className="gh-icon"><Github size={29}/></div><div>
              <h3>{github?.connected?'Conectado como '+github.username:github?.installed?'GitHub CLI detectado · Sin sesión':'Conecta tu cuenta de GitHub'}</h3>
              <p>{github?.hint||'Buscando GitHub CLI y la sesión local…'}</p></div><span className={'status-pill '+(github?.connected?'yes':'no')}>{github?.connected?'Conectado':'Desconectado'}</span></div>
            {!github?.connected?<div className="module"><h3>Configura la conexión una sola vez</h3><p>DEVDОCK usa GitHub CLI. No te pedirá tu contraseña ni guardará tokens.</p>
              <ol className="steps"><li>Instala GitHub CLI desde <code>https://cli.github.com</code>. En Windows: <code>winget install --id GitHub.cli --exact</code></li>
              <li>Abre PowerShell y ejecuta <code>gh auth login --hostname github.com --git-protocol https --web</code></li>
              <li>Ejecuta <code>gh auth setup-git</code> y reinicia DEVDОCK si acabas de instalar gh.</li>
              <li>Pulsa <b>Comprobar conexión</b> para cargar tus repositorios.</li></ol></div>
              :<><div className="section-title"><h2>Repositorios remotos ({remote.length})</h2><button className="ghost" onClick={()=>void loadGitHub()}><RefreshCw size={16}/> Recargar</button></div>
              {remote.length?<div className="repo-list">{remote.map(r=><div className="repo" key={r.nameWithOwner}>
                <span className="repo-icon"><Github size={22}/></span><div className="repo-data"><strong>{r.nameWithOwner}</strong><small>{r.description||'Sin descripción'}</small></div>
                <span className={'chip '+(r.isPrivate?'amber':'')}>{r.isPrivate?'Privado':'Público'}</span>
                <button className="primary" disabled={busy} onClick={()=>void cloneRepo(r)}><DownloadCloud size={15}/> Clonar</button></div>)}</div>
                :<div className="empty">No se encontraron repositorios en esta cuenta. Comprueba los permisos de GitHub CLI.</div>}</>}
          </>}
          {page==='git'&&<>
            <div className="intro"><div><div className="eyebrow">REPOSITORIOS / GIT LOCAL</div><h1>Control de versiones<span className="accent">.</span></h1><p>Consulta archivos, commits y sincroniza Git desde DEVDОCK.</p></div><button className="secondary" onClick={()=>void refreshProjects()}><RefreshCw size={16}/> Actualizar</button></div>
            <div className="module"><label className="field">Repositorio<select value={gitId} onChange={e=>{setGitId(e.target.value);setGitInfo(null)}}>{!gitProjects.length&&<option value="">No hay repositorios</option>}{gitProjects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
              <div className="actions"><button className="primary" disabled={!gitSelected||busy} onClick={()=>void loadGit()}><GitBranch size={15}/> Ver historial y cambios</button>
                <button className="secondary" disabled={!gitSelected||busy} onClick={()=>void runGit('fetch')}>Fetch</button>
                <button className="secondary" disabled={!gitSelected||busy} onClick={()=>void runGit('pull')}>Pull</button>
                <button className="secondary" disabled={!gitSelected||busy} onClick={()=>void runGit('push')}>Push</button></div></div>
            {gitInfo&&<div className="two-col"><div className="module"><h3><GitBranch size={18}/> Rama {gitInfo.branch||'HEAD'}</h3><p>Remoto: {gitInfo.remote||'No configurado'}</p>
              <h4>Archivos cambiados</h4><pre>{gitInfo.changes.length?gitInfo.changes.join('\n'):'Sin cambios locales'}</pre></div>
              <div className="module"><h3><Activity size={18}/> Historial reciente</h3><div className="commit-list">{gitInfo.commits.map(c=><div className="commit" key={c.hash}><code>{c.hash}</code><span title={c.subject}>{c.subject}</span><small>{c.relativeTime}</small></div>)}</div></div></div>}
            <div className="module"><h3><Code2 size={18}/> Registrar cambios</h3><p>Stage prepara TODOS los cambios. Commit confirma únicamente los cambios ya preparados.</p>
              <div className="actions"><button className="secondary" disabled={!gitSelected||busy} onClick={()=>void runGit('stage')}>Stage: git add -A</button>
                <input className="commit-input" value={commitMessage} onChange={e=>setCommitMessage(e.target.value)} maxLength={200} placeholder="Mensaje del commit"/>
                <button className="primary" disabled={!gitSelected||busy||!commitMessage.trim()} onClick={()=>void runGit('commit')}>Commit</button></div></div>
            {commandOutput&&<div className="module"><h3>Resultado</h3><pre>{commandOutput.command+'\n\n'+commandOutput.stdout+'\n'+commandOutput.stderr}</pre></div>}
          </>}
          {page==='commands'&&<>
            <div className="intro"><div><div className="eyebrow">PRODUCTIVIDAD / COMMANDS</div><h1>Centro de comandos<span className="accent">.</span></h1><p>Ejecuta acciones rápidas dentro de un proyecto. Sin terminal interactiva.</p></div><button className="secondary" onClick={()=>setCmdAdd(v=>!v)}><Plus size={17}/> Nuevo comando</button></div>
            <div className="two-col"><div className="module"><h3><Terminal size={19}/> Ejecutar</h3>
              <label className="field">Proyecto<select value={gitId} onChange={e=>setGitId(e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
              <label className="field">Comando<select value={commandId} onChange={e=>setCommandId(e.target.value)}>{commands.map(c=><option key={c.id} value={c.id}>{c.category} / {c.name}</option>)}</select></label>
              <div className="command-example">{selectedCommand?.executable} {selectedCommand?.args.join(' ')}</div>
              <div className="actions"><button className="primary" disabled={busy||!gitId} onClick={()=>void runCommand()}><Terminal size={16}/> Ejecutar</button>
                {selectedCommand&&!selectedCommand.builtin&&<button className="secondary" onClick={()=>{if(window.confirm('¿Eliminar este comando?'))void action(async()=>{await window.devdock.deleteCommand(commandId);await refreshCommands();setCommandId('git-status')})}}><Trash2 size={16}/> Eliminar</button>}</div>
              <div className="hint"><ShieldCheck size={16}/> Los comandos personalizados requieren confirmación antes de ejecutarse.</div></div>
              <div className="module"><h3>Salida</h3><pre className="output">{commandOutput?commandOutput.command+'\n\n'+commandOutput.stdout+'\n'+commandOutput.stderr:'Aquí aparecerá el resultado del comando.'}</pre></div></div>
            {cmdAdd&&<form className="module form" onSubmit={e=>void addCommand(e)}><h3>Nuevo comando personalizado</h3>
              <div className="form-grid"><label className="field">Nombre<input required value={cmdForm.name} onChange={e=>setCmdForm({...cmdForm,name:e.target.value})}/></label>
              <label className="field">Ejecutable<input required placeholder="git" value={cmdForm.executable} onChange={e=>setCmdForm({...cmdForm,executable:e.target.value})}/></label>
              <label className="field">Argumentos<input placeholder="status --short" value={cmdForm.args} onChange={e=>setCmdForm({...cmdForm,args:e.target.value})}/></label>
              <label className="field">Categoría<input required value={cmdForm.category} onChange={e=>setCmdForm({...cmdForm,category:e.target.value})}/></label></div><button className="primary" type="submit"><Save size={15}/> Guardar</button></form>}
          </>}
          {page==='library'&&<>
            <div className="intro"><div><div className="eyebrow">RECURSOS / LIBRARY</div><h1>Biblioteca técnica<span className="accent">.</span></h1><p>Notas, documentación y snippets guardados localmente.</p></div><button className="primary" onClick={()=>{setResourceForm({...emptyResource});setResourceOpen(true)}}><Plus size={17}/> Nuevo recurso</button></div>
            <div className="two-col"><div className="module resource-list">{resources.length?resources.map(r=><button key={r.id} className={'resource '+(resourceSelected?.id===r.id?'picked':'')} onClick={()=>setResourceSelected(r)}>
              {r.kind==='link'?<Link2 size={18}/>:r.kind==='snippet'?<Code2 size={18}/>:<BookOpen size={18}/>}
              <span><strong>{r.title}</strong><small>{r.category} · {r.kind}</small></span><ArrowRight size={16}/></button>):<div className="empty">Todavía no hay recursos guardados.</div>}</div>
              <div className="module">{resourceSelected?<><h3>{resourceSelected.title}</h3><p>{resourceSelected.category}</p>
                <pre className="resource-content">{resourceSelected.content}</pre><div className="actions">
                  <button className="secondary" onClick={()=>void navigator.clipboard.writeText(resourceSelected.content)}><Copy size={15}/> Copiar</button>
                  <button className="secondary" onClick={()=>{setResourceForm({...resourceSelected});setResourceOpen(true)}}>Editar</button>
                  <button className="secondary" onClick={()=>void deleteResource(resourceSelected)}><Trash2 size={15}/> Eliminar</button>
                </div></>:<div className="empty">Selecciona una nota o snippet para consultarlo.</div>}</div></div>
            {resourceOpen&&<form className="module form" onSubmit={e=>void saveResource(e)}><div className="section-title"><h3>Guardar recurso</h3><button type="button" className="icon-button" onClick={()=>setResourceOpen(false)}><X size={18}/></button></div>
              <div className="form-grid"><label className="field">Título<input required value={resourceForm.title} onChange={e=>setResourceForm({...resourceForm,title:e.target.value})}/></label>
              <label className="field">Categoría<input required value={resourceForm.category} onChange={e=>setResourceForm({...resourceForm,category:e.target.value})}/></label>
              <label className="field">Tipo<select value={resourceForm.kind} onChange={e=>setResourceForm({...resourceForm,kind:e.target.value as Resource['kind']})}><option value="note">Nota</option><option value="link">Enlace</option><option value="snippet">Snippet</option></select></label></div>
              <label className="field">Contenido<textarea rows={7} required value={resourceForm.content} onChange={e=>setResourceForm({...resourceForm,content:e.target.value})}/></label>
              <button className="primary" type="submit"><Save size={15}/> Guardar</button></form>}
          </>}
          {page==='tools'&&<>
            <div className="intro"><div><div className="eyebrow">SISTEMA / TOOLS</div><h1>Herramientas instaladas<span className="accent">.</span></h1><p>Detectamos qué comandos están disponibles en tu equipo.</p></div><button className="secondary" disabled={busy} onClick={()=>void loadTools()}><RefreshCw size={16}/> Detectar de nuevo</button></div>
            <div className="tool-grid">{tools.map(t=><article className="tool" key={t.name}><Wrench size={23}/><div><b>{t.name}</b><small>{t.version}</small></div><span className={'status-pill '+(t.installed?'yes':'no')}>{t.installed?'Disponible':'No detectado'}</span></article>)}</div>
            <p className="hint">Una herramienta puede estar instalada aunque no esté disponible en PATH.</p>
          </>}
          {page==='settings'&&<>
            <div className="intro"><div><div className="eyebrow">PREFERENCIAS / SETTINGS</div><h1>Configuración<span className="accent">.</span></h1><p>Personaliza cómo se abren tus proyectos.</p></div></div>
            <div className="module"><h3><Settings size={18}/> Editor predeterminado</h3><p>Al abrir un proyecto, DEVDОCK utiliza este editor o el explorador del sistema.</p>
              <select value={editor} onChange={e=>{const v=e.target.value;void action(async()=>{await window.devdock.setEditor(v);setEditor(v)},'Preferencia guardada')}}>
                <option value="system">Explorador de archivos</option><option value="vscode">Visual Studio Code</option><option value="cursor">Cursor</option>
              </select></div>
            <div className="module"><h3><ShieldCheck size={18}/> Privacidad</h3><p>Todos los proyectos y recursos se guardan en tu propio ordenador. GitHub se autentica mediante la sesión de GitHub CLI.</p></div>
          </>}
        </>}
      </section><footer> <span><span className="dot"/> DEVDОCK LOCAL</span><span>Electron · React · TypeScript · SQLite · GitHub CLI &nbsp; | &nbsp; v0.3.0</span></footer>
    </main></div>
}
