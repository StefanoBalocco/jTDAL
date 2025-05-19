'use strict';

export default class jTDAL {
	private static readonly _keywords: string[] = [ 'condition', 'repeat', 'content', 'replace', 'attributes', 'omittag' ];
	private static readonly _regexpPatternPath: string = '(?:[\\w\\-\\/]*[\\w](?:[\\s]*\\|[\\s]*[\\w\\-\\/]*[\\w])*)';
	private static readonly _regexpPatternString: string = 'STRING:(?:[^;](?:(?!<=;);)?)+';
	private static readonly _regexpPatternMacro: string = 'MACRO:[a-zA-Z0-9-]+';
	private static readonly _regexpPatternPathBoolean: string = '(?:(?:!)?[\\w\\-\\/]*[\\w](?:[\\s]*\\|[\\s]*[\\w\\-\\/]*[\\w])*)';
	private static readonly _regexpPatternExpressionAllowedBoolean: string = '(?:' + jTDAL._regexpPatternString + '|(?:' + jTDAL._regexpPatternPathBoolean + ')(?:[\\s*]\\|[\\s*]' + jTDAL._regexpPatternString + ')?)';
	private static readonly _regexpPatternExpressionAllowedBooleanMacro: string = '(?:' + jTDAL._regexpPatternMacro + '|' + jTDAL._regexpPatternString + '|' + jTDAL._regexpPatternPathBoolean + '(?:[\\s*]\\|[\\s*]' + jTDAL._regexpPatternString + ')?)';
	private static readonly _regexpTagWithTDAL: RegExp = new RegExp( '<((?:\\w+:)?\\w+)(\\s+[^<>]+?)??\\s+\\bdata-tdal-(?:' + jTDAL._keywords.join( '|' ) +
																																	 ')\\b=([\'"])(.*?)\\3(\\s+[^<>]+?)??\\s*(\/)?>', 'i' );
	private static readonly _regexpTagAttributes: RegExp = new RegExp( '(?<=\\s)((?:[\\w\\-]+\:)?[\\w\\-]+)=(?:([\'"])(.*?)\\2|([^>\\s\'"]+))', 'gi' );
	private static readonly _regexpPathString: RegExp = new RegExp( '(?:{(' + jTDAL._regexpPatternPath + ')}|{\\?(' + jTDAL._regexpPatternPathBoolean + ')}(.*?){\\/\\2})' );
	private static readonly _regexpCondition: RegExp = new RegExp( '^[\\s]*(' + jTDAL._regexpPatternExpressionAllowedBoolean + ')[\\s]*$' );
	private static readonly _regexpRepeat: RegExp = new RegExp( '^[\\s]*([\\w\\-]+?)[\\s]+(' + jTDAL._regexpPatternPath + ')[\\s]*$' );
	private static readonly _regexpContent: RegExp = new RegExp( '^[\\s]*(?:(structure)[\\s]+)?(' + jTDAL._regexpPatternExpressionAllowedBooleanMacro + ')[\\s]*$' );
	private static readonly _regexpAttributes: RegExp = new RegExp( '[\\s]*(?:(?:([\\w\\-]+?)[\\s]+(' + jTDAL._regexpPatternExpressionAllowedBoolean + ')[\\s]*)(?:;;[\\s]*|$))', 'g' );
	private static readonly _regexpAttributesTDAL: RegExp = new RegExp( '\\s*(data-tdal-[\\w\\-]+)=(?:([\'"])(.*?)\\2|([^>\\s\'"]+))', 'gi' );
	private static readonly _HTML5VoidElements: string[] = [ 'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr' ];
	private _macros: { [ key: string ]: string } = {};

