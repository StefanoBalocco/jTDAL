'use strict';
namespace jTDAL {
	const regexpPatternPath: string = '(?:[\\w-\\/]*[\\w](?:[\\s]*\\|[\\s]*[\\w-\\/]*[\\w])*)';
	const regexpPatternPathAllowedBoolean: string = '(?:(?:!)?[\\w-\\/]*[\\w](?:[\\s]*\\|[\\s]*[\\w-\\/]*[\\w])*)';
	//const regexpPatternExpression: string = '(STRING:[^;]+|' + regexpPatternPathAllowedBoolean + ')';
	const regexpPatternExpressionAllowedBoolean: string = '(STRING:(?:[^;](?:(?!<=;);)?)+|' + regexpPatternPathAllowedBoolean + ')';
	const keywords: string[] = [ 'condition', 'repeat', 'content', 'replace', 'attributes', 'omittag' ];
	const regexp: { [ key: string ]: RegExp } = {
		'tagWithTDAL': new RegExp( '<((?:\\w+:)?\\w+)(\\s+[^<>]+?)??\\s+data-tdal-(?:' + keywords.join( '|' ) +
															 ')=([\'"])(.*?)\\3(\\s+[^<>]+?)??\\s*(\/)?>', 'i' ),
		'tagWithAttribute': new RegExp( '<((?:\w+:)?\w+)(\s+[^<>]+?)??\s+%s=([\'"])(.*?)\\3(\s+[^<>]+?)??\s*(\/)?>', 'i' ),
		'tagAttributes': new RegExp( '(?<=\\s)((?:[\\w-]+\:)?[\\w-]+)=(?:([\'"])(.*?)\\2|([^>\\s\'"]+))', 'gi' ),
		'pathString': new RegExp( '(?:{(' + regexpPatternPath + ')}|{\\?(' + regexpPatternPathAllowedBoolean + ')}(.*?){\\?\\2})' ),
		'pathInString': new RegExp( '{(' + regexpPatternPath + ')}', 'g' ),
		'conditionInString': new RegExp( '{\\?(' + regexpPatternPathAllowedBoolean + ')}(.*?){\\?\\1}', 'g' ),
		'condition': new RegExp( '^[\\s]*(' + regexpPatternExpressionAllowedBoolean + ')[\\s]*$' ),
		'repeat': new RegExp( '^[\\s]*([\\w-]+?)[\\s]+(' + regexpPatternPath + ')[\\s]*$' ),
		'content': new RegExp( '^[\\s]*(?:(text|structure)[\\s]+)?(' + regexpPatternExpressionAllowedBoolean + ')[\\s]*$' ),
		'attributes': new RegExp( '[\\s]*(?:(?:([\\w-]+?)[\\s]+(' + regexpPatternExpressionAllowedBoolean + ')[\\s]*)(?:;;[\\s]*|$))', 'g' ),
		'attributesTDAL': new RegExp( '\\s*(data-tdal-[\\w-]+)=(?:([\'"])(.*?)\\2|([^>\\s\'"]+))', 'gi' )
	};
	// {\?((?:[\w-\/]*[\w](?:[\s]*\|[\s]*[\w-\/]*[\w])*))}(.*?){\?(?:[\w-\/]*[\w](?:[\s]*\|[\s]*[\w-\/]*[\w])*)}
	const HTML5VoidElements: string[] = [ 'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr' ];

	function ParseString( stringExpression: string, features: { Check: boolean, Bool: boolean, Repeat: boolean } ) {
		let returnValue: string = '""';
		let match = null;
		while( null != ( match = regexp[ 'pathString' ].exec( stringExpression ) ) ) {
			if( 0 < match[ 'index' ] ) {
				returnValue += '+' + JSON.stringify( String( stringExpression.substring( 0, match[ 'index' ] ) ) );
			}
			stringExpression = stringExpression.substring( match[ 'index' ] + match[ 0 ].length );
			if( match[ 1 ] ) {
				// simple path substitution
				returnValue += '+(a(' + ParsePath( match[ 1 ], features, false ) + ')&&("string"===typeof t[t[0]]||("number"===typeof t[t[0]]&&!isNaN(t[t[0]])))?t[t[0]]:"")';
			} else if( match[ 2 ] ) {
				// if condition
				const tmpValue = ParsePath( match[ 2 ], features, true );
				if( 'true' === tmpValue ) {
					returnValue += '+' + ParseString( match[ 3 ], features );
				} else if( 'false' !== tmpValue ) {
					returnValue += '+(true===' + tmpValue + '?""+' + ParseString( match[ 3 ], features ) + ':"")';
				} // if "static" false, the content of the condition should be removed
			}
		}
		if( 0 < stringExpression.length ) {
			returnValue += '+' + JSON.stringify( String( stringExpression ) );
		}
		return returnValue;
	}

