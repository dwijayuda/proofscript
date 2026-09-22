import {ParseError,UnsupportedFeature,Token,SurfaceDeclaration} from "@proofscript/syntax";

const knownUnsupportedCommands=new Set(["module","public","meta","syntax","macro","elab","set_option","initialize","mutual","contract","export"]);

/**
 * Narrow dispatch interface for top-level declaration command parsing.
 *
 * This module owns only command dispatch. Individual declaration grammars stay
 * in the main Parser for now because they share namespace, section-variable,
 * binder, pattern, and term parsing state. Splitting dispatch first prevents
 * the main parser from growing more command-routing policy as new declaration
 * forms are added.
 */
export interface DeclarationParserHost{
  peek():Token;
  parseInductiveDeclaration():SurfaceDeclaration;
  parseStructureDeclaration():SurfaceDeclaration;
  parseClassDeclaration():SurfaceDeclaration;
  parseInstanceDeclaration():SurfaceDeclaration;
  parseDefinition():SurfaceDeclaration;
  parseFunctionAliasDeclaration():SurfaceDeclaration;
  parseConstAliasDeclaration():SurfaceDeclaration;
  parseTransparentLikeDeclaration(kind:"opaque"|"abbrev"):SurfaceDeclaration;
  parseExampleDeclaration():SurfaceDeclaration;
  parseTheoremOrAxiomDeclaration(kind:"theorem"|"axiom"):SurfaceDeclaration;
}

export function parseDeclaration(host:DeclarationParserHost):SurfaceDeclaration{
  const head=host.peek();
  if(head.kind!=="id")throw new ParseError(`expected declaration at offset ${head.offset}`);
  if(head.text==="inductive")return host.parseInductiveDeclaration();
  if(head.text==="structure")return host.parseStructureDeclaration();
  if(head.text==="class")return host.parseClassDeclaration();
  if(head.text==="instance")return host.parseInstanceDeclaration();
  if(head.text==="def")return host.parseDefinition();
  if(head.text==="function")return host.parseFunctionAliasDeclaration();
  if(head.text==="const")return host.parseConstAliasDeclaration();
  if(head.text==="opaque"||head.text==="abbrev")return host.parseTransparentLikeDeclaration(head.text);
  if(head.text==="example")return host.parseExampleDeclaration();
  if(knownUnsupportedCommands.has(head.text))throw new UnsupportedFeature(`K3c-section-vars0 does not implement ProofScript v0.1 command '${head.text}'`);
  if(head.text!=="theorem"&&head.text!=="axiom")throw new ParseError(`unknown declaration command '${head.text}' at offset ${head.offset}`);
  return host.parseTheoremOrAxiomDeclaration(head.text);
}