	private static _ParseString( stringExpression: string, macros: { [ key: string ]: string } = {} ): string {
		let returnValue: string = '""';
		let match = null;
		while( null != ( match = jTDAL._regexpPathString.exec( stringExpression ) ) ) {
			if( 0 < match[ 'index' ] ) {
				returnValue += '+' + JSON.stringify( String( stringExpression.substring( 0, match[ 'index' ] ) ) );
			}
			stringExpression = stringExpression.substring( match[ 'index' ] + match[ 0 ].length );
			if( match[ 1 ] ) {
				// simple path substitution
				returnValue += '+(a(' + jTDAL._ParsePath( match[ 1 ], false, macros ) + ')&&("string"===typeof t[t[0]]||("number"===typeof t[t[0]]&&!isNaN(t[t[0]])))?t[t[0]]:"")';
			} else if( match[ 2 ] ) {
				// if condition
				const tmpValue = jTDAL._ParsePath( match[ 2 ], true, macros );
				if( 'true' === tmpValue ) {
					returnValue += '+' + this._ParseString( match[ 3 ], macros );
				} else if( 'false' !== tmpValue ) {
					returnValue += '+(true===' + tmpValue + '?""+' + this._ParseString( match[ 3 ], macros ) + ':"")';
				} // if "static" false, the content of the condition should be removed
			}
		}
		if( 0 < stringExpression.length ) {
			returnValue += '+' + JSON.stringify( String( stringExpression ) );
		}
		return returnValue;
	}

	private static _ParsePath( pathExpression: string, getBoolean: boolean = false, macros: { [ key: string ]: string } = {} ): string {
		/* Boolean conversion:
		 * (false!==(t[t[0]]=("function" === typeof #PATH#))&&null!==t[t[0]]&&!(Array.isArray(t[t[0]])&&1>t[t[0]].length)&&!("object"===typeof t[t[0]]&&1>Object.keys(t[t[0]]).length))
		 */
		let returnValue: string = '';
		if( pathExpression ) {
			paths: {
				const paths = pathExpression.split( '|' );
				const cL1 = paths.length;
				for( let iL1 = 0; iL1 < cL1; ++iL1 ) {
					if( 0 != iL1 ) {
						returnValue += '||';
					}
					let currentPath = paths[ iL1 ].replace( /^\s+/, '' );
					if( currentPath.startsWith( 'STRING:' ) ) {
						returnValue += '(' + this._ParseString( currentPath.substring( 7 ) ) + ')';
						break paths;
					} else if( currentPath.startsWith( 'MACRO:' ) ) {
						if( 'undefined' !== typeof macros[ currentPath.substring( 6 ) ] ) {
							returnValue += '("function"===typeof m["' + currentPath.substring( 6 ) + '"]?m["' + currentPath.substring( 6 ) + '"]():false)';
						} else {
							returnValue += 'false';
						}
						break paths;
					} else {
						currentPath = currentPath.replace( /\s+$/, '' );
						const not = ( '!' === currentPath[ 0 ] );
						const boolPath = getBoolean || not;
						const path = ( not ? currentPath.substring( 1 ) : currentPath ).split( '/' );
						if( ( 0 < path.length ) && ( 0 < path[ 0 ].length ) ) {
							switch( path[ 0 ] ) {
								case 'FALSE': {
									if( not ) {
										returnValue += 'true';
									} else {
										returnValue += 'false';
									}
									break paths;
								}
								case 'TRUE': {
									if( not ) {
										returnValue += 'false';
									} else {
										returnValue += 'true';
									}
									break paths;
								}
								case 'REPEAT': {
									if( 3 == path.length ) {
										returnValue += ( boolPath ? ( not ? '!' : '' ) + 'b(' : '' ) + 'c(r,"' + path.join( '/' ) + '")' + ( boolPath ? ')' : '' );
									}
									break;
								}
								case 'GLOBAL': {
									// at least two tokens: GLOBAL/variable
									if( 1 < path.length && 0 < path[ 1 ].length ) {
										// d must be a object
										// Skip GLOBAL
										returnValue += ( boolPath ? ( not ? '!' : '' ) + 'b(' : '' ) + 'c(d,"' + path.slice( 1 ).join( '/' ) + '")' + ( boolPath ? ')' : '' );
									}
									break;
								}
								default: {
									// not encapsulate checks between parenthesis because not checks are connected with &&
									if( boolPath ) {
										returnValue += ( not ? '!(' : '' ) + '(a(c(r,"' + path.join( '/' ) + '"))&&false!==b(t[t[0]]))||(a(c(d,"' + path.join( '/' ) + '"))&&false!==b(t[t[0]]))' + ( not ? ')' : '' );
									} else {
										returnValue += '((a(c(r,"' + path.join( '/' ) + '"))||a(c(d,"' + path.join( '/' ) + '")))?t[t[0]]:false)';
									}
								}
							}
						}
					}
				}
			}
		} else {
			returnValue = 'false';
		}
		return returnValue;
	}

