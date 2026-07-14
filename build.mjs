import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { minify } from 'terser';
import ts from 'typescript';

const __filename = fileURLToPath( import.meta.url );
const __dirname = path.dirname( __filename );
const isMain = process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === __filename;

// ── Tuple manifest ────────────────────────────────────────────────────────────
// [ name, tsconfigFileName, filesToMinify[], prefix? ]

const buildTargets = [
	[ 'library', 'tsconfig.json', [ 'jTDAL.js' ] ],
	[ 'tests', 'tsconfig.tests.json', [] ]
];

// ── Function-call and class alias whitelists ──────────────────────────────────

const functionsToAlias = [
	'Date.now',
	'JSON.parse',
	'JSON.stringify',
	'Math.floor',
	'Math.max',
	'Math.min',
	'Math.round',
	'Number.isFinite',
	'Number.isInteger',
	'Number.isNaN',
	'Object.assign',
	'Object.entries',
	'Object.keys',
	'Object.values',
	'RegExp',
	'Reflect.get',
	'Reflect.has',
	'Reflect.ownKeys',
	'Reflect.set',
	'String.fromCharCode',
	'String.fromCodePoint'
];

const classesToAlias = [
	'Array',
	'Promise'
];

// ── Utilities ─────────────────────────────────────────────────────────────────

function log( step, message ) {
	const stamp = new Date().toISOString().substring( 11, 19 );
	console.log( `[${ stamp }] [${ step }] ${ message }` );
}

function compileTsc( configPath ) {
	const absConfig = path.resolve( __dirname, configPath );
	const configFile = ts.readConfigFile( absConfig, ts.sys.readFile );
	if( configFile.error ) {
		throw new Error( ts.formatDiagnosticsWithColorAndContext( [ configFile.error ], {
			getCurrentDirectory: ts.sys.getCurrentDirectory,
			getCanonicalFileName: f => f,
			getNewLine: () => '\n'
		} ) );
	}
	const parsed = ts.parseJsonConfigFileContent(
		configFile.config,
		ts.sys,
		path.dirname( absConfig )
	);
	if( 0 < parsed.errors.length ) {
		const message = ts.formatDiagnosticsWithColorAndContext( parsed.errors, {
			getCurrentDirectory: ts.sys.getCurrentDirectory,
			getCanonicalFileName: f => f,
			getNewLine: () => '\n'
		} );
		throw new Error( message );
	}
	const program = ts.createProgram( parsed.fileNames, parsed.options );
	const emitResult = program.emit();
	const diagnostics = ts.getPreEmitDiagnostics( program ).concat( emitResult.diagnostics );
	if( 0 < diagnostics.length ) {
		const message = ts.formatDiagnosticsWithColorAndContext( diagnostics, {
			getCurrentDirectory: ts.sys.getCurrentDirectory,
			getCanonicalFileName: f => f,
			getNewLine: () => '\n'
		} );
		throw new Error( message );
	}
}

// ── Tuple validation ──────────────────────────────────────────────────────────

function validateBuildTargets( targets ) {
	const cL1 = targets.length;
	for( let iL1 = 0; iL1 < cL1; iL1++ ) {
		const tuple = targets[ iL1 ];
		const errorPrefix = `Build target ${ iL1 }:`;
		if( !Array.isArray( tuple ) || ( 3 !== tuple.length && 4 !== tuple.length ) ) {
			throw new Error( `${ errorPrefix } must be a tuple of length 3 or 4` );
		}
		const [ name, configFile, filesToMinify, prefix ] = tuple;
		if( 'string' !== typeof name || '' === name ) {
			throw new Error( `${ errorPrefix } name must be a non-empty string` );
		}
		if( 'string' !== typeof configFile || '' === configFile ) {
			throw new Error( `${ errorPrefix } tsconfig file must be a non-empty string` );
		}
		if( !Array.isArray( filesToMinify ) ) {
			throw new Error( `${ errorPrefix } filesToMinify must be an array` );
		}
		if( undefined !== prefix && 'string' !== typeof prefix ) {
			throw new Error( `${ errorPrefix } prefix must be a string when provided` );
		}
		const cL2 = filesToMinify.length;
		for( let iL2 = 0; iL2 < cL2; iL2++ ) {
			if( 'string' !== typeof filesToMinify[ iL2 ] || !filesToMinify[ iL2 ].endsWith( '.js' ) ) {
				throw new Error( `${ errorPrefix } file '${ filesToMinify[ iL2 ] }' must end in '.js'` );
			}
		}
	}
}

// ── Per-file literal aliasing ─────────────────────────────────────────────────