	function ParsePath( pathExpression: string, features: { Check: boolean, Bool: boolean, Repeat: boolean }, getBoolean: boolean = false ): string {
		/* Boolean conversion:
		 * (false!==(t[t[0]]=("function" === typeof #PATH#))&&null!==t[t[0]]&&!(Array.isArray(t[t[0]])&&1>t[t[0]].length)&&!("object"===typeof t[t[0]]&&1>Object.keys(t[t[0]]).length))
		 */
		let returnValue: string = '';
		if( pathExpression ) {
			let openedBracket: number = 0;
			paths: {
				const paths = pathExpression.split( '|' );
				const countFirstLevel = paths.length;
				for( let indexFirstLevel = 0; indexFirstLevel < countFirstLevel; ++indexFirstLevel ) {
					if( 0 != indexFirstLevel ) {
						returnValue += '||';
					}
					const currentPath = paths[ indexFirstLevel ].replace( /^\s+/, '' );
					if( currentPath.startsWith( 'STRING:' ) ) {
						returnValue += '(' + ParseString( currentPath.substring( 7 ), features ) + ')';
						break paths;
					} else {
						const not = ( '!' === currentPath[ 0 ] );
						const boolPath = getBoolean || not;
						const path = ( not ? currentPath.substring( 1 ) : currentPath ).split( '/' );
						features.Bool ||= boolPath;
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
										features.Check = true;
										features.Repeat = true;
										returnValue += ( boolPath ? ( not ? '!' : '' ) + 'b(' : '' ) + 'c(r,"' + path.join( '/' ) + '")' + ( boolPath ? ')' : '' );
									}
									break;
								}
								case 'GLOBAL': {
									// at least two tokens: GLOBAL/variable
									if( 1 < path.length && 0 < path[ 1 ].length ) {
										features.Check = true;
										// d must be a object
										// Skip GLOBAL
										returnValue += ( boolPath ? ( not ? '!' : '' ) + 'b(' : '' ) + 'c(d,"' + path.slice( 1 ).join( '/' ) + '")' + ( boolPath ? ')' : '' );
									}
									break;
								}
								default: {
									features.Check = true;
									// not encapsulate checks between parenthesis because not checks are connected with &&
									openedBracket++;
									returnValue += '(';
									if( features.Repeat ) {
										returnValue += ( boolPath ? ( not ? '!' : '' ) + 'b(' : '' ) + 'c(r,"' + path.join( '/' ) + '")' + ( boolPath ? ')' : '' );
										returnValue += ( boolPath && not ? '&&' : '||' );
									}
									returnValue += ( boolPath ? ( not ? '!' : '' ) + 'b(' : '' ) + 'c(d,"' + path.join( '/' ) + '")' + ( boolPath ? ')' : '' );
								}
							}
						}
					}
				}
			}
			for( let indexFirstLevel = 0; indexFirstLevel < openedBracket; indexFirstLevel++ ) {
				returnValue += ')';
			}
		} else {
			returnValue = 'false';
		}
		return returnValue;
	}

	function Parse( template: string, features: { Check: boolean, Bool: boolean, Repeat: boolean } ) {
		let returnValue = '';
		let tmpTDALTags = null;

		while( null !== ( tmpTDALTags = regexp[ 'tagWithTDAL' ].exec( template ) ) ) {
			if( 0 < tmpTDALTags[ 'index' ] ) {
				returnValue += "+" + JSON.stringify( String( template.substring( 0, tmpTDALTags[ 'index' ] ) ) );
			}
			template = template.substring( tmpTDALTags[ 'index' ] + tmpTDALTags[ 0 ].length );
			let attributes: { [ key: string ]: RegExpExecArray } = {};
			let tmpMatch: ( RegExpExecArray | null );
			while( null !== ( tmpMatch = regexp[ 'tagAttributes' ].exec( tmpTDALTags[ 0 ] ) ) ) {
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
			current[ 1 ] = current[ 1 ].replace( regexp[ 'attributesTDAL' ], '' );

			// selfclosed if /> or if is an area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr
			let selfClosed = !!tmpTDALTags[ 6 ] || HTML5VoidElements.includes( tmpTDALTags[ 1 ].toLowerCase() );
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
					current[ 4 ] += Parse( template.substring( 0, closingPosition[ 0 ] ), features );
					current[ 6 ] += template.substring( closingPosition[ 0 ], closingPosition[ 0 ] + closingPosition[ 1 ] );
					template = template.substring( closingPosition[ 0 ] + closingPosition[ 1 ] );
				}
			}
			tdal: {
				if( attributes[ 'data-tdal-condition' ] && ( regexp[ 'condition' ].exec( attributes[ 'data-tdal-condition' ][ 3 ] ) ) ) {
					let tmpValue = ParsePath( attributes[ 'data-tdal-condition' ][ 3 ], features, true );
					if( 'false' === tmpValue ) {
						// the tag (and it's content) should be removed
						break tdal;
					} else if( 'true' !== tmpValue ) {
						current[ 0 ] += '+(true===' + tmpValue + '?""';
						current[ 7 ] = ':"")' + current[ 7 ];
					}
				}
				let tmpTDALrules;
				if( attributes[ 'data-tdal-repeat' ] && ( tmpTDALrules = regexp[ 'repeat' ].exec( attributes[ 'data-tdal-repeat' ][ 3 ] ) ) ) {
					let tmpValue = ParsePath( tmpTDALrules[ 2 ], features, false );
					if( ( 'false' == tmpValue ) || ( '""' == tmpValue ) || ( 'true' == tmpValue ) ) {
						// 0 repetition, same as condition false
						break tdal;
					} else {
						current[ 0 ] += '+(';
						// current i = object
						current[ 0 ] += 'a(' + tmpValue + ')&&';
						current[ 0 ] += '(!Array.isArray(t[t[0]])||(t[t[0]]=Object.assign({},t[t[0]])))&&';
						// current i = index for object loop ( i+=1 )
						current[ 0 ] += '("object"===typeof t[t[0]]&&null!==t[t[0]]&&0<Object.keys(t[t[0]++]).length)&&(t[t[0]++]=1)';
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
						features.Repeat = true;
						// resetting i
						current[ 7 ] = ';},""):"")+((t[0]-=2)?"":"")' + current[ 7 ];
					}
				}
				if( attributes[ 'data-tdal-content' ] && ( tmpTDALrules = regexp[ 'content' ].exec( attributes[ 'data-tdal-content' ][ 3 ] ) ) ) {
					let tmpValue = ParsePath( tmpTDALrules[ 2 ], features, false );
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
				} else if( attributes[ 'data-tdal-replace' ] && ( tmpTDALrules = regexp[ 'content' ].exec( attributes[ 'data-tdal-replace' ][ 3 ] ) ) ) {
					let tmpValue = ParsePath( tmpTDALrules[ 2 ], features, false );
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
				if( attributes[ 'data-tdal-attributes' ] && ( tmpTDALrules = regexp[ 'attributes' ].exec( attributes[ 'data-tdal-attributes' ][ 3 ] ) ) ) {
					while( null !== tmpTDALrules ) {
						let tmpValue = ParsePath( tmpTDALrules[ 2 ], features, false );
						if( 'false' === tmpValue ) {
							if( 'undefined' !== ( typeof attributes[ tmpTDALrules[ 1 ] ] ) ) {
								current[ 1 ] = current[ 1 ].replace( new RegExp( '\\s*' + tmpTDALrules[ 1 ] + '(?:=([\'"]).*?\\1)?' ), '' );
							}
						} else if( 'true' !== tmpValue ) {
							current[ 2 ] += '+(a(' + tmpValue + ')&&("string"===typeof t[t[0]]||("number"===typeof t[t[0]]&&!isNaN(t[t[0]])))?" ' + tmpTDALrules[ 1 ] + '=\\""+t[t[0]]+"\\"":(true!==t[t[0]]?"":"' + tmpTDALrules[ 1 ] + '"';
							if( 'undefined' !== ( typeof attributes[ tmpTDALrules[ 1 ] ] ) ) {
								current[ 1 ] = current[ 1 ].replace( new RegExp( '\\s*' + tmpTDALrules[ 1 ] + '(?:=([\'"]).*?\\1)?' ), '' );
								current[ 2 ] += ( ( ( 'undefined' !== ( typeof attributes[ tmpTDALrules[ 1 ] ][ 3 ] ) ) && ( '' != attributes[ tmpTDALrules[ 1 ] ][ 3 ] ) ) ? '+"="+' + JSON.stringify( String( attributes[ tmpTDALrules[ 1 ] ][ 2 ] + attributes[ tmpTDALrules[ 1 ] ][ 3 ] + attributes[ tmpTDALrules[ 1 ] ][ 2 ] ) ) : "" );
							}
							current[ 2 ] += '))';
						}
						tmpTDALrules = regexp[ 'attributes' ].exec( attributes[ 'data-tdal-attributes' ][ 3 ] );
					}
				}
				if( attributes[ 'data-tdal-omittag' ] && ( regexp[ 'condition' ].exec( attributes[ 'data-tdal-omittag' ][ 3 ] ) ) ) {
					let tmpValue = ParsePath( attributes[ 'data-tdal-omittag' ][ 3 ], features, true );
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

	function Compile( template: string, trim: boolean = true, strip: boolean = true ): string {
		const features: { Check: boolean, Bool: boolean, Repeat: boolean } = {
			Check: false,
			Bool: false,
			Repeat: false
		};
		let tmpValue = Parse( strip ? template.replace( /<!--.*?-->/sg, '' ) : template, features );
		let returnValue = 'let ' + ( features.Repeat ? 'r={"REPEAT":{}},' : '' ) + 't=[1];';
		returnValue += 'const ';
		returnValue += 'a=(e)=>{';
		returnValue += 't[t[0]]=e;';
		returnValue += 'return 1';
		returnValue += '}';
		if( features.Check ) {
			returnValue += ',c=(a,b)=>{';
			returnValue += 'let z=!1,y=b.split("/"),x,w;';
			returnValue += 'if(0<y.length&&0<y[0].length)';
			returnValue += 'for(z=a,x=0;x<y.length&&1!==z;x++)';
			returnValue += 'z="object"===typeof z&&null!==z&&void 0!==(w="function"===typeof z[y[x]]?z[y[x]](d,' + ( features.Repeat ? 'r' : '{}' ) + '):z[y[x]])&&w;';
			returnValue += 'return z';
			returnValue += '}';
			if( features.Bool ) {
				returnValue += ',b=(v)=>{';
				returnValue += 'return "object"===typeof v?null!==v&&0<Object.keys(v).length:(Array.isArray(v)?0<v.length:void 0!==typeof v&&false!==v&&""!==v)';
				returnValue += '}';
			}
			returnValue += ';';
		}
		returnValue += 'return ' + ( trim ? '(' : '' ) + '""' + tmpValue + ( trim ? ').trim()' : '' );
		tmpValue = '';
		do {
			tmpValue = returnValue;
			returnValue = returnValue.replace( /(?<!\\)"\+"/g, '' ).replace( '(true!==t[t[0]]?"":"")', '""' );
		}
		while( tmpValue != returnValue );
		return returnValue;
	}

	export function CompileToFunction( template: string, trim: boolean = true, strip: boolean = true ): Function {
		return new Function( 'd', Compile( template, trim, strip ) );
	}

	export function CompileToString( template: string, trim: boolean = true, strip: boolean = true ): string {
		return 'function(d){' + Compile( template, trim, strip ) + '}';
	}
}

export default {
	CompileToFunction: jTDAL.CompileToFunction,
	CompileToString: jTDAL.CompileToString
};