	private _Parse( template: string ) {
		let returnValue = '';
		let tmpTDALTags = null;
		const attributesPrefix = 'data-tdal-';

		while( null !== ( tmpTDALTags = jTDAL._regexpTagWithTDAL.exec( template ) ) ) {
			if( 0 < tmpTDALTags[ 'index' ] ) {
				returnValue += "+" + JSON.stringify( String( template.substring( 0, tmpTDALTags[ 'index' ] ) ) );
			}
			template = template.substring( tmpTDALTags[ 'index' ] + tmpTDALTags[ 0 ].length );
			let attributes: { [ key: string ]: RegExpExecArray } = {};
			let tmpMatch: ( RegExpExecArray | null );
			while( null !== ( tmpMatch = jTDAL._regexpTagAttributes.exec( tmpTDALTags[ 0 ] ) ) ) {
				attributes[ tmpMatch[ 1 ] ] = tmpMatch;
			}
			// 0: js before tag open
			// 1: tagOpen
			// 2: js attributes (before closing tagOpen)
			// 3: js after tag open
			// 4: tagContent
			// 5: js before tag close
			// 6: tagClose
			// 7: js after tag close
			let current = [ '', tmpTDALTags[ 0 ], '', '', '', '', '', '' ];

			// remove data-tdal-attributes
			current[ 1 ] = current[ 1 ].replace( jTDAL._regexpAttributesTDAL, '' );

			// selfclosed if /> or if is an area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr
			let selfClosed = !!tmpTDALTags[ 6 ] || jTDAL._HTML5VoidElements.includes( tmpTDALTags[ 1 ].toLowerCase() );
			if( !selfClosed ) {
				let closingPosition: number[] = [];
				const endTag = new RegExp( '<(\\/)?' + tmpTDALTags[ 1 ] + '[^<>]*(?<!\\/)>', 'gi' );
				let tags = 1;
				while( ( 'undefined' === typeof closingPosition[ 0 ] ) && ( null !== ( tmpMatch = endTag.exec( template ) ) ) ) {
					if( !tmpMatch[ 1 ] ) {
						tags++;
					} else {
						tags--;
					}
					if( 0 == tags ) {
						closingPosition = [ tmpMatch[ 'index' ], tmpMatch[ 0 ].length ];
					}
				}
				if( 'undefined' === typeof closingPosition[ 0 ] ) {
					selfClosed = true;
				} else {
					current[ 4 ] += this._Parse( template.substring( 0, closingPosition[ 0 ] ) );
					current[ 6 ] += template.substring( closingPosition[ 0 ], closingPosition[ 0 ] + closingPosition[ 1 ] );
					template = template.substring( closingPosition[ 0 ] + closingPosition[ 1 ] );
				}
			}
			tdal: {
				let attribute = attributesPrefix + jTDAL._keywords[ 0 ];
				if( attributes[ attribute ] && ( jTDAL._regexpCondition.exec( attributes[ attribute ][ 3 ] ) ) ) {
					let tmpValue = jTDAL._ParsePath( attributes[ attribute ][ 3 ], true, this._macros );
					if( 'false' === tmpValue ) {
						// the tag (and it's content) should be removed
						break tdal;
					} else if( 'true' !== tmpValue ) {
						current[ 0 ] += '+(true===' + tmpValue + '?""';
						current[ 7 ] = ':"")' + current[ 7 ];
					}
				}
				let tmpTDALrules;
				attribute = attributesPrefix + jTDAL._keywords[ 1 ];
				if( attributes[ attribute ] && ( tmpTDALrules = jTDAL._regexpRepeat.exec( attributes[ attribute ][ 3 ] ) ) ) {
					let tmpValue = jTDAL._ParsePath( tmpTDALrules[ 2 ], false, this._macros );
					if( ( 'false' == tmpValue ) || ( '""' == tmpValue ) || ( 'true' == tmpValue ) ) {
						// 0 repetition, same as condition false
						break tdal;
					} else {
						current[ 0 ] += '+(';
						// current i = object
						current[ 0 ] += '((';
						current[ 0 ] += 'a(' + tmpValue + ')&&';
						current[ 0 ] += '(!Array.isArray(t[t[0]])||(t[t[0]]=Object.assign({},t[t[0]])))&&';
						current[ 0 ] += '("object"===typeof t[t[0]]&&null!==t[t[0]]&&Object.keys(t[t[0]]).length)';
						// current i = index for object loop ( i+=1 )
						current[ 0 ] += ')?((t[++t[0]]=1)&&t[0]++):((t[0]+=2)&&false))';
						current[ 0 ] += '?';
						current[ 0 ] += 'Object.keys(t[t[0]-2]).reduce((o,e)=>{';
						current[ 0 ] += 'r["' + tmpTDALrules[ 1 ] + '"]=t[t[0]-2][e];';
						current[ 0 ] += 'r["REPEAT"]["' + tmpTDALrules[ 1 ] + '"]={};';
						current[ 0 ] += 'r["REPEAT"]["' + tmpTDALrules[ 1 ] + '"]["index"]=e;';
						// current i = free index ( i+=1 )
						current[ 0 ] += 'r["REPEAT"]["' + tmpTDALrules[ 1 ] + '"]["number"]=t[t[0]-1]++;';
						current[ 0 ] += 'r["REPEAT"]["' + tmpTDALrules[ 1 ] + '"]["even"]=0==(r["REPEAT"]["' + tmpTDALrules[ 1 ] + '"]["number"]%2);';
						current[ 0 ] += 'r["REPEAT"]["' + tmpTDALrules[ 1 ] + '"]["odd"]=1==(r["REPEAT"]["' + tmpTDALrules[ 1 ] + '"]["number"]%2);';
						current[ 0 ] += 'r["REPEAT"]["' + tmpTDALrules[ 1 ] + '"]["first"]=1==r["REPEAT"]["' + tmpTDALrules[ 1 ] + '"]["number"];';
						current[ 0 ] += 'r["REPEAT"]["' + tmpTDALrules[ 1 ] + '"]["length"]=Object.keys(t[t[0]-2]);';
						current[ 0 ] += 'r["REPEAT"]["' + tmpTDALrules[ 1 ] + '"]["last"]=r["REPEAT"]["' + tmpTDALrules[ 1 ] + '"]["length"]==r["REPEAT"]["' +
														tmpTDALrules[ 1 ] + '"]["number"];';
						current[ 0 ] += 'return o';
						// resetting i
						current[ 7 ] = ';},""):"")+((t[0]-=2)&&(delete r["REPEAT"]["' + tmpTDALrules[ 1 ] + '"])&&delete(r["' + tmpTDALrules[ 1 ] + '"])?"":"")' + current[ 7 ];
					}
				}
				attribute = attributesPrefix + jTDAL._keywords[ 2 ];
				if( attributes[ attribute ] && ( tmpTDALrules = jTDAL._regexpContent.exec( attributes[ attribute ][ 3 ] ) ) ) {
					let tmpValue = jTDAL._ParsePath( tmpTDALrules[ 2 ], false, this._macros );
					if( 'false' == tmpValue ) {
						current[ 4 ] = '';
					} else if( 'true' != tmpValue ) {
						let encoding = [ '', '' ];
						if( 'structure' != tmpTDALrules[ 1 ] ) {
							encoding[ 0 ] = 'String(';
							encoding[ 1 ] = ').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")';
						}
						current[ 3 ] += '+(a(' + tmpValue + ')&&("string"===typeof t[t[0]]||("number"===typeof t[t[0]]&&!isNaN(t[t[0]])))?' + encoding[ 0 ] + 't[t[0]]' + encoding[ 1 ] + ':(true!==t[t[0]]?"":""';
						current[ 5 ] += '))';
					}
				} else {
					attribute = attributesPrefix + jTDAL._keywords[ 3 ];
					if( attributes[ attribute ] && ( tmpTDALrules = jTDAL._regexpContent.exec( attributes[ attribute ][ 3 ] ) ) ) {
						let tmpValue = jTDAL._ParsePath( tmpTDALrules[ 2 ], false, this._macros );
						if( 'false' == tmpValue ) {
							current[ 1 ] = '';
							current[ 4 ] = '';
							current[ 6 ] = '';
						} else if( 'true' != tmpValue ) {
							let encoding = [ '', '' ];
							if( 'structure' != tmpTDALrules[ 1 ] ) {
								encoding[ 0 ] = 'String(';
								encoding[ 1 ] = ').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")';
							}
							current[ 0 ] += '+(a(' + tmpValue + ')&&("string"===typeof t[t[0]]||("number"===typeof t[t[0]]&&!isNaN(t[t[0]])))?' + encoding[ 0 ] + 't[t[0]]' + encoding[ 1 ] + ':(true!==t[t[0]]?"":""';
							current[ 7 ] = '))' + current[ 7 ];
						}
					}
				}
				attribute = attributesPrefix + jTDAL._keywords[ 4 ];
				if( attributes[ attribute ] && ( tmpTDALrules = jTDAL._regexpAttributes.exec( attributes[ attribute ][ 3 ] ) ) ) {
					while( null !== tmpTDALrules ) {
						let tmpValue = jTDAL._ParsePath( tmpTDALrules[ 2 ], false, this._macros );
						if( 'false' === tmpValue ) {
							if( 'undefined' !== ( typeof attributes[ tmpTDALrules[ 1 ] ] ) ) {
								current[ 1 ] = current[ 1 ].replace( new RegExp( '\\s*\\b' + tmpTDALrules[ 1 ] + '\\b(?:=([\'"]).*?\\1)?(?=\\s|\\/?>)' ), '' );
							}
						} else if( 'true' !== tmpValue ) {
							current[ 2 ] += '+(a(' + tmpValue + ')&&("string"===typeof t[t[0]]||("number"===typeof t[t[0]]&&!isNaN(t[t[0]])))?" ' + tmpTDALrules[ 1 ] + '=\\""+t[t[0]]+"\\"":(true!==t[t[0]]?"":"' + tmpTDALrules[ 1 ] + '"';
							if( 'undefined' !== ( typeof attributes[ tmpTDALrules[ 1 ] ] ) ) {
								current[ 1 ] = current[ 1 ].replace( new RegExp( '\\s*\\b' + tmpTDALrules[ 1 ] + '\\b(?:=([\'"]).*?\\1)?(?=\\s|\\/?>)' ), '' );
								current[ 2 ] += ( ( ( 'undefined' !== ( typeof attributes[ tmpTDALrules[ 1 ] ][ 3 ] ) ) && ( '' != attributes[ tmpTDALrules[ 1 ] ][ 3 ] ) ) ? '+"="+' + JSON.stringify( String( attributes[ tmpTDALrules[ 1 ] ][ 2 ] + attributes[ tmpTDALrules[ 1 ] ][ 3 ] + attributes[ tmpTDALrules[ 1 ] ][ 2 ] ) ) : "" );
							}
							current[ 2 ] += '))';
						}
						tmpTDALrules = jTDAL._regexpAttributes.exec( attributes[ attribute ][ 3 ] );
					}
				}
				attribute = attributesPrefix + jTDAL._keywords[ 5 ];
				if( attributes[ attribute ] && ( jTDAL._regexpCondition.exec( attributes[ attribute ][ 3 ] ) ) ) {
					let tmpValue = jTDAL._ParsePath( attributes[ attribute ][ 3 ], true, this._macros );
					if( 'true' == tmpValue ) {
						current[ 1 ] = '';
						current[ 6 ] = '';
					} else if( 'false' != tmpValue ) {
						current[ 0 ] += '+(' + tmpValue + '?"":""';
						current[ 3 ] = ')' + current[ 3 ];
						current[ 5 ] += '+(' + tmpValue + '?"":""';
						current[ 7 ] = ')' + current[ 7 ];
					}
				}
			}
			current[ 1 ] = current[ 1 ].replace( /\s*\/?>$/, '' );
			if( selfClosed && ( ( '' != current[ 4 ] ) || ( '' != current[ 3 ] ) || ( '' != current[ 5 ] ) ) ) {
				// if is a tag selfclosed, and if it has contents, I should close it
				current[ 6 ] = '</' + tmpTDALTags[ 1 ] + '>';
				selfClosed = false;
			}
			returnValue += current[ 0 ] + '+' + JSON.stringify( String( current[ 1 ] ) ) + current[ 2 ] +
										 ( ( '' != current[ 1 ] ) ? '+"' + ( selfClosed ? '/' : '' ) + '>"' : '' ) + current[ 3 ] + current[ 4 ] + current[ 5 ] + '+' +
										 JSON.stringify( String( current[ 6 ] ) ) + current[ 7 ];
		}
		returnValue += '+' + JSON.stringify( String( template ) );
		return returnValue;
	}