function isUnsafeStringLiteral( node, parent ) {
	let unsafe = false;
	if( parent ) {
		if( ts.isExpressionStatement( parent ) && parent.expression === node ) {
			unsafe = true;
		}
		if( ( ts.isImportDeclaration( parent ) || ts.isExportDeclaration( parent ) ) && parent.moduleSpecifier === node ) {
			unsafe = true;
		}
		if( ts.isCallExpression( parent ) && ts.isImportKeyword( parent.expression ) && 0 < parent.arguments.length && parent.arguments[ 0 ] === node ) {
			unsafe = true;
		}
		if( ( ts.isImportAttribute( parent ) ) && ( parent.value === node || parent.name === node ) ) {
			unsafe = true;
		}
		if( ( ts.isPropertyAssignment( parent ) || ts.isMethodDeclaration( parent ) || ts.isPropertyDeclaration( parent ) || ts.isGetAccessorDeclaration( parent ) || ts.isSetAccessorDeclaration( parent ) || ts.isPropertyAccessExpression( parent ) || ts.isElementAccessExpression( parent ) ) && parent.name === node ) {
			unsafe = true;
		}
		if( ts.isBindingElement( parent ) && parent.propertyName === node ) {
			unsafe = true;
		}
		if( ( ts.isImportSpecifier( parent ) || ts.isExportSpecifier( parent ) ) && ( parent.name === node || parent.propertyName === node ) ) {
			unsafe = true;
		}
	}
	return unsafe;
}

function collectStringCandidates( sourceFile ) {
	const identifiers = new Set();
	const stringLiterals = new Map();

	function visit( node, parent ) {
		if( ts.isIdentifier( node ) ) {
			identifiers.add( node.text );
		}
		if( ts.isStringLiteral( node ) ) {
			const text = node.text;
			if( !isUnsafeStringLiteral( node, parent ) ) {
				if( !stringLiterals.has( text ) ) {
					stringLiterals.set( text, [] );
				}
				stringLiterals.get( text ).push( { node, parent } );
			}
		}
		ts.forEachChild( node, child => visit( child, node ) );
	}

	visit( sourceFile, null );

	return { identifiers, stringLiterals };
}

function findInsertionPoint( sourceFile ) {
	let returnValue = 0;
	let go = true;
	const cL1 = sourceFile.statements.length;
	for( let iL1 = 0; iL1 < cL1 && go; iL1++ ) {
		const stmt = sourceFile.statements[ iL1 ];
		if( ts.isExpressionStatement( stmt ) && ts.isStringLiteral( stmt.expression ) ) {
			returnValue = stmt.end;
		} else if( ts.isImportDeclaration( stmt ) ) {
			returnValue = stmt.end;
		} else {
			go = false;
		}
	}
	return returnValue;
}

async function minifyFile( absPath ) {
	const source = await fs.readFile( absPath, 'utf8' );

	const baselineResult = await minify( source, {
		module: true,
		toplevel: true,
		compress: { defaults: true, passes: 2 },
		mangle: { properties: { regex: /^_/ } }
	} );
	const baselineCode = baselineResult.code;

	const outPath = absPath.replace( /\.js$/, '.min.js' );
	let outputCode;

	const transformed = transformSource( source, absPath );

	if( transformed !== source ) {
		const transformedResult = await minify( transformed, {
			module: true,
			toplevel: true,
			compress: { defaults: true, passes: 2, reduce_vars: false },
			mangle: { properties: { regex: /^_/ } }
		} );
		const size = [
			Buffer.byteLength( baselineCode, 'utf8' ),
			Buffer.byteLength( transformedResult.code, 'utf8' )
		];
		log( 'MINIFY', `Baseline    output size: ${size[0]}` );
		log( 'MINIFY', `Transformed output size: ${size[1]}` );
		if( Buffer.byteLength( transformedResult.code, 'utf8' ) < Buffer.byteLength( baselineCode, 'utf8' ) ) {
			outputCode = transformedResult.code;
			log( 'MINIFY', `Transformed output written — ${ outPath }` );
		} else {
			outputCode = baselineCode;
			log( 'MINIFY', `Baseline output written — ${ outPath }` );
		}
	} else {
		log( 'MINIFY', 'Code not transformed' );
		outputCode = baselineCode;
		log( 'MINIFY', `Baseline output written — ${ outPath }` );
	}

	await fs.writeFile( outPath, outputCode );
}

// ── Target runner ─────────────────────────────────────────────────────────────

async function runTarget( target ) {
	const [ name, configFile, filesToMinify, prefix ] = target;
	const dir = path.resolve( __dirname, prefix ?? '.' );
	const absConfig = path.resolve( dir, configFile );

	log( name.toUpperCase(), 'Compiling TypeScript...' );
	compileTsc( absConfig );

	const cL1 = filesToMinify.length;
	for( let iL1 = 0; iL1 < cL1; iL1++ ) {
		const absFile = path.resolve( dir, filesToMinify[ iL1 ] );
		log( name.toUpperCase(), `Minifying ${ path.relative( __dirname, absFile ) }...` );
		await minifyFile( absFile );
	}

	log( name.toUpperCase(), '✓ Built.' );
}

