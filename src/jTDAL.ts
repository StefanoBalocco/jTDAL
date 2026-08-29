type Nullable<T> = T | null;
type Undefinedable<T> = T | undefined;
// 0 = r + c, 1 = b, 2 = k, 3 = f + s, 4 = q
type ParseResult = [ string, boolean[], boolean, Set<string> ];
type StackTag = {
  name: string;
  skip: boolean;
  beforeClose?: string;
  afterClose?: string;
  omitClose?: boolean;
  repeatName?: string;
  repeatCloseTail?: string;
};
export type TemplateEngine = ( data: any ) => string;

export default class jTDAL {
  private static readonly _keywords: string[] = [ 'condition', 'repeat', 'content', 'replace', 'attributes', 'omittag' ];
  private static readonly _regexpPatternPath: string = '(?:[\\w\\-\\/]*[\\w](?:[\\s]*\\|[\\s]*[\\w\\-\\/]*[\\w])*)';
  private static readonly _regexpPatternPathBoolean: string = `(?:(?:!)?${ jTDAL._regexpPatternPath })`;
  private static readonly _regexpPatternTagAttributes: string = '(?:[^<>"\']|"[^"]*"|\'[^\']*\')';
  private static readonly _regexpTagWithTDAL: RegExp = RegExp( `\
<\!--[\\s\\S]*?(?:-->|$)\
|<((?:[\\w-]+:)?[a-zA-Z][\\w-]*)(?:\\s+${ jTDAL._regexpPatternTagAttributes }+?)??\\s+\
\\bdata-tdal-(?:${ jTDAL._keywords.join( '|' ) })\\b\
=(['"])(?:.*?)\\2(?:\\s+${ jTDAL._regexpPatternTagAttributes }+?)??\\s*(\/)?>\
|<((?:[\\w-]+:)?[a-zA-Z][\\w-]*)(?:\\s+${ jTDAL._regexpPatternTagAttributes }+?)??\\s*(\/)?>\
|<\\/((?:[\\w-]+:)?[a-zA-Z][\\w-]*)\\s*>`, 'gi' );
  private static readonly _regexpTagAttributes: RegExp = /\s((?:[\w-]+:)?[\w-]+)(?:=(?:(['"])(.*?)\2|([^>\s'"]+)))?(?=\s|\/?>)/gi;
  private static readonly _regexpCondition: RegExp = RegExp( `^[\\s]*(${ jTDAL._regexpPatternPathBoolean })[\\s]*$` );
  private static readonly _regexpRepeat: RegExp = RegExp( `^[\\s]*([\\w\\-]+?)[\\s]+(${ jTDAL._regexpPatternPath })[\\s]*$` );
  private static readonly _regexpContent: RegExp = RegExp( `^[\\s]*(?:(structure)[\\s]+)?(MACRO:[a-zA-Z0-9-]+|${ jTDAL._regexpPatternPathBoolean })[\\s]*$` );
  private static readonly _regexpAttributes: RegExp = RegExp( `[\\s]*((?:[\\w\\-]+:)?[\\w\\-]+)(\\??)[\\s]+(${ jTDAL._regexpPatternPathBoolean })[\\s]*(?:;;[\\s]*|$)`, 'g' );
  private static readonly _regexpAttributesTDAL: RegExp = /\s*(data-tdal-[\w-]+)=(?:(['"])(.*?)\2|([^>\s'"]+))/gi;
  private static readonly _regexpPathSeparator: RegExp = /\s*\|\s*/;
  private static readonly _regexpTagEnd: RegExp = /\s*\/?>$/;
  private static readonly _regexpMacroName: RegExp = /^[a-zA-Z0-9-]+$/;
  private static readonly _HTML5VoidElements: Set<string> = new Set<string>( [ 'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr' ] );
  private readonly _trim: boolean;
  private readonly _strip: boolean;
  private _macros: Record<string, ParseResult> = {};

  private static _ParsePath( pathExpression: string, getBoolean: boolean, macros: Record<string, ParseResult>, result: ParseResult ): string {
    let returnValue: string = '';
    if( pathExpression ) {
      const paths: string[] = pathExpression.trim().split( jTDAL._regexpPathSeparator );
      const cL1: number = paths.length;
      for( let iL1: number = 0; iL1 < cL1; ++iL1 ) {
        if( 0 != iL1 ) {
          returnValue += '||';
        }
        const currentPath: string = paths[ iL1 ];
        if( currentPath.startsWith( 'MACRO:' ) ) {
          const macroName: string = currentPath.substring( 6 );
          if( Object.hasOwn( macros, macroName ) ) {
            // Public grammar permits MACRO: only in content and replace expressions.
            returnValue += `m["${ macroName }"]()`;
            result[ 3 ].add( macroName );
          } else {
            returnValue += 'false';
          }
          iL1 = cL1;
        } else {
          const not: boolean = ( '!' === currentPath[ 0 ] );
          const path: string[] = ( not ? currentPath.substring( 1 ) : currentPath ).split( '/' );
          const boolPath: boolean = ( getBoolean || not );
          const boolPrefix: string = not ? '!' : '';
          if( path[ 0 ].length ) {
            switch( path[ 0 ] ) {
              case 'FALSE': {
                if( not ) {
                  returnValue += 'true';
                } else {
                  returnValue += 'false';
                }
                iL1 = cL1;
                break;
              }
              case 'TRUE': {
                if( not ) {
                  returnValue += 'false';
                } else {
                  returnValue += 'true';
                }
                iL1 = cL1;
                break;
              }
              case 'REPEAT': {
                if( 3 == path.length ) {
                  result[ 1 ][ 0 ] = true;
                  result[ 1 ][ 1 ] ||= boolPath;
                  returnValue += `${ boolPrefix }c(r,"${ path.join( '/' ) }"${ boolPath ? ',2' : '' })`;
                } else {
                  throw new Error( 'ParsePath: Invalid REPEAT syntax' );
                }
                break;
              }
              case 'GLOBAL': {
                // at least two tokens: GLOBAL/variable
                if( path[ 1 ]?.length ) {
                  // d must be an object
                  // Skip GLOBAL
                  result[ 1 ][ 0 ] = true;
                  result[ 1 ][ 1 ] ||= boolPath;
                  returnValue += `${ boolPrefix }c(d,"${ path.slice( 1 ).join( '/' ) }"${ boolPath ? ',2' : '' })`;
                } else {
                  throw new Error( 'ParsePath: Invalid GLOBAL syntax' );
                }
                break;
              }
              default: {
                // not encapsulate checks between parenthesis because not checks are connected with &&
                result[ 1 ][ 0 ] = true;
                result[ 1 ][ 1 ] ||= boolPath;
                returnValue += `${ boolPrefix }c(r,"${ path.join( '/' ) }",${ boolPath ? '3' : '1' })`;
              }
            }
          } else {
            throw new Error( 'ParsePath: Invalid path length' );
          }
        }
      }
    }
    return returnValue;
  }

  constructor( trim: boolean = true, strip: boolean = true ) {
    this._trim = trim;
    this._strip = strip;
  }

  private _Parse( template: string ): ParseResult {
    const returnValue: ParseResult = [ '', [ false, false, false, false, false ], false, new Set<string>() ];
    const attributesPrefix: string = 'data-tdal-';
    const stack: StackTag[] = [];
    let skip: boolean = false;
    let sourceIndex: number = 0;
    let backtickOpened: boolean = false;
    let tmpTDALTags: Nullable<RegExpExecArray>;
    jTDAL._regexpTagWithTDAL.lastIndex = 0;
    while( tmpTDALTags = jTDAL._regexpTagWithTDAL.exec( template ) ) {
      const tagName: string = ( tmpTDALTags[ 1 ] || tmpTDALTags[ 4 ] || tmpTDALTags[ 6 ] || '' ).toLowerCase();
      const selfClosed: string = tmpTDALTags[ 3 ] || tmpTDALTags[ 5 ];
      const innermost: Undefinedable<StackTag> = stack[ stack.length - 1 ];
      const inOpaqueRegion: boolean = innermost && [ 'template', 'script' ].includes( innermost.name );

      if( tmpTDALTags[ 0 ].startsWith( '<!--' ) ) {
        if( tmpTDALTags[ 0 ].endsWith( '-->' ) ) {
          if( !skip && !inOpaqueRegion && this._strip ) {
            if( sourceIndex < tmpTDALTags.index ) {
              if( !backtickOpened ) {
                returnValue[ 0 ] += '`';
                backtickOpened = true;
              }
              returnValue[ 0 ] += template.substring( sourceIndex, tmpTDALTags.index ).replaceAll( '\\', '\\\\' ).replaceAll( '`', '\\`' ).replaceAll( '${', '\\${' );
            }
            sourceIndex = jTDAL._regexpTagWithTDAL.lastIndex;
          }
        } else {
          throw new Error( 'Parse: Unclosed comment' );
        }
      } else if( inOpaqueRegion && !( tmpTDALTags[ 6 ] && ( tagName == innermost.name ) ) ) {
        // opaque region: only its own closing tag and nested template/script regions matter
        if( ( 'script' != innermost.name ) && [ 'template', 'script' ].includes( tagName ) && !selfClosed ) {
          stack.push( { name: tagName, skip: false } );
        }
      } else {
        const voidElement: boolean = jTDAL._HTML5VoidElements.has( tagName );
        if( !selfClosed || voidElement ) {
          if( tmpTDALTags[ 6 ] ) {
            if( innermost && ( tagName == innermost.name ) ) {
              const closed: StackTag = stack.pop()!;
              const beforeClose: boolean = ( undefined !== closed.beforeClose );
              if( beforeClose ) {
                if( !closed.skip && ( sourceIndex < tmpTDALTags.index ) ) {
                  returnValue[ 0 ] += template.substring( sourceIndex, tmpTDALTags.index ).replaceAll( '\\', '\\\\' ).replaceAll( '`', '\\`' ).replaceAll( '${', '\\${' );
                }
                returnValue[ 0 ] += closed.beforeClose + ( closed.omitClose ? '' : tmpTDALTags[ 0 ] ).replaceAll( '\\', '\\\\' ).replaceAll( '`', '\\`' ).replaceAll( '${', '\\${' ) + closed.afterClose;
                if( closed.repeatName ) {
                  returnValue[ 0 ] += '`;}},""):"")}' + `\${(delete r["REPEAT"]["${ closed.repeatName }"],delete r["${ closed.repeatName }"],"")}` + closed.repeatCloseTail!;
                }
              }
              if( closed.skip || beforeClose ) {
                sourceIndex = jTDAL._regexpTagWithTDAL.lastIndex;
              }
              if( closed.skip ) {
                skip = false;
              }
            } else if( !innermost ) {
              throw new Error( `Parse: Unopened tag </${ tagName }>` );
            } else {
              throw new Error( `Parse: Mismatched closing tag </${ tagName }>, expected </${ innermost.name }>` );
            }
          } else if( skip || tmpTDALTags[ 4 ] ) {
            // ordinary HTML, or HTML inside a dropped subtree, only needs balancing
            if( !voidElement && !selfClosed ) {
              stack.push( { name: tagName, skip: false } );
            }
          } else if( tmpTDALTags[ 1 ] ) {
            if( sourceIndex < tmpTDALTags.index ) {
              if( !backtickOpened ) {
                returnValue[ 0 ] += '`';
                backtickOpened = true;
              }
              returnValue[ 0 ] += template.substring( sourceIndex, tmpTDALTags.index ).replaceAll( '\\', '\\\\' ).replaceAll( '`', '\\`' ).replaceAll( '${', '\\${' );
            }

            // 0: js before tag open
            // 1: tag open
            // 2: js attributes
            // 3: js after tag open
            // 4: js before tag close
            // 5: js after tag close
            const current: string[] = [ '', tmpTDALTags[ 0 ], '', '', '', '' ];
            const tagResult: ParseResult = [ '', [ false, false, false, false, false ], false, new Set<string>() ];
            const attributes: Record<string, RegExpExecArray> = {};
            for( const match of tmpTDALTags[ 0 ].matchAll( jTDAL._regexpTagAttributes ) ) {
              attributes[ match[ 1 ] ] = match;
            }
            current[ 1 ] = current[ 1 ].replaceAll( jTDAL._regexpAttributesTDAL, '' );

            let dropElement: boolean = false;
            let dropContent: boolean = false;
            let omitClose: boolean = false;
            let tmpMatch: Nullable<RegExpExecArray>;
            let tmpValue: string;
            let repeatName: Undefinedable<string>;
            let repeatCloseTail: string = '';
            let openingOutput: string = '';
            let attribute: string = attributesPrefix + jTDAL._keywords[ 0 ];

            if( attributes[ attribute ] && jTDAL._regexpCondition.exec( attributes[ attribute ][ 3 ] ) ) {
              tmpValue = jTDAL._ParsePath( attributes[ attribute ][ 3 ], true, this._macros, tagResult );
              if( 'false' == tmpValue ) {
                dropElement = true;
              } else if( 'true' != tmpValue ) {
                current[ 0 ] += '${' + tmpValue + '?`';
                current[ 5 ] = '`:``}' + current[ 5 ];
              }
            }

            if( !dropElement ) {
              attribute = attributesPrefix + jTDAL._keywords[ 1 ];
              if( attributes[ attribute ] && ( tmpMatch = jTDAL._regexpRepeat.exec( attributes[ attribute ][ 3 ] ) ) ) {
                tmpValue = jTDAL._ParsePath( tmpMatch[ 2 ], false, this._macros, tagResult );
                if( [ 'false', '""', 'true' ].includes( tmpValue ) ) {
                  dropElement = true;
                } else {
                  repeatName = tmpMatch[ 1 ];
                  tagResult[ 1 ][ 2 ] = true;
                  tagResult[ 2 ] = true;
                  current[ 0 ] += '${((q=' + tmpValue + ')&&"object"==typeof q&&((Array.isArray(q)&&(k=q,q=true))||(k=Object.keys(q)))&&k.length?k.reduce((o,v,i)=>{' +
                                  `r["${ repeatName }"]=(true===q)?v:q[v];` +
                                  `r["REPEAT"]["${ repeatName }"]={` +
                                  'index:(true===q)?i:v,number:i+1,length:k.length,even:1==i%2,odd:0==i%2,first:0==i,last:k.length==i+1};' +
                                  '{let q,k;';
                  repeatCloseTail = current[ 5 ];
                  current[ 5 ] = '';
                }
              }
            }

            if( !dropElement ) {
              attribute = attributesPrefix + jTDAL._keywords[ 2 ];
              tmpMatch = attributes[ attribute ] ? jTDAL._regexpContent.exec( attributes[ attribute ][ 3 ] ) : null;
              if( !tmpMatch ) {
                attribute = attributesPrefix + jTDAL._keywords[ 3 ];
                tmpMatch = attributes[ attribute ] ? jTDAL._regexpContent.exec( attributes[ attribute ][ 3 ] ) : null;
              }
              if( tmpMatch ) {
                tmpValue = jTDAL._ParsePath( tmpMatch[ 2 ], false, this._macros, tagResult );
                if( 'false' == tmpValue ) {
                  if( attributesPrefix + jTDAL._keywords[ 2 ] == attribute ) {
                    dropContent = true;
                  } else {
                    dropElement = true;
                  }
                } else if( 'true' != tmpValue ) {
                  const encode: boolean = 'structure' != tmpMatch[ 1 ];
                  const prefix: string = '${((q=' + tmpValue + ',false!==q)&&("string"===typeof q||("number"===typeof q&&!isNaN(q)))?' + ( encode ? 'String(q).replace(f,m=>s[m])' : 'q' ) + ':(true!==q?``:' + '`';
                  tagResult[ 1 ][ 3 ] ||= encode;
                  tagResult[ 1 ][ 4 ] = true;
                  if( attributesPrefix + jTDAL._keywords[ 2 ] == attribute ) {
                    current[ 3 ] += prefix;
                    current[ 4 ] += '`))}';
                  } else {
                    if( repeatName ) {
                      openingOutput += prefix;
                    } else {
                      current[ 0 ] += prefix;
                    }
                    current[ 5 ] = '`))}' + current[ 5 ];
                  }
                }
              }
            }

            if( !dropElement ) {
              attribute = attributesPrefix + jTDAL._keywords[ 4 ];
              if( attributes[ attribute ] ) {
                for( const match of attributes[ attribute ][ 3 ].matchAll( jTDAL._regexpAttributes ) ) {
                  const isFlag: boolean = '?' === match[ 2 ];
                  tmpValue = jTDAL._ParsePath( match[ 3 ], isFlag, this._macros, tagResult );
                  if( 'false' == tmpValue ) {
                    if( attributes[ match[ 1 ] ] ) {
                      current[ 1 ] = current[ 1 ].replace( RegExp( "\\s*\\b" + match[ 1 ] + "\\b(?:=(['\"]).*?\\1)?(?=\\s|\\/?>)" ), '' );
                    }
                  } else if( 'true' != tmpValue ) {
                    if( isFlag ) {
                      current[ 2 ] += `\${${ tmpValue }?\` ${ match[ 1 ] }\`:\`\``;
                    } else {
                      tagResult[ 1 ][ 4 ] = true;
                      current[ 2 ] += `\${((q=${ tmpValue },false!==q)&&((q&&"string"===typeof q)||("number"===typeof q&&!isNaN(q)))?\` ${ match[ 1 ] }="\${q}"\`:(true!==q?\`\`:\`` + ` ${ match[ 1 ] }`;
                    }
                    if( attributes[ match[ 1 ] ] ) {
                      current[ 1 ] = current[ 1 ].replace( RegExp( `\\s*\\b${match[ 1 ]}\\b(?:=(['"]).*?\\1)?(?=\\s|\\/?>)` ), '' );
                      current[ 2 ] += attributes[ match[ 1 ] ][ 3 ] ? '=' + ( attributes[ match[ 1 ] ][ 2 ] + attributes[ match[ 1 ] ][ 3 ] + attributes[ match[ 1 ] ][ 2 ] ).replaceAll( '\\', '\\\\' ).replaceAll( '`', '\\`' ).replaceAll( '${', '\\${' ) : '';
                    }
                    current[ 2 ] += isFlag ? '}' : '`))}';
                  }
                }
              }
            }

            if( !dropElement ) {
              attribute = attributesPrefix + jTDAL._keywords[ 5 ];
              if( attributes[ attribute ] && jTDAL._regexpCondition.exec( attributes[ attribute ][ 3 ] ) ) {
                tmpValue = jTDAL._ParsePath( attributes[ attribute ][ 3 ], true, this._macros, tagResult );
                if( 'true' == tmpValue ) {
                  current[ 1 ] = '';
                  omitClose = true;
                } else if( 'false' != tmpValue ) {
                  const omitTagPrefix: string = `\${${ tmpValue }?\`\`:\``;
                  if( repeatName ) {
                    openingOutput += omitTagPrefix;
                  } else {
                    current[ 0 ] += omitTagPrefix;
                  }
                  current[ 3 ] = '`}' + current[ 3 ];
                  current[ 4 ] += omitTagPrefix;
                  current[ 5 ] = '`}' + current[ 5 ];
                }
              }
            }

            current[ 1 ] = current[ 1 ].replace( jTDAL._regexpTagEnd, '' );
            if( dropElement ) {
              sourceIndex = jTDAL._regexpTagWithTDAL.lastIndex;
              if( !( selfClosed || voidElement ) ) {
                stack.push( { name: tagName, skip: true } );
                skip = true;
              }
            } else if( selfClosed || voidElement ) {
              const syntheticClose: string = current[ 3 ] || current[ 4 ];
              if( !backtickOpened ) {
                returnValue[ 0 ] += '`';
                backtickOpened = true;
              }
              returnValue[ 0 ] += current[ 0 ];
              if( repeatName ) {
                returnValue[ 0 ] += 'return o+`' + openingOutput;
              }
              returnValue[ 0 ] += current[ 1 ].replaceAll( '\\', '\\\\' ).replaceAll( '`', '\\`' ).replaceAll( '${', '\\${' ) + current[ 2 ] + ( current[ 1 ] ? ( syntheticClose ? '>' : '/>' ) : '' ) + current[ 3 ];
              returnValue[ 0 ] += current[ 4 ] + ( syntheticClose ? `</${ tagName }>` : '' ).replaceAll( '\\', '\\\\' ).replaceAll( '`', '\\`' ).replaceAll( '${', '\\${' ) + current[ 5 ];
              if( repeatName ) {
                returnValue[ 0 ] += '`;}},""):"")}' + `\${(delete r["REPEAT"]["${ repeatName }"],delete r["${ repeatName }"],"")}` + repeatCloseTail;
              }
              sourceIndex = jTDAL._regexpTagWithTDAL.lastIndex;
            } else {
              if( !backtickOpened ) {
                returnValue[ 0 ] += '`';
                backtickOpened = true;
              }
              returnValue[ 0 ] += current[ 0 ];
              if( repeatName ) {
                returnValue[ 0 ] += 'return o+`' + openingOutput;
              }
              returnValue[ 0 ] += current[ 1 ].replaceAll( '\\', '\\\\' ).replaceAll( '`', '\\`' ).replaceAll( '${', '\\${' ) + current[ 2 ] + ( current[ 1 ] ? '>' : '' ) + current[ 3 ];
              sourceIndex = jTDAL._regexpTagWithTDAL.lastIndex;
              const stackTag: StackTag = { name: tagName, skip: dropContent, beforeClose: current[ 4 ], afterClose: current[ 5 ], omitClose };
              if( repeatName ) {
                stackTag.repeatName = repeatName;
                stackTag.repeatCloseTail = repeatCloseTail;
              }
              stack.push( stackTag );
            }
            if( !dropElement ) {
              const cL1: number = tagResult[ 1 ].length;
              for( let iL1: number = 0; iL1 < cL1; iL1++ ) {
                returnValue[ 1 ][ iL1 ] ||= tagResult[ 1 ][ iL1 ];
              }
              returnValue[ 2 ] ||= tagResult[ 2 ];
              tagResult[ 3 ].forEach( ( value: string ): void => { returnValue[ 3 ].add( value ); } );
            }
            if( dropContent ) {
              skip = true;
            }
          }
        } else {
          throw new Error( `Parse: Self-closed non-void tag <${ tagName }>` );
        }
      }
    }

    if( 0 == stack.length ) {
      if( sourceIndex < template.length ) {
        if( !backtickOpened ) {
          returnValue[ 0 ] += '`';
          backtickOpened = true;
        }
        returnValue[ 0 ] += template.substring( sourceIndex ).replaceAll( '\\', '\\\\' ).replaceAll( '`', '\\`' ).replaceAll( '${', '\\${' );
      }
    } else {
      throw new Error( `Parse: Unclosed tag <${ stack[ stack.length - 1 ].name }>` );
    }
    if( !backtickOpened ) {
      returnValue[ 0 ] = '``';
    } else {
      returnValue[ 0 ] += '`';
    }
    return returnValue;
  }

  public MacroAdd( macroName: string, template: string ): void {
    if( jTDAL._regexpMacroName.test( macroName ) ) {
      const macroResult: ParseResult = this._Parse( template );
      if( this._trim ) {
        macroResult[ 0 ] = '(' + macroResult[ 0 ] + ').trim()';
      }
      this._macros[ macroName ] = macroResult;
    } else {
      throw new Error( 'MacroAdd: Invalid macro name' );
    }
  }

  private _Compile( template: string ): string {
    const parseResult: ParseResult = this._Parse( template );
    for( const macroName of parseResult[ 3 ] ) {
      if( Object.hasOwn( this._macros, macroName ) ) {
        const macroResult: ParseResult = this._macros[ macroName ];
        const cL1: number = parseResult[ 1 ].length;
        for( let iL1: number = 0; iL1 < cL1; iL1++ ) {
          // Macro-only repeat and content scratch needs stay inside the macro body block.
          if( 2 != iL1 && 4 != iL1 ) {
            parseResult[ 1 ][ iL1 ] ||= macroResult[ 1 ][ iL1 ];
          }
        }
        parseResult[ 2 ] ||= macroResult[ 2 ];
        macroResult[ 3 ].forEach( ( value: string ): void => { parseResult[ 3 ].add( value ); } );
      }
    }
    const declarations: string[] = [];

    if( parseResult[ 1 ][ 0 ] ) {
      declarations.push( 'r=' + ( parseResult[ 2 ] ? '{REPEAT:{}}' : '{}' ) );
      declarations.push( 'c=(a,c,e)=>{let z=a,y=c.split("/"),x=0,w,l=y.length,m=2&e;for(;x<l&&1!==z;){z="object"===typeof z&&null!==z&&void 0!==(w="function"===typeof z[y[x]]?z[y[x]](d,r):z[y[x]])&&w;x++;if(1&e&&(false===z||x==l&&m&&!b(z))){z=d;e=0;x=0}}return m?b(z):z}' );
    }
    if( parseResult[ 1 ][ 1 ] ) {
      declarations.push( 'b=v=>!!v&&("object"!==typeof v||(Array.isArray(v)?0<v.length:0<Object.keys(v).length))' );
    }
    if( parseResult[ 1 ][ 3 ] ) {
      declarations.push( `f=/[&<>"]/g`, `s={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}` );
    }
    if( parseResult[ 3 ].size ) {
      declarations.push( 'm={' + Array.from(
        parseResult[ 3 ],
        ( macroName: string ): string => {
          const macroResult: ParseResult = this._macros[ macroName ];
          const block: string = ( macroResult[ 1 ][ 2 ] ? '{let q,k;return ' : ( macroResult[ 1 ][ 4 ] ? '{let q;return ' : '' ) );
          return `"${ macroName }":()=>${ block }${ macroResult[ 0 ] }${ block ? '}' : '' }`;
        }
      ).join( ',' ) + '}' );
    }

    return (
      ( parseResult[ 1 ][ 2 ] ? 'let q,k;' : ( parseResult[ 1 ][ 4 ] ? 'let q;' : '' ) ) +
      ( declarations.length ? `const ${ declarations.join( ',' ) };` : '' ) +
      'return ' + ( this._trim ? '(' : '' ) + parseResult[ 0 ] +
      ( this._trim ? ').trim()' : '' )
    );
  }

  public CompileToFunction( template: string ): TemplateEngine {
    return new Function( 'd', this._Compile( template ) ) as TemplateEngine;
  }

  public CompileToString( template: string ): string {
    return `function(d){${ this._Compile( template ) }}`;
  }
}
