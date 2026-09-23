import {ParseError,Token} from "@proofscript/syntax";

const isIdentifierStart=(ch:string):boolean=>ch==="_"||/\p{ID_Start}/u.test(ch);
const isIdentifierContinue=(ch:string):boolean=>ch==="_"||ch==="'"||ch==="?"||/\p{ID_Continue}/u.test(ch);
const codePointAt=(source:string,index:number):string=>String.fromCodePoint(source.codePointAt(index)!);

export type SpannedToken=Token&{readonly endOffset:number};

/**
 * Canonical tokenizer with exact raw source spans.
 *
 * The ordinary tokenize() API intentionally retains its historical Token shape.
 * Product tools such as the formatter may use this span-preserving view to
 * recover trivia from the gaps between tokens without implementing another
 * ProofScript lexer.
 */
export function tokenizeWithSpans(source:string):SpannedToken[]{
  const out:SpannedToken[]=[];let i=0;
  const push=(kind:Token["kind"],text:string,offset:number,endOffset:number)=>out.push({kind,text,offset,endOffset});
  while(i<source.length){
    const c=source[i];
    if(/\s/u.test(c)){i++;continue;}
    if(source.startsWith("//",i))throw new ParseError(`standard ProofScript does not use JavaScript // line comments; use Lean-compatible -- line comments at offset ${i}`);
    if(source.startsWith("--",i)){i+=2;while(i<source.length&&source[i]!=="\n")i++;continue;}
    if(source.startsWith("/-",i)){
      const start=i;i+=2;let depth=1;
      while(i<source.length&&depth>0){
        if(source.startsWith("/-",i)){depth++;i+=2;}
        else if(source.startsWith("-/",i)){depth--;i+=2;}
        else i++;
      }
      if(depth!==0)throw new ParseError(`unterminated block comment at offset ${start}`);
      continue;
    }
    if(c==='"'){
      const start=i;i++;let value="";let closed=false;
      const readHex=(n:number,kind:string):string=>{
        if(i+n>source.length)throw new ParseError(`unterminated ${kind} escape in string literal at offset ${start}`);
        const hex=source.slice(i,i+n);
        if(!/^[0-9a-fA-F]+$/.test(hex))throw new ParseError(`invalid ${kind} escape in string literal at offset ${i}`);
        i+=n;return String.fromCodePoint(parseInt(hex,16));
      };
      while(i<source.length){
        const ch=source[i];
        if(ch==='"'){i++;push("str",value,start,i);closed=true;break;}
        if(ch==="\n"||ch==="\r")throw new ParseError(`newline in string literal at offset ${i}`);
        if(ch==="\\"){
          i++;if(i>=source.length)throw new ParseError(`unterminated string escape at offset ${start}`);
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
        value+=ch;i++;
      }
      if(!closed)throw new ParseError(`unterminated string literal at offset ${start}`);
      continue;
    }
    const two=source.slice(i,i+2);
    if([":=","=>","->","==","!=","<=",">=","<-","&&","||"].includes(two)){
      const start=i;i+=2;push("sym",two,start,i);continue;
    }
    if(["(",")",",",":",";","→","∀","←","{","}","⦃","⦄","[","]","=","≠","@",".","+","-","*","<",">","|","!"].includes(c)){
      const start=i;i++;push("sym",c,start,i);continue;
    }
    if(/[0-9]/.test(c)){
      const start=i;while(i<source.length&&/[0-9]/.test(source[i]))i++;
      push("num",source.slice(start,i),start,i);continue;
    }
    const idStart=codePointAt(source,i);
    if(isIdentifierStart(idStart)){
      const start=i;i+=idStart.length;
      while(i<source.length){
        const ch=codePointAt(source,i);
        if(isIdentifierContinue(ch)){i+=ch.length;continue;}
        if(source[i]==="."&&i+1<source.length){
          const next=codePointAt(source,i+1);
          if(isIdentifierStart(next)){
            i+=1+next.length;
            while(i<source.length){
              const q=codePointAt(source,i);
              if(isIdentifierContinue(q)){i+=q.length;continue;}
              break;
            }
            continue;
          }
        }
        break;
      }
      push("id",source.slice(start,i),start,i);continue;
    }
    throw new ParseError(`unexpected character ${JSON.stringify(c)} at offset ${i}`);
  }
  push("eof","<eof>",source.length,source.length);
  return out;
}

export function tokenize(source:string):Token[]{
  return tokenizeWithSpans(source).map(({endOffset:_endOffset,...token})=>token);
}