function getRootIdentifier( path ) {
	const dotIndex = path.indexOf( '.' );
	return 0 <= dotIndex ? path.substring( 0, dotIndex ) : path;
}

function collectBindings( sourceFile ) {
	const bindings = new Set();

	function visit( node, parent ) {
		if( ts.isIdentifier( node ) ) {
			if( ts.isVariableDeclaration( parent ) && parent.name === node ) {
				bindings.add( node.text );
			} else if( ts.isBindingElement( parent ) && parent.name === node ) {
				bindings.add( node.text );
			} else if( ts.isParameter( parent ) ) {
				bindings.add( node.text );
			} else if( ( ts.isFunctionDeclaration( parent ) || ts.isFunctionExpression( parent ) || ts.isArrowFunction( parent ) ) && parent.name === node ) {
				bindings.add( node.text );
			} else if( ( ts.isClassDeclaration( parent ) || ts.isClassExpression( parent ) ) && parent.name === node ) {
				bindings.add( node.text );
			} else if( ts.isImportSpecifier( parent ) && parent.name === node ) {
				bindings.add( node.text );
			} else if( ts.isImportClause( parent ) && parent.name === node ) {
				bindings.add( node.text );
			} else if( ts.isNamespaceImport( parent ) && parent.name === node ) {
				bindings.add( node.text );
			} else if( ts.isCatchClause( parent ) && parent.variableDeclaration && parent.variableDeclaration.name === node ) {
				bindings.add( node.text );
			}
		}
		ts.forEachChild( node, child => visit( child, node ) );
	}

	visit( sourceFile, null );
	return bindings;
}

