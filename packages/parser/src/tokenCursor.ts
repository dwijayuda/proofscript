import {ParseError,Token} from "@proofscript/syntax";

/**
 * Small token cursor shared by the parser implementation.
 *
 * This class deliberately owns only token navigation and expectation helpers.
 * Higher-level grammar, declaration parsing, namespace state, and sugar lowering
 * stay in the parser modules so cursor code cannot grow into a second parser.
 */
export class TokenCursor{
  protected i=0;

  constructor(protected readonly tokens:Token[]){}

  protected at(text:string):boolean{return this.peek().text===text;}

  protected atId(text:string):boolean{return this.peek().kind==="id"&&this.peek().text===text;}

  protected peek(ahead=0):Token{return this.tokens[Math.min(this.i+ahead,this.tokens.length-1)];}

  protected next():Token{return this.tokens[this.i++];}

  protected expect(text:string):Token{const t=this.peek();if(t.text!==text)throw new ParseError(`expected '${text}' at offset ${t.offset}, found '${t.text}'`);return this.next();}

  protected expectId(text:string):Token{const t=this.peek();if(t.kind!=="id"||t.text!==text)throw new ParseError(`expected '${text}' at offset ${t.offset}, found '${t.text}'`);return this.next();}

  protected expectKind(kind:Token["kind"],what:string):Token{const t=this.peek();if(t.kind!==kind)throw new ParseError(`expected ${what} at offset ${t.offset}, found '${t.text}'`);return this.next();}
}
