/** Keep native agent commands bound to the workspace selected in the address. */
export function bindAgentWorkspace<T>(api:T,definition:unknown):T {
  const contract=definition as Record<string,unknown>
  return new Proxy(api as object,{get(target,key){
    const value=Reflect.get(target,key)
    if(typeof key!=='string')return value
    const node=contract[key]
    if(!node||typeof node!=='object')return value
    if('method' in node) {
      const workspace=typeof window==='undefined'?null:new URLSearchParams(window.location.search).get('workspace')
      if(!workspace)return value
      const bind=(input:Record<string,unknown>={})=>{
        const endpoint=value.input({...input,workspace_id:workspace})
        return new Proxy(endpoint,{get(current,property){
          if(property==='input')return bind
          const result=Reflect.get(current,property)
          return typeof result==='function'?result.bind(current):result
        }})
      }
      return bind()
    }
    return bindAgentWorkspace(value,node)
  }}) as T
}
