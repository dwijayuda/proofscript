import { TypeclassClassMetadata, TypeclassEnvironmentMetadata, TypeclassInstanceMetadata, emptyTypeclassEnvironment } from "@proofscript/kernel";

export function rankInstanceCandidates(instances: readonly TypeclassInstanceMetadata[], className:string):TypeclassInstanceMetadata[]{
  return instances.filter(i=>i.className===className).map(i=>({...i})).sort((a,b)=>b.priority-a.priority||b.declarationOrder-a.declarationOrder);
}

export class TypeclassEnvironment {
  private readonly classes = new Map<string, TypeclassClassMetadata>();
  private readonly instances: TypeclassInstanceMetadata[] = [];
  constructor(metadata:TypeclassEnvironmentMetadata=emptyTypeclassEnvironment()){
    for(const c of metadata.classes)this.registerClass(c);
    for(const i of metadata.instances)this.registerInstance(i);
  }
  isClass(name:string):boolean{return this.classes.has(name);}
  getClass(name:string):TypeclassClassMetadata|undefined{return this.classes.get(name);}
  registerClass(meta:TypeclassClassMetadata):void{if(this.classes.has(meta.name))throw new Error(`duplicate class registration: ${meta.name}`);this.classes.set(meta.name,{...meta,params:meta.params.map(p=>({...p})),fields:meta.fields.map(f=>({...f}))});}
  registerInstance(meta:TypeclassInstanceMetadata):void{if(this.instances.some(i=>i.name===meta.name))throw new Error(`duplicate instance registration: ${meta.name}`);if(!this.classes.has(meta.className))throw new Error(`instance ${meta.name} references unknown class ${meta.className}`);this.instances.push({...meta});}
  candidates(className:string):TypeclassInstanceMetadata[]{return rankInstanceCandidates(this.instances,className);}
  snapshot():TypeclassEnvironmentMetadata{return{classes:[...this.classes.values()].map(c=>({...c,params:c.params.map(p=>({...p})),fields:c.fields.map(f=>({...f}))})),instances:this.instances.map(i=>({...i}))};}
}
