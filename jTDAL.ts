'use strict';
namespace jTDAL {
	const regexpPatternPath: string = '(?:[\\w-\\/]*[\\w](?:[\\s]*\\|[\\s]*[\\w-\\/]*[\\w])*)';
	const regexpPatternPathAllowedBoolean: string = '(?:(?:!)?[\\w-\\/]*[\\w](?:[\\s]*\\|[\\s]*[\\w-\\/]*[\\w])*)';
	//const regexpPatternExpression: string = '(STRING:[^;]+|' + regexpPatternPathAllowedBoolean + ')';
	const regexpPatternExpressionAllowedBoolean: string = '(STRING:[^;]+|' + regexpPatternPathAllowedBoolean + ')';
	const keywords: string[] = [ 'condition', 'repeat', 'content', 'replace', 'attributes', 'omittag' ];
	const regexp: { [ key: string ]: RegExp } = {
		'pathString': new RegExp( '^[\\s]*STRING:(.*)$' ),
		'tagWithTDAL': new RegExp( '<((?:\\w+:)?\\w+)(\\s+[^<>]+?)??\\s+data-tdal-(?:' + keywords.join( '|' ) +
															 ')=([\'"])(.*?)\\3(\\s+[^<>]+?)??\\s*(\/)?>', 'i' ),
		'tagWithAttribute': new RegExp( '<((?:\w+:)?\w+)(\s+[^<>]+?)??\s+%s=([\'"])(.*?)\\3(\s+[^<>]+?)??\s*(\/)?>', 'i' ),
		'tagAttributes': new RegExp( '(?<=\\s)((?:[\\w-]+\:)?[\\w-]+)=(?:([\'"])(.*?)\\2|([^>\\s\'"]+))', 'gi' ),
		'pathInString': new RegExp( '{(' + regexpPatternPath + ')}', 'g' ),
		'condition': new RegExp( '^[\\s]*(' + regexpPatternExpressionAllowedBoolean + ')[\\s]*$' ),
		'repeat': new RegExp( '^[\\s]*([\\w-]+?)[\\s]+(' + regexpPatternPath + ')[\\s]*$' ),
		'content': new RegExp( '^[\\s]*(?:(text|structure)[\\s]+)?(' + regexpPatternExpressionAllowedBoolean + ')[\\s]*$' ),
		'attributes': new RegExp( '[\\s]*(?:(?:([\\w-]+?)[\\s]+(' + regexpPatternExpressionAllowedBoolean + ')[\\s]*)(?:;[\\s]*|$))', 'g' ),
		'attributesTDAL': new RegExp( '\\s*(data-tdal-[\\w-]+)=(?:([\'"])(.*?)\\2|([^>\\s\'"]+))', 'gi' )
	};
	const HTML5VoidElements: string[] = [ 'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr' ];

