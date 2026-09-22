import {ParseError,Token} from "@proofscript/syntax";

export function tokenize(source:string):Token[]{
  const out:Token[]=[];let i=0;const push=(kind:Token["kind"],text:string,offset:number)=>out.push({kind,text,offset});
  while(i<source.length){const c=source[i];if(/\s/u.test(c)){i++;continue;}
    if(source.startsWith("//",i))throw new ParseError(`standard ProofScript does not use JavaScript // line comments; use Lean-compatible -- line comments at offset ${i}`);
    if(source.startsWith("--",i)){i+=2;while(i<source.length&&source[i]!=="\n")i++;continue;}
    if(source.startsWith("/-",i)){const start=i;i+=2;let depth=1;while(i<source.length&&depth>0){if(source.startsWith("/-",i)){depth++;i+=2;}else if(source.startsWith("-/",i)){depth--;i+=2;}else i++;}if(depth!==0)throw new ParseError(`unterminated block comment at offset ${start}`);continue;}
    if(c==='"'){
      const start=i; i++; let value=""; let closed=false;
      const readHex=(n:number,kind:string):string=>{
        if(i+n>source.length)throw new ParseError(`unterminated ${kind} escape in string literal at offset ${start}`);
        const hex=source.slice(i,i+n);
        if(!/^[0-9a-fA-F]+$/.test(hex))throw new ParseError(`invalid ${kind} escape in string literal at offset ${i}`);
        i+=n; return String.fromCodePoint(parseInt(hex,16));
      };
      while(i<source.length){
        const ch=source[i];
        if(ch==='"'){i++;push("str",value,start);closed=true;break;}
        if(ch==="\n"||ch==="\r")throw new ParseError(`newline in string literal at offset ${i}`);
        if(ch==="\\"){
          i++; if(i>=source.length)throw new ParseError(`unterminated string escape at offset ${start}`);
          const esc=source[i++];
          if(esc==='"')value+='"';
          else if(esc==="\\")value+="\\";
          else if(esc==="n")value+="\n";
          else if(esc==="r")value+="\r";
          else if(esc==="t")value+="\t";
          else if(esc==="0")value+="\0";
          else if(esc==="x")value+=readHex(2,"hex");
          else if(esc==="u")value+=readHex(4,"unicode");
          else throw new ParseError(`unsupported string escape \\${esc} at offset ${i-1}`);
          continue;
        }
        value+=ch; i++;
      }
      if(!closed)throw new ParseError(`unterminated string literal at offset ${start}`);
      continue;
    }
    const two=source.slice(i,i+2);if([":=","=>","->","==","!=","<=",">=","<-","&&","||"].includes(two)){push("sym",two,i);i+=2;continue;}
    if(["(",")",",",":",";","→","∀","←","{","}","⦃","⦄","[","]","=","≠","@",".","+","-","*","<",">","|","!"].includes(c)){push("sym",c,i);i++;continue;}
    if(/[0-9]/.test(c)){const s=i;while(i<source.length&&/[0-9]/.test(source[i]))i++;push("num",source.slice(s,i),s);continue;}
    if(/[A-Za-z_]/.test(c)){const s=i;i++;while(i<source.length){if(/[A-Za-z0-9_'?]/u.test(source[i])){i++;continue;}if(source[i]==="."&&i+1<source.length&&/[A-Za-z_]/.test(source[i+1])){i+=2;while(i<source.length&&/[A-Za-z0-9_'?]/u.test(source[i]))i++;continue;}break;}push("id",source.slice(s,i),s);continue;}
    throw new ParseError(`unexpected character ${JSON.stringify(c)} at offset ${i}`);
  }out.push({kind:"eof",text:"<eof>",offset:source.length});return out;
}