	public MacroAdd( macroName: string, template: string, trim: boolean = true, strip: boolean = true ): boolean {
		let returnValue: boolean = false;
		if( macroName.match( /[a-zA-Z0-9]/ ) ) {
			returnValue = true;
			this._macros[ macroName ] = '""' + this._Parse( strip ? template.replace( /<!--.*?-->/sg, '' ) : template );
			if( trim ) {
				this._macros[ macroName ] = '(' + this._macros[ macroName ] + ').trim()';
			}
		}
		return returnValue;
	}

	constructor( macros: [ string, string ][] = [], trim: boolean = true, strip: boolean = true ) {
		const cL1 = macros.length;
		for( let iL1 = 0; iL1 < cL1; iL1++ ) {
			this.MacroAdd( macros[ iL1 ][ 0 ], macros[ iL1 ][ 1 ], trim, strip );
		}
	}

	private _Compile( template: string, trim: boolean = true, strip: boolean = true ): string {
		let tmpValue = this._Parse( strip ? template.replace( /<!--.*?-->/sg, '' ) : template );
		let returnValue = 'const r={"REPEAT":{}}';
		returnValue += ',t=[1]';
		returnValue += ',m={' + Object.keys( this._macros ).map( macro => '"' + macro + '":()=>' + this._macros[ macro ] ).join( ',' ) + '}';
		returnValue += ',a=(e)=>{';
		returnValue += 't[t[0]]=e;';
		returnValue += 'return false!==t[t[0]]';
		returnValue += '}';
		returnValue += ',c=(a,b)=>{';
		returnValue += 'let z=!1,y=b.split("/"),x,w;';
		returnValue += 'if(0<y.length&&0<y[0].length)';
		returnValue += 'for(z=a,x=0;x<y.length&&1!==z;x++)';
		returnValue += 'z="object"===typeof z&&null!==z&&void 0!==(w="function"===typeof z[y[x]]?z[y[x]](d,r):z[y[x]])&&w;';
		returnValue += 'return z';
		returnValue += '}';
		returnValue += ',b=(v)=>{';
		returnValue += 'return "object"===typeof v?null!==v&&0<Object.keys(v).length:(Array.isArray(v)?0<v.length:void 0!==typeof v&&false!==v&&""!==v)';
		returnValue += '}';
		returnValue += ';';
		const tmpArray: [ string, string ] = [ '', '' ];
		if( trim ) {
			tmpArray[ 0 ] = '(';
			tmpArray[ 1 ] = ').trim()';
		}
		returnValue += 'return ' + tmpArray[ 0 ] + '""' + tmpValue + tmpArray[ 1 ];
		tmpValue = '';
		do {
			tmpValue = returnValue;
			returnValue = returnValue.replace( /(?<!\\)"\+"/g, '' ).replace( '(true!==t[t[0]]?"":"")', '""' );
		}
		while( tmpValue != returnValue );
		return returnValue;
	}

	public CompileToFunction( template: string, trim: boolean = true, strip: boolean = true ): Function {
		return new Function( 'd', this._Compile( template, trim, strip ) );
	}

	public CompileToString( template: string, trim: boolean = true, strip: boolean = true ): string {
		return 'function(d){' + this._Compile( template, trim, strip ) + '}';
	}
}