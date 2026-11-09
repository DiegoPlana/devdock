import { useEffect, useState } from 'react'
import { AlertCircle, Check, ChevronRight, ClipboardCopy, Download, LoaderCircle, PackageCheck, RefreshCw, Settings2, ShieldCheck, SkipForward, Sparkles, Terminal, Wrench, X } from 'lucide-react'
import type { DependencyInfo } from '../shared/types'

function explainError(e:unknown):string {
  return e instanceof Error?e.message.replace(/^Error invoking remote method '[^']+': Error: /,''):String(e)
}
function ToolRow({tool,active,onInstall}: {tool:DependencyInfo;active:boolean;onInstall:(id:string)=>void}) {
  return <div className="dep-row">
    <div className="dep-icon">{tool.installed?<Check size={21}/>:<Wrench size={19}/>}</div>
    <div className="dep-information">
      <div className="dep-name">{tool.name} {tool.recommended&&<span className="dep-recommended">Recomendado</span>}</div>
      <p>{tool.purpose}</p>
      <small>{tool.installed?tool.version:tool.installable?'Disponible para instalar desde DEVDОCK':'Instalación manual o gestor no disponible'}</small>
    </div>
    {tool.installed?<span className="dep-success"><Check size={15}/> Instalado</span>:tool.installable?
      <button className="primary" disabled={active} onClick={()=>onInstall(tool.id)}>{active?<LoaderCircle size={15} className="dep-spin"/>:<Download size={15}/>} Instalar</button>:
      <span className="dep-manual">Manual</span>}
  </div>
}

export function DependencyCenter(){
  const [items,setItems]=useState<DependencyInfo[]>([])
  const [loading,setLoading]=useState(true)
  const [installing,setInstalling]=useState<string|null>(null)
  const [message,setMessage]=useState<{text:string;bad:boolean}|null>(null)
  async function refresh(){
    setLoading(true)
    try{setItems(await window.devdock.dependencies());setMessage(null)}
    catch(e){setMessage({text:explainError(e),bad:true})}
    finally{setLoading(false)}
  }
  useEffect(()=>{void refresh()},[])
  async function install(id:string){
    setInstalling(id);setMessage(null)
    try{
      const response=await window.devdock.installDependency(id)
      setMessage({text:response.ok?'Proceso finalizado. '+response.details:response.details,bad:!response.ok})
      setItems(await window.devdock.dependencies())
    }catch(e){setMessage({text:explainError(e),bad:true})}
    finally{setInstalling(null)}
  }
  return <>
    <div className="intro"><div><div className="eyebrow">SISTEMA / DEPENDENCIAS</div>
      <h1>Preparar mi entorno<span className="accent">.</span></h1>
      <p>Comprueba e instala tus herramientas de desarrollo con tu autorización.</p></div>
      <button className="secondary" disabled={loading||!!installing} onClick={()=>void refresh()}><RefreshCw size={17}/> Volver a comprobar</button>
    </div>
    <div className="dep-note"><ShieldCheck size={23}/><div><strong>Tú decides qué se instala</strong><p>DEVDОCK funciona sin Node.js, Git ni Docker adicionales. Solo se instalarán las herramientas que apruebes. El sistema puede solicitar permisos de administrador. No se ejecutan descargas ocultas.</p></div></div>
    {message&&<div role="status" className={'notification '+(message.bad?'error':'success')}>{message.bad?<AlertCircle size={17}/>:<Check size={17}/>}<span>{message.text}</span><button className="icon-button" onClick={()=>setMessage(null)}><X size={16}/></button></div>}
    {loading&&<div className="dep-loading"><LoaderCircle size={20} className="dep-spin"/> Comprobando herramientas…</div>}
    {!loading&&<div className="module dep-table">
      {items.map(tool=><ToolRow key={tool.id} tool={tool} active={!!installing} onInstall={id=>void install(id)}/>)}
    </div>}
    {!loading&&<div className="module"><h3><Terminal size={18}/> Instalación manual</h3>
      <p>Si no hay botón de instalación, utiliza uno de estos comandos en la terminal. Después reinicia DEVDОCK si la herramienta no se detecta.</p>
      <div className="dep-manual-list">{items.filter(x=>!x.installed&&!x.installable).map(x=><div className="dep-command" key={x.id}><span>{x.name}</span>
        <code>{x.instructions}</code><button className="icon-button" title="Copiar instrucción" onClick={()=>void navigator.clipboard.writeText(x.instructions)}><ClipboardCopy size={16}/></button></div>)}
        {!items.some(x=>!x.installed&&!x.installable)&&<p>Todas las herramientas no instaladas tienen opción de instalación automática.</p>}
      </div>
      <p className="dep-warning">Docker puede necesitar configurar WSL 2 o reiniciar el equipo. GitHub CLI requiere además iniciar sesión con <code>gh auth login</code>. Las herramientas opcionales no son necesarias para abrir DEVDОCK.</p>
    </div>}
  </>
}