function transformSource( source, sourceFilePath ) {
	const sourceFile = ts.createSourceFile( sourceFilePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS );
	const { identifiers, stringLiterals } = collectStringCandidates( sourceFile );
	const bindings = collectBindings( sourceFile );

	// Determine all roots that can be aliased
	const allRoots = new Set();
	for( const path of functionsToAlias ) {
		allRoots.add( getRootIdentifier( path ) );
	}
	for( const cls of classesToAlias ) {
		allRoots.add( cls );
	}

	// If a root is bound locally, exclude all aliases for that root
	const boundRoots = new Set();
	for( const binding of bindings ) {
		if( allRoots.has( binding ) ) {
			boundRoots.add( binding );
		}
	}

	// Collect call candidates
	const functionCandidates = []; // { path, node }
	const classCandidates = [];    // { root, node }

	function visitCalls( node, parent ) {
		if( ts.isCallExpression( node ) && !ts.isNewExpression( node ) ) {
			const callee = node.expression;

			// Bare Identifier — e.g. RegExp( x )
			if( ts.isIdentifier( callee ) ) {
				const path = callee.text;
				if( !boundRoots.has( path ) && functionsToAlias.includes( path ) ) {
					functionCandidates.push( { path, node } );
				}
			}
			// Direct PropertyAccessExpression with Identifier root — e.g. JSON.stringify( x )
			else if( ts.isPropertyAccessExpression( callee ) && ts.isIdentifier( callee.expression ) ) {
				const root = callee.expression.text;
				const path = root + '.' + callee.name.text;

				if( !boundRoots.has( root ) ) {
					if( functionsToAlias.includes( path ) ) {
						functionCandidates.push( { path, node } );
					} else if( classesToAlias.includes( root ) ) {
						classCandidates.push( { root, node } );
					}
				}
			}
		}
		ts.forEachChild( node, child => visitCalls( child, node ) );
	}

	visitCalls( sourceFile, null );

	// --- String aliases (_s0, _s1, ...) ---
	const stringAliases = [];
	let nextSSuffix = 0;
	for( const [ text, nodes ] of stringLiterals ) {
		if( 3 < text.length && 1 < nodes.length ) {
			let alias = '_s' + nextSSuffix;
			while( identifiers.has( alias ) ) {
				nextSSuffix++;
				alias = '_s' + nextSSuffix;
			}
			identifiers.add( alias );
			stringAliases.push( { alias, text, nodes } );
			nextSSuffix++;
		}
	}

	// --- Function aliases (_f0, _f1, ...) — order by functionsToAlias ---
	const functionCounts = new Map();
	for( const { path } of functionCandidates ) {
		functionCounts.set( path, ( functionCounts.get( path ) || 0 ) + 1 );
	}

	const functionAliases = [];
	let nextFSuffix = 0;
	for( const path of functionsToAlias ) {
		const count = functionCounts.get( path );
		if( 2 <= count ) {
			let alias = '_f' + nextFSuffix;
			while( identifiers.has( alias ) ) {
				nextFSuffix++;
				alias = '_f' + nextFSuffix;
			}
			identifiers.add( alias );
			functionAliases.push( { alias, path } );
			nextFSuffix++;
		}
	}

	// --- Class aliases (_fN, ...) — order by classesToAlias ---
	const classCounts = new Map();
	for( const { root } of classCandidates ) {
		classCounts.set( root, ( classCounts.get( root ) || 0 ) + 1 );
	}

	const classAliases = [];
	for( const cls of classesToAlias ) {
		const count = classCounts.get( cls );
		if( 2 <= count ) {
			let alias = '_f' + nextFSuffix;
			while( identifiers.has( alias ) ) {
				nextFSuffix++;
				alias = '_f' + nextFSuffix;
			}
			identifiers.add( alias );
			classAliases.push( { alias, root: cls } );
			nextFSuffix++;
		}
	}

	// --- Build replacements (descending offset) ---
	const replacements = [];

	// String literal replacements
	for( const { alias, nodes } of stringAliases ) {
		for( const { node } of nodes ) {
			replacements.push( {
				start: node.getStart( sourceFile ),
				end: node.end,
				text: alias
			} );
		}
	}

	// Function call callee replacements — replace entire callee expression
	const functionAliasMap = new Map( functionAliases.map( ( { alias, path } ) => [ path, alias ] ) );
	for( const { path, node } of functionCandidates ) {
		const alias = functionAliasMap.get( path );
		if( alias ) {
			replacements.push( {
				start: node.expression.getStart( sourceFile ),
				end: node.expression.end,
				text: alias
			} );
		}
	}

	// Class call root identifier replacements — replace only root Identifier
	const classAliasMap = new Map( classAliases.map( ( { alias, root } ) => [ root, alias ] ) );
	for( const { root, node } of classCandidates ) {
		const alias = classAliasMap.get( root );
		if( alias ) {
			const calleeExpr = node.expression;
			if( ts.isPropertyAccessExpression( calleeExpr ) && ts.isIdentifier( calleeExpr.expression ) ) {
				replacements.push( {
					start: calleeExpr.expression.getStart( sourceFile ),
					end: calleeExpr.expression.end,
					text: alias
				} );
			}
		}
	}

	if( 0 === stringAliases.length && 0 === functionAliases.length && 0 === classAliases.length ) {
		return source;
	}

	replacements.sort( ( a, b ) => b.start - a.start );

	// Build single const declaration: strings first, then functions, then classes
	const constParts = [];
	for( const { alias, text } of stringAliases ) {
		constParts.push( alias + '=' + JSON.stringify( text ) );
	}
	for( const { alias, path } of functionAliases ) {
		constParts.push( alias + '=' + path );
	}
	for( const { alias, root } of classAliases ) {
		constParts.push( alias + '=' + root );
	}
	const constDecl = 'const ' + constParts.join( ',' ) + ';';
	const insertionPoint = findInsertionPoint( sourceFile );

	let returnValue = source;
	for( const rep of replacements ) {
		returnValue = returnValue.slice( 0, rep.start ) + rep.text + returnValue.slice( rep.end );
	}

	returnValue = returnValue.slice( 0, insertionPoint ) + constDecl + '\n' + returnValue.slice( insertionPoint );

	return returnValue;
}

// ── Dispatch ─────────────────────────────────────────────────────────────────

if( isMain ) {
	validateBuildTargets( buildTargets );

	const targetNamesAllowed = new Set(
		buildTargets.flatMap( ( [ targetName ] ) => [ targetName ] )
	);
	let targetNamesArgs = new Set( process.argv.slice( 2 ) );

	if( targetNamesArgs.has( 'all' ) ) {
		targetNamesArgs.delete( 'all' );
		for( const targetName of targetNamesAllowed ) {
			targetNamesArgs.add( targetName );
		}
	}

	const targetNamesSelected = targetNamesAllowed.intersection( targetNamesArgs );
	const targetNamesInvalid = targetNamesArgs.difference( targetNamesAllowed );

	if( 0 < targetNamesSelected.size && 0 === targetNamesInvalid.size ) {
		async function main() {
			for( const target of buildTargets ) {
				if( targetNamesSelected.has( target[ 0 ] ) ) {
					await runTarget( target );
				}
			}
		}

		main().catch( err => {
			console.error( err );
			process.exit( 1 );
		} );
	} else {
		if( 0 < targetNamesInvalid.size ) {
			console.error( 'Unknown target(s): ' + [ ...targetNamesInvalid ].join( ', ' ) );
		}
		console.log( 'Usage: node build.mjs <target> [<target> ...]' );
		console.log( 'Available targets: ' + [ ...targetNamesAllowed ].join( ', ' ) + ', all' );
		process.exitCode = 1;
	}
}