	function ParsePath( pathExpression: string, getBoolean: boolean = false ): string {
		/* Boolean conversion:
		 * (false!==(t[i]=("function" === typeof #PATH#))&&null!==t[i]&&!(Array.isArray(t[i])&&1>t[i].length)&&!("object"===typeof t[i]&&1>Object.keys(t[i]).length))
		 */
		let returnValue: string = '';
		if( pathExpression ) {
			let openedBracket: number = 0;
			paths: {
				const paths = pathExpression.split( '|' );
				const countFirstLevel = paths.length;
				for( let indexFirstLevel = 0; indexFirstLevel < countFirstLevel; ++indexFirstLevel ) {
					const currentPath = paths[ indexFirstLevel ].trim();
					if( regexp[ 'pathString' ].exec( currentPath ) ) {
						let compiledString = '';
						let index = currentPath.indexOf( 'STRING:' ) + 7;
						let match = null;
						while( null != ( match = regexp[ 'pathInString' ].exec( currentPath ) ) ) {
							if( 0 < compiledString.length ) {
								compiledString += '+';
							}
							if( 0 < ( match.index - index ) ) {
								compiledString += JSON.stringify( String( currentPath.substr( index, match.index - index ) ) ) + '+';
							}
							compiledString += '(' + ParsePath( match[ 1 ] ) + ')';
							index = match[ 'index' ] + match[ 0 ].length;
						}
						if( currentPath.length > index ) {
							if( 0 < compiledString.length ) {
								compiledString += '+';
							}
							compiledString += JSON.stringify( String( currentPath.substr( index ) ) );
						}
						returnValue += '(' + compiledString + ')';
						break paths;
					}
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
									openedBracket++;
									returnValue += ( boolPath ? '(' + ( not ? '!' : '' ) : '' ) + '("undefined"!==typeof r["REPEAT"]&&';
									returnValue += '"undefined"!==typeof r["REPEAT"]["' + path[ 1 ] + '"]&&';
									let lastPath = 'r["REPEAT"]["' + path[ 1 ] + '"]["' + path[ 2 ] + '"]';
									returnValue += '"undefined"!==typeof ' + lastPath;
									returnValue += ( boolPath ? ')?false!==(t[i]=' + lastPath + ')&&null!==t[i]' : '?' + lastPath ) + ':';
								}
								break;
							}
							case 'GLOBAL': {
								// at least two tokens: GLOBAL/variable
								if( 1 < path.length ) {
									const countSecondLevel = path.length;
									// d must be a object
									returnValue += ( boolPath ? ( not ? '!(' : '(' ) : '' ) + '"object"===typeof (t[i]=d)';
									// Skip GLOBAL
									for( let indexSecondLevel = 1; indexSecondLevel < countSecondLevel; ++indexSecondLevel ) {
										returnValue += '&&';
										let lastPath = 't[i]["' + path[ indexSecondLevel ] + '"]';
										returnValue += '"undefined"!==typeof ';
										returnValue += '(t[i]=("function"===typeof ' + lastPath + '?' + lastPath + '(r,d)):' + lastPath + ')';
									}
									returnValue += ( boolPath ? '?"object"===typeof t[i]?0<Object.keys(t[i]).length:(Array.isArray(t[i])?0<t[i].length:false!==t[i]&&null!==t[i]):false)?true' : '?t[i]' ) + ':';
								}
								break;
							}
							default: {
								const countSecondLevel = path.length;
								openedBracket++;
								returnValue += '(' + ( boolPath ? ( not ? '!' : '' ) + '(' : '' ) + '"object"===typeof (t[i]=r)';
								for( let indexSecondLevel = 0; indexSecondLevel < countSecondLevel; ++indexSecondLevel ) {
									returnValue += '&&';
									let lastPath = 't[i]["' + path[ indexSecondLevel ] + '"]';
									returnValue += '"undefined"!==typeof ';
									returnValue += '(t[i]=("function"===typeof ' + lastPath + '?' + lastPath + '(d,r):' + lastPath + '))';
								}
								returnValue += ( boolPath ? '?"object"===typeof t[i]?0<Object.keys(t[i]).length:(Array.isArray(t[i])?0<t[i].length:false!==t[i]&&null!==t[i]):false)' + ( not ? '&&' : '||' ) : '?t[i]:' );
								returnValue += ( boolPath ? ( not ? '!' : '' ) + '(' : '' ) + '"object"===typeof (t[i]=d)';
								for( let indexSecondLevel = 0; indexSecondLevel < countSecondLevel; ++indexSecondLevel ) {
									returnValue += '&&';
									let lastPath = 't[i]["' + path[ indexSecondLevel ] + '"]';
									returnValue += '"undefined"!==typeof ';
									returnValue += '(t[i]=("function"===typeof ' + lastPath + '?' + lastPath + '(d,r):' + lastPath + '))';
								}
								returnValue += ( boolPath ? '?"object"===typeof t[i]?0<Object.keys(t[i]).length:(Array.isArray(t[i])?0<t[i].length:false!==t[i]&&null!==t[i]):false)?true' : '?t[i]' ) + ':';
							}
						}
					}
				}
				returnValue += 'false';
			}
			for( let indexFirstLevel = 0; indexFirstLevel < openedBracket; indexFirstLevel++ ) {
				returnValue += ')';
			}
		} else {
			returnValue = 'false';
		}
		return returnValue;
	}

	function Parse( template: string ) {
		let returnValue = '';
		let tmpTDALTags = null;

		while( null !== ( tmpTDALTags = regexp[ 'tagWithTDAL' ].exec( template ) ) ) {
			if( 0 < tmpTDALTags[ 'index' ] ) {
				returnValue += "+" + JSON.stringify( String( template.substr( 0, tmpTDALTags[ 'index' ] ) ) );
			}
			template = template.substr( tmpTDALTags[ 'index' ] + tmpTDALTags[ 0 ].length );
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
			// selfclosed if /> or if is a area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr
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
					current[ 4 ] += Parse( template.substr( 0, closingPosition[ 0 ] ) );
					current[ 6 ] += template.substr( closingPosition[ 0 ], closingPosition[ 1 ] );
					template = template.substr( closingPosition[ 0 ] + closingPosition[ 1 ] );
				}
			}
			tdal:      {
				if( attributes[ 'data-tdal-condition' ] && ( regexp[ 'condition' ].exec( attributes[ 'data-tdal-condition' ][ 3 ] ) ) ) {
					let tmpValue = ParsePath( attributes[ 'data-tdal-condition' ][ 3 ], true );
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
					let tmpValue = ParsePath( tmpTDALrules[ 2 ] );
					if( ( 'false' == tmpValue ) || ( '""' == tmpValue ) || ( 'true' == tmpValue ) ) {
						// 0 repetition, same as condition false
						break tdal;
					} else {
						current[ 0 ] += '+(';
						// current i = object
						current[ 0 ] += 'false!==(t[i++]=' + tmpValue + ')&&';
						current[ 0 ] += '(!Array.isArray(t[--i])||(t[i]=Object.assign({},t[i])))&&';
						// current i = index for object loop ( i+=1 )
						current[ 0 ] += '("object"===typeof t[i]&&0<Object.keys(t[i++]).length)&&(t[i++]=1)';
						current[ 0 ] += '?';
						current[ 0 ] += 'Object.keys(t[i-2]).reduce(function(o,e){';
						current[ 0 ] += 'r["' + tmpTDALrules[ 1 ] + '"]=t[i-2][e];';
						current[ 0 ] += 'r["REPEAT"]["' + tmpTDALrules[ 1 ] + '"]={};';
						current[ 0 ] += 'r["REPEAT"]["' + tmpTDALrules[ 1 ] + '"]["index"]=e;';
						// current i = free index ( i+=1 )
						current[ 0 ] += 'r["REPEAT"]["' + tmpTDALrules[ 1 ] + '"]["number"]=t[i-1]++;';
						current[ 0 ] += 'r["REPEAT"]["' + tmpTDALrules[ 1 ] + '"]["even"]=0==(r["REPEAT"]["' + tmpTDALrules[ 1 ] + '"]["number"]%2);';
						current[ 0 ] += 'r["REPEAT"]["' + tmpTDALrules[ 1 ] + '"]["odd"]=1==(r["REPEAT"]["' + tmpTDALrules[ 1 ] + '"]["number"]%2);';
						current[ 0 ] += 'r["REPEAT"]["' + tmpTDALrules[ 1 ] + '"]["first"]=1==r["REPEAT"]["' + tmpTDALrules[ 1 ] + '"]["number"];';
						current[ 0 ] += 'r["REPEAT"]["' + tmpTDALrules[ 1 ] + '"]["length"]=Object.keys(t[i-2]);';
						current[ 0 ] += 'r["REPEAT"]["' + tmpTDALrules[ 1 ] + '"]["last"]=r["REPEAT"]["' + tmpTDALrules[ 1 ] + '"]["length"]==r["REPEAT"]["' +
														tmpTDALrules[ 1 ] + '"]["number"];';
						current[ 0 ] += 'return o';
						// resetting i
						current[ 7 ] = ';},""):"")+((i-=2)?"":"")' + current[ 7 ];
					}
				}
				if( attributes[ 'data-tdal-content' ] && ( tmpTDALrules = regexp[ 'content' ].exec( attributes[ 'data-tdal-content' ][ 3 ] ) ) ) {
					let tmpValue = ParsePath( tmpTDALrules[ 2 ] );
					if( 'false' == tmpValue ) {
						current[ 4 ] = '';
					} else if( 'true' != tmpValue ) {
						let encoding = [ '', '' ];
						if( 'structure' != tmpTDALrules[ 1 ] ) {
							encoding[ 0 ] = '(new String(';
							encoding[ 1 ] = ')).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")';
						}
						current[ 3 ] += '+(false!==(t[i++]=' + tmpValue + ')&&("string"===typeof t[--i]||("number"===typeof t[i]&&!isNaN(t[i])))?' + encoding[ 0 ] +
														't[i]' + encoding[ 1 ] + ':(true!==t[i]?"":""';
						current[ 5 ] += '))';
					}
				} else if( attributes[ 'data-tdal-replace' ] && ( tmpTDALrules = regexp[ 'content' ].exec( attributes[ 'data-tdal-replace' ][ 3 ] ) ) ) {
					let tmpValue = ParsePath( tmpTDALrules[ 2 ] );
					if( 'false' == tmpValue ) {
						current[ 1 ] = '';
						current[ 4 ] = '';
						current[ 6 ] = '';
					} else if( 'true' != tmpValue ) {
						let encoding = [ '', '' ];
						if( 'structure' != tmpTDALrules[ 1 ] ) {
							encoding[ 0 ] = '(new String(';
							encoding[ 1 ] = ')).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")';
						}
						current[ 0 ] += '+(false!==(t[i++]=' + tmpValue + ')&&("string"===typeof t[--i]||("number"===typeof t[i]&&!isNaN(t[i])))?' + encoding[ 0 ] +
														't[i]' + encoding[ 1 ] + ':(true!==t[i]?"":""';
						current[ 7 ] = '))' + current[ 7 ];
					}
				}
				if( attributes[ 'data-tdal-attributes' ] && ( tmpTDALrules = regexp[ 'attributes' ].exec( attributes[ 'data-tdal-attributes' ][ 3 ] ) ) ) {
					while( null !== tmpTDALrules ) {
						let tmpValue = ParsePath( tmpTDALrules[ 2 ] );
						if( 'false' === tmpValue ) {
							if( 'undefined' !== ( typeof attributes[ tmpTDALrules[ 1 ] ] ) ) {
								current[ 1 ] = current[ 1 ].replace( new RegExp( '\\s*' + tmpTDALrules[ 1 ] + '(?:=([\'"]).*?\\1)?' ), '' );
							}
						} else if( 'true' !== tmpValue ) {
							current[ 2 ] += '+(false!==(t[i++]=' + tmpValue + ')&&("string"===typeof t[--i]||("number"===typeof t[i]&&!isNaN(t[i])))?" ' + tmpTDALrules[ 1 ] +
															'=\\""+t[i]+"\\"":(true!==t[i]?"":"';
							if( 'undefined' !== ( typeof attributes[ tmpTDALrules[ 1 ] ] ) ) {
								current[ 1 ] = current[ 1 ].replace( new RegExp( '\\s*' + tmpTDALrules[ 1 ] + '(?:=([\'"]).*?\\1)?' ), '' );
								current[ 2 ] += tmpTDALrules[ 1 ] + '"' +
																( ( ( 'undefined' !== ( typeof attributes[ tmpTDALrules[ 1 ] ][ 3 ] ) ) && ( '' != attributes[ tmpTDALrules[ 1 ] ][ 3 ] ) ) ? '+"="+' +
																JSON.stringify( String( attributes[ tmpTDALrules[ 1 ] ][ 2 ] + attributes[ tmpTDALrules[ 1 ] ][ 3 ] +
																attributes[ tmpTDALrules[ 1 ] ][ 2 ] ) ) : "" );
							} else {
								current[ 2 ] += '"';
							}
							current[ 2 ] += '))';
						}
						tmpTDALrules = regexp[ 'attributes' ].exec( attributes[ 'data-tdal-attributes' ][ 3 ] );
					}
				}
				if( attributes[ 'data-tdal-omittag' ] && ( regexp[ 'condition' ].exec( attributes[ 'data-tdal-omittag' ][ 3 ] ) ) ) {
					let tmpValue = ParsePath( attributes[ 'data-tdal-omittag' ][ 3 ], true );
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

				while( null !== ( tmpMatch = regexp[ 'attributesTDAL' ].exec( current[ 1 ] ) ) ) {
					current[ 1 ] = current[ 1 ].replace( regexp[ 'attributesTDAL' ], '' );
				}
			}
			current[ 1 ] = current[ 1 ].replace( /\s*\/?>$/, '' );
			if( selfClosed && ( ( '' != current[ 4 ] ) || ( '' != current[ 3 ] ) || ( '' != current[ 5 ] ) ) ) {
				// if is a tag selfclosed, and if it have contents, i should close it
				current[ 6 ] = '</' + tmpTDALTags[ 1 ] + '>';
				selfClosed = false;
			}
			returnValue += current[ 0 ] + '+' + JSON.stringify( String( current[ 1 ] ) ) + current[ 2 ] +
										 ( ( '' != current[ 1 ] ) ? '+"' + ( selfClosed ? '/' : '' ) + '>"' : '' ) + current[ 3 ] + current[ 4 ] + current[ 5 ] + '+' +
										 JSON.stringify( String( current[ 6 ] ) ) + current[ 7 ];
		}
		returnValue += '+' + JSON.stringify( String( template ) );
		return ( returnValue );
	}

	export function Compile( template: string, trim: boolean = true ) {
		let returnValue = ( 'let r={"REPEAT":{}},i=0,t=[];return ' + ( trim ? '(' : '' ) + '""' +
											Parse( template ) ).replace( /(?<!\\)""\+/, '' ).replace( /(?<!\\)"\+"/g, '' ).replace( /\+""$/, '' ) + ( trim ? ').trim()' : '' ) + ';';
		return new Function( 'd', returnValue );
	}
}
// @ts-ignore
if( 'undefined' !== typeof exports ) {
	// @ts-ignore
	exports.Compile = jTDAL.Compile;
}