export function FirstRunSetup(){
  const [show,setShow]=useState(false)
  const [step,setStep]=useState(0)
  const [deps,setDeps]=useState<DependencyInfo[]>([])
  const [selected,setSelected]=useState<Record<string,boolean>>({})
  const [processing,setProcessing]=useState(false)
  const [progress,setProgress]=useState('')
  const [errors,setErrors]=useState<string[]>([])
  useEffect(()=>{
    let active=true
    void Promise.all([window.devdock.setupComplete(),window.devdock.dependencies()])
      .then(([done,items])=>{
        if(!active)return
        setDeps(items)
        setSelected(Object.fromEntries(items.map(item=>[item.id,item.recommended&&!item.installed&&item.installable])))
        setShow(!done)
      }).catch(e=>{if(active){setErrors([explainError(e)]);setShow(true)}})
    return()=>{active=false}
  },[])
  async function finish(){
    try{await window.devdock.completeSetup();setShow(false)}catch(e){setErrors(x=>[...x,explainError(e)])}
  }
  async function runInstall(){
    setProcessing(true);setErrors([])
    const tools=deps.filter(d=>selected[d.id]&&!d.installed&&d.installable)
    for(const tool of tools){
      setProgress('Preparando '+tool.name+'…')
      try{
        const output=await window.devdock.installDependency(tool.id)
        if(!output.ok)setErrors(x=>[...x,tool.name+': '+output.details])
        setDeps(await window.devdock.dependencies())
      }catch(e){setErrors(x=>[...x,tool.name+': '+explainError(e)])}
    }
    setProgress('Comprobaciones terminadas')
    setProcessing(false);setStep(2)
  }
  if(!show)return null
  return <div className="setup-overlay" role="dialog" aria-modal="true" aria-label="Configuración inicial de DEVDОCK">
    <div className="setup-modal">
      <aside className="setup-sidebar">
        <div className="setup-brand"><span>◆</span> DEVDОCK</div>
        {['Bienvenida','Herramientas','Finalizar'].map((label,i)=><div className={'setup-step '+(step===i?'chosen':'')+(i<step?' completed':'')} key={label}>
          <span>{i<step?<Check size={14}/>:i+1}</span>{label}
        </div>)}
        <div className="setup-version">Versión 0.3.1</div>
      </aside>
      <div className="setup-body">
        {step===0&&<>
          <div className="setup-hero"><div className="setup-hero-icon"><Sparkles size={31}/></div>
            <h2>Bienvenido a DEVDОCK</h2><p>Un centro de trabajo para tus proyectos y repositorios.</p></div>
          <div className="setup-benefits"><div><Check size={17}/> Detectaremos las herramientas de tu ordenador.</div>
            <div><Check size={17}/> Te preguntaremos qué quieres instalar.</div>
            <div><Check size={17}/> Nada se instalará sin tu permiso.</div></div>
          <div className="setup-footer"><button className="secondary" onClick={()=>void finish()}>Ahora no</button>
            <button className="primary" onClick={()=>setStep(1)}>Configurar <ChevronRight size={16}/></button></div>
        </>}
        {step===1&&<>
          <div className="eyebrow">CONFIGURACIÓN INICIAL</div><h2>Elige tus herramientas</h2>
          <p>Git y GitHub CLI son recomendables para sincronizar repositorios. Las demás son opcionales y puedes instalarlas más adelante.</p>
          <div className="setup-tool-list">{deps.map(tool=><label className="setup-tool" key={tool.id}>
            <input type="checkbox" disabled={tool.installed||!tool.installable||processing} checked={!!selected[tool.id]}
              onChange={e=>setSelected(s=>({...s,[tool.id]:e.target.checked}))}/>
            <span className="setup-tool-body"><strong>{tool.name}</strong><small>{tool.purpose}</small></span>
            <span className={'setup-tool-status '+(tool.installed?'installed':'')}>{tool.installed?'Instalado':tool.installable?'Disponible':'Manual'}</span>
          </label>)}</div>
          {progress&&<div className="dep-loading"><LoaderCircle size={17} className={processing?'dep-spin':''}/>{progress}</div>}
          <div className="setup-footer"><button className="secondary" disabled={processing} onClick={()=>void finish()}>Omitir</button>
            <button className="primary" disabled={processing} onClick={()=>void runInstall()}>
              {processing?<LoaderCircle size={16} className="dep-spin"/>:<Download size={16}/>}
              {Object.values(selected).some(Boolean)?'Instalar seleccionadas':'Continuar'}
            </button>
          </div>
        </>}
        {step===2&&<>
          <div className="setup-hero"><div className="setup-hero-icon finished"><PackageCheck size={37}/></div>
            <h2>¡Preparado para trabajar!</h2><p>Ya puedes utilizar DEVDОCK y gestionar tus herramientas cuando quieras.</p></div>
          {errors.length>0?<div className="setup-errors"><strong>Estas instalaciones requieren atención:</strong>{errors.map((e,i)=><p key={i}>{e}</p>)}</div>:<div className="setup-benefits"><div><Check size={17}/> Comprobación terminada.</div><div><Check size={17}/> La configuración queda guardada en tu ordenador.</div></div>}
          <div className="setup-footer"><button className="primary" onClick={()=>void finish()}>Abrir DEVDОCK <ChevronRight size={16}/></button></div>
        </>}
      </div>
    </div>
  </div>
}
